/**
 * Admin & Owner Data Repository
 * Handles single-owner identity, administrative accounts, lockout state, and secure sessions.
 * Compatible with MySQL 8.0+ and MariaDB 10.3+.
 */

import { PrismaClient, User, AdminSession, Role } from '@prisma/client';
import { getPrismaClient } from '../db';

export class AdminRepository {
  private prisma: PrismaClient | null;

  constructor(prismaClient?: PrismaClient | null) {
    this.prisma = prismaClient ?? null;
  }

  private getClient(): PrismaClient {
    const client = this.prisma || getPrismaClient();
    if (!client) {
      throw new Error('Database is not connected. Admin repository cannot execute queries.');
    }
    return client;
  }

  /**
   * Returns count of registered store owners / administrators.
   * Single-owner architecture guarantees exactly one primary owner.
   */
  async getOwnerCount(): Promise<number> {
    const client = this.getClient();
    return client.user.count({
      where: {
        role: {
          in: [Role.SUPERADMIN, Role.ADMIN],
        },
      },
    });
  }

  /**
   * Finds an admin user by email or phone.
   */
  async findAdminByIdentifier(identifier: string): Promise<User | null> {
    const client = this.getClient();
    const clean = identifier.trim().toLowerCase();

    return client.user.findFirst({
      where: {
        AND: [
          {
            OR: [
              { email: clean },
              { phone: clean },
            ],
          },
          {
            role: {
              in: [Role.SUPERADMIN, Role.ADMIN, Role.STAFF],
            },
          },
        ],
      },
    });
  }

  /**
   * Finds an admin by internal UUID.
   */
  async findAdminById(id: string): Promise<User | null> {
    const client = this.getClient();
    return client.user.findUnique({
      where: { id },
    });
  }

  /**
   * Registers the store owner during CLI bootstrap.
   * Guarantees atomic transaction and enforces single-owner constraint.
   */
  async createBootstrapOwner(data: {
    email: string;
    fullName: string;
    phone?: string;
    passwordHash: string;
    mfaSecretEncrypted: string;
    mfaSecretIv: string;
    mfaSecretTag: string;
    initialTotpCounter: bigint;
  }): Promise<User> {
    const client = this.getClient();

    return client.$transaction(async (tx) => {
      // 1. Strict single-owner gate check
      const existingCount = await tx.user.count({
        where: {
          role: { in: [Role.SUPERADMIN, Role.ADMIN] },
        },
      });

      if (existingCount > 0) {
        throw new Error(
          'Single-owner constraint violation: Store owner is already bootstrapped. Multiple owners are strictly prohibited.'
        );
      }

      // 2. Create the primary SUPERADMIN owner
      const owner = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          phone: data.phone?.trim() || null,
          fullName: data.fullName.trim(),
          passwordHash: data.passwordHash,
          role: Role.SUPERADMIN,
          isVerified: true,
          mfaEnabled: true,
          mfaSecretEncrypted: data.mfaSecretEncrypted,
          mfaSecretIv: data.mfaSecretIv,
          mfaSecretTag: data.mfaSecretTag,
          lastTotpCounter: data.initialTotpCounter,
          failedLoginAttempts: 0,
        },
      });

      // 3. Record audit event for owner bootstrap
      await tx.auditEvent.create({
        data: {
          userId: owner.id,
          action: 'OWNER_BOOTSTRAP_COMPLETED',
          entityType: 'USER',
          entityId: owner.id,
          detailsJson: JSON.stringify({
            email: owner.email,
            role: owner.role,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return owner;
    });
  }

  /**
   * Records a failed login attempt with exponential backoff / lockout.
   * Lockout threshold: 5 attempts triggers 15-minute lock.
   */
  async recordFailedLogin(userId: string): Promise<{ lockedUntil: Date | null; attempts: number }> {
    const client = this.getClient();
    const user = await client.user.findUnique({ where: { id: userId } });
    if (!user) return { lockedUntil: null, attempts: 0 };

    const newAttempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;

    if (newAttempts >= 5) {
      // 15-minute lockout
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await client.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil,
      },
    });

    return { lockedUntil, attempts: newAttempts };
  }

  /**
   * Resets failed login counters and updates last login timestamp + monotonic TOTP counter.
   */
  async recordSuccessfulLogin(userId: string, totpCounter: bigint): Promise<void> {
    const client = this.getClient();
    await client.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastTotpCounter: totpCounter,
      },
    });
  }

  /**
   * Creates a new admin session record.
   */
  async createSession(data: {
    userId: string;
    sessionTokenHash: string;
    csrfSecret: string;
    ipAddressMasked?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<AdminSession> {
    const client = this.getClient();
    return client.adminSession.create({
      data: {
        userId: data.userId,
        sessionTokenHash: data.sessionTokenHash,
        csrfSecret: data.csrfSecret,
        ipAddressMasked: data.ipAddressMasked,
        userAgent: data.userAgent?.slice(0, 255),
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Finds an active, non-expired, non-revoked session by SHA-256 token hash.
   */
  async findActiveSession(tokenHash: string): Promise<(AdminSession & { user: User }) | null> {
    const client = this.getClient();
    return client.adminSession.findFirst({
      where: {
        sessionTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Touches session activity timestamp.
   */
  async touchSession(sessionId: string): Promise<void> {
    const client = this.getClient();
    await client.adminSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    const client = this.getClient();
    await client.adminSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active sessions for a user (e.g. security reset or password change).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const client = this.getClient();
    const res = await client.adminSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return res.count;
  }
}

export const adminRepository = new AdminRepository();

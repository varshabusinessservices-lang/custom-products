/**
 * Admin Authentication & Session Service
 * Provides production-grade owner/admin authentication lifecycle:
 * - Scrypt constant-time password verification with side-channel mitigation
 * - Brute-force account lockout protection
 * - AES-256-GCM decrypted TOTP MFA verification with replay defense
 * - Opaque 32-byte session token generation with SHA-256 hash storage
 * - Single-owner store policy enforcement
 */

import { adminRepository } from '../repositories/admin.repository';
import { checkDatabaseConnection } from '../db';
import {
  verifyScryptPassword,
  timingSafeDummyVerification,
  decryptAes256Gcm,
  verifyTotpCode,
  generateSessionToken,
  hashSessionToken,
  generateCsrfToken,
} from '../security/crypto';
import { User, AdminSession, Role } from '@prisma/client';

export interface AdminLoginInput {
  identifier: string; // Email or phone
  password: string;
  totpCode: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminLoginResult {
  success: boolean;
  statusCode: number;
  error?: string;
  message: string;
  sessionToken?: string;
  csrfToken?: string;
  expiresAt?: string;
  user?: {
    id: string;
    email: string | null;
    fullName: string;
    role: Role;
    mfaEnabled: boolean;
  };
}

export interface AuthenticatedAdminContext {
  user: User;
  session: AdminSession;
}

export class AdminAuthService {
  /**
   * Evaluates if store owner has been bootstrapped in the connected database.
   */
  async getBootstrapStatus(): Promise<{
    dbConnected: boolean;
    ownerBootstrapped: boolean;
    ownerCount: number;
    message: string;
  }> {
    const dbState = await checkDatabaseConnection();
    if (!dbState.connected) {
      return {
        dbConnected: false,
        ownerBootstrapped: false,
        ownerCount: 0,
        message: 'Database is not connected. Connect MySQL 8 / MariaDB 10+ to inspect bootstrap state.',
      };
    }

    try {
      const count = await adminRepository.getOwnerCount();
      return {
        dbConnected: true,
        ownerBootstrapped: count > 0,
        ownerCount: count,
        message: count > 0 ? 'Store owner is bootstrapped and active.' : 'No store owner created yet. Run CLI bootstrap.',
      };
    } catch (err: any) {
      return {
        dbConnected: true,
        ownerBootstrapped: false,
        ownerCount: 0,
        message: `Failed to inspect admin state: ${err.message}`,
      };
    }
  }

  /**
   * Authenticates owner/admin using scrypt password + TOTP 6-digit MFA.
   * Employs constant-time checks and dummy hashing to eliminate account-enumeration side-channels.
   */
  async login(input: AdminLoginInput): Promise<AdminLoginResult> {
    const dbState = await checkDatabaseConnection();
    if (!dbState.connected) {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message:
          'Administrative authentication requires a live MySQL 8 or MariaDB 10+ database. No simulated logins or mock bypasses are permitted.',
      };
    }

    if (!input.identifier || !input.password) {
      return {
        success: false,
        statusCode: 400,
        error: 'Missing Credentials',
        message: 'Username/email and password are required.',
      };
    }

    if (!input.totpCode) {
      return {
        success: false,
        statusCode: 400,
        error: 'MFA Required',
        message: 'A 6-digit TOTP authenticator code is mandatory for administrative access.',
      };
    }

    const admin = await adminRepository.findAdminByIdentifier(input.identifier);

    // If user does not exist, run dummy scrypt computation to maintain constant execution time
    if (!admin || !admin.passwordHash) {
      await timingSafeDummyVerification(input.password);
      return {
        success: false,
        statusCode: 401,
        error: 'Invalid Credentials',
        message: 'Invalid administrative credentials or TOTP authentication failed.',
      };
    }

    // Check account lockout
    if (admin.lockedUntil && new Date() < admin.lockedUntil) {
      const waitMinutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      return {
        success: false,
        statusCode: 429,
        error: 'Account Temporarily Locked',
        message: `Account is temporarily locked due to consecutive failed attempts. Retry in ${waitMinutes} minute(s).`,
      };
    }

    // Verify scrypt password
    const passwordMatch = await verifyScryptPassword(input.password, admin.passwordHash);
    if (!passwordMatch) {
      await adminRepository.recordFailedLogin(admin.id);
      return {
        success: false,
        statusCode: 401,
        error: 'Invalid Credentials',
        message: 'Invalid administrative credentials or TOTP authentication failed.',
      };
    }

    // Verify TOTP MFA (mandatory for ADMIN/SUPERADMIN)
    if (!admin.mfaSecretEncrypted || !admin.mfaSecretIv || !admin.mfaSecretTag) {
      return {
        success: false,
        statusCode: 403,
        error: 'MFA Not Configured',
        message: 'Administrative account lacks mandatory MFA setup. Re-run owner bootstrap CLI.',
      };
    }

    let totpSecretPlain: string;
    try {
      totpSecretPlain = decryptAes256Gcm(
        admin.mfaSecretEncrypted,
        admin.mfaSecretIv,
        admin.mfaSecretTag
      );
    } catch {
      return {
        success: false,
        statusCode: 500,
        error: 'Crypto Error',
        message: 'Failed to decrypt MFA secret with server key.',
      };
    }

    const totpResult = verifyTotpCode(totpSecretPlain, input.totpCode, {
      currentTimeMs: Date.now(),
      windowSteps: 1, // +/- 30s
      lastUsedCounter: admin.lastTotpCounter,
    });

    if (!totpResult.valid || totpResult.matchedCounter == null) {
      await adminRepository.recordFailedLogin(admin.id);
      return {
        success: false,
        statusCode: 401,
        error: 'Invalid Credentials',
        message: 'Invalid administrative credentials or TOTP authentication failed.',
      };
    }

    // Reset failed login attempts and record updated monotonic TOTP counter
    await adminRepository.recordSuccessfulLogin(admin.id, totpResult.matchedCounter);

    // Issue opaque session token and CSRF secret
    const rawSessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawSessionToken);
    const csrfSecret = generateCsrfToken();
    const sessionDurationMs = 8 * 60 * 60 * 1000; // 8 hours
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    // Mask IP for privacy before recording
    const maskedIp = input.ipAddress
      ? input.ipAddress.includes('.')
        ? input.ipAddress.split('.').slice(0, 2).join('.') + '.0.0'
        : input.ipAddress.slice(0, 8) + '::'
      : undefined;

    await adminRepository.createSession({
      userId: admin.id,
      sessionTokenHash: tokenHash,
      csrfSecret,
      ipAddressMasked: maskedIp,
      userAgent: input.userAgent,
      expiresAt,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Administrative authentication successful.',
      sessionToken: rawSessionToken,
      csrfToken: csrfSecret,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        mfaEnabled: admin.mfaEnabled,
      },
    };
  }

  /**
   * Validates session token and returns authenticated context.
   */
  async validateSession(rawSessionToken: string): Promise<AuthenticatedAdminContext | null> {
    if (!rawSessionToken || typeof rawSessionToken !== 'string') return null;

    const dbState = await checkDatabaseConnection();
    if (!dbState.connected) return null;

    const tokenHash = hashSessionToken(rawSessionToken);
    const session = await adminRepository.findActiveSession(tokenHash);

    if (!session || !session.user) return null;

    // Background update last active time
    adminRepository.touchSession(session.id).catch(() => {});

    return {
      user: session.user,
      session,
    };
  }

  /**
   * Revokes session by raw token.
   */
  async logout(rawSessionToken: string): Promise<boolean> {
    if (!rawSessionToken) return false;

    const dbState = await checkDatabaseConnection();
    if (!dbState.connected) return false;

    const tokenHash = hashSessionToken(rawSessionToken);
    const session = await adminRepository.findActiveSession(tokenHash);
    if (!session) return false;

    await adminRepository.revokeSession(session.id);
    return true;
  }
}

export const adminAuthService = new AdminAuthService();

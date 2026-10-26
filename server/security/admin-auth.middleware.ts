/**
 * Express Middleware for Owner / Admin Session Authentication & CSRF
 * Single-Owner E-Commerce Security Guard
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuthService, AuthenticatedAdminContext } from '../services/admin-auth.service';
import { Role } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      adminContext?: AuthenticatedAdminContext;
    }
  }
}

/**
 * Extracts session token from cookie header or Authorization Bearer header.
 */
export function extractSessionToken(req: Request): { token: string | null; isCookie: boolean } {
  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), isCookie: false };
  }

  // 2. Check Cookie header for 'ps_admin_session'
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('ps_admin_session=')) {
        const val = cookie.substring('ps_admin_session='.length);
        return { token: decodeURIComponent(val), isCookie: true };
      }
    }
  }

  return { token: null, isCookie: false };
}

/**
 * Validates admin session and enforces CSRF protection on state-modifying requests.
 */
export async function authenticateAdminSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { token, isCookie } = extractSessionToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Administrative session token is missing. Please log in.',
    });
    return;
  }

  const context = await adminAuthService.validateSession(token);
  if (!context) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Administrative session has expired, been revoked, or is invalid.',
    });
    return;
  }

  // CSRF Defense for cookie-based state mutations (POST, PUT, PATCH, DELETE)
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (isCookie && isMutation) {
    const headerCsrf = req.headers['x-csrf-token'];
    const origin = req.headers.origin || req.headers.referer;

    // Reject if CSRF header does not match session secret
    if (!headerCsrf || headerCsrf !== context.session.csrfSecret) {
      res.status(403).json({
        success: false,
        error: 'Forbidden (CSRF Mismatch)',
        message: 'State-modifying administrative request failed CSRF token verification.',
      });
      return;
    }
  }

  req.adminContext = context;
  next();
}

/**
 * Guard requiring SUPERADMIN role (Store Owner).
 */
export function requireOwnerRole(req: Request, res: Response, next: NextFunction): void {
  const context = req.adminContext;
  if (!context || !context.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.',
    });
    return;
  }

  if (context.user.role !== Role.SUPERADMIN) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Operation restricted strictly to the primary store owner.',
    });
    return;
  }

  next();
}

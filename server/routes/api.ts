/**
 * Express REST API v1 Routes
 * Personalised Indian E-Commerce Platform (Single-Owner Store)
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../db';
import { sanitizeString, validateItemCustomisation } from '../security';
import { openApiSpecification } from '../openapi';
import { FIXTURE_PRODUCTS, lookupPincode } from '../../shared/fixtures';
import { HealthStatusResponse } from '../../shared/types';
import { catalogService } from '../services/catalog.service';
import { quoteService } from '../services/quote.service';
import { getSecurityCapabilitiesReport } from '../auth-contract';
import { adminAuthService } from '../services/admin-auth.service';
import {
  authenticateAdminSession,
  requireOwnerRole,
  extractSessionToken,
} from '../security/admin-auth.middleware';

export const apiRouter = Router();

const startTime = Date.now();

// Helper to build truthful Phase 2B-1 health status payload
export async function buildHealthStatusPayload(): Promise<HealthStatusResponse> {
  const dbState = await checkDatabaseConnection();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  let isMfaOperational = false;

  if (dbState.connected) {
    const bootstrapStatus = await adminAuthService.getBootstrapStatus();
    isMfaOperational = bootstrapStatus.ownerBootstrapped;
  }

  return {
    status: dbState.connected ? 'ok' : 'degraded',
    version: '1.0.0-phase2b1',
    service: 'personalised-store-backend',
    environment: process.env.NODE_ENV || 'development',
    database: {
      configured: dbState.configured,
      provider: 'mysql',
      connected: dbState.connected,
      message: dbState.message,
      schemaStatus: dbState.schemaStatus,
      databaseUrlMasked: dbState.databaseUrlMasked,
      readiness: dbState.readiness,
    },
    storage: {
      driver: process.env.STORAGE_DRIVER || 'local',
      mode: 'temporary-preview',
      persistent: false,
      active: false,
      maxUploadMb: Number(process.env.STORAGE_MAX_UPLOAD_MB) || 15,
      message: 'In-browser local preview only. Persistent private image storage inactive until storage driver wired.',
    },
    security: {
      corsConfigured: true,
      rateLimitingEnabled: true,
      mfaRequiredByPolicy: process.env.ADMIN_MFA_ENFORCED !== 'false',
      mfaOperational: isMfaOperational,
      mfaEnforced: isMfaOperational,
    },
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  };
}

// GET /api/v1/health
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const payload = await buildHealthStatusPayload();
  res.status(200).json(payload);
});

// GET /api/v1/openapi.json
apiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpecification);
});

// GET /api/v1/auth/capabilities - Security & Operational Readiness Contract
apiRouter.get('/auth/capabilities', async (req: Request, res: Response) => {
  const dbState = await checkDatabaseConnection();
  const legacy = req.query.legacy === 'true';
  let isBootstrapped = false;

  if (dbState.connected) {
    const bs = await adminAuthService.getBootstrapStatus();
    isBootstrapped = bs.ownerBootstrapped;
  }

  res.json(
    getSecurityCapabilitiesReport({
      dbConnected: dbState.connected,
      ownerBootstrapped: isBootstrapped,
      legacyCompat: legacy,
    })
  );
});

// GET /api/v1/catalog/categories - MySQL Repository with Dev Fixture Fallback
apiRouter.get('/catalog/categories', async (_req: Request, res: Response) => {
  const result = await catalogService.getCategories();
  if (!result.success) {
    return res.status(result.statusCode).json(result);
  }
  res.json({
    success: true,
    count: result.data.count,
    categories: result.data.categories,
    dataSource: result.dataSource,
    isDevelopmentPreview: result.isDevelopmentPreview,
  });
});

// GET /api/v1/catalog/products - MySQL Repository with Dev Fixture Fallback
apiRouter.get('/catalog/products', async (req: Request, res: Response) => {
  const categorySlug = req.query.category as string | undefined;
  const search = req.query.q as string | undefined;
  const minPricePaisa = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPricePaisa = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  const sort = req.query.sort as any;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await catalogService.getProducts({
    categorySlug,
    search,
    minPricePaisa,
    maxPricePaisa,
    sort,
    page,
    limit,
  });

  if (!result.success) {
    return res.status(result.statusCode).json(result);
  }

  res.json({
    success: true,
    total: result.data.total,
    products: result.data.products,
    page: result.data.page,
    limit: result.data.limit,
    totalPages: result.data.totalPages,
    dataSource: result.dataSource,
    isDevelopmentPreview: result.isDevelopmentPreview,
  });
});

// GET /api/v1/catalog/products/:slug - MySQL Repository with Dev Fixture Fallback
apiRouter.get('/catalog/products/:slug', async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const result = await catalogService.getProductBySlug(slug);

  if (!result.success) {
    return res.status(result.statusCode).json(result);
  }

  res.json({
    success: true,
    product: result.data.product,
    dataSource: result.dataSource,
    isDevelopmentPreview: result.isDevelopmentPreview,
  });
});

// GET /api/v1/templates/:productId - MySQL Repository with Dev Fixture Fallback
apiRouter.get('/templates/:productId', async (req: Request, res: Response) => {
  const productId = req.params.productId;
  const result = await catalogService.getTemplateByProductId(productId);

  if (!result.success) {
    return res.status(result.statusCode).json(result);
  }

  res.json({
    success: true,
    template: result.data.template,
    dataSource: result.dataSource,
    isDevelopmentPreview: result.isDevelopmentPreview,
  });
});

// GET /api/v1/pincode/:code
apiRouter.get('/pincode/:code', (req: Request, res: Response) => {
  const code = sanitizeString(req.params.code, 6);
  const info = lookupPincode(code);

  res.json({
    success: true,
    pincodeInfo: info,
  });
});

// POST /api/v1/quote - Authoritative Server Calculation (Price-Tampering Protection)
apiRouter.post('/quote', async (req: Request, res: Response) => {
  const result = await quoteService.calculateQuote(req.body);

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  res.json({
    success: true,
    quote: result.quote,
    dataSource: result.dataSource,
  });
});

// POST /api/v1/checkout/create-order - Protected Gate (Phase 1 Database Warning)
apiRouter.post('/checkout/create-order', async (req: Request, res: Response) => {
  const { items } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Payload',
      message: 'Order creation requires a non-empty items array.',
    });
  }

  for (const item of items) {
    const product = FIXTURE_PRODUCTS.find((p) => p.id === item.productId || p.slug === item.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product Not Found',
        message: `Product '${item.productId}' was not found.`,
      });
    }
    if (product.isPersonalised) {
      const validation = validateItemCustomisation(product, item.customisationValues || []);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Incomplete Customisation',
          message: `Product '${product.title}' has unsatisfied required customisation slots: ${validation.missingSlots.join(', ')}.`,
          fieldErrors: validation.fieldErrors,
        });
      }
    }
  }

  const dbState = await checkDatabaseConnection();

  if (!dbState.connected) {
    return res.status(503).json({
      success: false,
      error: 'Database Unconnected',
      message:
        'Live order persistence requires a connected MySQL 8 instance. The platform is currently operating in Phase 1 Architecture Preview mode. Please connect DATABASE_URL to enable live transactions.',
      statusDetails: dbState,
    });
  }

  res.status(501).json({
    success: false,
    message: 'Order creation endpoint ready for MySQL transaction pipeline in Phase 2.',
  });
});

// ============================================================================
// ADMINISTRATIVE & OWNER SECURITY ROUTES (Phase 2B-1)
// ============================================================================

// GET /api/v1/admin/bootstrap-status
apiRouter.get('/admin/bootstrap-status', async (_req: Request, res: Response) => {
  const status = await adminAuthService.getBootstrapStatus();
  res.json({ success: true, ...status });
});

// POST /api/v1/admin/login - Authenticated Staff Gate with Scrypt & TOTP
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  const { email, identifier, password, totpCode, mfaCode } = req.body || {};
  const id = (identifier || email || '').trim();
  const code = (totpCode || mfaCode || '').trim();
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'];

  const result = await adminAuthService.login({
    identifier: id,
    password: password || '',
    totpCode: code,
    ipAddress: ip,
    userAgent,
  });

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error,
      message: result.message,
    });
  }

  // Set secure cookie for browser sessions
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `ps_admin_session=${encodeURIComponent(result.sessionToken!)}; Path=/api/v1/admin; HttpOnly; SameSite=Strict; Max-Age=28800${isProd ? '; Secure' : ''}`
  );

  res.status(200).json({
    success: true,
    message: result.message,
    sessionToken: result.sessionToken,
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt,
    user: result.user,
  });
});

// POST /api/v1/admin/logout
apiRouter.post('/admin/logout', async (req: Request, res: Response) => {
  const { token } = extractSessionToken(req);
  if (token) {
    await adminAuthService.logout(token);
  }
  res.setHeader('Set-Cookie', 'ps_admin_session=; Path=/api/v1/admin; HttpOnly; SameSite=Strict; Max-Age=0');
  res.status(200).json({
    success: true,
    message: 'Successfully logged out.',
  });
});

// GET /api/v1/admin/me - Authenticated Admin Context
apiRouter.get('/admin/me', authenticateAdminSession, async (req: Request, res: Response) => {
  const context = req.adminContext!;
  res.json({
    success: true,
    user: {
      id: context.user.id,
      email: context.user.email,
      fullName: context.user.fullName,
      role: context.user.role,
      mfaEnabled: context.user.mfaEnabled,
      lastLoginAt: context.user.lastLoginAt,
    },
    session: {
      id: context.session.id,
      expiresAt: context.session.expiresAt,
      createdAt: context.session.createdAt,
    },
    csrfToken: context.session.csrfSecret,
  });
});

// GET /api/v1/admin/metrics - Protected Admin Metrics (SUPERADMIN/ADMIN only)
apiRouter.get('/admin/metrics', authenticateAdminSession, requireOwnerRole, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    metrics: {
      totalOrders: 0,
      revenuePaisa: 0,
      currency: 'INR',
      activeSessions: 1,
      systemStatus: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

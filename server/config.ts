/**
 * Server Configuration & Environment Variable Validator
 * Validates MySQL and security configurations safely without exposing credentials.
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  database: {
    rawUrl: string;
    isConfigured: boolean;
    maskedUrl: string;
    connectTimeoutMs: number;
  };
  storage: {
    driver: string;
    maxUploadMb: number;
  };
  security: {
    adminMfaRequired: boolean;
    corsOrigin: string;
    rateLimitMaxPerMin: number;
  };
}

export function maskDatabaseUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'NOT_CONFIGURED';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '********';
    }
    return parsed.toString();
  } catch {
    return 'MALFORMED_URL';
  }
}

export function validateDatabaseUrl(url: string): { isValid: boolean; reason?: string } {
  if (!url) {
    return { isValid: false, reason: 'DATABASE_URL is not set' };
  }
  if (!url.startsWith('mysql://')) {
    return { isValid: false, reason: 'DATABASE_URL must use mysql:// protocol for MySQL 8' };
  }
  // Check placeholder or sample password
  if (url.includes('secure_password_here') || url.includes('placeholder')) {
    return { isValid: false, reason: 'DATABASE_URL contains placeholder credentials' };
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      return { isValid: false, reason: 'DATABASE_URL missing hostname' };
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, reason: `Malformed DATABASE_URL: ${err?.message || 'invalid format'}` };
  }
}

export function loadConfig(): AppConfig {
  const env = (process.env.NODE_ENV as AppConfig['env']) || 'development';
  const rawDbUrl = process.env.DATABASE_URL || '';
  const validation = validateDatabaseUrl(rawDbUrl);

  return {
    env,
    port: Number(process.env.PORT) || 3000,
    database: {
      rawUrl: rawDbUrl,
      isConfigured: validation.isValid,
      maskedUrl: maskDatabaseUrl(rawDbUrl),
      connectTimeoutMs: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS) || 3000,
    },
    storage: {
      driver: process.env.STORAGE_DRIVER || 'local',
      maxUploadMb: Number(process.env.STORAGE_MAX_UPLOAD_MB) || 15,
    },
    security: {
      adminMfaRequired: process.env.ADMIN_MFA_ENFORCED !== 'false',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      rateLimitMaxPerMin: Number(process.env.RATE_LIMIT_MAX_PER_MIN) || 120,
    },
  };
}

export const config = loadConfig();

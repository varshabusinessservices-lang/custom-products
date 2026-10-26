/**
/**
 * Cryptographic Foundation for Single-Owner E-Commerce Platform
 * Node.js 22 Built-in Crypto Engine (Zero External Dependencies)
 * 
 * Features:
 * 1. Scrypt Password Hashing & Constant-Time Verification
 *    - Memory tuned for shared hosting constraints (N=16384, r=8, p=1, maxmem=32MB)
 *    - Timing-safe dummy verification to eliminate user-enumeration side-channels
 * 2. RFC 6238 Time-Based One-Time Password (TOTP)
 *    - Base32 encoding/decoding without npm packages
 *    - HMAC-SHA1 30-second window with +/- 1 clock skew tolerance
 *    - Replay-attack protection via monotonic counter tracking
 * 3. AES-256-GCM Secret Encryption at Rest
 *    - Encrypts TOTP secrets before database persistence
 * 4. High-Entropy Session & CSRF Token Management
 *    - 32-byte opaque session tokens hashed with SHA-256 in database
 */

import crypto from 'crypto';

// ============================================================================
// 1. PASSWORD SECURITY (scrypt + constant-time comparison)
// ============================================================================

/**
 * Shared Hosting Scrypt Parameters:
 * N = 16384 (2^14): Provides strong ASIC/GPU resistance (~16MB RAM per hash).
 * r = 8: Standard block size.
 * p = 1: Single execution thread to prevent CPU thread starvation on shared hosting.
 * maxmem = 32MB: Safe bound well within shared hosting container limits (256MB-512MB).
 * keyLen = 64 bytes: 512-bit derived output key.
 * saltLen = 32 bytes: Cryptographically secure random salt.
 */
export const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
  keyLen: 64,
  saltLen: 32,
} as const;

export interface ScryptHashResult {
  hashString: string; // Stored format: $scrypt$ln=14,r=8,p=1$<salt_hex>$<derived_key_hex>
}

/**
 * Derives a salted scrypt hash string asynchronously using Node.js built-in crypto.
 */
export async function scryptHashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be a non-empty string with at least 8 characters.');
  }

  const salt = crypto.randomBytes(SCRYPT_CONFIG.saltLen);

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_CONFIG.keyLen,
      {
        cost: SCRYPT_CONFIG.N,
        blockSize: SCRYPT_CONFIG.r,
        parallelization: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      },
      (err, derived) => {
        if (err) return reject(err);
        resolve(derived);
      }
    );
  });

  return `$scrypt$ln=14,r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies password against stored $scrypt$ formatted string using constant-time comparison.
 */
export async function verifyScryptPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  // Format: ['', 'scrypt', 'ln=14,r=8,p=1', '<salt>', '<key>']
  if (parts.length !== 5 || parts[1] !== 'scrypt') {
    return false;
  }

  const saltHex = parts[3];
  const storedKeyHex = parts[4];
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(storedKeyHex, 'hex');

  if (salt.length !== SCRYPT_CONFIG.saltLen || storedKey.length !== SCRYPT_CONFIG.keyLen) {
    return false;
  }

  try {
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        SCRYPT_CONFIG.keyLen,
        {
          cost: SCRYPT_CONFIG.N,
          blockSize: SCRYPT_CONFIG.r,
          parallelization: SCRYPT_CONFIG.p,
          maxmem: SCRYPT_CONFIG.maxmem,
        },
        (err, derived) => {
          if (err) return reject(err);
          resolve(derived);
        }
      );
    });

    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Executes a dummy scrypt verification with identical cost parameters to prevent
 * username/email timing enumeration when an account does not exist.
 */
export async function timingSafeDummyVerification(password: string): Promise<void> {
  const dummySalt = Buffer.alloc(SCRYPT_CONFIG.saltLen, 0xaa);
  await new Promise<void>((resolve) => {
    crypto.scrypt(
      password || 'dummy-password-string',
      dummySalt,
      SCRYPT_CONFIG.keyLen,
      {
        cost: SCRYPT_CONFIG.N,
        blockSize: SCRYPT_CONFIG.r,
        parallelization: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      },
      () => resolve()
    );
  });
}

// ============================================================================
// 2. RFC 6238 TOTP (Base32, HMAC-SHA1, 30s Window, Replay Prevention)
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 4648 Base32 string (unpadded).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string to a Buffer.
 */
export function base32Decode(base32Str: string): Buffer {
  const cleanStr = base32Str.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base32 character encountered: '${char}'`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a 20-byte (160-bit) cryptographically secure random Base32 TOTP secret.
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Calculates RFC 6238 TOTP 6-digit code for a specific counter step.
 */
export function generateTotpCodeForCounter(secretBase32: string, counter: bigint): string {
  const key = base32Decode(secretBase32);

  // Big-endian 8-byte buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter, 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

  // Dynamic truncation (RFC 4226 section 5.4)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code with clock skew tolerance (+/- 1 step = 30 seconds)
 * and enforces replay protection against previous counters.
 */
export function verifyTotpCode(
  secretBase32: string,
  userCode: string,
  options: {
    currentTimeMs?: number;
    windowSteps?: number;
    lastUsedCounter?: bigint | null;
  } = {}
): { valid: boolean; matchedCounter?: bigint; reason?: string } {
  if (!userCode || !/^\d{6}$/.test(userCode.trim())) {
    return { valid: false, reason: 'TOTP code must be exactly 6 digits.' };
  }

  const cleanCode = userCode.trim();
  const timeMs = options.currentTimeMs ?? Date.now();
  const windowSteps = options.windowSteps ?? 1; // +/- 1 step (30s past and future)
  const currentCounter = BigInt(Math.floor(timeMs / 1000 / 30));
  const lastUsed = options.lastUsedCounter != null ? BigInt(options.lastUsedCounter) : null;

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidateCounter = currentCounter + BigInt(offset);

    // Replay attack defense: Counter cannot be <= the last successfully verified counter
    if (lastUsed !== null && candidateCounter <= lastUsed) {
      continue;
    }

    try {
      const expectedCode = generateTotpCodeForCounter(secretBase32, candidateCounter);
      // Constant-time comparison for TOTP string
      const bufA = Buffer.from(cleanCode);
      const bufB = Buffer.from(expectedCode);

      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { valid: true, matchedCounter: candidateCounter };
      }
    } catch (err: any) {
      return { valid: false, reason: err.message };
    }
  }

  return { valid: false, reason: 'Invalid TOTP code or expired token.' };
}

/**
 * Builds standard otpauth:// URI for authenticator applications (Google Authenticator, Aegis, Bitwarden).
 */
export function buildOtpAuthUri(accountName: string, issuer: string, secretBase32: string): string {
  const encAccount = encodeURIComponent(accountName);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ============================================================================
// 3. AES-256-GCM ENCRYPTION AT REST (TOTP Secrets)
// ============================================================================

/**
 * Derives a 32-byte AES-256 key from server environment secret.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_SECRET || process.env.SESSION_SECRET || 'personalised-store-shared-hosting-aes256-fallback';
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedData {
  encryptedHex: string;
  ivHex: string;
  tagHex: string;
}

/**
 * Encrypts sensitive string using AES-256-GCM.
 */
export function encryptAes256Gcm(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encryptedHex: encrypted,
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex'),
  };
}

/**
 * Decrypts AES-256-GCM encrypted payload, verifying authentication tag.
 */
export function decryptAes256Gcm(encryptedHex: string, ivHex: string, tagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============================================================================
// 4. SESSION & CSRF TOKEN HELPERS
// ============================================================================

/**
 * Generates an opaque, high-entropy 32-byte session token (64 hex characters).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a SHA-256 digest of the session token for database storage.
 * The raw token is stored only in the user's browser cookie.
 */
export function hashSessionToken(sessionToken: string): string {
  return crypto.createHash('sha256').update(sessionToken).digest('hex');
}

/**
 * Generates a CSRF prevention secret token (32 hex characters).
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

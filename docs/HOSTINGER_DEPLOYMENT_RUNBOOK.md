# Hostinger Node.js 22 & MariaDB 10+ Production Deployment Runbook

**Platform:** Commercial Indian Personalised Products E-Commerce Platform  
**Target Architecture:** Single-Owner Store on Node.js 22 + MariaDB 10+ / MySQL 8.0+  
**ORM:** Prisma 6.19.3 with `mysql` datasource provider  
**Zero-Vendor-Lock:** Runs on Hostinger Business / Cloud Shared Hosting, VPS, or any standard Linux Node.js environment.

---

## 1. MariaDB 10+ & MySQL 8 Compatibility Audit

Hostinger's shared web database service utilizes **MariaDB 10.3+ / 10.5+ / 10.11+ LTS**. Prisma's `mysql` provider fully supports MariaDB.

| Database Feature | MySQL 8.0 Implementation | Hostinger MariaDB Implementation | Compatibility Status |
| :--- | :--- | :--- | :--- |
| **Provider** | `provider = "mysql"` | `provider = "mysql"` | **100% Compatible** |
| **Collation & Charset** | `utf8mb4_unicode_ci` | `utf8mb4_unicode_ci` | **100% Compatible** |
| **Unique Indexes** | `VARCHAR(191)` | `VARCHAR(191)` (fits 767B limit) | **100% Compatible** |
| **JSON Columns** | Native Binary `JSON` | Native alias to `LONGTEXT` with `JSON_VALID()` | **100% Transparent** (Prisma handles serialisation) |
| **Monotonic TOTP Counters** | `BIGINT` | `BIGINT` | **100% Compatible** |
| **Precision Timestamps** | `DATETIME(3)` | `DATETIME(3)` | **100% Compatible** |
| **Foreign Key Cascades** | `ON DELETE CASCADE` | `ON DELETE CASCADE` (InnoDB) | **100% Compatible** |

> **Audit Conclusion:** All models and migrations in `prisma/schema.prisma` and `prisma/migrations/` use standard ANSI SQL and InnoDB constructs without MySQL 8-only proprietary dialect extensions. The schema is 100% production-ready for Hostinger MariaDB databases.

---

## 2. Resource & Memory Bounds for Shared Hosting

Hostinger shared hosting plans enforce container memory boundaries (typically 256 MB to 512 MB RAM per account). To guarantee platform stability and prevent Out-Of-Memory (OOM) process termination:

### A. Scrypt Password Hashing Tuning
Our cryptographic engine (`server/security/crypto.ts`) tunes Node.js's native `crypto.scrypt` with bounded memory:
```typescript
export const SCRYPT_CONFIG = {
  N: 16384,             // 2^14 cost factor (~16 MB peak RAM per hash)
  r: 8,                 // Standard 1024-byte block size
  p: 1,                 // Single execution thread (avoids CPU starvation)
  maxmem: 32 * 1024 * 1024, // 32 MB hard ceiling (safe for shared containers)
  keyLen: 64,           // 512-bit output key
  saltLen: 32,          // 256-bit cryptographically secure random salt
};
```
*Rationale:* Provides strong resistance against GPU brute-forcing while remaining strictly under the 32 MB per-operation ceiling.

### B. Database Connection Pool Limits
Shared MariaDB servers set `max_connections` per user (often 15–30 connections). In `.env.production`, configure `connection_limit=5`:
```
DATABASE_URL="mysql://u123456789_store:StrongSecretPass@127.0.0.1:3306/u123456789_storedb?connection_limit=5&connect_timeout=10&pool_timeout=10"
```

---

## 3. Hostinger Deployment Step-by-Step

### Step 1: Create Database in Hostinger hPanel
1. Log in to **Hostinger hPanel** → **Databases** → **Management**.
2. Create a new database:
   - **Database Name:** `u123456789_storedb`
   - **Username:** `u123456789_storeuser`
   - **Password:** Generate a 24+ character password.
3. Note the host (usually `localhost` or `127.0.0.1`).

### Step 2: Configure Node.js Application in hPanel
1. Navigate to **Advanced** → **Node.js**.
2. Click **Create Application**:
   - **Node.js Version:** `22.x` (or latest 20.x/22.x LTS supported on your plan).
   - **Application Mode:** `Production`.
   - **Application Root:** `domains/yourdomain.com/public_html` (or dedicated subfolder).
   - **Application Startup File:** `server.ts` (or `dist/server.js`).
3. Save the application.

### Step 3: Configure Environment Variables
Create or upload `.env.production` (do NOT commit to git):
```env
NODE_ENV=production
PORT=3000

# MariaDB / MySQL 8 Connection
DATABASE_URL="mysql://u123456789_storeuser:YOUR_SECRET_PASSWORD@127.0.0.1:3306/u123456789_storedb?connection_limit=5&connect_timeout=10"

# Application Security Keys (Generate with `openssl rand -hex 32`)
MFA_ENCRYPTION_SECRET=d8a4f91b72e38c050a4b7f921d3e8f4c2e6b0a1c3d5e7f9a2b4c6e8f0a2d4e6
SESSION_SECRET=c7e3a1f94b8d2e0a5c7f8b9d1e3a5c7f9a2b4c6e8f0a2d4e6b8c0e2f4a6b8d0

# CORS & Domain Settings
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
STORAGE_DRIVER=local
STORAGE_MAX_UPLOAD_MB=15
ADMIN_MFA_ENFORCED=true
```

### Step 4: Run Build & Migrations via SSH
Connect to your Hostinger SSH terminal:
```bash
# 1. Navigate to your app directory
cd domains/yourdomain.com/public_html

# 2. Install production dependencies
npm install --omit=dev

# 3. Generate Prisma client & build frontend
npm run build

# 4. Deploy schema migrations (CRITICAL: Never run prisma db push in production)
npm run migrate:deploy
```

> **Why `npx prisma migrate deploy` instead of `prisma db push`?**
> `prisma db push` bypasses migration files and can silently drop tables or columns if schemas drift. `npx prisma migrate deploy` only executes versioned, audited SQL files recorded in `prisma/migrations/`, checking the `_prisma_migrations` tracking table atomically.

---

## 4. One-Time Owner Bootstrap

Run the single-owner bootstrap CLI script via SSH:
```bash
npm run owner:bootstrap
```

The CLI wizard will:
1. Verify live MariaDB connectivity (`checkDatabaseConnection()`).
2. Verify that NO owner currently exists (`adminRepository.getOwnerCount() === 0`).
3. Prompt for Store Owner Email, Name, and Password (min 12 characters).
4. Generate an RFC 6238 Base32 secret and output the `otpauth://` URI.
5. **Require you to input the first 6-digit code from Google Authenticator / Bitwarden.**
6. Hash the password with `scrypt`, encrypt the TOTP secret with `AES-256-GCM`, and persist the owner atomically.

---

## 5. Verification & Health Monitoring

Verify the production deployment by testing the health endpoint:
```bash
curl -s http://localhost:3000/api/v1/health | jq
```
Expected output:
```json
{
  "status": "ok",
  "version": "1.0.0-phase2b1",
  "service": "personalised-store-backend",
  "environment": "production",
  "database": {
    "configured": true,
    "provider": "mysql",
    "connected": true,
    "schemaStatus": "applied",
    "readiness": "ready"
  },
  "security": {
    "mfaRequiredByPolicy": true,
    "mfaOperational": true,
    "mfaEnforced": true
  }
}
```

---

## 6. Security Hygiene & Graceful Shutdown

- **Secret Masking:** Database credentials and connection passwords are automatically masked with `********` across all logs, error reports, and health endpoints via `maskDatabaseUrl()`.
- **Session Cookie Flags:** Admin session cookies (`ps_admin_session`) use `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/admin`.
- **CSRF Defense:** Mutation endpoints verify `x-csrf-token` header against the cryptographically generated `csrfSecret` in the session.
- **Graceful Shutdown:** `SIGTERM` and `SIGINT` triggers `prismaClient.$disconnect()`, releasing pooled MariaDB connections back to the shared server.

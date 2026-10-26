# Database Operations, Migration & Backup Runbook
## Single-Owner Personalised Products E-Commerce Platform (MySQL 8 + Prisma)

This runbook documents production database administration, schema migrations, backup strategies, rollback protocols, and fixture-to-production catalog import procedures.

---

### 1. Database Architecture & Provisioning Contract

- **Database Engine**: MySQL 8.0+ (InnoDB storage engine, `utf8mb4` character set, `utf8mb4_unicode_ci` collation).
- **Hosting Model**: Independent VPS, dedicated server, or standard managed MySQL hosting.
- **ORM / Migrations**: Prisma 6 (`prisma/schema.prisma` and `prisma/migrations/`).
- **Connection Environment**:
  ```bash
  DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<database>?connect_timeout=10&sslaccept=strict"
  DATABASE_CONNECT_TIMEOUT_MS=5000
  ```
- **Security Invariant**: Never commit credentials to version control. Passwords must remain masked in all diagnostic APIs and application logs.

---

### 2. Schema Migration Protocol

#### Deploying Migrations to Live MySQL
When applying new migrations to an existing production database:
```bash
# 1. Verify connection string is configured
echo $DATABASE_URL

# 2. Deploy all pending migration files atomically
npx prisma migrate deploy

# 3. Verify status
npx prisma migrate status
```

#### Creating New Incremental Migrations (Development Only)
- Never modify or delete previously applied migrations (`prisma/migrations/0_init`).
- Only create forward additive migrations:
```bash
npx prisma migrate dev --name <migration_name> --create-only
```

---

### 3. Backup & Disaster Recovery Strategy

#### Daily Automated Logical Backup
Run scheduled backups prior to executing any schema migration:
```bash
# Generate timestamped compressed logical dump
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mysqldump -u ${DB_USER} -p${DB_PASSWORD} -h ${DB_HOST} \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  ${DB_NAME} | gzip > /backups/db_backup_${TIMESTAMP}.sql.gz
```

#### Verification of Backup Integrity
Test restore monthly in an isolated staging environment:
```bash
gunzip -c /backups/db_backup_${TIMESTAMP}.sql.gz | mysql -u test_user -p test_db
```

---

### 4. Rollback Plan

If a schema migration or deployment fails:
1. **Immediate Stop**: Halt web server processes (`npm stop` or systemd service halt) to prevent partial data writes.
2. **Point-In-Time Restoration**: Restore the pre-migration logical backup:
   ```bash
   gunzip -c /backups/db_backup_pre_migration.sql.gz | mysql -u ${DB_USER} -p${DB_PASSWORD} -h ${DB_HOST} ${DB_NAME}
   ```
3. **Prisma Migration Table Sync**: If migration was partially registered:
   ```bash
   npx prisma migrate resolve --rolled-back "<failed_migration_name>"
   ```
4. **Service Health Recheck**: Execute `GET /api/v1/health` and verify `database.connected: true` and `database.schemaStatus: 'applied'`.

---

### 5. Fixture-to-Production Catalog Import

To populate an empty production MySQL database with the initial catalog taxonomy:
```bash
# Execute idempotent catalog import script
npx tsx scripts/seed-catalog.ts
```
The script performs idempotent transactional upserts for:
- 6 Categories (Photo Frames, Photo Mugs, Cushions, Calendars, Keychains, Wall Art)
- Products with specifications, images, variants, and customisation templates
- Customisation slots with validation constraints

---

### 6. Health & Diagnostic Truthfulness

The application reports real status via `GET /api/v1/health`:
- `database.configured`: `false` if `DATABASE_URL` is empty or using placeholder format.
- `database.connected`: `false` until `SELECT 1` returns successfully.
- `database.schemaStatus`: `'unconnected'` when no live database is present.
- `database.readiness`: `'ready'` when connected, `'degraded_preview'` in development preview, `'unavailable'` in production.
- `storage.mode`: `'temporary-preview'` (in-browser only).
- `security.mfaOperational`: `false` (until TOTP engine is configured).

-- Migration: Additive Phase 2B-1 Admin Authentication and Sessions
-- Target: MariaDB 10.3+ / MySQL 8.0+
-- Run with: npx prisma migrate deploy

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `mfaSecretEncrypted` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `mfaSecretIv` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `mfaSecretTag` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `lastTotpCounter` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `failedLoginAttempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `lockedUntil` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `lastLoginAt` DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `sessionTokenHash` VARCHAR(64) NOT NULL UNIQUE,
  `ipAddressMasked` VARCHAR(45) NULL,
  `userAgent` VARCHAR(255) NULL,
  `csrfSecret` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_admin_sessions_user` (`userId`),
  INDEX `idx_admin_sessions_token_hash` (`sessionTokenHash`),
  INDEX `idx_admin_sessions_expires` (`expiresAt`),
  CONSTRAINT `fk_admin_sessions_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

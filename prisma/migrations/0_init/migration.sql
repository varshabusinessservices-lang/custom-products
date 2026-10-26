-- Migration 0_init: MySQL 8 Initial Schema for Single-Owner Personalised Products E-Commerce
-- Target: MySQL 8.0+
-- Run with: npx prisma migrate deploy (or mysql -u root -p personalised_store_db < migration.sql)

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(191) NULL UNIQUE,
  `phone` VARCHAR(20) NULL UNIQUE,
  `passwordHash` VARCHAR(255) NULL,
  `fullName` VARCHAR(100) NOT NULL,
  `role` ENUM('CUSTOMER', 'ADMIN', 'STAFF', 'SUPERADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `isVerified` BOOLEAN NOT NULL DEFAULT FALSE,
  `mfaSecret` VARCHAR(128) NULL,
  `mfaEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_addresses` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `recipientName` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `streetAddress` VARCHAR(255) NOT NULL,
  `landmark` VARCHAR(100) NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `postalCode` VARCHAR(10) NOT NULL,
  `addressType` VARCHAR(20) NOT NULL DEFAULT 'HOME',
  `isDefault` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_addresses_user` (`userId`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_role_permissions` (
  `id` VARCHAR(36) NOT NULL,
  `role` ENUM('CUSTOMER', 'ADMIN', 'STAFF', 'SUPERADMIN') NOT NULL,
  `permissionKey` VARCHAR(100) NOT NULL,
  `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role`, `permissionKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `shortDescription` VARCHAR(255) NULL,
  `iconUrl` VARCHAR(255) NULL,
  `bannerUrl` VARCHAR(255) NULL,
  `displayOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `parentId` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_category_slug` (`slug`),
  INDEX `idx_category_order` (`displayOrder`),
  CONSTRAINT `fk_category_parent` FOREIGN KEY (`parentId`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(36) NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  `shortSummary` VARCHAR(500) NOT NULL,
  `description` TEXT NOT NULL,
  `categoryId` VARCHAR(36) NOT NULL,
  `basePricePaisa` INT NOT NULL,
  `originalMspPaisa` INT NOT NULL,
  `isPersonalised` BOOLEAN NOT NULL DEFAULT TRUE,
  `leadTimeDays` INT NOT NULL DEFAULT 2,
  `minDeliveryDays` INT NOT NULL DEFAULT 3,
  `maxDeliveryDays` INT NOT NULL DEFAULT 5,
  `ratingAverage` DOUBLE NOT NULL DEFAULT 4.8,
  `ratingCount` INT NOT NULL DEFAULT 0,
  `stockStatus` VARCHAR(30) NOT NULL DEFAULT 'IN_STOCK',
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `isFeatured` BOOLEAN NOT NULL DEFAULT FALSE,
  `isBestseller` BOOLEAN NOT NULL DEFAULT FALSE,
  `isTrending` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_product_category` (`categoryId`),
  INDEX `idx_product_slug` (`slug`),
  INDEX `idx_product_active` (`isActive`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_images` (
  `id` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `imageUrl` VARCHAR(500) NOT NULL,
  `altText` VARCHAR(255) NOT NULL,
  `displayOrder` INT NOT NULL DEFAULT 0,
  `isPrimary` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_img_product` (`productId`),
  CONSTRAINT `fk_img_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `sku` VARCHAR(60) NOT NULL UNIQUE,
  `title` VARCHAR(100) NOT NULL,
  `attributeType` VARCHAR(50) NOT NULL,
  `attributeValue` VARCHAR(50) NOT NULL,
  `additionalPaisa` INT NOT NULL DEFAULT 0,
  `stockQuantity` INT NOT NULL DEFAULT 100,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_variant_product` (`productId`),
  CONSTRAINT `fk_variant_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customisation_templates` (
  `id` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `templateKey` VARCHAR(60) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) NULL,
  `previewBaseImageUrl` VARCHAR(500) NOT NULL,
  `overlayConfigJson` TEXT NULL,
  `schemaVersion` INT NOT NULL DEFAULT 1,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_template_product` (`productId`),
  CONSTRAINT `fk_template_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customisation_slots` (
  `id` VARCHAR(36) NOT NULL,
  `templateId` VARCHAR(36) NOT NULL,
  `slotKey` VARCHAR(50) NOT NULL,
  `slotType` ENUM('TEXT', 'PHOTO', 'DATE', 'SELECT', 'COLOR') NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `placeholder` VARCHAR(100) NULL,
  `required` BOOLEAN NOT NULL DEFAULT TRUE,
  `maxLength` INT NULL,
  `optionsJson` TEXT NULL,
  `helpText` VARCHAR(255) NULL,
  `allowedMimesJson` VARCHAR(255) NULL,
  `maxFileSizeMb` INT NULL DEFAULT 15,
  `aspectRatio` VARCHAR(20) NULL,
  `positionConfigJson` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_slot_template` (`templateId`),
  CONSTRAINT `fk_slot_template` FOREIGN KEY (`templateId`) REFERENCES `customisation_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `carts` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NULL,
  `guestToken` VARCHAR(100) NULL UNIQUE,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_cart_user` (`userId`),
  INDEX `idx_cart_guest` (`guestToken`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` VARCHAR(36) NOT NULL,
  `cartId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `variantId` VARCHAR(36) NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unitBasePaisa` INT NOT NULL,
  `unitCustomisationPaisa` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_item_cart` (`cartId`),
  CONSTRAINT `fk_cart_item_cart` FOREIGN KEY (`cartId`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_item_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_cart_item_variant` FOREIGN KEY (`variantId`) REFERENCES `product_variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(36) NOT NULL,
  `orderNumber` VARCHAR(30) NOT NULL UNIQUE,
  `customerId` VARCHAR(36) NULL,
  `guestEmail` VARCHAR(191) NULL,
  `guestPhone` VARCHAR(20) NULL,
  `addressSnapshotJson` TEXT NOT NULL,
  `subtotalPaisa` INT NOT NULL,
  `discountPaisa` INT NOT NULL DEFAULT 0,
  `deliveryFeePaisa` INT NOT NULL DEFAULT 0,
  `taxPaisa` INT NOT NULL DEFAULT 0,
  `totalAmountPaisa` INT NOT NULL,
  `currency` VARCHAR(5) NOT NULL DEFAULT 'INR',
  `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PROCESSING_CUSTOMISATION', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `paymentStatus` ENUM('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `notes` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_order_number` (`orderNumber`),
  INDEX `idx_order_customer` (`customerId`),
  INDEX `idx_order_status` (`status`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customerId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(36) NOT NULL,
  `orderId` VARCHAR(36) NOT NULL,
  `productId` VARCHAR(36) NOT NULL,
  `variantId` VARCHAR(36) NULL,
  `productTitleSnapshot` VARCHAR(200) NOT NULL,
  `skuSnapshot` VARCHAR(60) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unitBasePaisa` INT NOT NULL,
  `unitCustomisationPaisa` INT NOT NULL DEFAULT 0,
  `totalLinePaisa` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_order_item_order` (`orderId`),
  CONSTRAINT `fk_order_item_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_item_prod` FOREIGN KEY (`productId`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_order_item_var` FOREIGN KEY (`variantId`) REFERENCES `product_variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customisation_values` (
  `id` VARCHAR(36) NOT NULL,
  `cartItemId` VARCHAR(36) NULL,
  `orderItemId` VARCHAR(36) NULL,
  `slotId` VARCHAR(36) NOT NULL,
  `textValue` TEXT NULL,
  `imageStorageKey` VARCHAR(255) NULL,
  `privateStorageUrl` VARCHAR(500) NULL,
  `originalFileName` VARCHAR(255) NULL,
  `fileSizeBytes` INT NULL,
  `previewCoordinatesJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_cval_cart` (`cartItemId`),
  INDEX `idx_cval_order` (`orderItemId`),
  INDEX `idx_cval_slot` (`slotId`),
  CONSTRAINT `fk_cval_cart` FOREIGN KEY (`cartItemId`) REFERENCES `cart_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cval_order` FOREIGN KEY (`orderItemId`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cval_slot` FOREIGN KEY (`slotId`) REFERENCES `customisation_slots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `description` VARCHAR(255) NOT NULL,
  `discountType` ENUM('PERCENTAGE', 'FLAT_AMOUNT') NOT NULL,
  `discountValue` INT NOT NULL,
  `minOrderPaisa` INT NOT NULL DEFAULT 0,
  `maxDiscountPaisa` INT NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usageLimit` INT NULL,
  `timesUsed` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_coupon_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(36) NOT NULL,
  `orderId` VARCHAR(36) NOT NULL,
  `gatewayProvider` ENUM('RAZORPAY', 'CASHFREE', 'PHONEPE', 'COD') NOT NULL,
  `transactionRef` VARCHAR(120) NULL UNIQUE,
  `paymentMethod` VARCHAR(50) NULL,
  `amountPaisa` INT NOT NULL,
  `currency` VARCHAR(5) NOT NULL DEFAULT 'INR',
  `status` ENUM('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `gatewayResponseJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_pay_order` (`orderId`),
  INDEX `idx_pay_txn` (`transactionRef`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipments` (
  `id` VARCHAR(36) NOT NULL,
  `orderId` VARCHAR(36) NOT NULL,
  `courierPartner` ENUM('DELHIVERY', 'BLUEDART', 'EKART', 'DTDC', 'INDIA_POST') NOT NULL,
  `trackingNumber` VARCHAR(100) NOT NULL,
  `trackingUrl` VARCHAR(500) NULL,
  `currentStatus` VARCHAR(50) NOT NULL,
  `dispatchedAt` DATETIME(3) NULL,
  `estimatedDeliveryAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `updatesLogJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_shipment_order` (`orderId`),
  INDEX `idx_shipment_track` (`trackingNumber`),
  CONSTRAINT `fk_shipment_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_settings` (
  `id` VARCHAR(36) NOT NULL,
  `settingKey` VARCHAR(80) NOT NULL UNIQUE,
  `settingValueJson` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NULL,
  `action` VARCHAR(80) NOT NULL,
  `entityType` VARCHAR(50) NOT NULL,
  `entityId` VARCHAR(50) NULL,
  `ipAddress` VARCHAR(45) NULL,
  `userAgent` VARCHAR(255) NULL,
  `detailsJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_time` (`createdAt`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

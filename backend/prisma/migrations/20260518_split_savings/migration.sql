-- Create cms_savings table and migrate Savings rows from cms_services

-- Create table (MySQL-compatible)
CREATE TABLE IF NOT EXISTS `cms_savings` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NOT NULL,
  `features` JSON NOT NULL,
  `ctaLabel` VARCHAR(191) NULL,
  `ctaPath` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Copy existing Savings entries from cms_services into cms_savings
-- This preserves ids and feature JSON payloads
INSERT INTO `cms_savings` (`id`, `title`, `description`, `features`, `ctaLabel`, `ctaPath`, `sortOrder`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, `title`, `description`, `features`, `ctaLabel`, `ctaPath`, `sortOrder`, `status`, `createdAt`, `updatedAt`
FROM `cms_services`
WHERE TRIM(LOWER(`category`)) = 'savings';

-- Optionally delete migrated rows from cms_services if you want savings only in new table
-- DELETE FROM `cms_services` WHERE TRIM(LOWER(`category`)) = 'savings';

-- Drop category column from cms_services
ALTER TABLE `cms_services` DROP COLUMN `category`;

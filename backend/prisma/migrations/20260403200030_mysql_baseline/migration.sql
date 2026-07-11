-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `manager` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPERATIONAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branches_name_key`(`name`),
    UNIQUE INDEX `branches_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applicants` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `dob` DATETIME(3) NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `nationality` VARCHAR(191) NULL DEFAULT 'Ethiopian',
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `subCity` VARCHAR(191) NULL,
    `woreda` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `idType` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `applicants_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_applications` (
    `id` VARCHAR(191) NOT NULL,
    `referenceNo` VARCHAR(191) NOT NULL,
    `applicantId` VARCHAR(191) NOT NULL,
    `applicantType` ENUM('INDIVIDUAL', 'GROUP', 'ORGANIZATION') NOT NULL DEFAULT 'INDIVIDUAL',
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED', 'ACTIVATED') NOT NULL DEFAULT 'DRAFT',
    `occupation` VARCHAR(191) NULL,
    `employer` VARCHAR(191) NULL,
    `incomeRange` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `membershipProduct` VARCHAR(191) NULL,
    `emergencyContactName` VARCHAR(191) NULL,
    `emergencyContactPhone` VARCHAR(191) NULL,
    `termsAccepted` BOOLEAN NOT NULL DEFAULT false,
    `privacyAccepted` BOOLEAN NOT NULL DEFAULT false,
    `signature` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `membership_applications_referenceNo_key`(`referenceNo`),
    INDEX `membership_applications_branchId_status_createdAt_idx`(`branchId`, `status`, `createdAt`),
    INDEX `membership_applications_assignedToId_status_createdAt_idx`(`assignedToId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_applications` (
    `id` VARCHAR(191) NOT NULL,
    `referenceNo` VARCHAR(191) NOT NULL,
    `applicantId` VARCHAR(191) NOT NULL,
    `membershipNo` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED', 'ACTIVATED') NOT NULL DEFAULT 'DRAFT',
    `loanType` ENUM('PERSONAL', 'BUSINESS', 'EMERGENCY', 'DEVELOPMENT', 'ASSET', 'GROUP') NULL,
    `amount` DOUBLE NULL,
    `tenure` INTEGER NULL,
    `purpose` VARCHAR(191) NULL,
    `repaymentSource` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `employer` VARCHAR(191) NULL,
    `monthlyIncome` DOUBLE NULL,
    `monthlyExpenses` DOUBLE NULL,
    `existingLoans` DOUBLE NULL,
    `guarantorName` VARCHAR(191) NULL,
    `guarantorPhone` VARCHAR(191) NULL,
    `guarantorIdNumber` VARCHAR(191) NULL,
    `collateralType` VARCHAR(191) NULL,
    `collateralDesc` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `termsAccepted` BOOLEAN NOT NULL DEFAULT false,
    `creditConsent` BOOLEAN NOT NULL DEFAULT false,
    `signature` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_applications_referenceNo_key`(`referenceNo`),
    INDEX `loan_applications_branchId_status_createdAt_idx`(`branchId`, `status`, `createdAt`),
    INDEX `loan_applications_loanType_status_createdAt_idx`(`loanType`, `status`, `createdAt`),
    INDEX `loan_applications_assignedToId_status_createdAt_idx`(`assignedToId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'PASSPORT', 'APPLICANT_PHOTO', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'PAYSLIP', 'BUSINESS_LICENSE', 'GUARANTOR_ID', 'COLLATERAL_DOC', 'OTHER') NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `storedName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED', 'FLAGGED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `membershipApplicationId` VARCHAR(191) NULL,
    `loanApplicationId` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,

    INDEX `documents_status_uploadedAt_idx`(`status`, `uploadedAt`),
    INDEX `documents_membershipApplicationId_status_idx`(`membershipApplicationId`, `status`),
    INDEX `documents_loanApplicationId_status_idx`(`loanApplicationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'LOAN_OFFICER', 'KYC_OFFICER', 'BRANCH_MANAGER', 'CONTENT_ADMIN') NOT NULL DEFAULT 'MEMBERSHIP_OFFICER',
    `branchId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    INDEX `admin_users_role_isActive_branchId_idx`(`role`, `isActive`, `branchId`),
    INDEX `admin_users_lastLogin_idx`(`lastLogin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_notes` (
    `id` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT true,
    `authorId` VARCHAR(191) NOT NULL,
    `membershipApplicationId` VARCHAR(191) NULL,
    `loanApplicationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_history` (
    `id` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED', 'ACTIVATED') NOT NULL,
    `toStatus` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED', 'ACTIVATED') NOT NULL,
    `note` VARCHAR(191) NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `membershipApplicationId` VARCHAR(191) NULL,
    `loanApplicationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `workflow_history_fromStatus_toStatus_createdAt_idx`(`fromStatus`, `toStatus`, `createdAt`),
    INDEX `workflow_history_changedById_createdAt_idx`(`changedById`, `createdAt`),
    INDEX `workflow_history_membershipApplicationId_createdAt_idx`(`membershipApplicationId`, `createdAt`),
    INDEX `workflow_history_loanApplicationId_createdAt_idx`(`loanApplicationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `details` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `audit_logs_targetType_createdAt_idx`(`targetType`, `createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `audit_logs_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_audit_records` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestedBy` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `format` VARCHAR(191) NOT NULL,
    `rows` INTEGER NOT NULL,
    `digest` VARCHAR(191) NOT NULL,
    `signature` VARCHAR(191) NOT NULL,
    `filters` JSON NOT NULL,

    INDEX `export_audit_records_created_at_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_faqs` (
    `id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `answer` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'General',
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_news` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `content` TEXT NULL,
    `imageUrl` TEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'General',
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_pages` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cms_pages_path_key`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_events` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_events_type_timestamp_idx`(`type`, `timestamp`),
    INDEX `notification_events_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_download_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_download_files` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cms_download_files_categoryId_published_sortOrder_idx`(`categoryId`, `published`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_branches` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `officeHours` VARCHAR(191) NOT NULL,
    `mapUrl` VARCHAR(191) NOT NULL,
    `phonePrimary` VARCHAR(191) NULL,
    `phoneSecondary` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_services` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'General',
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

-- CreateTable
CREATE TABLE `cms_loan_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `suited` VARCHAR(191) NOT NULL,
    `docs` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `maxAmount` VARCHAR(191) NOT NULL,
    `interestRate` VARCHAR(191) NOT NULL,
    `maxTerm` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT 'border-l-primary',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_announcements` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Info',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Scheduled',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `placement` VARCHAR(191) NOT NULL DEFAULT 'Banner',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_event_logs` (
    `id` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `details` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_event_logs_endpoint_createdAt_idx`(`endpoint`, `createdAt`),
    INDEX `security_event_logs_eventType_createdAt_idx`(`eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_abuse_states` (
    `email` VARCHAR(191) NOT NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `windowStartAt` DATETIME(3) NULL,
    `lockoutUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `tokenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_sessions_userId_revokedAt_expiresAt_idx`(`userId`, `revokedAt`, `expiresAt`),
    PRIMARY KEY (`tokenId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'EMAIL',
    `subject_template` VARCHAR(191) NOT NULL,
    `body_template` VARCHAR(191) NOT NULL,
    `required_variables` VARCHAR(191) NOT NULL DEFAULT '',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_templates_name_key`(`name`),
    INDEX `notification_templates_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_delivery_timeline` (
    `id` VARCHAR(191) NOT NULL,
    `notification_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `detail` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_delivery_timeline_notification_created_idx`(`notification_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_acknowledgements` (
    `notification_id` VARCHAR(191) NOT NULL,
    `acknowledged` BOOLEAN NOT NULL DEFAULT false,
    `owner_id` VARCHAR(191) NULL,
    `owner_name` VARCHAR(191) NULL,
    `due_at` DATETIME(3) NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_acknowledgements_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_noise_controls` (
    `id` INTEGER NOT NULL,
    `throttle_enabled` BOOLEAN NOT NULL DEFAULT true,
    `dedup_enabled` BOOLEAN NOT NULL DEFAULT true,
    `throttle_window_minutes` INTEGER NOT NULL DEFAULT 10,
    `dedup_window_minutes` INTEGER NOT NULL DEFAULT 60,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiry_routing_rules` (
    `id` VARCHAR(191) NOT NULL,
    `keyword` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NOT NULL,
    `sla_minutes` INTEGER NOT NULL DEFAULT 240,
    `escalation_destination` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inquiry_routing_rules_priority_updated_at_idx`(`priority`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiry_notification_meta` (
    `notification_id` VARCHAR(191) NOT NULL,
    `routed_to` VARCHAR(191) NOT NULL,
    `sla_due_at` DATETIME(3) NULL,
    `escalation_destination` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `last_escalated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inquiry_notification_meta_status_sla_due_at_idx`(`status`, `sla_due_at`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_report_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `recipients` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'DAILY',
    `format` VARCHAR(191) NOT NULL DEFAULT 'CSV',
    `filters` JSON NOT NULL,
    `next_run_at` DATETIME(3) NOT NULL,
    `last_run_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `admin_report_schedules_status_next_run_at_idx`(`status`, `next_run_at`),
    INDEX `admin_report_schedules_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_job_queue` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `run_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `last_error` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `background_job_queue_status_run_at_idx`(`status`, `run_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operational_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `severity` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',

    INDEX `operational_alerts_created_at_idx`(`createdAt`),
    INDEX `operational_alerts_status_severity_idx`(`status`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `membership_applications` ADD CONSTRAINT `membership_applications_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `applicants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_applications` ADD CONSTRAINT `membership_applications_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_applications` ADD CONSTRAINT `membership_applications_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `applicants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_users` ADD CONSTRAINT `admin_users_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_notes` ADD CONSTRAINT `application_notes_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_notes` ADD CONSTRAINT `application_notes_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_notes` ADD CONSTRAINT `application_notes_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_history` ADD CONSTRAINT `workflow_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_history` ADD CONSTRAINT `workflow_history_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_history` ADD CONSTRAINT `workflow_history_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


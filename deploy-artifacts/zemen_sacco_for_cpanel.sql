-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: zemen_sacco
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_report_schedules`
--

DROP TABLE IF EXISTS `admin_report_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_report_schedules` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DAILY',
  `format` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CSV',
  `filters` json NOT NULL,
  `next_run_at` datetime(3) NOT NULL,
  `last_run_at` datetime(3) DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_report_schedules_status_next_run_at_idx` (`status`,`next_run_at`),
  KEY `admin_report_schedules_updated_at_idx` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_report_schedules`
--

LOCK TABLES `admin_report_schedules` WRITE;
/*!40000 ALTER TABLE `admin_report_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_report_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','MEMBERSHIP_OFFICER','LOAN_OFFICER','KYC_OFFICER','BRANCH_MANAGER','CONTENT_ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEMBERSHIP_OFFICER',
  `branchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastLogin` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_users_email_key` (`email`),
  KEY `admin_users_role_isActive_branchId_idx` (`role`,`isActive`,`branchId`),
  KEY `admin_users_lastLogin_idx` (`lastLogin`),
  KEY `admin_users_branchId_fkey` (`branchId`),
  CONSTRAINT `admin_users_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES ('892da003-cfd5-4e16-9a4b-a0047bf6b8da','Elena Aris','officer@zemen.com','$2a$10$U1FJspcPB95uVtRjpv0Ix.sdxmuwyMYHZIMxiMDeQ7Jlb5ybSHTDm','LOAN_OFFICER','1cfed2de-5792-4d57-bc75-baba6e62e6b2',1,NULL,'2026-04-03 20:59:12.403','2026-04-03 20:59:12.403'),('e85770c4-4646-4213-8d85-0f462e43d61f','System Administrator','admin@zemen.com','$2a$10$b0Aa7CG0Ml4eVLlesBLqE.vyBrA1wTOSThgmzNOWk9s0ghdYtzjtW','SUPER_ADMIN','941990bc-b380-4810-9c97-7931f4762303',1,'2026-04-03 21:59:01.229','2026-04-03 20:59:12.283','2026-04-03 21:59:01.236');
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applicants`
--

DROP TABLE IF EXISTS `applicants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applicants` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middleName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` datetime(3) DEFAULT NULL,
  `gender` enum('MALE','FEMALE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'Ethiopian',
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subCity` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `woreda` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idNumber` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `applicants_phone_key` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applicants`
--

LOCK TABLES `applicants` WRITE;
/*!40000 ALTER TABLE `applicants` DISABLE KEYS */;
INSERT INTO `applicants` VALUES ('7060716f-dfe6-4cb7-95b4-2de625d01575','Yonas','kkk','Welearegay','2000-09-09 00:00:00.000','MALE','Ethiopian','+251992315994','yoniwell2001@gmail.com','tigray','Mekele','Mekele','bbbbb','Tigray flkhk','NATIONAL_ID','66868688','2026-04-03 21:51:48.018','2026-04-03 21:51:48.018');
/*!40000 ALTER TABLE `applicants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_notes`
--

DROP TABLE IF EXISTS `application_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_notes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isInternal` tinyint(1) NOT NULL DEFAULT '1',
  `authorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membershipApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loanApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `application_notes_authorId_fkey` (`authorId`),
  KEY `application_notes_membershipApplicationId_fkey` (`membershipApplicationId`),
  KEY `application_notes_loanApplicationId_fkey` (`loanApplicationId`),
  CONSTRAINT `application_notes_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `application_notes_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `application_notes_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_notes`
--

LOCK TABLES `application_notes` WRITE;
/*!40000 ALTER TABLE `application_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `application_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_createdAt_idx` (`createdAt`),
  KEY `audit_logs_action_createdAt_idx` (`action`,`createdAt`),
  KEY `audit_logs_targetType_createdAt_idx` (`targetType`,`createdAt`),
  KEY `audit_logs_userId_createdAt_idx` (`userId`,`createdAt`),
  KEY `audit_logs_ipAddress_createdAt_idx` (`ipAddress`,`createdAt`),
  CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('1b82f531-0cf2-483d-9dd4-97cc6edb7d0c','e85770c4-4646-4213-8d85-0f462e43d61f','DOCUMENT_VERIFIED','DOCUMENT','31ac690a-cfcd-4be6-b8e7-d9a2fa260cdb','{\"previousStatus\":\"PENDING\",\"nextStatus\":\"VERIFIED\"}','::1','2026-04-03 21:52:04.301'),('8ed19e67-d46f-42af-a140-ecc093861a67','e85770c4-4646-4213-8d85-0f462e43d61f','DOCUMENT_VERIFIED','DOCUMENT','0f858407-2f41-4165-b356-910e2377dd65','{\"previousStatus\":\"PENDING\",\"nextStatus\":\"VERIFIED\"}','::1','2026-04-03 21:52:01.844'),('956c7f1f-4e41-4b25-aa06-bcc10de1aff2','e85770c4-4646-4213-8d85-0f462e43d61f','APPLICATION_STATUS_UPDATED','MEMBERSHIP_APPLICATION','49893f89-3ec8-4c3f-bcee-85ba35ff0da4','{\"fromStatus\":\"UNDER_REVIEW\",\"toStatus\":\"APPROVED\",\"note\":\"Status updated to APPROVED\"}','::1','2026-04-03 21:52:08.440'),('9a6144f3-eb9d-4f18-b118-08b14753a0c3','e85770c4-4646-4213-8d85-0f462e43d61f','APPLICATION_STATUS_UPDATED','MEMBERSHIP_APPLICATION','49893f89-3ec8-4c3f-bcee-85ba35ff0da4','{\"fromStatus\":\"SUBMITTED\",\"toStatus\":\"UNDER_REVIEW\",\"note\":\"Status updated to UNDER_REVIEW\"}','::1','2026-04-03 21:52:08.348'),('b21b7895-aa9c-4b2d-8131-adf87aa4675d','e85770c4-4646-4213-8d85-0f462e43d61f','DOCUMENT_VERIFIED','DOCUMENT','5069f13f-d958-4fe4-85a3-2313404474e0','{\"previousStatus\":\"PENDING\",\"nextStatus\":\"VERIFIED\"}','::1','2026-04-03 21:52:02.824'),('f7e6e567-dfde-41b5-88d6-a1062ae0f925','e85770c4-4646-4213-8d85-0f462e43d61f','DOCUMENT_VERIFIED','DOCUMENT','f09942a6-77cd-47c3-9ff1-5de9ffa1480b','{\"previousStatus\":\"PENDING\",\"nextStatus\":\"VERIFIED\"}','::1','2026-04-03 21:52:05.775');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `tokenId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `revokedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`tokenId`),
  KEY `auth_sessions_userId_revokedAt_expiresAt_idx` (`userId`,`revokedAt`,`expiresAt`),
  CONSTRAINT `auth_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_sessions`
--

LOCK TABLES `auth_sessions` WRITE;
/*!40000 ALTER TABLE `auth_sessions` DISABLE KEYS */;
INSERT INTO `auth_sessions` VALUES ('30c5e5c3-5a62-4185-9a60-d41bdf6be176','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:59:01.246',NULL,'2026-04-03 21:59:01.253','2026-04-03 21:59:01.253'),('4b5263a6-6868-45af-ab4e-982213a4e3ea','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:18:51.863',NULL,'2026-04-03 21:18:51.867','2026-04-03 21:18:51.867'),('5fb2035b-57ca-4bb2-9aec-53bbe2a4bf73','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:43:57.943',NULL,'2026-04-03 21:43:57.949','2026-04-03 21:43:57.949'),('639920f3-6f2e-4e67-8101-b05f69d9b12e','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:17:15.045',NULL,'2026-04-03 21:17:15.046','2026-04-03 21:17:15.046'),('76dfbbef-bed3-4540-9e2d-f5332dc0b78a','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:43:58.102',NULL,'2026-04-03 21:43:58.108','2026-04-03 21:43:58.108'),('78be5683-6d98-47cb-a47d-f6cf3865abec','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:43:58.268',NULL,'2026-04-03 21:43:58.274','2026-04-03 21:43:58.274'),('8ba0d40d-5661-4f94-8a90-adb0236e769f','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:24:26.881',NULL,'2026-04-03 21:24:26.883','2026-04-03 21:24:26.883'),('8e423631-e783-4d0d-8445-3b86cb8a5fe6','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:46:16.528',NULL,'2026-04-03 21:46:16.530','2026-04-03 21:46:16.530'),('99747f07-8197-4368-b5f6-46e3c310dc25','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:44:54.624',NULL,'2026-04-03 21:44:54.625','2026-04-03 21:44:54.625'),('9e0886f2-cdce-46c4-ac94-2c3bccb08314','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:26:01.314',NULL,'2026-04-03 21:26:01.321','2026-04-03 21:26:01.321'),('a0f317de-6bf1-4f18-9200-aa5869354bca','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:53:17.830',NULL,'2026-04-03 21:53:17.831','2026-04-03 21:53:17.831'),('a8af1d2b-3083-4f3f-abea-ad1a776c8017','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:43:57.769',NULL,'2026-04-03 21:43:57.775','2026-04-03 21:43:57.775'),('b5ccc4b5-d02d-4ca5-bb56-20495a834e6e','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:52:24.668',NULL,'2026-04-03 21:52:24.669','2026-04-03 21:52:24.669'),('b8522e97-31a4-450c-9c42-774323bf55ec','e85770c4-4646-4213-8d85-0f462e43d61f','2026-04-10 21:00:24.642',NULL,'2026-04-03 21:00:24.644','2026-04-03 21:00:24.644');
/*!40000 ALTER TABLE `auth_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `background_job_queue`
--

DROP TABLE IF EXISTS `background_job_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `background_job_queue` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `run_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `last_error` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `background_job_queue_status_run_at_idx` (`status`,`run_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `background_job_queue`
--

LOCK TABLES `background_job_queue` WRITE;
/*!40000 ALTER TABLE `background_job_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `background_job_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPERATIONAL',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_name_key` (`name`),
  UNIQUE KEY `branches_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES ('04982992-43a2-4c03-944d-37cda7362240','Adigrat','ADG-001','Adigrat',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('1cfed2de-5792-4d57-bc75-baba6e62e6b2','Mekelle Head Office','BR-002','Adi Hawesi, In front of IOM','Dr. Silas Omari','OPERATIONAL','2026-04-03 20:59:12.105','2026-04-03 20:59:12.105'),('1e46eea0-9c0c-43d8-8e98-27ed2b31cfd8','Adwa','ADW-001','Adwa',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('27766fc2-75e5-4daf-9da6-26c104493a84','Shire','SHR-001','Shire',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('32ac7a89-d728-40e9-8da1-bfc96c11414e','Addis Abeba','AA-001','Addis Abeba',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('66cbb187-9503-4277-882d-c2bd6979f467','Rama','RAM-001','Rama',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('699aae2f-0bb8-4103-85ce-2f908f3a1d95','Mekelle Branch','MK-001','Mekelle',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('941990bc-b380-4810-9c97-7931f4762303','Addis Ababa HQ','BR-001','Bole Medhanialem, Addis Ababa','Aisha Hassan','OPERATIONAL','2026-04-03 20:59:12.105','2026-04-03 20:59:12.105'),('b69bad9a-85b4-4de5-9182-8237fda47778','AbiAdi','ABI-001','AbiAdi',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('f609211e-ef1d-41eb-b6f9-7f5e3463729d','Maychow','MYC-001','Maychow',NULL,'OPERATIONAL','2026-04-03 21:46:22.973','2026-04-03 21:46:22.973'),('f7cd7dad-1f27-4083-8e9e-31e1ab78cf61','n','HKJ','gg','hj','OPERATIONAL','2026-04-03 21:46:56.826','2026-04-03 21:46:56.826');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_announcements`
--

DROP TABLE IF EXISTS `cms_announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_announcements` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Info',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Scheduled',
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `placement` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Banner',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_announcements`
--

LOCK TABLES `cms_announcements` WRITE;
/*!40000 ALTER TABLE `cms_announcements` DISABLE KEYS */;
INSERT INTO `cms_announcements` VALUES ('3ef2ac1b-f725-4ba8-a83e-dd4557fbc684','Document Verification Notice','Please ensure uploaded KYC documents are clear and valid to avoid review delays.','Notice','Scheduled','2026-04-01 00:00:00.000',NULL,'Banner','2026-04-03 21:46:38.380','2026-04-03 21:46:38.380'),('87f00900-1a63-407a-bc63-991470b1b136','Welcome to the Zemen Digital Platform','Use the online portals to submit membership and loan applications securely.','Info','Active','2026-01-01 00:00:00.000',NULL,'Homepage','2026-04-03 21:46:38.314','2026-04-03 21:46:38.314');
/*!40000 ALTER TABLE `cms_announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_branches`
--

DROP TABLE IF EXISTS `cms_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_branches` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `officeHours` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mapUrl` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phonePrimary` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phoneSecondary` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_branches`
--

LOCK TABLES `cms_branches` WRITE;
/*!40000 ALTER TABLE `cms_branches` DISABLE KEYS */;
INSERT INTO `cms_branches` VALUES ('551cb7fb-43cb-413c-8dce-7498449b4186','Addis Ababa Branch','Bole, In front of Stadium, Addis Ababa','Mon-Fri 8:30 AM - 5:30 PM','https://maps.google.com/?q=Addis+Ababa+Branch','+251997339200',NULL,1,'2026-04-03 21:46:38.373','2026-04-03 21:46:38.373'),('7982b81e-211d-4719-9255-fefeaa1ab484','Mekelle Head Office','Adi Hawesi, In front of IOM, Mekelle','Mon-Fri 8:30 AM - 5:30 PM','https://maps.google.com/?q=Mekelle+Head+Office','+251953444411','+251997346200',1,'2026-04-03 21:46:38.302','2026-04-03 21:46:38.302');
/*!40000 ALTER TABLE `cms_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_download_categories`
--

DROP TABLE IF EXISTS `cms_download_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_download_categories` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `published` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_download_categories`
--

LOCK TABLES `cms_download_categories` WRITE;
/*!40000 ALTER TABLE `cms_download_categories` DISABLE KEYS */;
INSERT INTO `cms_download_categories` VALUES ('7ad2dde0-556e-44e2-980c-648fa12e6cf9','Guides',2,1,'2026-04-03 21:46:38.379','2026-04-03 21:46:38.379'),('b30d4a0e-8980-4f3d-833b-9ef2409e6264','Forms',1,1,'2026-04-03 21:46:38.317','2026-04-03 21:46:38.317');
/*!40000 ALTER TABLE `cms_download_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_download_files`
--

DROP TABLE IF EXISTS `cms_download_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_download_files` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `published` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cms_download_files_categoryId_published_sortOrder_idx` (`categoryId`,`published`,`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_download_files`
--

LOCK TABLES `cms_download_files` WRITE;
/*!40000 ALTER TABLE `cms_download_files` DISABLE KEYS */;
INSERT INTO `cms_download_files` VALUES ('1a36cb04-d2f9-4892-b4f1-be324f97dcda','b30d4a0e-8980-4f3d-833b-9ef2409e6264','Membership Application Form','PDF','PDF','#',1,1,'2026-04-03 21:46:38.439','2026-04-03 21:46:38.439'),('331b8bf3-c8e5-466a-82c7-61feec026315','b30d4a0e-8980-4f3d-833b-9ef2409e6264','Loan Application Checklist','PDF','PDF','#',2,1,'2026-04-03 21:46:38.459','2026-04-03 21:46:38.459'),('768d4216-eac7-4870-8027-9121a5bed02a','b30d4a0e-8980-4f3d-833b-9ef2409e6264','Loan Application Checklist','PDF','PDF','#',2,1,'2026-04-03 21:46:38.456','2026-04-03 21:46:38.456'),('cd2c134e-31b6-491e-83ad-ea1e962ee4af','7ad2dde0-556e-44e2-980c-648fa12e6cf9','Digital Portal User Guide','PDF','PDF','#',1,1,'2026-04-03 21:46:38.480','2026-04-03 21:46:38.480'),('f8221661-5ddd-4d41-b9ac-96a24ad5e392','b30d4a0e-8980-4f3d-833b-9ef2409e6264','Membership Application Form','PDF','PDF','#',1,1,'2026-04-03 21:46:38.404','2026-04-03 21:46:38.404');
/*!40000 ALTER TABLE `cms_download_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_faqs`
--

DROP TABLE IF EXISTS `cms_faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_faqs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `published` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_faqs`
--

LOCK TABLES `cms_faqs` WRITE;
/*!40000 ALTER TABLE `cms_faqs` DISABLE KEYS */;
INSERT INTO `cms_faqs` VALUES ('433c178d-8cce-4c71-8856-260846cb18ed','How long does loan approval take?','Approval timelines depend on documentation completeness and internal review, typically within a few business days.','Loans',1,'2026-04-03 21:46:38.380','2026-04-03 21:46:38.380'),('b83eb2de-4028-4d8f-9789-70a3eebec1ee','Which documents are required for KYC?','A valid national ID or passport, applicant photo, and proof of address are commonly required.','KYC',1,'2026-04-03 21:46:38.399','2026-04-03 21:46:38.399'),('f0195cb8-0df2-498a-b280-550358d588cb','Who can become a member of Zemen SACCO?','Individuals and eligible groups who meet KYC and membership requirements can apply.','Membership',1,'2026-04-03 21:46:38.314','2026-04-03 21:46:38.314');
/*!40000 ALTER TABLE `cms_faqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_loan_products`
--

DROP TABLE IF EXISTS `cms_loan_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_loan_products` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suited` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `docs` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `maxAmount` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interestRate` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxTerm` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'border-l-primary',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_loan_products`
--

LOCK TABLES `cms_loan_products` WRITE;
/*!40000 ALTER TABLE `cms_loan_products` DISABLE KEYS */;
INSERT INTO `cms_loan_products` VALUES ('933426d3-edaf-413f-b1df-a8210441ef7d','Business and Trade Loan','Supports business expansion, working capital, trading activity, and income-generating operations.','Traders, entrepreneurs, and small business operators.','Business License, Cash Flow Records, 6+ Months Membership','PUBLISHED','Based on business cashflow','Competitive','Up to 48 months','border-l-primary',2,'2026-04-03 21:46:38.494','2026-04-03 21:46:38.494'),('9d09247b-2621-4b89-bafa-6b25839d5b96','Emergency Support Loan','Smaller and faster-response financing for urgent but essential financial needs.','Active members in good standing with a verifiable urgent need.','Proof of Emergency, Guarantor Form, Active Account','PUBLISHED','Rapid-response limit','Preferential','Up to 12 months','border-l-primary',3,'2026-04-03 21:46:38.530','2026-04-03 21:46:38.530'),('cdf5e0fd-bf8b-46c4-834c-cd5635eda72d','Personal Development Loan','Supports education, household improvements, health needs, or planned personal expenses.','Active members with savings history and predictable income.','Valid ID, Savings Statement, Proof of Income','PUBLISHED','Based on savings and affordability','Competitive','Up to 36 months','border-l-primary',1,'2026-04-03 21:46:38.463','2026-04-03 21:46:38.463');
/*!40000 ALTER TABLE `cms_loan_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_news`
--

DROP TABLE IF EXISTS `cms_news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_news` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `imageUrl` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_news`
--

LOCK TABLES `cms_news` WRITE;
/*!40000 ALTER TABLE `cms_news` DISABLE KEYS */;
INSERT INTO `cms_news` VALUES ('1803c673-fd1f-4f63-9fec-606a04d225d7','New Digital Loan Application Portal Launched','We are excited to announce our new online portal for faster and more convenient loan applications.','We are excited to announce our new online portal for faster and more convenient loan applications.',NULL,'Product Update','PUBLISHED','2026-04-03 21:46:38.406','2026-04-03 21:46:38.406'),('1c1868ca-f2fc-4118-aa1d-7b9a9dffb61d','bb','bnnn',',mmnmm','/uploads/cms-news/a39a07fa-3548-4e39-8d38-dc24324548c1.jpg','General','PUBLISHED','2026-04-03 21:48:21.236','2026-04-03 21:48:21.236'),('6f32afe1-8486-4297-a02c-df2d8059c000','Annual General Assembly Meeting 2024','Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.','Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.',NULL,'Meeting','PUBLISHED','2026-04-03 21:46:38.382','2026-04-03 21:46:38.382'),('81d40e2d-d5ab-4ae2-b939-5825569b4bc1','New Branch Opening in Bole','To serve our members better, we have opened a new branch in the heart of Bole sub-city.','To serve our members better, we have opened a new branch in the heart of Bole sub-city.',NULL,'Branch Notice','PUBLISHED','2026-04-03 21:46:38.456','2026-04-03 21:46:38.456');
/*!40000 ALTER TABLE `cms_news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_pages`
--

DROP TABLE IF EXISTS `cms_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_pages` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLISHED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cms_pages_path_key` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_pages`
--

LOCK TABLES `cms_pages` WRITE;
/*!40000 ALTER TABLE `cms_pages` DISABLE KEYS */;
/*!40000 ALTER TABLE `cms_pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_services`
--

DROP TABLE IF EXISTS `cms_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cms_services` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `description` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `features` json NOT NULL,
  `ctaLabel` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ctaPath` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_services`
--

LOCK TABLES `cms_services` WRITE;
/*!40000 ALTER TABLE `cms_services` DISABLE KEYS */;
INSERT INTO `cms_services` VALUES ('439af700-5055-4db5-97ec-bc43cf94b25c','Digital Services','Digital','Manage your accounts, apply for loans, and more through our modern digital platform.','[\"Mobile Access\", \"SMS Alerts\", \"Secure Login\"]','Go Digital','/how-to-apply',4,'PUBLISHED','2026-04-03 21:46:38.442','2026-04-03 21:46:38.442'),('4d9e9a76-b3c5-417e-9b59-5097575ce64e','Loan Products','Loans','Access flexible loan options with fair rates to support your personal, business, or emergency needs.','[\"Fast Approval\", \"No Hidden Charges\", \"Expert Advisory\"]','Apply Now','/loans',2,'PUBLISHED','2026-04-03 21:46:38.379','2026-04-03 21:46:38.379'),('9fee6a58-760c-481e-8897-9d7d6aebcda0','Savings Products','Savings','Grow your wealth with competitive interest rates and secure savings accounts designed for your future.','[\"Zero Fees\", \"Daily Interest\", \"Instant Access\"]','Learn More','/savings',1,'PUBLISHED','2026-04-03 21:46:38.296','2026-04-03 21:46:38.296'),('e52dd82e-2121-4b56-8bf4-6ad97e00df3a','Membership Benefits','Membership','Enjoy exclusive benefits, including dividend shares and community support as a valued member.','[\"Annual Dividends\", \"Voting Rights\", \"Community Events\"]','See Benefits','/membership',3,'PUBLISHED','2026-04-03 21:46:38.395','2026-04-03 21:46:38.395');
/*!40000 ALTER TABLE `cms_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('NATIONAL_ID_FRONT','NATIONAL_ID_BACK','PASSPORT','APPLICANT_PHOTO','PROOF_OF_ADDRESS','BANK_STATEMENT','PAYSLIP','BUSINESS_LICENSE','GUARANTOR_ID','COLLATERAL_DOC','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storedName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `status` enum('PENDING','VERIFIED','REJECTED','FLAGGED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `membershipApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loanApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploadedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `verifiedAt` datetime(3) DEFAULT NULL,
  `verifiedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejectionReason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documents_status_uploadedAt_idx` (`status`,`uploadedAt`),
  KEY `documents_membershipApplicationId_status_idx` (`membershipApplicationId`,`status`),
  KEY `documents_loanApplicationId_status_idx` (`loanApplicationId`,`status`),
  KEY `documents_verifiedById_fkey` (`verifiedById`),
  CONSTRAINT `documents_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES ('0f858407-2f41-4165-b356-910e2377dd65','PROOF_OF_ADDRESS','photo_5_2026-03-01_13-17-31.jpg','c28f1671-bf64-4836-8af1-b7e38410cbf2.jpg','image/jpeg',216088,'VERIFIED','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:51:48.224','2026-04-03 21:52:01.829','e85770c4-4646-4213-8d85-0f462e43d61f',NULL),('31ac690a-cfcd-4be6-b8e7-d9a2fa260cdb','NATIONAL_ID_FRONT','photo_2026-03-01_13-08-12.jpg','3a5cbfd5-149f-4f02-ab8c-1d51cabf453c.jpg','image/jpeg',136791,'VERIFIED','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:51:48.098','2026-04-03 21:52:04.290','e85770c4-4646-4213-8d85-0f462e43d61f',NULL),('5069f13f-d958-4fe4-85a3-2313404474e0','APPLICANT_PHOTO','photo_3_2026-03-01_13-17-31.jpg','c7557f67-937d-4d22-8e75-889f39b4a36e.jpg','image/jpeg',154423,'VERIFIED','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:51:48.191','2026-04-03 21:52:02.797','e85770c4-4646-4213-8d85-0f462e43d61f',NULL),('f09942a6-77cd-47c3-9ff1-5de9ffa1480b','NATIONAL_ID_BACK','photo_1_2026-03-01_13-17-31.jpg','b3fd0819-ba3c-4a57-a9e1-8f56f2fe826f.jpg','image/jpeg',143690,'VERIFIED','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:51:48.125','2026-04-03 21:52:05.761','e85770c4-4646-4213-8d85-0f462e43d61f',NULL);
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `export_audit_records`
--

DROP TABLE IF EXISTS `export_audit_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_audit_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `requestedBy` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `format` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rows` int NOT NULL,
  `digest` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signature` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filters` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `export_audit_records_created_at_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `export_audit_records`
--

LOCK TABLES `export_audit_records` WRITE;
/*!40000 ALTER TABLE `export_audit_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_audit_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inquiry_notification_meta`
--

DROP TABLE IF EXISTS `inquiry_notification_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inquiry_notification_meta` (
  `notification_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `routed_to` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sla_due_at` datetime(3) DEFAULT NULL,
  `escalation_destination` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `last_escalated_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `inquiry_notification_meta_status_sla_due_at_idx` (`status`,`sla_due_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inquiry_notification_meta`
--

LOCK TABLES `inquiry_notification_meta` WRITE;
/*!40000 ALTER TABLE `inquiry_notification_meta` DISABLE KEYS */;
/*!40000 ALTER TABLE `inquiry_notification_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inquiry_routing_rules`
--

DROP TABLE IF EXISTS `inquiry_routing_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inquiry_routing_rules` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keyword` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sla_minutes` int NOT NULL DEFAULT '240',
  `escalation_destination` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `inquiry_routing_rules_priority_updated_at_idx` (`priority`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inquiry_routing_rules`
--

LOCK TABLES `inquiry_routing_rules` WRITE;
/*!40000 ALTER TABLE `inquiry_routing_rules` DISABLE KEYS */;
INSERT INTO `inquiry_routing_rules` VALUES ('00000000-0000-4000-8000-000000000100',NULL,'admin@zemensacco.local',240,'superadmin@zemensacco.local',999,1,'2026-04-03 21:46:31.093','2026-04-03 21:46:31.093');
/*!40000 ALTER TABLE `inquiry_routing_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_applications`
--

DROP TABLE IF EXISTS `loan_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_applications` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membershipNo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','KYC_VERIFICATION','PENDING_DOCUMENTS','PENDING_CLARIFICATION','APPROVED','REJECTED','ACTIVATED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `loanType` enum('PERSONAL','BUSINESS','EMERGENCY','DEVELOPMENT','ASSET','GROUP') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `tenure` int DEFAULT NULL,
  `purpose` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `repaymentSource` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monthlyIncome` double DEFAULT NULL,
  `monthlyExpenses` double DEFAULT NULL,
  `existingLoans` double DEFAULT NULL,
  `guarantorName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guarantorPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guarantorIdNumber` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collateralType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collateralDesc` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `termsAccepted` tinyint(1) NOT NULL DEFAULT '0',
  `creditConsent` tinyint(1) NOT NULL DEFAULT '0',
  `signature` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignedToId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submittedAt` datetime(3) DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_applications_referenceNo_key` (`referenceNo`),
  KEY `loan_applications_branchId_status_createdAt_idx` (`branchId`,`status`,`createdAt`),
  KEY `loan_applications_loanType_status_createdAt_idx` (`loanType`,`status`,`createdAt`),
  KEY `loan_applications_assignedToId_status_createdAt_idx` (`assignedToId`,`status`,`createdAt`),
  KEY `loan_applications_applicantId_fkey` (`applicantId`),
  CONSTRAINT `loan_applications_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `applicants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `loan_applications_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `loan_applications_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_applications`
--

LOCK TABLES `loan_applications` WRITE;
/*!40000 ALTER TABLE `loan_applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_abuse_states`
--

DROP TABLE IF EXISTS `login_abuse_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_abuse_states` (
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failedAttempts` int NOT NULL DEFAULT '0',
  `windowStartAt` datetime(3) DEFAULT NULL,
  `lockoutUntil` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_abuse_states`
--

LOCK TABLES `login_abuse_states` WRITE;
/*!40000 ALTER TABLE `login_abuse_states` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_abuse_states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membership_applications`
--

DROP TABLE IF EXISTS `membership_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membership_applications` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantType` enum('INDIVIDUAL','GROUP','ORGANIZATION') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INDIVIDUAL',
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','KYC_VERIFICATION','PENDING_DOCUMENTS','PENDING_CLARIFICATION','APPROVED','REJECTED','ACTIVATED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `occupation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incomeRange` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branchId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membershipProduct` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergencyContactName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergencyContactPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `termsAccepted` tinyint(1) NOT NULL DEFAULT '0',
  `privacyAccepted` tinyint(1) NOT NULL DEFAULT '0',
  `signature` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignedToId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submittedAt` datetime(3) DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `membership_applications_referenceNo_key` (`referenceNo`),
  KEY `membership_applications_branchId_status_createdAt_idx` (`branchId`,`status`,`createdAt`),
  KEY `membership_applications_assignedToId_status_createdAt_idx` (`assignedToId`,`status`,`createdAt`),
  KEY `membership_applications_applicantId_fkey` (`applicantId`),
  CONSTRAINT `membership_applications_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `applicants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `membership_applications_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `membership_applications_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membership_applications`
--

LOCK TABLES `membership_applications` WRITE;
/*!40000 ALTER TABLE `membership_applications` DISABLE KEYS */;
INSERT INTO `membership_applications` VALUES ('49893f89-3ec8-4c3f-bcee-85ba35ff0da4','MEM-2026-4280','7060716f-dfe6-4cb7-95b4-2de625d01575','INDIVIDUAL','APPROVED','skhdskha','jhskjkfs','5000_15000','04982992-43a2-4c03-944d-37cda7362240','REGULAR','hdshkds','+251900000000',1,1,'shdkjs kjdshsdk',NULL,'2026-04-03 21:51:48.039','2026-04-03 21:52:08.412','2026-04-03 21:51:48.041','2026-04-03 21:52:08.413');
/*!40000 ALTER TABLE `membership_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_acknowledgements`
--

DROP TABLE IF EXISTS `notification_acknowledgements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_acknowledgements` (
  `notification_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acknowledged` tinyint(1) NOT NULL DEFAULT '0',
  `owner_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_at` datetime(3) DEFAULT NULL,
  `acknowledged_at` datetime(3) DEFAULT NULL,
  `notes` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `notification_acknowledgements_updated_at_idx` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_acknowledgements`
--

LOCK TABLES `notification_acknowledgements` WRITE;
/*!40000 ALTER TABLE `notification_acknowledgements` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_acknowledgements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_delivery_timeline`
--

DROP TABLE IF EXISTS `notification_delivery_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_delivery_timeline` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notification_delivery_timeline_notification_created_idx` (`notification_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_delivery_timeline`
--

LOCK TABLES `notification_delivery_timeline` WRITE;
/*!40000 ALTER TABLE `notification_delivery_timeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_delivery_timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_events`
--

DROP TABLE IF EXISTS `notification_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_events` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INFO',
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SYSTEM',
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notification_events_type_timestamp_idx` (`type`,`timestamp`),
  KEY `notification_events_status_createdAt_idx` (`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_events`
--

LOCK TABLES `notification_events` WRITE;
/*!40000 ALTER TABLE `notification_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_noise_controls`
--

DROP TABLE IF EXISTS `notification_noise_controls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_noise_controls` (
  `id` int NOT NULL,
  `throttle_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `dedup_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `throttle_window_minutes` int NOT NULL DEFAULT '10',
  `dedup_window_minutes` int NOT NULL DEFAULT '60',
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_noise_controls`
--

LOCK TABLES `notification_noise_controls` WRITE;
/*!40000 ALTER TABLE `notification_noise_controls` DISABLE KEYS */;
INSERT INTO `notification_noise_controls` VALUES (1,1,1,10,60,'2026-04-03 21:46:31.083');
/*!40000 ALTER TABLE `notification_noise_controls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_templates` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMAIL',
  `subject_template` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_template` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `required_variables` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_templates_name_key` (`name`),
  KEY `notification_templates_updated_at_idx` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_templates`
--

LOCK TABLES `notification_templates` WRITE;
/*!40000 ALTER TABLE `notification_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operational_alerts`
--

DROP TABLE IF EXISTS `operational_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operational_alerts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `severity` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  PRIMARY KEY (`id`),
  KEY `operational_alerts_created_at_idx` (`createdAt`),
  KEY `operational_alerts_status_severity_idx` (`status`,`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operational_alerts`
--

LOCK TABLES `operational_alerts` WRITE;
/*!40000 ALTER TABLE `operational_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `operational_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_event_logs`
--

DROP TABLE IF EXISTS `security_event_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_event_logs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `security_event_logs_endpoint_createdAt_idx` (`endpoint`,`createdAt`),
  KEY `security_event_logs_eventType_createdAt_idx` (`eventType`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_event_logs`
--

LOCK TABLES `security_event_logs` WRITE;
/*!40000 ALTER TABLE `security_event_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `security_event_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('AUDIT_CHAIN_ANCHOR_COUNT','6','2026-04-03 20:59:35.099','2026-04-03 21:58:35.330'),('AUDIT_CHAIN_ANCHOR_HASH','5eac24636e49f4838a6e38cd263258ecbea9b6f7a5c72c29e7942f7af3329f73','2026-04-03 20:59:35.099','2026-04-03 21:58:35.330'),('AUDIT_CHAIN_ANCHOR_LATEST_AT','2026-04-03T21:52:08.440Z','2026-04-03 20:59:35.099','2026-04-03 21:58:35.330'),('AUDIT_CHAIN_ANCHOR_SIGNATURE','2eee67173af9e3e5cd9b9c96505ce798fda293cdef1801f0ca3f63f39acefe59','2026-04-03 20:59:35.099','2026-04-03 21:58:35.330'),('migration.mysqlBaseline','{\"migrationDir\":\"20260403200030_mysql_baseline\",\"appliedAt\":\"2026-04-03T20:58:08.282Z\"}','2026-04-03 23:58:08.292','2026-04-03 23:58:08.292');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflow_history`
--

DROP TABLE IF EXISTS `workflow_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_history` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromStatus` enum('DRAFT','SUBMITTED','UNDER_REVIEW','KYC_VERIFICATION','PENDING_DOCUMENTS','PENDING_CLARIFICATION','APPROVED','REJECTED','ACTIVATED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `toStatus` enum('DRAFT','SUBMITTED','UNDER_REVIEW','KYC_VERIFICATION','PENDING_DOCUMENTS','PENDING_CLARIFICATION','APPROVED','REJECTED','ACTIVATED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changedById` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membershipApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loanApplicationId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `workflow_history_fromStatus_toStatus_createdAt_idx` (`fromStatus`,`toStatus`,`createdAt`),
  KEY `workflow_history_changedById_createdAt_idx` (`changedById`,`createdAt`),
  KEY `workflow_history_membershipApplicationId_createdAt_idx` (`membershipApplicationId`,`createdAt`),
  KEY `workflow_history_loanApplicationId_createdAt_idx` (`loanApplicationId`,`createdAt`),
  CONSTRAINT `workflow_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `workflow_history_loanApplicationId_fkey` FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `workflow_history_membershipApplicationId_fkey` FOREIGN KEY (`membershipApplicationId`) REFERENCES `membership_applications` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_history`
--

LOCK TABLES `workflow_history` WRITE;
/*!40000 ALTER TABLE `workflow_history` DISABLE KEYS */;
INSERT INTO `workflow_history` VALUES ('4453866d-2198-4236-9893-ad8f6a699e1e','SUBMITTED','UNDER_REVIEW','Status updated to UNDER_REVIEW','e85770c4-4646-4213-8d85-0f462e43d61f','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:52:08.307'),('a73a7380-9ac9-4dcc-bdc5-0b42a00561af','UNDER_REVIEW','APPROVED','Status updated to APPROVED','e85770c4-4646-4213-8d85-0f462e43d61f','49893f89-3ec8-4c3f-bcee-85ba35ff0da4',NULL,'2026-04-03 21:52:08.425');
/*!40000 ALTER TABLE `workflow_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'zemen_sacco'
--

--
-- Dumping routines for database 'zemen_sacco'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-04  2:23:17

ALTER TABLE `membership_applications`
  ADD COLUMN `membershipPaymentAmount` DOUBLE NULL,
  ADD COLUMN `savingType` VARCHAR(191) NULL,
  ADD COLUMN `savingPaymentAmount` DOUBLE NULL,
  ADD COLUMN `savingTransactionRef` VARCHAR(191) NULL;

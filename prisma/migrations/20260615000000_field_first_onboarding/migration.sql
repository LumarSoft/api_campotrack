-- CreateTable: Provider (suppliers/vendors, account-scoped)
CREATE TABLE `Provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` INTEGER NOT NULL,
    `creatorRole` ENUM('ADMIN', 'MEMBER', 'PRODUCER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: Campaign estimated end date
ALTER TABLE `Campaign` ADD COLUMN `endDateEst` DATETIME(3) NULL;

-- AlterTable: Cost can reference a provider
ALTER TABLE `Cost` ADD COLUMN `providerId` INTEGER NULL;
CREATE INDEX `Cost_providerId_idx` ON `Cost`(`providerId`);

-- AlterTable: Subdivision.locationId becomes optional (lotes belong to the field)
ALTER TABLE `Subdivision` DROP FOREIGN KEY `Subdivision_locationId_fkey`;
ALTER TABLE `Subdivision` MODIFY `locationId` INTEGER NULL;

-- AlterTable: FieldRecord anchored to a field; campaign/lote optional.
ALTER TABLE `FieldRecord` ADD COLUMN `fieldId` INTEGER NULL;

-- Backfill fieldId from the existing campaign (directly or via its subdivision).
UPDATE `FieldRecord` fr
    JOIN `Campaign` c ON fr.`campaignId` = c.`id`
    LEFT JOIN `Subdivision` s ON c.`subdivisionId` = s.`id`
    SET fr.`fieldId` = COALESCE(c.`fieldId`, s.`fieldId`);

ALTER TABLE `FieldRecord` MODIFY `fieldId` INTEGER NOT NULL;
ALTER TABLE `FieldRecord` DROP FOREIGN KEY `FieldRecord_campaignId_fkey`;
ALTER TABLE `FieldRecord` MODIFY `campaignId` INTEGER NULL;
CREATE INDEX `FieldRecord_fieldId_idx` ON `FieldRecord`(`fieldId`);

-- AddForeignKeys
ALTER TABLE `Subdivision` ADD CONSTRAINT `Subdivision_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Cost` ADD CONSTRAINT `Cost_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Provider` ADD CONSTRAINT `Provider_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FieldRecord` ADD CONSTRAINT `FieldRecord_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `Field`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FieldRecord` ADD CONSTRAINT `FieldRecord_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

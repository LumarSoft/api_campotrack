-- CreateTable
CREATE TABLE `FieldRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subtype` ENUM('SOWING', 'FERTILIZATION', 'PHYTOSANITARY', 'OBSERVATION', 'HARVEST') NOT NULL,
    `campaignId` INTEGER NOT NULL,
    `subdivisionId` INTEGER NULL,
    `recordDate` DATETIME(3) NOT NULL,
    `data` JSON NOT NULL,
    `photos` JSON NULL,
    `clientUpdatedAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `creatorRole` ENUM('ADMIN', 'MEMBER', 'PRODUCER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FieldRecord` ADD CONSTRAINT `FieldRecord_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldRecord` ADD CONSTRAINT `FieldRecord_subdivisionId_fkey` FOREIGN KEY (`subdivisionId`) REFERENCES `Subdivision`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FieldRecord` ADD CONSTRAINT `FieldRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `CalendarEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,
    `subdivisionId` INTEGER NULL,
    `type` ENUM('SOWING', 'FERTILIZATION', 'PHYTOSANITARY', 'HARVEST', 'EXPIRATION', 'DEADLINE', 'OTHER') NOT NULL,
    `plannedDate` DATETIME(3) NOT NULL,
    `actualDate` DATETIME(3) NULL,
    `status` ENUM('PLANNED', 'DONE', 'POSTPONED') NOT NULL DEFAULT 'PLANNED',
    `suggestedBySystem` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(191) NULL,
    `createdById` INTEGER NOT NULL,
    `creatorRole` ENUM('ADMIN', 'MEMBER', 'PRODUCER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alarm` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `type` ENUM('SAME_WEEK', 'DAY_BEFORE', 'SAME_DAY') NOT NULL,

    UNIQUE INDEX `Alarm_eventId_type_key`(`eventId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Postponement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `previousDate` DATETIME(3) NOT NULL,
    `newDate` DATETIME(3) NOT NULL,
    `cause` ENUM('WEATHER_DROUGHT', 'WEATHER_FROST', 'WEATHER_HAIL', 'WEATHER_HEAT', 'SOIL_MOISTURE', 'WATER_AVAILABILITY', 'FLOOD_RISK', 'FIRE_RISK', 'OWN_DECISION', 'SUPPLIER', 'OTHER') NOT NULL,
    `note` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_subdivisionId_fkey` FOREIGN KEY (`subdivisionId`) REFERENCES `Subdivision`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alarm` ADD CONSTRAINT `Alarm_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CalendarEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Postponement` ADD CONSTRAINT `Postponement_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CalendarEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Postponement` ADD CONSTRAINT `Postponement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

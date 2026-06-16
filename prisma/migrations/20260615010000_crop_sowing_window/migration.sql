-- AlterTable: optional sowing window for crops (months 1-12), used by recommendations
ALTER TABLE `Crop` ADD COLUMN `sowingFromMonth` INTEGER NULL;
ALTER TABLE `Crop` ADD COLUMN `sowingToMonth` INTEGER NULL;

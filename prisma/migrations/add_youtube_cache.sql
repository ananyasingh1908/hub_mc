-- Run this SQL against your MySQL database to create the YouTubeCache table
-- Or use: npx prisma db push (if you use db push workflow)

CREATE TABLE IF NOT EXISTS `YouTubeCache` (
    `id` VARCHAR(30) NOT NULL DEFAULT (cuid()),
    `cacheKey` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `cachedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `YouTubeCache_cacheKey_key`(`cacheKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ActivityLog` (
	`id` varchar(191) NOT NULL,
	`employeeId` varchar(191),
	`action` varchar(191) NOT NULL,
	`entity` varchar(191) NOT NULL,
	`entityId` varchar(191),
	`details` text,
	`severity` varchar(50) NOT NULL DEFAULT 'INFO',
	`ipAddress` varchar(191),
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ActivityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Coupon` (
	`id` varchar(191) NOT NULL,
	`code` varchar(191) NOT NULL,
	`description` varchar(500) NOT NULL,
	`discountType` varchar(50) NOT NULL DEFAULT 'PERCENTAGE',
	`percentageOff` int,
	`amountOff` decimal(10,2),
	`active` boolean NOT NULL DEFAULT true,
	`maxRedemptions` int,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Coupon_id` PRIMARY KEY(`id`),
	CONSTRAINT `Coupon_code_key` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `Customer` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`fullName` varchar(191),
	`phoneNumber` varchar(20),
	`phoneVerifiedAt` datetime,
	`authProvider` varchar(50) NOT NULL DEFAULT 'phone_otp',
	`minecraftUsername` varchar(191) NOT NULL DEFAULT '',
	`minecraftUuid` varchar(191) NOT NULL DEFAULT '',
	`avatarUrl` varchar(500),
	`skinUrl` varchar(500),
	`lastLoginAt` datetime,
	`country` varchar(191),
	`createdAt` varchar(191) NOT NULL,
	`updatedAt` varchar(191) NOT NULL,
	CONSTRAINT `Customer_id` PRIMARY KEY(`id`),
	CONSTRAINT `Customer_userId_key` UNIQUE(`userId`),
	CONSTRAINT `Customer_phoneNumber_key` UNIQUE(`phoneNumber`),
	CONSTRAINT `Customer_minecraftUsername_key` UNIQUE(`minecraftUsername`),
	CONSTRAINT `Customer_minecraftUuid_key` UNIQUE(`minecraftUuid`)
);
--> statement-breakpoint
CREATE TABLE `Employee` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`displayName` varchar(191) NOT NULL,
	`department` varchar(191),
	`isActive` boolean NOT NULL DEFAULT true,
	`disabledAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Employee_id` PRIMARY KEY(`id`),
	CONSTRAINT `Employee_userId_key` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `FeaturedStream` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`channelId` varchar(191) NOT NULL,
	`channelTitle` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`thumbnailUrl` varchar(500),
	`liveViewers` int NOT NULL DEFAULT 0,
	`status` varchar(50) NOT NULL DEFAULT 'PENDING',
	`moderatedById` varchar(191),
	`moderatedAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `FeaturedStream_id` PRIMARY KEY(`id`),
	CONSTRAINT `FeaturedStream_videoId_key` UNIQUE(`videoId`)
);
--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'INFO',
	`read` boolean NOT NULL DEFAULT false,
	`link` varchar(500),
	`createdAt` datetime NOT NULL,
	CONSTRAINT `Notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `OrderItem` (
	`id` varchar(191) NOT NULL,
	`orderId` varchar(191) NOT NULL,
	`productId` varchar(191) NOT NULL,
	`productName` varchar(191) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `OrderItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Order` (
	`id` varchar(191) NOT NULL,
	`orderNumber` varchar(191) NOT NULL,
	`userId` varchar(191),
	`customerId` varchar(191),
	`couponId` varchar(191),
	`minecraftUsername` varchar(191) NOT NULL,
	`minecraftUuid` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`country` varchar(191) NOT NULL,
	`status` enum('PENDING','PAID','FULFILLED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
	`paymentMethod` enum('CARD','UPI','NETBANKING','WALLET') NOT NULL,
	`deliveryStatus` enum('PENDING','PROCESSING','DELIVERED','FAILED','AWAITING_SERVER') NOT NULL DEFAULT 'PENDING',
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total` decimal(10,2) NOT NULL,
	`razorpayOrderId` varchar(191),
	`razorpayPaymentId` varchar(191),
	`razorpaySignature` varchar(500),
	`receipt` varchar(191),
	`paymentVerifiedAt` datetime,
	`refundedAt` datetime,
	`refundReason` text,
	`deliveredAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Order_id` PRIMARY KEY(`id`),
	CONSTRAINT `Order_orderNumber_key` UNIQUE(`orderNumber`),
	CONSTRAINT `Order_razorpayOrderId_key` UNIQUE(`razorpayOrderId`),
	CONSTRAINT `Order_razorpayPaymentId_key` UNIQUE(`razorpayPaymentId`),
	CONSTRAINT `Order_receipt_key` UNIQUE(`receipt`)
);
--> statement-breakpoint
CREATE TABLE `PhoneOtpRequest` (
	`id` varchar(191) NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`otpCode` varchar(255) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`verified` boolean NOT NULL DEFAULT false,
	`consumed` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `PhoneOtpRequest_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `PlayerBan` (
	`id` varchar(191) NOT NULL,
	`employeeId` varchar(191),
	`customerId` varchar(191),
	`minecraftUsername` varchar(191) NOT NULL,
	`reason` text NOT NULL,
	`tournamentId` varchar(191),
	`bannedUntil` datetime,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `PlayerBan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `PlayerNote` (
	`id` varchar(191) NOT NULL,
	`employeeId` varchar(191),
	`customerId` varchar(191),
	`minecraftUsername` varchar(191) NOT NULL,
	`note` text NOT NULL,
	`severity` varchar(50) NOT NULL DEFAULT 'INFO',
	`createdAt` datetime NOT NULL,
	CONSTRAINT `PlayerNote_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `PlayerRank` (
	`id` varchar(191) NOT NULL,
	`customerId` varchar(191) NOT NULL,
	`minecraftUsername` varchar(191) NOT NULL,
	`rank` varchar(191) NOT NULL,
	`assignedBy` varchar(191),
	`assignedAt` datetime NOT NULL,
	`expiresAt` datetime,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `PlayerRank_id` PRIMARY KEY(`id`),
	CONSTRAINT `PlayerRank_customerId_rank_key` UNIQUE(`customerId`,`rank`)
);
--> statement-breakpoint
CREATE TABLE `Product` (
	`id` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	`category` varchar(191) NOT NULL DEFAULT 'Ranks',
	CONSTRAINT `Product_id` PRIMARY KEY(`id`),
	CONSTRAINT `Product_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `RolePermission` (
	`id` varchar(191) NOT NULL,
	`employeeId` varchar(191) NOT NULL,
	`products` boolean NOT NULL DEFAULT true,
	`orders` boolean NOT NULL DEFAULT true,
	`support` boolean NOT NULL DEFAULT true,
	`customers` boolean NOT NULL DEFAULT false,
	`employees` boolean NOT NULL DEFAULT false,
	`logs` boolean NOT NULL DEFAULT false,
	`settings` boolean NOT NULL DEFAULT false,
	`tournaments` boolean NOT NULL DEFAULT true,
	`notifications` boolean NOT NULL DEFAULT true,
	`playerManage` boolean NOT NULL DEFAULT true,
	`employeeMonitor` boolean NOT NULL DEFAULT false,
	`platformLogs` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `RolePermission_id` PRIMARY KEY(`id`),
	CONSTRAINT `RolePermission_employeeId_key` UNIQUE(`employeeId`)
);
--> statement-breakpoint
CREATE TABLE `ServerReview` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191),
	`customerId` varchar(191),
	`minecraftUsername` varchar(191) NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ServerReview_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `SiteNotification` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'INFO',
	`link` varchar(500),
	`startAt` datetime NOT NULL,
	`expireAt` datetime,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `SiteNotification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `StreamBlacklist` (
	`id` varchar(191) NOT NULL,
	`channelId` varchar(191) NOT NULL,
	`channelTitle` varchar(191),
	`reason` text,
	`createdById` varchar(191),
	`createdAt` datetime NOT NULL,
	CONSTRAINT `StreamBlacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `StreamBlacklist_channelId_key` UNIQUE(`channelId`)
);
--> statement-breakpoint
CREATE TABLE `SupportTicket` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191),
	`customerId` varchar(191),
	`assignedToId` varchar(191),
	`subject` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `SupportTicket_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TicketReply` (
	`id` varchar(191) NOT NULL,
	`ticketId` varchar(191) NOT NULL,
	`employeeId` varchar(191),
	`authorName` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `TicketReply_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TournamentAnnouncement` (
	`id` varchar(191) NOT NULL,
	`tournamentId` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'INFO',
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TournamentAnnouncement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TournamentMatch` (
	`id` varchar(191) NOT NULL,
	`tournamentId` varchar(191) NOT NULL,
	`round` int NOT NULL,
	`matchIndex` int NOT NULL,
	`player1Id` varchar(191),
	`player2Id` varchar(191),
	`winnerId` varchar(191),
	`score1` int,
	`score2` int,
	`status` enum('SCHEDULED','LIVE','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
	`scheduledAt` datetime,
	`playedAt` datetime,
	`notes` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TournamentMatch_id` PRIMARY KEY(`id`),
	CONSTRAINT `TournamentMatch_tournamentId_round_matchIndex_key` UNIQUE(`tournamentId`,`round`,`matchIndex`)
);
--> statement-breakpoint
CREATE TABLE `TournamentRegistration` (
	`id` varchar(191) NOT NULL,
	`tournamentId` varchar(191) NOT NULL,
	`userId` varchar(191),
	`minecraftUsername` varchar(191) NOT NULL,
	`minecraftUuid` varchar(191),
	`discordUsername` varchar(191) NOT NULL,
	`discordId` varchar(191),
	`teamName` varchar(191),
	`teamMembers` json,
	`email` varchar(191) NOT NULL,
	`region` varchar(191) NOT NULL,
	`age` int,
	`agreedToRules` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TournamentRegistration_id` PRIMARY KEY(`id`),
	CONSTRAINT `TournamentRegistration_tournamentId_minecraftUsername_key` UNIQUE(`tournamentId`,`minecraftUsername`)
);
--> statement-breakpoint
CREATE TABLE `Tournament` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`bannerUrl` varchar(500),
	`type` enum('SOLO','DUO','SQUAD') NOT NULL DEFAULT 'SOLO',
	`gameMode` varchar(191) NOT NULL,
	`dateTime` datetime NOT NULL,
	`registrationDeadline` datetime NOT NULL,
	`maxParticipants` int NOT NULL,
	`entryFee` decimal(10,2),
	`prizePool` varchar(191),
	`discordLink` varchar(500),
	`rules` text NOT NULL,
	`serverIp` varchar(191),
	`status` enum('UPCOMING','LIVE','COMPLETED') NOT NULL DEFAULT 'UPCOMING',
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Tournament_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(191),
	`image` varchar(500),
	`microsoftAccountId` varchar(191),
	`passwordHash` varchar(255),
	`role` enum('SUPER_ADMIN','EMPLOYEE','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_key` UNIQUE(`email`),
	CONSTRAINT `User_microsoftAccountId_key` UNIQUE(`microsoftAccountId`)
);
--> statement-breakpoint
CREATE TABLE `YouTubeCache` (
	`id` varchar(191) NOT NULL,
	`cacheKey` varchar(191) NOT NULL,
	`data` json NOT NULL,
	`cachedAt` datetime NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `YouTubeCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `YouTubeCache_cacheKey_key` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `YouTubeContent` (
	`id` varchar(191) NOT NULL,
	`channelId` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`thumbnailUrl` varchar(500),
	`publishedAt` datetime,
	`contentType` varchar(50) NOT NULL DEFAULT 'UPLOAD',
	`isLive` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `YouTubeContent_id` PRIMARY KEY(`id`),
	CONSTRAINT `YouTubeContent_videoId_key` UNIQUE(`videoId`)
);
--> statement-breakpoint
CREATE INDEX `ActivityLog_employeeId_fkey` ON `ActivityLog` (`employeeId`);--> statement-breakpoint
CREATE INDEX `ActivityLog_createdAt_idx` ON `ActivityLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ActivityLog_entity_idx` ON `ActivityLog` (`entity`);--> statement-breakpoint
CREATE INDEX `ActivityLog_severity_idx` ON `ActivityLog` (`severity`);--> statement-breakpoint
CREATE INDEX `FeaturedStream_status_idx` ON `FeaturedStream` (`status`);--> statement-breakpoint
CREATE INDEX `Notification_userId_fkey` ON `Notification` (`userId`);--> statement-breakpoint
CREATE INDEX `Notification_createdAt_idx` ON `Notification` (`createdAt`);--> statement-breakpoint
CREATE INDEX `OrderItem_orderId_fkey` ON `OrderItem` (`orderId`);--> statement-breakpoint
CREATE INDEX `OrderItem_productId_fkey` ON `OrderItem` (`productId`);--> statement-breakpoint
CREATE INDEX `Order_status_idx` ON `Order` (`status`);--> statement-breakpoint
CREATE INDEX `Order_deliveryStatus_idx` ON `Order` (`deliveryStatus`);--> statement-breakpoint
CREATE INDEX `Order_createdAt_idx` ON `Order` (`createdAt`);--> statement-breakpoint
CREATE INDEX `Order_minecraftUsername_idx` ON `Order` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `PhoneOtpRequest_phoneNumber_idx` ON `PhoneOtpRequest` (`phoneNumber`);--> statement-breakpoint
CREATE INDEX `PhoneOtpRequest_createdAt_idx` ON `PhoneOtpRequest` (`createdAt`);--> statement-breakpoint
CREATE INDEX `PlayerBan_employeeId_fkey` ON `PlayerBan` (`employeeId`);--> statement-breakpoint
CREATE INDEX `PlayerBan_customerId_fkey` ON `PlayerBan` (`customerId`);--> statement-breakpoint
CREATE INDEX `PlayerBan_tournamentId_fkey` ON `PlayerBan` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `PlayerBan_minecraftUsername_idx` ON `PlayerBan` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `PlayerBan_active_idx` ON `PlayerBan` (`active`);--> statement-breakpoint
CREATE INDEX `PlayerBan_createdAt_idx` ON `PlayerBan` (`createdAt`);--> statement-breakpoint
CREATE INDEX `PlayerNote_employeeId_fkey` ON `PlayerNote` (`employeeId`);--> statement-breakpoint
CREATE INDEX `PlayerNote_customerId_fkey` ON `PlayerNote` (`customerId`);--> statement-breakpoint
CREATE INDEX `PlayerNote_minecraftUsername_idx` ON `PlayerNote` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `PlayerNote_createdAt_idx` ON `PlayerNote` (`createdAt`);--> statement-breakpoint
CREATE INDEX `PlayerRank_customerId_fkey` ON `PlayerRank` (`customerId`);--> statement-breakpoint
CREATE INDEX `PlayerRank_minecraftUsername_idx` ON `PlayerRank` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `PlayerRank_active_idx` ON `PlayerRank` (`active`);--> statement-breakpoint
CREATE INDEX `Product_active_idx` ON `Product` (`active`);--> statement-breakpoint
CREATE INDEX `Product_category_idx` ON `Product` (`category`);--> statement-breakpoint
CREATE INDEX `ServerReview_customerId_fkey` ON `ServerReview` (`customerId`);--> statement-breakpoint
CREATE INDEX `ServerReview_userId_fkey` ON `ServerReview` (`userId`);--> statement-breakpoint
CREATE INDEX `ServerReview_minecraftUsername_idx` ON `ServerReview` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `SiteNotification_active_idx` ON `SiteNotification` (`active`);--> statement-breakpoint
CREATE INDEX `SiteNotification_startAt_idx` ON `SiteNotification` (`startAt`);--> statement-breakpoint
CREATE INDEX `SiteNotification_expireAt_idx` ON `SiteNotification` (`expireAt`);--> statement-breakpoint
CREATE INDEX `SiteNotification_createdAt_idx` ON `SiteNotification` (`createdAt`);--> statement-breakpoint
CREATE INDEX `SupportTicket_assignedToId_fkey` ON `SupportTicket` (`assignedToId`);--> statement-breakpoint
CREATE INDEX `SupportTicket_customerId_fkey` ON `SupportTicket` (`customerId`);--> statement-breakpoint
CREATE INDEX `SupportTicket_userId_fkey` ON `SupportTicket` (`userId`);--> statement-breakpoint
CREATE INDEX `SupportTicket_status_idx` ON `SupportTicket` (`status`);--> statement-breakpoint
CREATE INDEX `TicketReply_ticketId_fkey` ON `TicketReply` (`ticketId`);--> statement-breakpoint
CREATE INDEX `TicketReply_employeeId_fkey` ON `TicketReply` (`employeeId`);--> statement-breakpoint
CREATE INDEX `TournamentAnnouncement_tournamentId_fkey` ON `TournamentAnnouncement` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `TournamentAnnouncement_createdAt_idx` ON `TournamentAnnouncement` (`createdAt`);--> statement-breakpoint
CREATE INDEX `TournamentMatch_tournamentId_fkey` ON `TournamentMatch` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `TournamentMatch_player1Id_fkey` ON `TournamentMatch` (`player1Id`);--> statement-breakpoint
CREATE INDEX `TournamentMatch_player2Id_fkey` ON `TournamentMatch` (`player2Id`);--> statement-breakpoint
CREATE INDEX `TournamentMatch_winnerId_fkey` ON `TournamentMatch` (`winnerId`);--> statement-breakpoint
CREATE INDEX `TournamentRegistration_tournamentId_fkey` ON `TournamentRegistration` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `TournamentRegistration_userId_fkey` ON `TournamentRegistration` (`userId`);--> statement-breakpoint
CREATE INDEX `TournamentRegistration_minecraftUsername_idx` ON `TournamentRegistration` (`minecraftUsername`);--> statement-breakpoint
CREATE INDEX `Tournament_status_idx` ON `Tournament` (`status`);--> statement-breakpoint
CREATE INDEX `Tournament_dateTime_idx` ON `Tournament` (`dateTime`);--> statement-breakpoint
CREATE INDEX `YouTubeContent_channelId_idx` ON `YouTubeContent` (`channelId`);
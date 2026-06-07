CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `account_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`userId` text NOT NULL,
	`balance` text NOT NULL,
	`currency` text NOT NULL,
	`snapshotDate` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `financial_account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`categoryId` text,
	`name` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text DEFAULT 'NZD' NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`startDate` integer NOT NULL,
	`endDate` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `financial_account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'NZD' NOT NULL,
	`balance` text DEFAULT '0' NOT NULL,
	`color` text DEFAULT '#06b6d4' NOT NULL,
	`icon` text,
	`isArchived` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fx_rate_cache` (
	`base` text PRIMARY KEY NOT NULL,
	`ratesJson` text NOT NULL,
	`source` text DEFAULT 'live' NOT NULL,
	`fetchedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryId` text,
	`amount` text NOT NULL,
	`currency` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`frequency` text NOT NULL,
	`dayOfMonth` integer,
	`dayOfWeek` integer,
	`nextDue` integer NOT NULL,
	`lastProcessed` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `financial_account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryId` text,
	`amount` text NOT NULL,
	`currency` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`notes` text,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`receiptUrl` text,
	`receiptKey` text,
	`tags` text,
	`isRecurring` integer DEFAULT false NOT NULL,
	`recurringId` text,
	`transferId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `financial_account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`userId` text PRIMARY KEY NOT NULL,
	`defaultCurrency` text DEFAULT 'NZD' NOT NULL,
	`locale` text DEFAULT 'en-NZ' NOT NULL,
	`fiscalYearStart` integer DEFAULT 4 NOT NULL,
	`taxRate` real DEFAULT 0.33 NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`extraCurrencies` text DEFAULT '[]' NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);

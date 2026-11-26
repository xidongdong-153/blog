CREATE TABLE `site_presence_latest` (
	`id` integer PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL,
	`seq` integer NOT NULL,
	`report` text NOT NULL,
	`received_at` text NOT NULL,
	`expires_at` text NOT NULL,
	CONSTRAINT "site_presence_singleton" CHECK("site_presence_latest"."id" = 1)
);

CREATE TABLE `site_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`document` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`published_revision` integer,
	`slug_locked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_posts_slug_unique` ON `site_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_updated_at_idx` ON `site_posts` (`updated_at`);
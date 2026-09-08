CREATE TABLE `site_friend_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`description` text NOT NULL,
	`avatar_url` text,
	`owner_name` text NOT NULL,
	`email` text NOT NULL,
	`has_added_us` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_token` text,
	`token_expires_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_broken` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service` text DEFAULT 'turso' NOT NULL,
	`status` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`checked_at` integer NOT NULL
);

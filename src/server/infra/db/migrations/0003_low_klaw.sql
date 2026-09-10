CREATE TABLE `site_article_summaries` (
	`slug` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`summary` text NOT NULL,
	`protocol` text NOT NULL,
	`model_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

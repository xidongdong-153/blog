CREATE TABLE `site_ai_summary_config` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL,
	`base_url` text NOT NULL,
	`model_id` text NOT NULL,
	`credential_ciphertext` text,
	`credential_iv` text,
	`credential_auth_tag` text,
	`credential_mask` text,
	`status` text DEFAULT 'needs_check' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

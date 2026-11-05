CREATE TABLE `site_ai_agent_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`model_config_id` text NOT NULL,
	`system_prompt` text NOT NULL,
	`tool_ids` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

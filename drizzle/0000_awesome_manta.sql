CREATE TABLE `analytics_events` (
	`visitor_id` text NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`lecture` text NOT NULL,
	`created_at` integer NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`visitor_id`, `event_id`),
	FOREIGN KEY (`visitor_id`) REFERENCES `analytics_visitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `analytics_events_created_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_lecture_idx` ON `analytics_events` (`lecture`,`created_at`);--> statement-breakpoint
CREATE TABLE `analytics_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`last_session` text NOT NULL
);

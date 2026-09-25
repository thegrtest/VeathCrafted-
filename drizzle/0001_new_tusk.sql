ALTER TABLE `orders` ADD `consultation_requested` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `consultation_notes` text DEFAULT '' NOT NULL;
CREATE TABLE `ready_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`soap_id` text NOT NULL,
	`soap_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`shipping_cents` integer NOT NULL,
	`status` text NOT NULL,
	`stripe_session_id` text,
	`customer_email` text,
	`shipping_name` text,
	`shipping_address` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`paid_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ready_orders_stripe_session_id_unique` ON `ready_orders` (`stripe_session_id`);
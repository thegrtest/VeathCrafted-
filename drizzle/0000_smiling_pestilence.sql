CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`delivery_zip` text NOT NULL,
	`base` text NOT NULL,
	`scent` text NOT NULL,
	`texture` text NOT NULL,
	`quantity` integer NOT NULL,
	`hardness` integer,
	`water_supplier` text,
	`water_source` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`estimated_total_cents` integer NOT NULL
);

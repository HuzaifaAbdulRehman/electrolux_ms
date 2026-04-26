-- Create missing tables to match Drizzle schema without breaking existing app

-- outages
CREATE TABLE IF NOT EXISTS `outages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `area_name` varchar(255) NOT NULL,
  `zone` varchar(50) NOT NULL,
  `outage_type` enum('planned','unplanned') NOT NULL,
  `reason` text,
  `severity` enum('low','medium','high','critical') NOT NULL,
  `scheduled_start_time` datetime,
  `scheduled_end_time` datetime,
  `actual_start_time` datetime,
  `actual_end_time` datetime,
  `affected_customer_count` int DEFAULT 0,
  `status` enum('scheduled','ongoing','restored','cancelled') NOT NULL,
  `restoration_notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `outages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

-- system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `category` enum('general','billing','security','system','electricity','tariffs','notifications') NOT NULL,
  `data_type` enum('string','number','boolean') NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `system_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint

-- connection_requests
CREATE TABLE IF NOT EXISTS `connection_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `application_number` varchar(50) NOT NULL,
  `applicant_name` varchar(255) NOT NULL,
  `father_name` varchar(255),
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `alternate_phone` varchar(20),
  `id_type` enum('passport','drivers_license','national_id','voter_id','aadhaar') NOT NULL,
  `id_number` varchar(100) NOT NULL,
  `property_type` enum('Residential','Commercial','Industrial','Agricultural') NOT NULL,
  `connection_type` varchar(50) NOT NULL,
  `load_required` decimal(10,2),
  `property_address` varchar(500) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100),
  `pincode` varchar(10),
  `landmark` varchar(255),
  `preferred_date` date,
  `purpose_of_connection` enum('domestic','business','industrial','agricultural') NOT NULL,
  `existing_connection` boolean NOT NULL DEFAULT FALSE,
  `existing_account_number` varchar(50),
  `status` enum('pending','under_review','approved','rejected','connected') NOT NULL DEFAULT 'pending',
  `estimated_charges` decimal(10,2),
  `inspection_date` date,
  `approval_date` date,
  `installation_date` date,
  `application_date` date NOT NULL,
  `account_number` varchar(50),
  `temporary_password` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `connection_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `connection_requests_application_number_unique` UNIQUE(`application_number`)
);
CREATE INDEX IF NOT EXISTS `idx_status` ON `connection_requests`(`status`);
CREATE INDEX IF NOT EXISTS `idx_email` ON `connection_requests`(`email`);
--> statement-breakpoint

-- bill_requests
CREATE TABLE IF NOT EXISTS `bill_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `request_id` varchar(50) NOT NULL,
  `customer_id` int NOT NULL,
  `billing_month` date NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `notes` text,
  `status` enum('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
  `request_date` date NOT NULL,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `bill_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `bill_requests_request_id_unique` UNIQUE(`request_id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `unique_request_month` ON `bill_requests`(`customer_id`,`billing_month`);
--> statement-breakpoint

-- Add FKs after table creation to avoid dependency issues
ALTER TABLE `outages`
  ADD CONSTRAINT IF NOT EXISTS `outages_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION;

ALTER TABLE `bill_requests`
  ADD CONSTRAINT IF NOT EXISTS `bill_requests_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS `bill_requests_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;




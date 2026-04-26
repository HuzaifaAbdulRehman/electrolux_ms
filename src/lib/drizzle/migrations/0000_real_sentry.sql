CREATE TABLE `bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`bill_number` varchar(50) NOT NULL,
	`billing_month` date NOT NULL,
	`issue_date` date NOT NULL,
	`due_date` date NOT NULL,
	`units_consumed` decimal(10,2) NOT NULL,
	`meter_reading_id` int,
	`base_amount` decimal(10,2) NOT NULL,
	`fixed_charges` decimal(10,2) NOT NULL,
	`electricity_duty` decimal(10,2) DEFAULT '0.00',
	`gst_amount` decimal(10,2) DEFAULT '0.00',
	`total_amount` decimal(10,2) NOT NULL,
	`status` enum('generated','issued','paid','overdue','cancelled') NOT NULL DEFAULT 'generated',
	`payment_date` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bills_id` PRIMARY KEY(`id`),
	CONSTRAINT `bills_bill_number_unique` UNIQUE(`bill_number`)
);
--> statement-breakpoint
CREATE TABLE `connection_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_number` varchar(50) NOT NULL,
	`customer_id` int,
	`applicant_name` varchar(255) NOT NULL,
	`father_name` varchar(255),
	`email` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`alternate_phone` varchar(20),
	`id_type` enum('passport','drivers_license','national_id','voter_id','aadhaar') NOT NULL,
	`id_number` varchar(100) NOT NULL,
	`property_type` enum('Residential','Commercial','Industrial','Agricultural') NOT NULL,
	`connection_type` enum('single_phase','three_phase','industrial') NOT NULL,
	`load_required` decimal(10,2) NOT NULL,
	`property_address` varchar(500) NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`landmark` varchar(255),
	`preferred_connection_date` date,
	`purpose_of_connection` enum('domestic','business','industrial','agricultural') NOT NULL,
	`status` enum('pending','approved','rejected','under_inspection','connected') NOT NULL DEFAULT 'pending',
	`estimated_charges` decimal(10,2),
	`application_fee_paid` int NOT NULL DEFAULT 0,
	`identity_proof_path` varchar(500),
	`address_proof_path` varchar(500),
	`property_proof_path` varchar(500),
	`site_inspection_date` date,
	`estimated_connection_days` int,
	`rejection_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `connection_applications_application_number_unique` UNIQUE(`application_number`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`account_number` varchar(50) NOT NULL,
	`meter_number` varchar(50) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`address` varchar(500) NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`connection_type` enum('Residential','Commercial','Industrial','Agricultural') NOT NULL,
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`connection_date` date NOT NULL,
	`last_bill_amount` decimal(10,2) DEFAULT '0.00',
	`last_payment_date` date,
	`average_monthly_usage` decimal(10,2) DEFAULT '0.00',
	`outstanding_balance` decimal(10,2) DEFAULT '0.00',
	`payment_status` enum('paid','pending','overdue') NOT NULL DEFAULT 'paid',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_account_number_unique` UNIQUE(`account_number`),
	CONSTRAINT `customers_meter_number_unique` UNIQUE(`meter_number`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`employee_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`designation` varchar(100) NOT NULL,
	`department` varchar(100) NOT NULL,
	`assigned_zone` varchar(100),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`hire_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`user_type` enum('admin','employee','customer') NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`meter_number` varchar(50) NOT NULL,
	`current_reading` decimal(10,2) NOT NULL,
	`previous_reading` decimal(10,2) NOT NULL,
	`units_consumed` decimal(10,2) NOT NULL,
	`reading_date` date NOT NULL,
	`reading_time` timestamp NOT NULL,
	`meter_condition` enum('good','fair','poor','damaged') NOT NULL DEFAULT 'good',
	`accessibility` enum('accessible','partially_accessible','inaccessible') NOT NULL DEFAULT 'accessible',
	`employee_id` int,
	`photo_path` varchar(500),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meter_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tariffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('Residential','Commercial','Industrial','Agricultural') NOT NULL,
	`fixed_charge` decimal(10,2) NOT NULL,
	`slab1_start` int NOT NULL DEFAULT 0,
	`slab1_end` int NOT NULL,
	`slab1_rate` decimal(10,2) NOT NULL,
	`slab2_start` int NOT NULL,
	`slab2_end` int NOT NULL,
	`slab2_rate` decimal(10,2) NOT NULL,
	`slab3_start` int NOT NULL,
	`slab3_end` int NOT NULL,
	`slab3_rate` decimal(10,2) NOT NULL,
	`slab4_start` int NOT NULL,
	`slab4_end` int NOT NULL,
	`slab4_rate` decimal(10,2) NOT NULL,
	`slab5_start` int NOT NULL,
	`slab5_end` int,
	`slab5_rate` decimal(10,2) NOT NULL,
	`time_of_use_peak_rate` decimal(10,2),
	`time_of_use_normal_rate` decimal(10,2),
	`time_of_use_offpeak_rate` decimal(10,2),
	`electricity_duty_percent` decimal(5,2) DEFAULT '0.00',
	`gst_percent` decimal(5,2) DEFAULT '18.00',
	`effective_date` date NOT NULL,
	`valid_until` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tariffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`bill_id` int,
	`payment_amount` decimal(10,2) NOT NULL,
	`payment_method` enum('credit_card','debit_card','bank_transfer','cash','cheque','upi','wallet') NOT NULL,
	`payment_date` date NOT NULL,
	`transaction_id` varchar(100),
	`receipt_number` varchar(50),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'completed',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_transaction_id_unique` UNIQUE(`transaction_id`),
	CONSTRAINT `payments_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`customer_id` int,
	`work_type` enum('meter_reading','maintenance','complaint_resolution','new_connection','disconnection','reconnection') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'assigned',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assigned_date` date NOT NULL,
	`due_date` date NOT NULL,
	`completion_date` date,
	`completion_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`notification_type` enum('payment','bill','maintenance','alert','info','work_order') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`is_read` int NOT NULL DEFAULT 0,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bills` ADD CONSTRAINT `bills_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bills` ADD CONSTRAINT `bills_meter_reading_id_meter_readings_id_fk` FOREIGN KEY (`meter_reading_id`) REFERENCES `meter_readings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connection_applications` ADD CONSTRAINT `connection_applications_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meter_readings` ADD CONSTRAINT `meter_readings_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meter_readings` ADD CONSTRAINT `meter_readings_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_bill_id_bills_id_fk` FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;


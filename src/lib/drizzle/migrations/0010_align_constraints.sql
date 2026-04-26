-- Backward-compatible alignment of constraints and FKs with current app schema

-- Bills: ensure FK to tariffs if present in schema
ALTER TABLE `bills`
  ADD COLUMN IF NOT EXISTS `tariff_id` int,
  ADD CONSTRAINT IF NOT EXISTS `bills_tariff_id_tariffs_id_fk` FOREIGN KEY (`tariff_id`) REFERENCES `tariffs`(`id`) ON DELETE NO ACTION;
--> statement-breakpoint

-- Bills: replace check using non-existent columns with existing ones
ALTER TABLE `bills`
  DROP CHECK IF EXISTS `check_positive_amounts`;
ALTER TABLE `bills`
  ADD CONSTRAINT `check_positive_amounts`
  CHECK (
    `total_amount` >= 0 AND
    `base_amount` >= 0 AND
    `gst_amount` >= 0 AND
    `electricity_duty` >= 0
  );
--> statement-breakpoint

-- Payments: checks must use actual column names
ALTER TABLE `payments`
  DROP CHECK IF EXISTS `check_payment_amount`;
ALTER TABLE `payments`
  ADD CONSTRAINT `check_payment_amount` CHECK (`payment_amount` > 0);
--> statement-breakpoint

-- Work orders: allow nullable employee_id to match schema (unassigned allowed)
ALTER TABLE `work_orders`
  MODIFY COLUMN `employee_id` int NULL;
--> statement-breakpoint

-- Customers: keep meter_number nullable to match schema (optional for new customers)
ALTER TABLE `customers`
  MODIFY COLUMN `meter_number` varchar(50) NULL;
--> statement-breakpoint

-- Notifications and users: keep INT flags (0/1) for compatibility, enforce domain via CHECK
ALTER TABLE `users`
  ADD CONSTRAINT IF NOT EXISTS `check_users_is_active_flag`
  CHECK (`is_active` IN (0,1));
ALTER TABLE `notifications`
  ADD CONSTRAINT IF NOT EXISTS `check_notifications_is_read_flag`
  CHECK (`is_read` IN (0,1));
--> statement-breakpoint

-- Tariff slabs: ensure unique and index exist even if created earlier
ALTER TABLE `tariff_slabs`
  ADD CONSTRAINT IF NOT EXISTS `unique_tariff_slab` UNIQUE (`tariff_id`, `slab_order`);
CREATE INDEX IF NOT EXISTS `idx_tariff_slabs_tariff_id` ON `tariff_slabs`(`tariff_id`);




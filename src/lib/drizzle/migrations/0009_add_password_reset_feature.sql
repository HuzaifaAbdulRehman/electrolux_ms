-- Migration: Add Password Reset Feature
-- Date: 2025-10-30
-- Description: Adds password reset requests table and requires_password_change field to users

-- 1. Add requires_password_change field to users table
ALTER TABLE `users`
ADD COLUMN `requires_password_change` INT NOT NULL DEFAULT 0
COMMENT '1 = must change password on next login, 0 = normal';

-- 2. Create password_reset_requests table
CREATE TABLE `password_reset_requests` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `request_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: PWRST-2025-XXXXX',
  `user_id` INT DEFAULT NULL COMMENT 'References users.id, NULL initially until matched',
  `email` VARCHAR(255) NOT NULL,
  `account_number` VARCHAR(50) DEFAULT NULL COMMENT 'For customers',
  `user_type` ENUM('employee', 'customer') NOT NULL,
  `request_reason` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `temp_password_plain` VARCHAR(255) DEFAULT NULL COMMENT 'Encrypted temporary password for admin display',
  `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` TIMESTAMP NULL DEFAULT NULL,
  `processed_by` INT DEFAULT NULL COMMENT 'Admin user who processed the request',
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Temporary password expiration',
  `rejection_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT `fk_password_reset_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_password_reset_processor`
    FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,

  -- Indexes
  INDEX `idx_status` (`status`),
  INDEX `idx_email` (`email`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insert initial test data (optional - for testing)
-- You can uncomment this after creating your first admin user
-- INSERT INTO `password_reset_requests` (`request_number`, `email`, `user_type`, `status`)
-- VALUES ('PWRST-2025-000001', 'test@example.com', 'customer', 'pending');

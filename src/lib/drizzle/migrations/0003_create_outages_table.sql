-- Create outages table for outage management
CREATE TABLE IF NOT EXISTS `outages` (
  `id` int NOT NULL AUTO_INCREMENT,
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
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_outages_zone` (`zone`),
  KEY `idx_outages_status` (`status`),
  KEY `idx_outages_type` (`outage_type`),
  KEY `idx_outages_created_by` (`created_by`),
  CONSTRAINT `outages_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Create reading_requests table for meter reading requests from customers
CREATE TABLE IF NOT EXISTS `reading_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) NOT NULL UNIQUE,
  `customer_id` int NOT NULL,
  `request_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `preferred_date` date DEFAULT NULL,
  `request_reason` text,
  `priority` enum('normal','urgent') NOT NULL DEFAULT 'normal',
  `status` enum('pending','assigned','completed','cancelled') NOT NULL DEFAULT 'pending',
  `notes` text,
  `work_order_id` int DEFAULT NULL,
  `assigned_date` timestamp NULL DEFAULT NULL,
  `completed_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `reading_requests_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reading_requests_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

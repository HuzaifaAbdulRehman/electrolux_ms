-- Add tariff_id field to bills table for audit trail
-- This allows tracking which tariff version was used for each bill

ALTER TABLE `bills` 
ADD COLUMN `tariff_id` int DEFAULT NULL,
ADD INDEX `idx_bills_tariff_id` (`tariff_id`),
ADD CONSTRAINT `bills_tariff_id_fk` 
  FOREIGN KEY (`tariff_id`) REFERENCES `tariffs` (`id`) 
  ON DELETE SET NULL;

-- Add comment for documentation
ALTER TABLE `bills` 
MODIFY COLUMN `tariff_id` int DEFAULT NULL COMMENT 'Reference to tariff version used for this bill (audit trail)';


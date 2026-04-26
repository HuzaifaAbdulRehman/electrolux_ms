-- Make load_required optional in connection_applications and connection_requests
-- Migration: 0008_make_load_required_optional

-- Modify connection_applications table
ALTER TABLE `connection_applications`
MODIFY COLUMN `load_required` DECIMAL(10, 2) NULL
COMMENT 'kW - Optional, determined during inspection';

-- connection_requests already has it as nullable, no change needed

-- Update existing records with NULL if they have unrealistic default values
UPDATE `connection_applications`
SET `load_required` = NULL
WHERE `load_required` = 0 OR `load_required` = 5;


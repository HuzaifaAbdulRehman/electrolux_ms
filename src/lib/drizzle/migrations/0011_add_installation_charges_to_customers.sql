-- Add installation_charges column to customers table
-- This field tracks the installation/connection fees for offline customer registrations
-- Matches the estimatedCharges field from online connection requests for consistency

ALTER TABLE `customers`
ADD COLUMN `installation_charges` DECIMAL(10, 2) NULL AFTER `connection_date`;

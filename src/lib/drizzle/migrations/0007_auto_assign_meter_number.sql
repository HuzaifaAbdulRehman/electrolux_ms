-- Migration: Auto-assign meter number system
-- This migration updates the customers table to support auto-assignment of meter numbers

-- Make meter_number optional (nullable)
ALTER TABLE customers MODIFY COLUMN meter_number VARCHAR(50) NULL;

-- Add pending_installation status to the status enum
ALTER TABLE customers MODIFY COLUMN status ENUM('pending_installation', 'active', 'suspended', 'inactive') DEFAULT 'active' NOT NULL;

-- Add index for better performance on meter number lookups
CREATE INDEX idx_customers_meter_number ON customers(meter_number);

-- Add index for status-based queries
CREATE INDEX idx_customers_status ON customers(status);

-- Update existing customers with NULL meter_number to have a generated one
-- This ensures data consistency for existing records
UPDATE customers 
SET meter_number = CONCAT('MTR-GEN-', LPAD(id, 6, '0'))
WHERE meter_number IS NULL;


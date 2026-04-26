-- Add zone column to connection_requests table
ALTER TABLE `connection_requests`
ADD COLUMN `zone` VARCHAR(50) NULL AFTER `landmark`;

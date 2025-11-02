-- ============================================
-- ADD QR CODE FIELD AND UNIQUE CONSTRAINTS
-- ============================================

USE ichrqhmy_perfectbrows;

-- Add unique constraint to phone number (prevent duplicates)
ALTER TABLE `customers`
ADD UNIQUE INDEX `idx_phone_unique` (`phone`);

-- Add unique constraint to email (prevent duplicates)
-- Allow NULL emails since email is optional
ALTER TABLE `customers`
ADD UNIQUE INDEX `idx_email_unique` (`email`);

-- Add QR code field to customers table
-- This will store a unique QR code identifier for each customer
ALTER TABLE `customers`
ADD COLUMN `qr_code` VARCHAR(255) NULL AFTER `email_consent`,
ADD UNIQUE INDEX `idx_qr_code_unique` (`qr_code`);

-- Verify the changes
SHOW CREATE TABLE customers;

-- Expected result:
-- - phone has UNIQUE index
-- - email has UNIQUE index
-- - qr_code column exists with UNIQUE index

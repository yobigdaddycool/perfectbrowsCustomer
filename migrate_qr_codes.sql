-- ============================================
-- QR Code Migration Script
-- ============================================
-- Purpose: Migrate QR codes from appointments table to customer_qr_codes table
-- Run this ONLY if you have an existing database with qr_code in appointments
-- ============================================

USE ichrqhmy_PerfectCustomer;

-- ============================================
-- STEP 1: Create customer_qr_codes table
-- ============================================

CREATE TABLE IF NOT EXISTS `customer_qr_codes` (
  `qr_code_id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `qr_code_value` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_update_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`qr_code_id`),
  UNIQUE KEY `idx_qr_code_value` (`qr_code_value`),
  KEY `idx_customer_active` (`customer_id`, `is_active`),
  CONSTRAINT `fk_customer_qr_codes_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`customer_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 2: Migrate existing QR codes (if any exist in appointments)
-- ============================================
-- This will take the most recent QR code per customer
-- and make it the active QR code in the new table

INSERT IGNORE INTO customer_qr_codes (customer_id, qr_code_value, is_active, created_at)
SELECT
    customer_id,
    qr_code,
    1,
    NOW()
FROM (
    SELECT
        customer_id,
        qr_code,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) as rn
    FROM appointments
    WHERE qr_code IS NOT NULL
    AND qr_code != ''
) AS ranked
WHERE rn = 1;

-- ============================================
-- STEP 3: Remove qr_code from appointments table
-- ============================================

-- First, remove the unique index on qr_code
ALTER TABLE appointments DROP INDEX IF EXISTS idx_qr_code;

-- Then, remove the qr_code column
ALTER TABLE appointments DROP COLUMN IF EXISTS qr_code;

-- ============================================
-- STEP 4: Add unique constraint for active QR codes
-- ============================================
-- This ensures only ONE active QR code per customer

ALTER TABLE `customer_qr_codes`
ADD CONSTRAINT `unique_active_qr_per_customer`
UNIQUE (`customer_id`, `is_active`);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show the structure of the new table
DESCRIBE customer_qr_codes;

-- Show how many QR codes were migrated
SELECT
    'Total QR codes migrated' as description,
    COUNT(*) as count
FROM customer_qr_codes;

-- Show QR codes per customer
SELECT
    customer_id,
    COUNT(*) as qr_count,
    SUM(is_active) as active_count
FROM customer_qr_codes
GROUP BY customer_id
ORDER BY customer_id;

-- Verify appointments table no longer has qr_code
DESCRIBE appointments;

-- ============================================
-- END OF MIGRATION SCRIPT
-- ============================================

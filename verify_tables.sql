-- ============================================
-- VERIFY PRIMARY KEYS AND INDEXES
-- Run these queries to verify your tables are set up correctly
-- ============================================

USE ichrqhmy_perfectbrows;

-- Check if all tables were created
SHOW TABLES;

-- Verify PRIMARY KEYS for each table
-- ============================================

-- Check customers table
SHOW KEYS FROM customers WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE customers;

-- Check customer_photos table
SHOW KEYS FROM customer_photos WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE customer_photos;

-- Check stylists table
SHOW KEYS FROM stylists WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE stylists;

-- Check services table
SHOW KEYS FROM services WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE services;

-- Check visit_types table
SHOW KEYS FROM visit_types WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE visit_types;

-- Check appointments table
SHOW KEYS FROM appointments WHERE Key_name = 'PRIMARY';
SHOW CREATE TABLE appointments;

-- ============================================
-- VERIFY UNIQUE INDEXES
-- ============================================

-- Check unique indexes
SHOW INDEX FROM customers WHERE Non_unique = 0;
SHOW INDEX FROM appointments WHERE Non_unique = 0;

-- ============================================
-- VERIFY FOREIGN KEYS
-- ============================================

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = 'ichrqhmy_perfectbrows'
    AND TABLE_NAME IN ('appointments', 'customer_photos');

-- ============================================
-- COUNT RECORDS IN EACH TABLE
-- ============================================

SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
UNION ALL
SELECT 'customer_photos', COUNT(*) FROM customer_photos
UNION ALL
SELECT 'stylists', COUNT(*) FROM stylists
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'visit_types', COUNT(*) FROM visit_types
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- - Each table should show a PRIMARY KEY
-- - customers should have idx_phone as UNIQUE
-- - appointments should have idx_qr_code as UNIQUE
-- - stylists should have 4 records (Anna, Layla, Maria, Nora)
-- - services should have 5 records (Threading, Waxing, Tinting, Lashes, Facial)
-- - visit_types should have 3 records (New, Returning, Walk-in)
-- ============================================

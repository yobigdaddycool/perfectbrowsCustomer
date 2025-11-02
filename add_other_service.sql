-- ============================================
-- ADD "OTHER" SERVICE TO SERVICES TABLE
-- ============================================

USE ichrqhmy_perfectbrows;

-- Insert "Other" as a new service
-- The service_id will auto-increment to 6
INSERT INTO `services` (`service_name`) VALUES ('Other');

-- Verify the insertion
SELECT * FROM services ORDER BY service_name ASC;

-- Expected result: 6 services total
-- Alphabetical order: Facial, Lashes, Other, Threading, Tinting, Waxing

-- ============================================
-- SEED TEST DATA
-- 3 Test Customers with Appointments
-- ============================================

USE ichrqhmy_perfectbrows;

-- ============================================
-- INSERT TEST CUSTOMERS
-- ============================================

INSERT INTO `customers` (`first_name`, `last_name`, `phone`, `email`, `sms_consent`, `email_consent`) VALUES
('TestFirstName01', 'TestLastName01', '555-123-4567', 'testcustomer01@example.com', 1, 1),
('TestFirstName02', 'TestLastName02', '555-234-5678', 'testcustomer02@example.com', 1, 0),
('TestFirstName03', 'TestLastName03', '555-345-6789', 'testcustomer03@example.com', 0, 1);

-- ============================================
-- INSERT TEST CUSTOMER PHOTOS
-- ============================================
-- Note: These reference photo files that should exist in tempdata/customer_photos/
-- For now, these are placeholder entries

INSERT INTO `customer_photos` (`customer_id`, `file_name`, `file_path`, `photo_type`, `is_primary`) VALUES
(1, 'customer_1_1699123456_profile.jpg', 'tempdata/customer_photos/customer_1_1699123456_profile.jpg', 'profile', 1),
(2, 'customer_2_1699234567_profile.jpg', 'tempdata/customer_photos/customer_2_1699234567_profile.jpg', 'profile', 1),
(3, 'customer_3_1699345678_profile.jpg', 'tempdata/customer_photos/customer_3_1699345678_profile.jpg', 'profile', 1),
(1, 'customer_1_1699123457_before.jpg', 'tempdata/customer_photos/customer_1_1699123457_before.jpg', 'before', 0),
(1, 'customer_1_1699123458_after.jpg', 'tempdata/customer_photos/customer_1_1699123458_after.jpg', 'after', 0);

-- ============================================
-- INSERT TEST APPOINTMENTS
-- ============================================
-- Using existing stylists (Anna=1, Layla=2, Maria=3, Nora=4)
-- Using existing services (Threading=1, Waxing=2, Tinting=3, Lashes=4, Facial=5)
-- Using existing visit_types (New=1, Returning=2, Walk-in=3)

INSERT INTO `appointments` (
    `customer_id`,
    `stylist_id`,
    `service_id`,
    `visit_type_id`,
    `appointment_date`,
    `appointment_time`,
    `quoted_price`,
    `notes`,
    `qr_code`,
    `check_in_status`
) VALUES
-- Customer 1: Past appointment (completed)
(
    1,
    1, -- Anna
    1, -- Threading
    1, -- New
    '2025-10-15',
    '10:00:00',
    15.00,
    'First time customer. Allergic to certain creams. Very satisfied with service.',
    'a8f5f167-2f0a-4c8e-9c8b-3d5e2a6f1b4c',
    'completed'
),

-- Customer 1: Upcoming appointment (pending)
(
    1,
    2, -- Layla
    3, -- Tinting
    2, -- Returning
    '2025-11-15',
    '14:30:00',
    20.00,
    'Returning customer. Prefers Layla. Wants eyebrow tinting.',
    'b9e6e278-3e1b-5d9f-0d9c-4e6f3b7g2c5d',
    'pending'
),

-- Customer 2: Today's appointment (checked in)
(on the register page, i need the search button link to be poitning to the search 
    2,
    3, -- Maria
    4, -- Lashes
    1, -- New
    CURDATE(),
    '11:00:00',
    50.00,
    'Walk-in customer. Interested in lash extensions. Sensitive skin.',
    'c0f7f389-4f2c-6e0g-1e0d-5f7g4c8h3d6e',
    'checked_in'
),

-- Customer 2: Future appointment
(
    2,
    4, -- Nora
    2, -- Waxing
    2, -- Returning
    '2025-11-20',
    '15:00:00',
    25.00,
    'Prefers Nora for waxing services. Regular customer.',
    'd1g8g490-5g3d-7f1h-2f1e-6g8h5d9i4e7f',
    'pending'
),

-- Customer 3: Upcoming appointment
(
    3,
    1, -- Anna
    5, -- Facial
    3, -- Walk-in
    '2025-11-18',
    '13:00:00',
    60.00,
    'Walk-in appointment. Requested full facial treatment. First time facial customer.',
    'e2h9h501-6h4e-8g2i-3g2f-7h9i6e0j5f8g',
    'pending'
),

-- Customer 3: Past no-show
(
    3,
    2, -- Layla
    1, -- Threading
    1, -- New
    '2025-10-01',
    '09:00:00',
    15.00,
    'Did not show up for appointment. No call.',
    'f3i0i612-7i5f-9h3j-4h3g-8i0j7f1k6g9h',
    'no_show'
);

-- ============================================
-- VERIFY SEED DATA
-- ============================================

SELECT '=== CUSTOMERS ===' as '';
SELECT * FROM customers;

SELECT '=== CUSTOMER PHOTOS ===' as '';
SELECT * FROM customer_photos;

SELECT '=== APPOINTMENTS ===' as '';
SELECT
    a.appointment_id,
    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
    CONCAT(s.first_name, ' ', s.last_name) as stylist_name,
    srv.service_name,
    vt.type_name as visit_type,
    a.appointment_date,
    a.appointment_time,
    a.quoted_price,
    a.check_in_status,
    a.qr_code
FROM appointments a
JOIN customers c ON a.customer_id = c.customer_id
JOIN stylists s ON a.stylist_id = s.stylist_id
JOIN services srv ON a.service_id = srv.service_id
JOIN visit_types vt ON a.visit_type_id = vt.visit_type_id
ORDER BY a.appointment_date DESC, a.appointment_time;

-- ============================================
-- SUMMARY
-- ============================================

SELECT '=== DATA SUMMARY ===' as '';
SELECT
    'Total Customers' as metric,
    COUNT(*) as count
FROM customers
UNION ALL
SELECT
    'Total Photos',
    COUNT(*)
FROM customer_photos
UNION ALL
SELECT
    'Total Appointments',
    COUNT(*)
FROM appointments
UNION ALL
SELECT
    'Pending Appointments',
    COUNT(*)
FROM appointments
WHERE check_in_status = 'pending'
UNION ALL
SELECT
    'Checked-In Today',
    COUNT(*)
FROM appointments
WHERE check_in_status = 'checked_in' AND appointment_date = CURDATE();

-- ============================================
-- TEST DATA CREATED:
-- ============================================
-- ✓ 3 Test Customers
--   - TestFirstName01 TestLastName01 (2 appointments, 3 photos)
--   - TestFirstName02 TestLastName02 (2 appointments, 1 photo)
--   - TestFirstName03 TestLastName03 (2 appointments, 1 photo)
--
-- ✓ 6 Test Appointmentsyr
--   - 1 Completed (past)
--   - 1 Checked-in (today)
--   - 1 No-show (past)
--   - 3 Pending (future)
--
-- ✓ 5 Photo Records (actual photo files need to be created separately)
--
-- ✓ All appointments have unique QR codes for testing check-in
-- ============================================

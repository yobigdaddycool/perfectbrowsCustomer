-- ============================================
-- SEED TEST DATA
-- 3 Test Customers with Appointments
-- ============================================

USE ichrqhmy_perfectbrows;

-- ============================================
-- INSERT DEFAULT CONSENT FORM
-- ============================================

INSERT INTO `consent_forms` (
    `title`,
    `version`,
    `body`,
    `effective_date`,
    `is_active`
) VALUES (
    'Perfect Brow Services Consent',
    '2024-01',
    CONCAT(
        'I acknowledge that I have read, understood, and agree to the following terms and conditions:',
        '\n\n',
        'No Refund Policy',
        '\n',
        'I understand and agree that all services provided by the salon are non-refundable. While the salon strives to deliver the highest quality of service, no refunds will be issued under any circumstances. If I am dissatisfied with a service, the salon may, at its sole discretion, attempt to rectify the issue.',
        '\n\n',
        'General Acknowledgment of Risk',
        '\n',
        'I understand that the services offered by the salon, including but not limited to haircuts, makeup, microblading, eyebrow shaping, waxing, threading, facials, and hairstyling, involve certain risks. I voluntarily assume all such risks and agree that the salon and its technicians shall not be liable for any adverse reactions, injuries, or dissatisfaction resulting from any service provided.',
        '\n\n',
        'Eyelash Extension Services',
        '\n',
        'If availing of eyelash extension services, I specifically agree to the following terms:',
        '\n',
        'a. I acknowledge and understand that there are inherent risks associated with the application and removal of artificial eyelashes. These risks may include, but are not limited to, irritation, discomfort, allergic reactions, swelling, itching, pain, and, in rare cases, infection.',
        '\n',
        'b. I understand that eyelash extensions will be applied to my natural eyelashes as determined by the technician to maintain the health, growth, and natural appearance of my eyelashes. Excessive weight on natural lashes will be avoided to prevent damage.',
        '\n',
        'c. I acknowledge that despite proper application and removal procedures, adhesive materials used in the process may become dislodged during or after the procedure, potentially causing irritation or requiring additional follow-up care.',
        '\n',
        'd. I agree to follow all aftercare instructions provided by the technician. I understand that failure to adhere to these instructions may result in the premature shedding of the extensions, potential irritation, or damage to my natural eyelashes.',
        '\n',
        'e. I understand that the eyelash extension procedure requires me to keep my eyes closed for a period of approximately 60 to 100 minutes while lying in a reclined position. I acknowledge that if I have any medical conditions that could be aggravated by remaining still for an extended period, I may be unable to undergo the procedure.',
        '\n',
        'f. If I experience any adverse reactions, irritation, or complications following the procedure, I agree to immediately contact my technician for removal and, if necessary, consult a physician at my own expense.',
        '\n\n',
        'Duration of Agreement',
        '\n',
        'This agreement shall remain in effect for all procedures performed by my technician for one (1) year from the date of signing.',
        '\n\n',
        'Age Requirement',
        '\n',
        'I affirm that I am at least 18 years of age. If I am under the age of 18 but at least 13 years old, I understand that a parent or legal guardian must also sign this form. Services will not be provided to individuals under the age of 13.',
        '\n\n',
        'Release of Liability',
        '\n',
        'I hereby release and hold harmless the salon, its owners, employees, and contractors from any and all liability, claims, damages, or expenses arising out of or in connection with any services rendered. I assume full responsibility for any risks, known or unknown, associated with the services I receive.',
        '\n\n',
        'Consent to Treatment',
        '\n',
        'By signing below, I acknowledge that I have read and fully understand this agreement. I voluntarily agree to undergo the requested services and accept all terms and conditions outlined herein.'
    ),
    '2024-01-01',
    1
);

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
-- Using existing stylists (Any=1, Anna=2, Layla=3, Maria=4, Nora=5)
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
-- ? 3 Test Customers
--   - TestFirstName01 TestLastName01 (2 appointments, 3 photos)
--   - TestFirstName02 TestLastName02 (2 appointments, 1 photo)
--   - TestFirstName03 TestLastName03 (2 appointments, 1 photo)
--
-- ? 6 Test Appointments
--   - 1 Completed (past)
--   - 1 Checked-in (today)
--   - 1 No-show (past)
--   - 3 Pending (future)
--
-- ? 5 Photo Records (actual photo files need to be created separately)
--
-- ? All appointments have unique QR codes for testing check-in
-- ============================================






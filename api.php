<?php
// api.php - Single API endpoint for all requests

// Forcing no caching for testing purposes
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Force error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Set CORS headers to allow requests from Angular
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Add security check - only allow from your domain
$allowed_origins = [
    'http://website-2eb58030.ich.rqh.mybluehost.me',
    'https://website-2eb58030.ich.rqh.mybluehost.me',
    'http://localhost:4200' // For local Angular development
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// Include database configuration
require_once 'db-config.php';

// Get the action from URL
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Initialize response
$response = [
    'success' => false,
    'message' => '',
    'data' => null,
    'error' => null,
    'debug' => []
];

try {
    $response['debug'][] = "Single API Endpoint: api.php";
    $response['debug'][] = "Action requested: " . ($action ?: 'none');
    $response['debug'][] = "PHP Version: " . PHP_VERSION;
    
    switch($action) {
        case 'test-connection':
            testConnection($response);
            break;
        case 'get-test-data':
            getTestData($response);
            break;
        case 'search-customers':
            searchCustomers($response);
            break;
        case 'get-services':
            getServices($response);
            break;
        case 'get-visit-types':
            getVisitTypes($response);
            break;
        case 'get-stylists':
            getStylists($response);
            break;
        case 'get-customer':
            getCustomer($response);
            break;
        case 'update-customer':
            updateCustomer($response);
            break;
        case 'create-customer':
            createCustomer($response);
            break;
        case 'scan-qr':
            scanQRCode($response);
            break;
        case 'check-duplicate-phone':
            checkDuplicatePhone($response);
            break;
        default:
            $response['success'] = false;
            $response['message'] = 'No action specified';
            $response['error'] = 'Valid actions: test-connection, get-test-data, search-customers, get-services, get-visit-types, get-stylists, get-customer, update-customer, create-customer, scan-qr, check-duplicate-phone';
            $response['debug'][] = "Available actions: test-connection, get-test-data, search-customers, get-services, get-visit-types, get-stylists, get-customer, update-customer, create-customer, scan-qr, check-duplicate-phone";
            break;
    }
    
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'API processing error';
    $response['error'] = $e->getMessage();
    $response['debug'][] = "Exception: " . $e->getMessage();
}

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT);

// API Functions

function testConnection(&$response) {
    global $pdo;
    
    try {
        $response['debug'][] = "PDO MySQL Available: " . (extension_loaded('pdo_mysql') ? 'Yes' : 'No');
        
        // Test database connection with fixed query
        $test_query = "SELECT 1 as test_result, NOW() as current_time_value, VERSION() as mysql_version";
        $stmt = $pdo->query($test_query);
        $result = $stmt->fetch();
        
        $response['success'] = true;
        $response['message'] = "Database connection successful via centralized API!";
        $response['data'] = [
            'queryResult' => $result,
            'testData' => null
        ];
        $response['debug'][] = "✅ Database test query executed successfully";
        $response['debug'][] = "Basic query test: PASSED - MySQL Version: " . $result['mysql_version'];
        
    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Database connection failed";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function getTestData(&$response) {
    global $pdo;

    try {
        // Check if test_data table exists
        $table_check = $pdo->query("SHOW TABLES LIKE 'test_data'");
        $table_exists = $table_check->rowCount() > 0;
        $response['debug'][] = "Table 'test_data' exists: " . ($table_exists ? 'Yes' : 'No');

        if ($table_exists) {
            // Get test data
            $select_sql = "SELECT * FROM test_data ORDER BY created_at DESC";
            $stmt = $pdo->query($select_sql);
            $test_data = $stmt->fetchAll();

            $response['success'] = true;
            $response['message'] = "Test data retrieved successfully";
            $response['data'] = [
                'testData' => $test_data
            ];
            $response['debug'][] = "Found " . count($test_data) . " records in test_data table";
        } else {
            $response['success'] = true;
            $response['message'] = "Test data table does not exist";
            $response['data'] = [
                'testData' => []
            ];
            $response['debug'][] = "Table 'test_data' not found";
        }

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve test data";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function searchCustomers(&$response) {
    global $pdo;

    try {
        // Get search parameters
        $firstName = $_GET['firstName'] ?? '';
        $lastName = $_GET['lastName'] ?? '';
        $phone = $_GET['phone'] ?? '';
        $dateFrom = $_GET['dateFrom'] ?? '';
        $dateTo = $_GET['dateTo'] ?? '';
        $serviceId = $_GET['serviceId'] ?? '';
        $visitTypeId = $_GET['visitTypeId'] ?? '';

        $response['debug'][] = "Search params - First: $firstName, Last: $lastName, Phone: $phone";

        // Build SQL query
        $sql = "SELECT DISTINCT
            c.customer_id,
            c.first_name,
            c.last_name,
            c.phone,
            c.email,
            c.is_active,
            MAX(cp.file_path) as profile_photo,
            MAX(a.appointment_date) as last_visit,
            COUNT(DISTINCT a.appointment_id) as total_visits,
            (SELECT a2.appointment_date
             FROM appointments a2
             WHERE a2.customer_id = c.customer_id
             AND a2.appointment_date >= CURDATE()
             ORDER BY a2.appointment_date ASC
             LIMIT 1) as next_appointment,
            (SELECT CONCAT(s2.first_name, ' ', s2.last_name)
             FROM appointments a2
             JOIN stylists s2 ON a2.stylist_id = s2.stylist_id
             WHERE a2.customer_id = c.customer_id
             AND a2.appointment_date >= CURDATE()
             ORDER BY a2.appointment_date ASC
             LIMIT 1) as next_appointment_stylist
        FROM customers c
        LEFT JOIN customer_photos cp ON c.customer_id = cp.customer_id AND cp.is_primary = 1
        LEFT JOIN appointments a ON c.customer_id = a.customer_id
        WHERE 1=1";

        $params = [];

        // Add search conditions
        if (!empty($firstName)) {
            $sql .= " AND c.first_name LIKE :firstName";
            $params[':firstName'] = "%$firstName%";
        }

        if (!empty($lastName)) {
            $sql .= " AND c.last_name LIKE :lastName";
            $params[':lastName'] = "%$lastName%";
        }

        if (!empty($phone)) {
            // Strip all non-numeric characters for phone search
            $cleanPhone = preg_replace('/\D/', '', $phone);
            $sql .= " AND REPLACE(REPLACE(REPLACE(c.phone, '-', ''), '(', ''), ')', '') LIKE :phone";
            $params[':phone'] = "%$cleanPhone%";
        }

        if (!empty($dateFrom)) {
            $sql .= " AND a.appointment_date >= :dateFrom";
            $params[':dateFrom'] = $dateFrom;
        }

        if (!empty($dateTo)) {
            $sql .= " AND a.appointment_date <= :dateTo";
            $params[':dateTo'] = $dateTo;
        }

        if (!empty($serviceId)) {
            $sql .= " AND a.service_id = :serviceId";
            $params[':serviceId'] = $serviceId;
        }

        if (!empty($visitTypeId)) {
            $sql .= " AND a.visit_type_id = :visitTypeId";
            $params[':visitTypeId'] = $visitTypeId;
        }

        $sql .= " GROUP BY c.customer_id";
        $sql .= " ORDER BY c.last_name, c.first_name";

        $response['debug'][] = "Executing search query with " . count($params) . " parameters";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results = array_map(function ($row) {
            $row['is_active'] = (int)($row['is_active'] ?? 1);
            $row['status'] = $row['is_active'] === 1 ? 'active' : 'inactive';
            return $row;
        }, $results);

        $response['success'] = true;
        $response['message'] = "Search completed successfully";
        $response['data'] = $results;
        $response['debug'][] = "Found " . count($results) . " customer(s)";

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Search failed";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function getServices(&$response) {
    global $pdo;

    try {
        $sql = "SELECT service_id, service_name, default_price
                FROM services
                WHERE is_active = 1
                ORDER BY display_order, service_name";

        $stmt = $pdo->query($sql);
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "Services retrieved successfully";
        $response['data'] = $services;
        $response['debug'][] = "Found " . count($services) . " active service(s)";

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve services";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function getVisitTypes(&$response) {
    global $pdo;

    try {
        $sql = "SELECT visit_type_id, type_name
                FROM visit_types
                WHERE is_active = 1
                ORDER BY display_order, type_name";

        $stmt = $pdo->query($sql);
        $visitTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "Visit types retrieved successfully";
        $response['data'] = $visitTypes;
        $response['debug'][] = "Found " . count($visitTypes) . " active visit type(s)";

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve visit types";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function getStylists(&$response) {
    global $pdo;

    try {
        $sql = "SELECT stylist_id, first_name, last_name
                FROM stylists
                WHERE is_active = 1
                ORDER BY display_order, first_name, last_name";

        $stmt = $pdo->query($sql);
        $stylists = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "Stylists retrieved successfully";
        $response['data'] = $stylists;
        $response['debug'][] = "Found " . count($stylists) . " active stylist(s)";

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve stylists";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function getCustomer(&$response) {
    global $pdo;

    try {
        $customerId = $_GET['customerId'] ?? '';

        if (empty($customerId)) {
            $response['success'] = false;
            $response['message'] = "Customer ID is required";
            $response['error'] = "Missing customerId parameter";
            return;
        }

        $response['debug'][] = "Fetching customer ID: $customerId";

        // Get customer basic info
        $sql = "SELECT
                c.customer_id,
                c.first_name,
                c.last_name,
                c.phone,
                c.email,
                c.sms_consent,
                c.email_consent,
                c.is_active,
                c.created_at,
                cp.file_path as profile_photo
            FROM customers c
            LEFT JOIN customer_photos cp ON c.customer_id = cp.customer_id AND cp.is_primary = 1
            WHERE c.customer_id = :customerId";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':customerId' => $customerId]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$customer) {
            $response['success'] = false;
            $response['message'] = "Customer not found";
            $response['error'] = "No customer with ID: $customerId";
            $response['debug'][] = "Customer ID $customerId does not exist";
            return;
        }

        $customer['is_active'] = (int)($customer['is_active'] ?? 1);
        $customer['status'] = $customer['is_active'] === 1 ? 'active' : 'inactive';

        // Get active QR code value if available
        $qrSql = "SELECT qr_code_value
                  FROM customer_qr_codes
                  WHERE customer_id = :customerId AND is_active = 1
                  ORDER BY qr_code_id DESC
                  LIMIT 1";
        $stmt = $pdo->prepare($qrSql);
        $stmt->execute([':customerId' => $customerId]);
        $qrRow = $stmt->fetch(PDO::FETCH_ASSOC);
        $customer['qr_code_value'] = $qrRow ? $qrRow['qr_code_value'] : null;

        // Get most recent appointment details
        $appointmentSql = "SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.stylist_id,
                a.service_id,
                a.quoted_price,
                a.notes,
                vt.type_name as visit_type,
                s.first_name as stylist_first_name,
                s.last_name as stylist_last_name,
                srv.service_name
            FROM appointments a
            LEFT JOIN visit_types vt ON a.visit_type_id = vt.visit_type_id
            LEFT JOIN stylists s ON a.stylist_id = s.stylist_id
            LEFT JOIN services srv ON a.service_id = srv.service_id
            WHERE a.customer_id = :customerId
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT 1";

        $stmt = $pdo->prepare($appointmentSql);
        $stmt->execute([':customerId' => $customerId]);
        $lastAppointment = $stmt->fetch(PDO::FETCH_ASSOC);

        // Combine appointment date and time if available
        if ($lastAppointment && $lastAppointment['appointment_date']) {
            if ($lastAppointment['appointment_time']) {
                $lastAppointment['appointment_datetime'] = $lastAppointment['appointment_date'] . ' ' . $lastAppointment['appointment_time'];
            } else {
                $lastAppointment['appointment_datetime'] = $lastAppointment['appointment_date'] . ' 00:00:00';
            }
        }

        $customer['last_appointment'] = $lastAppointment;

        $response['success'] = true;
        $response['message'] = "Customer retrieved successfully";
        $response['data'] = $customer;
        $response['debug'][] = "Customer data loaded for: " . $customer['first_name'] . " " . $customer['last_name'];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve customer";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function updateCustomer(&$response) {
    global $pdo;

    try {
        // Get POST data (expecting JSON)
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            $response['error'] = "Failed to parse JSON";
            return;
        }

        $customerId = $data['customerId'] ?? '';
        $firstName = $data['firstName'] ?? '';
        $lastName = $data['lastName'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $smsConsent = isset($data['smsConsent']) ? (int)$data['smsConsent'] : 0;
        $emailConsent = isset($data['emailConsent']) ? (int)$data['emailConsent'] : 0;
        $photo = $data['photo'] ?? null; // Base64 photo string
        $deletePhoto = isset($data['deletePhoto']) ? (bool)$data['deletePhoto'] : false;
        $qrAction = isset($data['qrAction']) ? strtolower(trim((string)$data['qrAction'])) : null;

        // Appointment data
        $appointmentDate = $data['date'] ?? null;
        $appointmentTime = $data['time'] ?? null;
        $stylistId = $data['stylist'] ?? null;
        $serviceId = $data['service'] ?? null;
        $visitType = $data['visitType'] ?? null;
        $notes = $data['notes'] ?? '';
        $quotedPrice = $data['price'] ?? null;

        $response['debug'][] = "Updating customer ID: $customerId";
        $response['debug'][] = "Appointment data received: date=$appointmentDate, time=$appointmentTime, stylist=$stylistId, service=$serviceId";
        if ($deletePhoto) {
            $response['debug'][] = "Photo deletion requested";
        }

        // Validate required fields
        if (empty($customerId) || empty($firstName) || empty($lastName) || empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "customerId, firstName, lastName, and phone are required";
            return;
        }

        // Check if customer exists
        $checkSql = "SELECT customer_id, is_active FROM customers WHERE customer_id = :customerId";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':customerId' => $customerId]);

        $existingCustomer = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingCustomer) {
            $response['success'] = false;
            $response['message'] = "Customer not found";
            $response['error'] = "No customer with ID: $customerId";
            return;
        }

        if ((int)$existingCustomer['is_active'] !== 1) {
            $response['success'] = false;
            $response['message'] = "Inactive customers cannot be modified";
            $response['error'] = "CUSTOMER_INACTIVE";
            $response['debug'][] = "Update blocked: customer $customerId is inactive";
            return;
        }

        // Update customer information
        $updateSql = "UPDATE customers SET
            first_name = :firstName,
            last_name = :lastName,
            phone = :phone,
            email = :email,
            sms_consent = :smsConsent,
            email_consent = :emailConsent,
            updated_at = NOW()
            WHERE customer_id = :customerId";

        $stmt = $pdo->prepare($updateSql);
        $stmt->execute([
            ':firstName' => $firstName,
            ':lastName' => $lastName,
            ':phone' => $phone,
            ':email' => $email,
            ':smsConsent' => $smsConsent,
            ':emailConsent' => $emailConsent,
            ':customerId' => $customerId
        ]);

        $response['debug'][] = "Customer information updated";

        // Update appointment if data provided
        if (!empty($appointmentDate)) {
            $response['debug'][] = "📅 Updating appointment information...";

            // Convert stylist name to ID if it's a string
            $stylistIdResolved = $stylistId;
            if (!empty($stylistId) && !is_numeric($stylistId)) {
                $response['debug'][] = "Converting stylist name '$stylistId' to ID...";
                $getStylistSql = "SELECT stylist_id FROM stylists WHERE first_name = :stylistName";
                $stmt = $pdo->prepare($getStylistSql);
                $stmt->execute([':stylistName' => $stylistId]);
                $stylistRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($stylistRow) {
                    $stylistIdResolved = $stylistRow['stylist_id'];
                    $response['debug'][] = "Stylist '$stylistId' resolved to ID: $stylistIdResolved";
                } else {
                    $response['debug'][] = "⚠️ Stylist name '$stylistId' not found in database";
                    $stylistIdResolved = null;
                }
            }

            // Convert service name to ID if it's a string
            $serviceIdResolved = $serviceId;
            if (!empty($serviceId) && !is_numeric($serviceId)) {
                $response['debug'][] = "Converting service name '$serviceId' to ID...";
                $getServiceSql = "SELECT service_id FROM services WHERE service_name = :serviceName";
                $stmt = $pdo->prepare($getServiceSql);
                $stmt->execute([':serviceName' => $serviceId]);
                $serviceRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($serviceRow) {
                    $serviceIdResolved = $serviceRow['service_id'];
                    $response['debug'][] = "Service '$serviceId' resolved to ID: $serviceIdResolved";
                } else {
                    $response['debug'][] = "⚠️ Service name '$serviceId' not found in database";
                    $serviceIdResolved = null;
                }
            }

            // Get the most recent appointment for this customer
            $getAppointmentSql = "SELECT appointment_id FROM appointments
                                  WHERE customer_id = :customerId
                                  ORDER BY appointment_date DESC, appointment_time DESC
                                  LIMIT 1";
            $stmt = $pdo->prepare($getAppointmentSql);
            $stmt->execute([':customerId' => $customerId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($appointment) {
                $appointmentId = $appointment['appointment_id'];
                $response['debug'][] = "Found appointment ID: $appointmentId";

                // Update the appointment
                $updateAppointmentSql = "UPDATE appointments SET
                    appointment_date = :appointmentDate,
                    appointment_time = :appointmentTime,
                    stylist_id = :stylistId,
                    service_id = :serviceId,
                    notes = :notes,
                    quoted_price = :quotedPrice
                    WHERE appointment_id = :appointmentId";

                $stmt = $pdo->prepare($updateAppointmentSql);
                $stmt->execute([
                    ':appointmentDate' => $appointmentDate,
                    ':appointmentTime' => $appointmentTime ?: null,
                    ':stylistId' => $stylistIdResolved,
                    ':serviceId' => $serviceIdResolved,
                    ':notes' => $notes,
                    ':quotedPrice' => $quotedPrice ?: null,
                    ':appointmentId' => $appointmentId
                ]);

                $response['debug'][] = "✅ Appointment updated successfully";
            } else {
                $response['debug'][] = "⚠️ No existing appointment found for this customer";
            }
        } else {
            $response['debug'][] = "ℹ️ No appointment date provided, skipping appointment update";
        }

        // Handle photo deletion if requested
        if ($deletePhoto) {
            $response['debug'][] = "🗑️ Processing photo deletion...";

            // Set all photos for this customer as non-primary (soft delete)
            $deletePhotoSql = "UPDATE customer_photos SET is_primary = 0 WHERE customer_id = :customerId";
            $stmt = $pdo->prepare($deletePhotoSql);
            $stmt->execute([':customerId' => $customerId]);

            $affectedRows = $stmt->rowCount();
            $response['debug'][] = "🗑️ Photos affected by deletion: $affectedRows row(s)";
            $response['debug'][] = "✅ Photo marked as deleted (is_primary = 0)";
            $response['photoDeleted'] = true;
        } else {
            $response['debug'][] = "ℹ️ No photo deletion requested (deletePhoto = false or not set)";
        }

        // Handle photo upload if provided
        $photoPath = null;
        if (!empty($photo)) {
            $response['debug'][] = "Processing photo upload...";

            // Remove data:image/jpeg;base64, prefix if present
            if (strpos($photo, 'data:image') === 0) {
                $photo = substr($photo, strpos($photo, ',') + 1);
            }

            // Decode base64
            $photoData = base64_decode($photo);

            if ($photoData === false) {
                $response['debug'][] = "⚠️ Failed to decode base64 photo";
            } else {
                // Create directory if it doesn't exist
                $uploadDir = __DIR__ . '/tempdata/customer_photos';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                    $response['debug'][] = "Created directory: $uploadDir";
                }

                // Generate filename: customer_{id}_{timestamp}_profile.jpg
                $timestamp = time();
                $fileName = "customer_{$customerId}_{$timestamp}_profile.jpg";
                $filePath = $uploadDir . '/' . $fileName;
                $relativePath = "tempdata/customer_photos/" . $fileName;

                // Save file
                $saved = file_put_contents($filePath, $photoData);

                if ($saved === false) {
                    $response['debug'][] = "⚠️ Failed to save photo to filesystem";
                } else {
                    $response['debug'][] = "✅ Photo saved: $relativePath";
                    $photoPath = $relativePath;

                    // Update customer_photos table
                    // First, set all existing photos for this customer as non-primary
                    $updatePhotosSql = "UPDATE customer_photos SET is_primary = 0 WHERE customer_id = :customerId";
                    $stmt = $pdo->prepare($updatePhotosSql);
                    $stmt->execute([':customerId' => $customerId]);

                    // Insert new photo as primary
                    $insertPhotoSql = "INSERT INTO customer_photos
                        (customer_id, file_name, file_path, photo_type, is_primary, uploaded_at)
                        VALUES (:customerId, :fileName, :filePath, 'profile', 1, NOW())";

                    $stmt = $pdo->prepare($insertPhotoSql);
                    $stmt->execute([
                        ':customerId' => $customerId,
                        ':fileName' => $fileName,
                        ':filePath' => $relativePath
                    ]);

                    $response['debug'][] = "✅ Photo record inserted into database";
                }
            }
        }

        $qrCodeValue = null;
        $successMessage = "Customer updated successfully";

        if ($qrAction === 'delete') {
            try {
                $deactivateQrSql = "UPDATE customer_qr_codes SET is_active = 0 WHERE customer_id = :customerId";
                $stmt = $pdo->prepare($deactivateQrSql);
                $stmt->execute([':customerId' => $customerId]);
                $response['debug'][] = "🗑️ QR code deactivated for customer ID: $customerId";
                $successMessage = "QR code removed successfully";
            } catch (PDOException $qrException) {
                $response['debug'][] = "⚠️ Failed to deactivate QR code: " . $qrException->getMessage();
            }
        } elseif ($qrAction === 'regenerate') {
            $qrPayload = [
                'customerId' => (string)$customerId,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'phone' => $phone,
                'email' => $email,
                'generatedAt' => gmdate('c')
            ];

            $encodedPayload = json_encode($qrPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            if ($encodedPayload === false) {
                $response['debug'][] = "⚠️ Failed to encode QR payload during regenerate";
            } else {
                try {
                    $deactivateQrSql = "UPDATE customer_qr_codes SET is_active = 0 WHERE customer_id = :customerId";
                    $stmt = $pdo->prepare($deactivateQrSql);
                    $stmt->execute([':customerId' => $customerId]);

                    $insertQrSql = "INSERT INTO customer_qr_codes (customer_id, qr_code_value, is_active, created_at)
                        VALUES (:customerId, :qrCodeValue, 1, NOW())";
                    $stmt = $pdo->prepare($insertQrSql);
                    $stmt->execute([
                        ':customerId' => $customerId,
                        ':qrCodeValue' => $encodedPayload
                    ]);

                    $response['debug'][] = "✅ QR code regenerated for customer ID: $customerId";
                    $successMessage = "QR code regenerated successfully";
                } catch (PDOException $qrException) {
                    $response['debug'][] = "⚠️ Failed to regenerate QR code: " . $qrException->getMessage();
                }
            }
        }

        // Fetch the current active QR code (if any) to return to client
        $currentQrSql = "SELECT qr_code_value
                         FROM customer_qr_codes
                         WHERE customer_id = :customerId AND is_active = 1
                         ORDER BY qr_code_id DESC
                         LIMIT 1";
        $stmt = $pdo->prepare($currentQrSql);
        $stmt->execute([':customerId' => $customerId]);
        $qrRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($qrRow) {
            $qrCodeValue = $qrRow['qr_code_value'];
        }

        $response['success'] = true;
        $response['message'] = $successMessage;
        $response['data'] = [
            'customerId' => $customerId,
            'photoPath' => $photoPath,
            'qrCodeValue' => $qrCodeValue
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to update customer";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    } catch (Exception $e) {
        $response['success'] = false;
        $response['message'] = "Failed to update customer";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ Exception: " . $e->getMessage();
    }
}

function checkDuplicatePhone(&$response) {
    global $pdo;

    try {
        $phone = $_GET['phone'] ?? '';

        if (empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Phone number is required";
            $response['error'] = "Missing phone parameter";
            return;
        }

        // Clean the phone number (remove all non-numeric characters)
        $cleanPhone = preg_replace('/\D/', '', $phone);

        $response['debug'][] = "Checking for duplicate phone: $cleanPhone";

        // Check if phone is all ones (1111111111) - this is allowed to be duplicated
        if ($cleanPhone === '1111111111') {
            $response['success'] = true;
            $response['message'] = "All-ones phone number is allowed (for testing/opt-out)";
            $response['exists'] = false; // Allow duplicate
            $response['debug'][] = "Phone is all ones - allowing duplicate";
            return;
        }

        // Check if phone already exists in database
        $sql = "SELECT customer_id, first_name, last_name
                FROM customers
                WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', '') = :phone
                LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':phone' => $cleanPhone]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $response['success'] = true;
            $response['message'] = "Phone number already exists";
            $response['exists'] = true;
            $response['data'] = $existing;
            $response['debug'][] = "Phone found for customer: " . $existing['first_name'] . " " . $existing['last_name'];
        } else {
            $response['success'] = true;
            $response['message'] = "Phone number is unique";
            $response['exists'] = false;
            $response['debug'][] = "Phone number is available";
        }

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to check phone number";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

function createCustomer(&$response) {
    global $pdo;

    try {
        // Get POST data (expecting JSON)
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            $response['error'] = "Failed to parse JSON";
            return;
        }

        $firstName = $data['firstName'] ?? '';
        $lastName = $data['lastName'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $smsConsent = isset($data['smsConsent']) ? (int)$data['smsConsent'] : 0;
        $emailConsent = isset($data['emailConsent']) ? (int)$data['emailConsent'] : 0;
        $photo = $data['photo'] ?? null;

        // Appointment data
        $appointmentDate = $data['date'] ?? null;
        $appointmentTime = $data['time'] ?? null;
        $stylistId = $data['stylist'] ?? null;
        $serviceId = $data['service'] ?? null;
        $visitType = $data['visitType'] ?? null;
        $notes = $data['notes'] ?? '';
        $quotedPrice = $data['price'] ?? null;

        $response['debug'][] = "Creating new customer: $firstName $lastName";

        // Validate required fields
        if (empty($firstName) || empty($lastName) || empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "firstName, lastName, and phone are required";
            return;
        }

        // Insert customer
        $insertCustomerSql = "INSERT INTO customers
            (first_name, last_name, phone, email, sms_consent, email_consent, created_at, updated_at)
            VALUES (:firstName, :lastName, :phone, :email, :smsConsent, :emailConsent, NOW(), NOW())";

        $stmt = $pdo->prepare($insertCustomerSql);
        $stmt->execute([
            ':firstName' => $firstName,
            ':lastName' => $lastName,
            ':phone' => $phone,
            ':email' => $email,
            ':smsConsent' => $smsConsent,
            ':emailConsent' => $emailConsent
        ]);

        $customerId = $pdo->lastInsertId();
        $response['debug'][] = "✅ Customer created with ID: $customerId";

        // Create appointment if date provided
        if (!empty($appointmentDate)) {
            $response['debug'][] = "📅 Creating appointment...";

            // Convert stylist name to ID
            $stylistIdResolved = null;
            if (!empty($stylistId) && !is_numeric($stylistId)) {
                $getStylistSql = "SELECT stylist_id FROM stylists WHERE first_name = :stylistName";
                $stmt = $pdo->prepare($getStylistSql);
                $stmt->execute([':stylistName' => $stylistId]);
                $stylistRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($stylistRow) {
                    $stylistIdResolved = $stylistRow['stylist_id'];
                }
            } else {
                $stylistIdResolved = $stylistId;
            }

            // Convert service name to ID
            $serviceIdResolved = null;
            if (!empty($serviceId) && !is_numeric($serviceId)) {
                $getServiceSql = "SELECT service_id FROM services WHERE service_name = :serviceName";
                $stmt = $pdo->prepare($getServiceSql);
                $stmt->execute([':serviceName' => $serviceId]);
                $serviceRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($serviceRow) {
                    $serviceIdResolved = $serviceRow['service_id'];
                }
            } else {
                $serviceIdResolved = $serviceId;
            }

            // Get visit type ID
            $visitTypeId = null;
            if (!empty($visitType)) {
                $getVisitTypeSql = "SELECT visit_type_id FROM visit_types WHERE type_name = :typeName";
                $stmt = $pdo->prepare($getVisitTypeSql);
                $stmt->execute([':typeName' => $visitType]);
                $visitTypeRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($visitTypeRow) {
                    $visitTypeId = $visitTypeRow['visit_type_id'];
                }
            }

            // Insert appointment
            $insertAppointmentSql = "INSERT INTO appointments
                (customer_id, appointment_date, appointment_time, stylist_id, service_id, visit_type_id, notes, quoted_price)
                VALUES (:customerId, :appointmentDate, :appointmentTime, :stylistId, :serviceId, :visitTypeId, :notes, :quotedPrice)";

            $stmt = $pdo->prepare($insertAppointmentSql);
            $stmt->execute([
                ':customerId' => $customerId,
                ':appointmentDate' => $appointmentDate,
                ':appointmentTime' => $appointmentTime ?: null,
                ':stylistId' => $stylistIdResolved,
                ':serviceId' => $serviceIdResolved,
                ':visitTypeId' => $visitTypeId,
                ':notes' => $notes,
                ':quotedPrice' => $quotedPrice ?: null
            ]);

            $response['debug'][] = "✅ Appointment created";
        }

        // Handle photo upload if provided
        $photoPath = null;
        if (!empty($photo)) {
            $response['debug'][] = "📸 Processing photo upload...";

            // Remove data:image/jpeg;base64, prefix if present
            if (strpos($photo, 'data:image') === 0) {
                $photo = substr($photo, strpos($photo, ',') + 1);
            }

            // Decode base64
            $photoData = base64_decode($photo);

            if ($photoData !== false) {
                // Create directory if it doesn't exist
                $uploadDir = __DIR__ . '/tempdata/customer_photos';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                // Generate filename
                $timestamp = time();
                $fileName = "customer_{$customerId}_{$timestamp}_profile.jpg";
                $filePath = $uploadDir . '/' . $fileName;
                $relativePath = "tempdata/customer_photos/" . $fileName;

                // Save file
                if (file_put_contents($filePath, $photoData) !== false) {
                    $photoPath = $relativePath;

                    // Insert photo record
                    $insertPhotoSql = "INSERT INTO customer_photos
                        (customer_id, file_name, file_path, photo_type, is_primary, uploaded_at)
                        VALUES (:customerId, :fileName, :filePath, 'profile', 1, NOW())";

                    $stmt = $pdo->prepare($insertPhotoSql);
                    $stmt->execute([
                        ':customerId' => $customerId,
                        ':fileName' => $fileName,
                        ':filePath' => $relativePath
                    ]);

                    $response['debug'][] = "✅ Photo saved: $relativePath";
                }
            }
        }

        // Generate QR code value for this customer
        $qrPayload = [
            'customerId' => (string)$customerId,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'phone' => $phone,
            'email' => $email,
            'generatedAt' => gmdate('c')
        ];

        $qrCodeValue = json_encode($qrPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($qrCodeValue === false) {
            $response['debug'][] = "⚠️ Failed to encode QR payload to JSON";
            $qrCodeValue = null;
        } else {
            $response['debug'][] = "📇 Generated QR payload: " . $qrCodeValue;
        }

        if ($qrCodeValue !== null) {
            try {
                // Deactivate any existing QR codes for this customer (safety)
                $deactivateQrSql = "UPDATE customer_qr_codes SET is_active = 0 WHERE customer_id = :customerId";
                $stmt = $pdo->prepare($deactivateQrSql);
                $stmt->execute([':customerId' => $customerId]);

                // Insert the active QR code record
                $insertQrSql = "INSERT INTO customer_qr_codes (customer_id, qr_code_value, is_active, created_at)
                    VALUES (:customerId, :qrCodeValue, 1, NOW())";
                $stmt = $pdo->prepare($insertQrSql);
                $stmt->execute([
                    ':customerId' => $customerId,
                    ':qrCodeValue' => $qrCodeValue
                ]);

                $response['debug'][] = "✅ QR code stored for customer ID: $customerId";
            } catch (PDOException $qrException) {
                $response['debug'][] = "⚠️ Failed to persist QR code: " . $qrException->getMessage();
            }
        }

        $response['success'] = true;
        $response['message'] = "Customer created successfully";
        $response['data'] = [
            'customerId' => $customerId,
            'photoPath' => $photoPath,
            'qrCodeValue' => $qrCodeValue
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to create customer";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    } catch (Exception $e) {
        $response['success'] = false;
        $response['message'] = "Failed to create customer";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ Exception: " . $e->getMessage();
    }
}

function scanQRCode(&$response) {
    global $pdo;

    try {
        $rawBody = file_get_contents('php://input');
        $decodedBody = json_decode($rawBody, true);

        if (!is_array($decodedBody)) {
            $decodedBody = $_POST;
        }

        $payload = $decodedBody['payload'] ?? ($_POST['payload'] ?? $_GET['payload'] ?? '');

        if (is_array($payload)) {
            $payload = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        $payload = trim((string)$payload);

        if ($payload === '') {
            $response['success'] = false;
            $response['message'] = "QR payload is required";
            $response['error'] = "MISSING_QR_PAYLOAD";
            $response['debug'][] = "❌ scan-qr: Missing payload";
            return;
        }

        $response['debug'][] = "🔍 scan-qr payload sample: " . substr($payload, 0, 200);

        $decodedPayload = json_decode($payload, true);

        if (!is_array($decodedPayload)) {
            $base64Decoded = base64_decode($payload, true);
            if ($base64Decoded !== false) {
                $decodedPayload = json_decode($base64Decoded, true);
                if (is_array($decodedPayload)) {
                    $payload = json_encode($decodedPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    $response['debug'][] = "🔁 Payload converted from base64";
                }
            }
        }

        if (!is_array($decodedPayload)) {
            $response['success'] = false;
            $response['message'] = "QR payload could not be parsed";
            $response['error'] = "INVALID_QR_PAYLOAD";
            $response['debug'][] = "❌ scan-qr: Invalid JSON payload";
            return;
        }

        $normalizedPayload = json_encode($decodedPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $customerId = $decodedPayload['customerId'] ?? $decodedPayload['customer_id'] ?? null;

        $response['debug'][] = "🔎 Normalized payload: " . $normalizedPayload;
        $response['debug'][] = "🆔 Customer ID from payload: " . ($customerId ?? 'none');

        $matchType = 'qr-code';
        $row = null;

        if ($normalizedPayload) {
            $lookupSql = "SELECT c.customer_id, c.first_name, c.last_name, c.is_active, q.created_at
                          FROM customer_qr_codes q
                          INNER JOIN customers c ON c.customer_id = q.customer_id
                          WHERE q.is_active = 1 AND q.qr_code_value = :qrValue
                          ORDER BY q.qr_code_id DESC
                          LIMIT 1";

            $stmt = $pdo->prepare($lookupSql);
            $stmt->execute([':qrValue' => $normalizedPayload]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $response['debug'][] = "⚠️ No match found for QR value. Falling back to customer ID.";
            }
        }

        if (!$row && $customerId) {
            $matchType = 'customer-id';
            $fallbackSql = "SELECT c.customer_id, c.first_name, c.last_name, c.is_active, q.created_at
                            FROM customers c
                            LEFT JOIN customer_qr_codes q ON q.customer_id = c.customer_id AND q.is_active = 1
                            WHERE c.customer_id = :customerId
                            ORDER BY q.qr_code_id DESC
                            LIMIT 1";

            $stmt = $pdo->prepare($fallbackSql);
            $stmt->execute([':customerId' => $customerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$row) {
            $response['success'] = false;
            $response['message'] = "Customer not found for scanned QR code";
            $response['error'] = "QR_CUSTOMER_NOT_FOUND";
            $response['debug'][] = "❌ scan-qr: No customer located for payload.";
            return;
        }

        $fullName = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $isActive = (int)($row['is_active'] ?? 1) === 1;

        $response['success'] = true;
        $response['message'] = $fullName
            ? ($isActive ? "Found customer: $fullName" : "Found inactive customer: $fullName")
            : ($isActive ? "Customer located via QR scan" : "Inactive customer located via QR scan");
        $response['data'] = [
            'customerId' => (int)$row['customer_id'],
            'fullName' => $fullName,
            'matchType' => $matchType,
            'qrGeneratedAt' => $decodedPayload['generatedAt'] ?? ($row['created_at'] ?? null),
            'isActive' => $isActive,
            'status' => $isActive ? 'active' : 'inactive'
        ];
        $response['debug'][] = "✅ scan-qr: Customer matched with ID " . $row['customer_id'];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to look up QR code";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ scan-qr PDO Exception: " . $e->getMessage();
    } catch (Exception $e) {
        $response['success'] = false;
        $response['message'] = "Failed to process QR code";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ scan-qr Exception: " . $e->getMessage();
    }
}
?>

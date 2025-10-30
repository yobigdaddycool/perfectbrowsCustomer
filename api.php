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
        default:
            $response['success'] = false;
            $response['message'] = 'No action specified';
            $response['error'] = 'Valid actions: test-connection, get-test-data, search-customers, get-services, get-visit-types, get-stylists, get-customer, update-customer';
            $response['debug'][] = "Available actions: test-connection, get-test-data, search-customers, get-services, get-visit-types, get-stylists, get-customer, update-customer";
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
        if ($lastAppointment && $lastAppointment['appointment_date'] && $lastAppointment['appointment_time']) {
            $lastAppointment['appointment_datetime'] = $lastAppointment['appointment_date'] . ' ' . $lastAppointment['appointment_time'];
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

        $response['debug'][] = "Updating customer ID: $customerId";

        // Validate required fields
        if (empty($customerId) || empty($firstName) || empty($lastName) || empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "customerId, firstName, lastName, and phone are required";
            return;
        }

        // Check if customer exists
        $checkSql = "SELECT customer_id FROM customers WHERE customer_id = :customerId";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':customerId' => $customerId]);

        if (!$checkStmt->fetch()) {
            $response['success'] = false;
            $response['message'] = "Customer not found";
            $response['error'] = "No customer with ID: $customerId";
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

        $response['success'] = true;
        $response['message'] = "Customer updated successfully";
        $response['data'] = [
            'customerId' => $customerId,
            'photoPath' => $photoPath
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
?>
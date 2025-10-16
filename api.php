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
        default:
            $response['success'] = false;
            $response['message'] = 'No action specified';
            $response['error'] = 'Valid actions: test-connection, get-test-data';
            $response['debug'][] = "Available actions: test-connection, get-test-data";
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
            $select_sql = "SELECT * FROM test_data ORDER BY created_at DESC LIMIT 3";
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
?>
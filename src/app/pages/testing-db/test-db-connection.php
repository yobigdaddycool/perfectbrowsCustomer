<?php

//forcing no caching for testing purposes
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

// Database configuration
$host = '50.6.108.147';
$port = '3306';
$dbname = 'ichrqhmy_test';
$username = 'ichrqhmy_testuser';
$password = 'Destruction123!';

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'queryResult' => null,
    'error' => null,
    'debug' => []
];

try {
    $response['debug'][] = "PHP Version: " . PHP_VERSION;
    $response['debug'][] = "PDO MySQL Available: " . (extension_loaded('pdo_mysql') ? 'Yes' : 'No');
    $response['debug'][] = "Attempting connection to: $host:$port, database: $dbname, user: $username";
    
    // Create connection
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $connection = new PDO($dsn, $username, $password, $options);
    $response['debug'][] = "✅ PDO Connection established successfully!";
    
    // FIXED: Use backticks for reserved keywords or use different alias names
    $test_query = "SELECT 1 as test_result, NOW() as current_time_value, VERSION() as mysql_version";
    $stmt = $connection->query($test_query);
    $result = $stmt->fetch();
    
    $response['success'] = true;
    $response['message'] = "Database connection successful!";
    $response['queryResult'] = $result;
    $response['debug'][] = "Basic query test: PASSED - MySQL Version: " . $result['mysql_version'];

    // Check if test_data table exists and get some sample data
    $table_check = $connection->query("SHOW TABLES LIKE 'test_data'");
    $table_exists = $table_check->rowCount() > 0;
    $response['debug'][] = "Table 'test_data' exists: " . ($table_exists ? 'Yes' : 'No');

    if ($table_exists) {
        // Try to get some data from test_data table
        $select_sql = "SELECT * FROM test_data ORDER BY created_at DESC LIMIT 3";
        $stmt = $connection->query($select_sql);
        $test_data = $stmt->fetchAll();
        $response['debug'][] = "Found " . count($test_data) . " records in test_data table";
        $response['testData'] = $test_data;
    }

} catch (PDOException $e) {
    $error_message = $e->getMessage();
    $response['success'] = false;
    $response['message'] = "Database connection failed";
    $response['error'] = $error_message;
    $response['debug'][] = "❌ PDO Exception: " . $error_message;
    
    // Try alternative connection with different options
    $response['debug'][] = "Attempting connection with different options...";
    try {
        $options_alt = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        $connection = new PDO($dsn, $username, $password, $options_alt);
        $response['debug'][] = "✅ Connection successful with alternative options!";
        
        // Test the fixed query again
        $test_query = "SELECT 1 as test_result, NOW() as current_time_value, VERSION() as mysql_version";
        $stmt = $connection->query($test_query);
        $result = $stmt->fetch();
        
        $response['success'] = true;
        $response['message'] = "Database connection successful!";
        $response['queryResult'] = $result;
        $response['error'] = null;
        $response['debug'][] = "Basic query test: PASSED - MySQL Version: " . $result['mysql_version'];
    } catch (PDOException $e2) {
        $response['debug'][] = "❌ Alternative connection also failed: " . $e2->getMessage();
    }
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = "General error occurred";
    $response['error'] = $e->getMessage();
    $response['debug'][] = "❌ General Exception: " . $e->getMessage();
}

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT);
?>
<?php
// File: test-db-connection.php
// Purpose: Lightweight JSON API for Angular to test MySQL connection

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Optional preflight (CORS) handler
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Enable detailed error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Database credentials (same ones that work for your PHP test page)
$host = '50.6.108.147';
$port = '3306';
$dbname = 'ichrqhmy_test';
$username = 'ichrqhmy_testuser';
$password = 'Destruction123!';

$response = [
    'success' => false,
    'message' => '',
    'debug'   => [],
    'timestamp' => date('c')
];

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $response['debug'][] = "Connecting to DSN: $dsn";

    // Create a PDO connection
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $response['debug'][] = "✅ PDO connection successful";

    // Test a simple query
    $stmt = $pdo->query("SELECT 1 + 1 AS test_result");
    $testResult = $stmt->fetch();

    $response['debug'][] = "Query executed successfully";

    // Check if test_data table exists
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'test_data'");
    $tableExists = $tableCheck->rowCount() > 0;
    $response['debug'][] = "Table 'test_data' exists: " . ($tableExists ? 'Yes' : 'No');

    $data = [];
    if ($tableExists) {
        $stmt = $pdo->query("SELECT * FROM test_data ORDER BY created_at DESC LIMIT 5");
        $data = $stmt->fetchAll();
        $response['debug'][] = "Fetched " . count($data) . " rows from test_data";
    }

    $response['success'] = true;
    $response['message'] = 'Connected to MySQL and fetched data successfully';
    $response['data'] = $data;
} catch (PDOException $e) {
    $response['success'] = false;
    $response['message'] = '❌ Database connection failed';
    $response['error'] = $e->getMessage();
    $response['debug'][] = 'PDOException: ' . $e->getMessage();
}

// Output clean JSON response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

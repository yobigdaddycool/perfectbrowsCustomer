<?php
// Debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Allowed origins (pick one per request)
$allowed_origins = [
    'http://website-2eb58030.ich.rqh.mybluehost.me',
    'https://website-2eb58030.ich.rqh.mybluehost.me',
    'http://localhost:4200'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback: no wildcard + specific header together. If you must allow all, uncomment next line:
    // header('Access-Control-Allow-Origin: *');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=UTF-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- DB CONFIG (Bluehost tip: use localhost) ---
$host = 'localhost';        // <- use localhost on Bluehost
$port = '3306';
$dbname = 'ichrqhmy_test';
$username = 'ichrqhmy_testuser';
$password = 'Destruction123!';

// Response shell
$response = [
    'success' => false,
    'message' => '',
    'queryResult' => null,
    'error' => null,
    'debug' => [],
    'testData' => []
];

try {
    $response['debug'][] = "PHP: " . PHP_VERSION;
    $response['debug'][] = "pdo_mysql: " . (extension_loaded('pdo_mysql') ? 'Yes' : 'No');

    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $connection = new PDO($dsn, $username, $password, $options);
    $response['debug'][] = "PDO connected";

    // Base sanity query
    $test_query = "SELECT 1 as test_result, NOW() as now_time, VERSION() as mysql_version";
    $stmt = $connection->query($test_query);
    $result = $stmt->fetch();

    $response['success'] = true;
    $response['message'] = "Database connection successful!";
    $response['queryResult'] = $result;

    // Your exact query kept
    $table_check = $connection->query("SHOW TABLES LIKE 'test_data'");
    if ($table_check->rowCount() > 0) {
        $select_sql = "SELECT * FROM test_data ORDER BY created_at DESC LIMIT 5";
        $stmt = $connection->query($select_sql);
        $response['testData'] = $stmt->fetchAll();
        $response['debug'][] = "test_data rows: " . count($response['testData']);
    } else {
        $response['debug'][] = "test_data table not found";
    }

    http_response_code(200);
} catch (PDOException $e) {
    $response['success'] = false;
    $response['message'] = "Database connection failed";
    $response['error']   = $e->getMessage();
    $response['debug'][] = "PDO Exception: " . $e->getMessage();

    // Still return 200 so the client can read JSON (avoids “uncaught (in promise)”)
    http_response_code(200);
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = "General error occurred";
    $response['error']   = $e->getMessage();
    $response['debug'][] = "General Exception: " . $e->getMessage();
    http_response_code(200);
}

echo json_encode($response, JSON_PRETTY_PRINT);
exit;

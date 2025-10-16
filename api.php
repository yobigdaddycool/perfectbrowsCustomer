<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header("Cache-Control: no-cache, no-store, must-revalidate");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection (include once)
require_once 'db-config.php';

// Get the action from URL or POST data
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch($action) {
    case 'test-connection':
        testConnection();
        break;
    case 'get-customers':
        getCustomers();
        break;
    default:
        echo json_encode(['error' => 'Invalid action: ' . $action]);
}

function testConnection() {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT 1 as test_result, NOW() as current_time, VERSION() as mysql_version");
        $result = $stmt->fetch();
        echo json_encode([
            'success' => true,
            'message' => 'Database connection successful!',
            'data' => $result
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function getCustomers() {
    // Your customer logic here
}
?>
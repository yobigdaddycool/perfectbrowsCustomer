<?php
// db-config.php - Database configuration
$host = '50.6.108.147';
$port = '3306';
$dbname = '
';
$username = 'ichrqhmy_testuser';
$password = 'Destruction123!';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Connection successful - you can log this if needed
    // error_log("Database connection successful to: $host");
    
} catch (PDOException $e) {
    // If we can't connect to DB, return JSON error
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database configuration error',
        'error' => $e->getMessage(),
        'debug' => ['Failed to connect to database']
    ], JSON_PRETTY_PRINT);
    exit();
}
?>
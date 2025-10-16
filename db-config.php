<?php
$host = '50.6.108.147';
$dbname = 'ichrqhmy_test';
$username = 'ichrqhmy_testuser';
$password = 'Destruction123!';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}
?>
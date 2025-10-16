<?php
// Force error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MySQL Database Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .success { color: green; background: #f0fff0; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .error { color: red; background: #fff0f0; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .info { color: blue; background: #f0f8ff; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .debug { color: orange; background: #fff8f0; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
        form { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        input, button { padding: 8px; margin: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>MySQL Database Connection Test</h1>
    
    <?php
    // Database configuration
    $host = '50.6.108.147';
    $port = '3306';
    $dbname = 'ichrqhmy_test';
    $username = 'ichrqhmy_testuser';
    $password = 'Destruction123!';

    // Initialize variables
    $connection = null;
    $message = '';
    $message_type = '';
    $test_data = [];
    $debug_info = [];

    // Add debug information
    $debug_info[] = "PHP Version: " . PHP_VERSION;
    $debug_info[] = "PDO MySQL Available: " . (extension_loaded('pdo_mysql') ? 'Yes' : 'No');
    $debug_info[] = "MySQLi Available: " . (extension_loaded('mysqli') ? 'Yes' : 'No');

    try {
        $debug_info[] = "Attempting connection to: $host:$port, database: $dbname, user: $username";
        
        // Create connection - NO SSL options to avoid fatal error
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $debug_info[] = "DSN: $dsn";
        
        $connection = new PDO($dsn, $username, $password, $options);
        $debug_info[] = "✅ PDO Connection established successfully!";
        
        $message = "✅ Database connection successful!";
        $message_type = 'success';

        // Test if we can execute queries
        $debug_info[] = "Testing query execution...";
        $test_query = "SELECT 1 as test_result";
        $stmt = $connection->query($test_query);
        $result = $stmt->fetch();
        $debug_info[] = "Basic query test: " . ($result['test_result'] == 1 ? 'PASSED' : 'FAILED');

        // Check if table exists
        $table_check = $connection->query("SHOW TABLES LIKE 'test_data'");
        $table_exists = $table_check->rowCount() > 0;
        $debug_info[] = "Table 'test_data' exists: " . ($table_exists ? 'Yes' : 'No');

        // If table doesn't exist, we can skip table operations but still show connection success
        if (!$table_exists) {
            $debug_info[] = "⚠️ Table 'test_data' not found. You may need to create it manually.";
        } else {
            // Handle form submission for inserting data
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['name'])) {
                $name = $_POST['name'];
                $email = $_POST['email'] ?? '';
                
                $insert_sql = "INSERT INTO test_data (name, email) VALUES (?, ?)";
                $stmt = $connection->prepare($insert_sql);
                $stmt->execute([$name, $email]);
                
                $message = "✅ Data inserted successfully!";
                $message_type = 'success';
            }

            // Fetch existing test data
            $select_sql = "SELECT * FROM test_data ORDER BY created_at DESC";
            $stmt = $connection->query($select_sql);
            $test_data = $stmt->fetchAll();
            $debug_info[] = "Found " . count($test_data) . " records in test_data table";
        }

    } catch (PDOException $e) {
        $error_message = $e->getMessage();
        $message = "❌ Database connection failed: " . $error_message;
        $message_type = 'error';
        $debug_info[] = "❌ PDO Exception: " . $error_message;
        
        // Try alternative connection with different options if needed
        $debug_info[] = "Attempting connection with different options...";
        try {
            $options_alt = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            $connection = new PDO($dsn, $username, $password, $options_alt);
            $debug_info[] = "✅ Connection successful with alternative options!";
            $message = "✅ Database connection successful!";
            $message_type = 'success';
        } catch (PDOException $e2) {
            $debug_info[] = "❌ Alternative connection also failed: " . $e2->getMessage();
        }
    }
    ?>

    <!-- Display debug information -->
    <div class="debug">
        <h3>Debug Information:</h3>
        <?php foreach ($debug_info as $info): ?>
            <div><?php echo htmlspecialchars($info); ?></div>
        <?php endforeach; ?>
    </div>

    <?php if ($message): ?>
        <div class="<?php echo $message_type; ?>">
            <?php echo $message; ?>
        </div>
    <?php endif; ?>

    <?php if ($connection): ?>
        <div class="info">
            <strong>Connection Details:</strong><br>
            Host: <?php echo $host; ?><br>
            Database: <?php echo $dbname; ?><br>
            User: <?php echo $username; ?><br>
            Connection Status: ✅ Connected
        </div>

        <?php 
        $table_check = $connection->query("SHOW TABLES LIKE 'test_data'");
        $table_exists = $table_check->rowCount() > 0;
        ?>

        <?php if ($table_exists): ?>
            <h2>Add Test Data</h2>
            <form method="POST">
                <div>
                    <label for="name">Name:</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div>
                    <label for="email">Email (optional):</label>
                    <input type="email" id="email" name="email">
                </div>
                <button type="submit">Insert Data</button>
            </form>

            <h2>Existing Test Data</h2>
            <?php if (count($test_data) > 0): ?>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($test_data as $row): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($row['id']); ?></td>
                                <td><?php echo htmlspecialchars($row['name']); ?></td>
                                <td><?php echo htmlspecialchars($row['email'] ?? 'N/A'); ?></td>
                                <td><?php echo htmlspecialchars($row['created_at']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>No test data found. Use the form above to add some data.</p>
            <?php endif; ?>
        <?php else: ?>
            <div class="error">
                <strong>Table Not Found:</strong> The 'test_data' table does not exist in the database. 
                Please run the SQL manually or check if it was created correctly.
            </div>
        <?php endif; ?>

    <?php else: ?>
        <div class="error">
            <strong>Connection Failed:</strong> Unable to establish database connection. 
            Check the debug information above for details.
        </div>
        
        <div class="info">
            <h3>Troubleshooting Tips:</h3>
            <ul>
                <li>Verify the database credentials in the code match your Bluehost settings</li>
                <li>Check if the database user has proper permissions</li>
                <li>Try using 'localhost' instead of the IP address if the database is on the same server</li>
                <li>Ensure the database exists and is accessible</li>
                <li>Check Bluehost's specific MySQL hostname (might be different from the IP)</li>
            </ul>
        </div>
    <?php endif; ?>

    <div class="info">
        <h3>Connection String Used:</h3>
        <pre>Server=<?php echo $host; ?>;Port=<?php echo $port; ?>;Database=<?php echo $dbname; ?>;User=<?php echo $username; ?>;Password=*******;</pre>
    </div>
</body>
</html>
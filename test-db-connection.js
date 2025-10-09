const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Error logging function
async function logError(errorMessage, errorDetails = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ERROR: ${errorMessage}${errorDetails ? ` - Details: ${errorDetails}` : ''}\n`;
  
  const logDir = path.join(__dirname, 'logs');
  const logFile = path.join(logDir, 'database-errors.log');
  
  try {
    // Create logs directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });
    // Append error to log file
    await fs.appendFile(logFile, logEntry);
    console.log('Error logged to:', logFile);
  } catch (logError) {
    console.error('Failed to write to error log:', logError.message);
  }
}

async function testConnection() {
  const connectionConfig = {
    host: '50.6.108.147',
    port: 3306,
    database: 'ichrqhmy_PerfectCustomer',
    user: 'ichrqhmy_testuser',
    password: 'Destruction123!',
    ssl: {
      rejectUnauthorized: false
    }
  };

  console.log('Testing MySQL database connection...');
  console.log('Host:', connectionConfig.host);
  console.log('Database:', connectionConfig.database);
  console.log('User:', connectionConfig.user);
  
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ SUCCESS: Connected to MySQL database!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('✅ Query test successful:', rows);
    
  } catch (error) {
    const errorMessage = 'Failed to connect to MySQL database';
    console.error('❌ ERROR:', errorMessage);
    console.error('Error details:', error.message);
    
    // Log error to file
    await logError(errorMessage, error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
  
  console.log('Database connection test completed.');
}

testConnection();
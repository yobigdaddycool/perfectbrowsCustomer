const mysql = require('mysql2/promise');

async function testConnection() {
  const connectionConfig = {
    host: '50.6.108.147',
    port: 3306,
    database: 'ichrqhmy_test',
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
    console.error('❌ ERROR: Failed to connect to MySQL database');
    console.error('Error details:', error.message);
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
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import mysql from 'mysql2/promise';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Database connection configuration
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

/**
 * Express Rest API endpoints
 */
app.get('/api/test-db-connection', async (req, res) => {
  try {
    console.log('Testing MySQL database connection via API...');
    
    let connection;
    try {
      connection = await mysql.createConnection(connectionConfig);
      console.log('✅ SUCCESS: Connected to MySQL database!');
      
      // Test a simple query
      const [rows] = await connection.execute('SELECT 1 + 1 AS result');
      console.log('✅ Query test successful:', rows);
      
      res.json({
        success: true,
        message: 'Connected to MySQL database successfully!',
        queryResult: rows,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ ERROR: Failed to connect to MySQL database');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      
      res.status(500).json({
        success: false,
        message: 'Failed to connect to MySQL database',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      if (connection) {
        await connection.end();
        console.log('Connection closed.');
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unexpected error in API:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Unexpected error occurred',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log('Database test API available at: http://localhost:' + port + '/api/test-db-connection');
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

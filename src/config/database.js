
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const createTables = async () => {
  try {
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    console.log('Tables created/verified');
  } catch (err) {
    console.error('Error creating tables OR they already exist:', err.message);
    // Don't exit - tables might already exist
  }
};

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected');
    client.release();
    
    // Auto-create tables when server starts
    await createTables();
    
  } catch (err) {
    console.error(' Database connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
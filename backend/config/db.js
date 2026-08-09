const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { logger } = require('../utils/logger');

const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jih_db',
};

if (process.env.DATABASE_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Log database events silently to root logs/database.log file
pool.on('connect', () => {
  logger.db('Connected a client connection to PostgreSQL database pool');
});

pool.on('error', (err) => {
  logger.error(`Unexpected PostgreSQL client error: ${err.message}`);
});

module.exports = pool;

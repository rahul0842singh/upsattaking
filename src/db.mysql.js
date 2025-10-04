// src/db.mysql.js
// Hard-coded MySQL connection (for debugging only; prefer env vars in production)
const mysql = require('mysql2/promise');

// Use your actual DB server hostname, NOT a Render IP.
const DB_HOST = 'hosting12.hostingfact.in';
const DB_PORT = 3306;
const DB_USER = 'friendst_sattaupking';
const DB_PASSWORD = 'Kashmir4india'; // <-- rotate this ASAP
const DB_NAME = 'friendst_satta_king';

// If your provider requires SSL, keep CA via env (safe to leave as-is)
const ssl = process.env.MYSQL_CA_CERT ? { ca: process.env.MYSQL_CA_CERT } : undefined;

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 8,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl
});

// Simple helper to run queries
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };

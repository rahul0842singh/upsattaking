// src/db.mysql.js
const fs = require('fs');
const path = require('path');

// Try to load .env from common locations (project root, parent of src, CWD)
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),      // if src/ is the current folder
  path.resolve(__dirname, '../..', '.env'),   // in case structure differs
];

let loadedFrom = null;
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    loadedFrom = p;
    break;
  }
}
if (!loadedFrom) {
  console.warn('⚠️  .env not found in:', envPaths.join(' | '));
} else {
  console.log('✅ Loaded .env from:', loadedFrom);
}

const mysql = require('mysql2/promise');

const DSN = process.env.MYSQL_URL;

const base = DSN || {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'satta_king',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Optional TLS if your host requires SSL (set MYSQL_SSL=true in .env)
if (!DSN && String(process.env.MYSQL_SSL).toLowerCase() === 'true') {
  base.ssl = { minVersion: 'TLSv1.2' };
}

console.log('MySQL target -> host:', base.host || '[DSN]', 'port:', base.port || '[DSN]');

const pool = mysql.createPool(DSN || base);

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };

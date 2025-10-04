// scripts/test-mysql.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const DSN = process.env.MYSQL_URL;
    const cfg = DSN || {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: String(process.env.MYSQL_SSL).toLowerCase() === 'true'
        ? { minVersion: 'TLSv1.2' }
        : undefined,
    };

    const conn = await mysql.createConnection(cfg);
    await conn.ping();
    const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS db');
    console.log('✅ Connected to MySQL');
    console.log('Database:', rows?.[0]?.db);
    console.log('MySQL version:', rows?.[0]?.version);
    await conn.end();
  } catch (e) {
    console.error('❌ FAILED to connect');
    console.error(' code:', e.code);
    console.error(' errno:', e.errno);
    console.error(' sqlState:', e.sqlState);
    console.error(' message:', e.message);
    process.exit(1);
  }
})();

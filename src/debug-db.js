// src/debug-db.js
const mysql = require('mysql2/promise');

(async () => {
  console.log("🔍 Starting MySQL debug (hard-coded values)...");

  // --- 🔧 Hard-coded database config ---
  const DB_HOST = 'hosting12.hostingfact.in';
  const DB_PORT = 3306;
  const DB_USER = 'friendst_sattaupking';
  const DB_PASSWORD = 'Kashmir4india';  // ⚠️ rotate after testing!
  const DB_NAME = 'friendst_satta_king';

  console.log("Environment Variables (simulated):");
  console.log({
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_NAME,
    DB_PASSWORD: DB_PASSWORD ? "****" : "(missing)"
  });

  try {
    console.log("⏳ Attempting to connect...");

    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectTimeout: 10000,
    });

    console.log("✅ MySQL connected successfully!");

    const [rows] = await connection.query("SELECT NOW() AS time;");
    console.log("⏱ Query result:", rows);

    await connection.end();
    console.log("🔒 Connection closed cleanly.");
  } catch (err) {
    console.error("❌ Connection failed!");
    console.error("Error details:");
    console.error({
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      message: err.message
    });
  }
})();

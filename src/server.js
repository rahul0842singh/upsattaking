// src/server.js

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { pool } = require('./db.mysql');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

/**
 * Strong /health endpoint:
 * - opens a conn
 * - pings
 * - returns selected DB + tables
 * - clear error details on failure
 */
app.get('/health', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();

    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    const db = dbRows?.[0]?.db || null;

    if (!db) {
      return res.status(500).json({
        ok: false,
        error: 'No database selected. Set MYSQL_DATABASE or include DB in MYSQL_URL.',
      });
    }

    const [tablesRows] = await conn.query('SHOW TABLES');
    const tables = tablesRows.map((row) => Object.values(row)[0]);

    return res.json({
      ok: true,
      connectedDatabase: db,
      tables,
    });
  } catch (e) {
    // Log as much as possible
    console.error('Health check failed:');
    console.error(' code:', e && e.code);
    console.error(' errno:', e && e.errno);
    console.error(' sqlState:', e && e.sqlState);
    console.error(' message:', e && e.message);
    return res.status(500).json({
      ok: false,
      error: e && e.message ? e.message : 'Unknown error',
      code: e && e.code,
      errno: e && e.errno,
      sqlState: e && e.sqlState,
    });
  } finally {
    if (conn) conn.release();
  }
});

app.use('/api/v1', routes);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    console.log(`MySQL connected. Selected database: ${dbRows?.[0]?.db || '(none)'}`);
    conn.release();
  } catch (e) {
    console.error('MySQL connection at startup failed:');
    console.error(' code:', e && e.code);
    console.error(' errno:', e && e.errno);
    console.error(' sqlState:', e && e.sqlState);
    console.error(' message:', e && e.message);
  }
});

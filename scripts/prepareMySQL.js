// scripts/prepareMySQL.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db.mysql');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    const statements = sql.split(/;\s*\n/).filter(Boolean);
    for (const stmt of statements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
    console.log('✅ MySQL schema prepared');
    process.exit(0);
  } catch (e) {
    console.error('❌ prepareMySQL failed:', e);
    process.exit(1);
  }
})();
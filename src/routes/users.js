const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db.mysql');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    const hash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, role, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    await pool.execute(sql, [name, email.toLowerCase(), role || 'viewer', hash]);

    res.json({ ok: true, message: 'User created' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db.mysql");

const router = express.Router();

// helper: verify JWT
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ ok: false, error: "Missing token" });

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, error: "Missing email or password" });

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      ok: true,
      token,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ NEW: GET /me (requires Bearer token)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = rows[0];
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });
    res.json({ ok: true, data: { user } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Optional: logout route (clears client token manually)
router.post("/logout", (req, res) => {
  res.json({ ok: true, message: "Logged out" });
});

module.exports = router;

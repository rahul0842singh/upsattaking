// src/controllers/games.controller.js
const { pool } = require('../db.mysql');

function normCode(code) {
  return String(code || '').trim().toUpperCase();
}

/**
 * GET /api/v1/games
 */
exports.listGames = async (req, res) => {
  try {
    // ✅ match MySQL column names (snake_case)
    const [rows] = await pool.query(`
      SELECT 
        id,
        name,
        code,
        default_time AS defaultTime,
        order_index AS orderIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM games
      ORDER BY order_index ASC, name ASC
    `);
    return res.json({ ok: true, data: { games: rows } });
  } catch (e) {
    console.error('listGames error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * GET /api/v1/games/:code
 */
exports.getGame = async (req, res) => {
  try {
    const code = normCode(req.params.code);
    const [rows] = await pool.query(
      `SELECT 
        id,
        name,
        code,
        default_time AS defaultTime,
        order_index AS orderIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM games WHERE code = ?`,
      [code]
    );

    if (!rows.length)
      return res.status(404).json({ ok: false, error: 'Game not found' });

    return res.json({ ok: true, data: { game: rows[0] } });
  } catch (e) {
    console.error('getGame error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/v1/games
 * body: { name, code, defaultTime, orderIndex }
 */
exports.createGame = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const code = normCode(req.body?.code);
    const defaultTime = String(req.body?.defaultTime || '').trim();
    const orderIndex = Number.isFinite(+req.body?.orderIndex)
      ? +req.body.orderIndex
      : 1;

    if (!name || !code) {
      return res
        .status(400)
        .json({ ok: false, error: 'name and code are required' });
    }

    await pool.query(
      'INSERT INTO games (name, code, default_time, order_index) VALUES (?, ?, ?, ?)',
      [name, code, defaultTime, orderIndex]
    );

    return res.status(201).json({ ok: true, message: 'Game added' });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ ok: false, error: 'Game code already exists' });
    }
    console.error('createGame error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * PUT /api/v1/games/:code
 * body can include: { name, defaultTime, orderIndex, newCode? }
 */
exports.updateGame = async (req, res) => {
  try {
    const oldCode = normCode(req.params.code);
    const candidate = req.body?.newCode || req.body?.code;
    const newCode = candidate ? normCode(candidate) : oldCode;

    const name = req.body?.name;
    const defaultTime = req.body?.defaultTime;
    const orderIndex = req.body?.orderIndex;

    const [rows] = await pool.query('SELECT * FROM games WHERE code = ?', [
      oldCode,
    ]);
    if (!rows.length)
      return res.status(404).json({ ok: false, error: 'Game not found' });
    const cur = rows[0];

    if (newCode !== oldCode) {
      const [conflict] = await pool.query('SELECT id FROM games WHERE code = ?', [
        newCode,
      ]);
      if (conflict.length) {
        return res
          .status(409)
          .json({ ok: false, error: 'Target code already exists' });
      }
    }

    await pool.query(
      'UPDATE games SET name=?, code=?, default_time=?, order_index=? WHERE code=?',
      [
        name ?? cur.name,
        newCode,
        defaultTime ?? cur.default_time,
        Number.isFinite(+orderIndex) ? +orderIndex : cur.order_index,
        oldCode,
      ]
    );

    return res.json({ ok: true, message: 'Game updated' });
  } catch (e) {
    console.error('updateGame error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * DELETE /api/v1/games/:code
 */
exports.deleteGame = async (req, res) => {
  try {
    const code = normCode(req.params.code);
    const [rows] = await pool.query('SELECT id FROM games WHERE code = ?', [
      code,
    ]);
    if (!rows.length)
      return res.status(404).json({ ok: false, error: 'Game not found' });

    await pool.query('DELETE FROM games WHERE code = ?', [code]);
    return res.json({ ok: true, message: 'Game deleted' });
  } catch (e) {
    console.error('deleteGame error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/v1/games/bulk
 * body: { items: [{ name, code, defaultTime, orderIndex }, ...] }
 */
exports.bulkUpsertGames = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length)
      return res.status(400).json({ ok: false, error: 'No items' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const it of items) {
        const name = String(it?.name || '').trim();
        const code = normCode(it?.code);
        const defaultTime = String(it?.defaultTime || '').trim();
        const orderIndex = Number.isFinite(+it?.orderIndex)
          ? +it.orderIndex
          : 1;
        if (!name || !code) continue;

        await conn.query(
          `INSERT INTO games (name, code, default_time, order_index)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
              name=VALUES(name),
              default_time=VALUES(default_time),
              order_index=VALUES(order_index)`,
          [name, code, defaultTime, orderIndex]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.json({ ok: true, message: 'Bulk upsert complete' });
  } catch (e) {
    console.error('bulkUpsertGames error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

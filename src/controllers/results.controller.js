// src/controllers/results.controller.js
const { pool } = require('../db.mysql');

/** Utility: "03:40 PM" / "3:40 pm" / "03:40" → minutes (0..1439) */
function toMinutesFromTimeString(s) {
  if (!s) return null;
  const str = String(s).trim().toUpperCase();

  const m12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hh = parseInt(m12[1], 10);
    const mm = parseInt(m12[2], 10);
    const ampm = m12[3].toUpperCase();
    if (hh === 12 && ampm === 'AM') hh = 0;
    if (hh !== 12 && ampm === 'PM') hh += 12;
    return hh * 60 + mm;
  }
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);

  return null;
}

/** Utility: minutes → "HH:MM" */
function minutesToHHMM(m) {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * GET /api/v1/results/timewise?dateStr=YYYY-MM-DD
 * Optional: &games=GALI,DESAWER (limits columns)
 * Returns:
 *  { ok:true, data:{ dateStr, games:[{id,name,code,default_time,order_index}...], rows:[{slotMin, values:{CODE:".."}}...] } }
 */
exports.listTimewise = async (req, res) => {
  try {
    const dateStr = String(req.query.dateStr || '').trim();
    if (!dateStr) return res.status(400).json({ ok: false, error: 'dateStr required' });

    // If provided, limit to these codes (normalized UPPER)
    const wantedCodes = String(req.query.games || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    // Fetch games (ordered)
    const [gameRows] = await pool.query(
      `
      SELECT id, name, code, default_time, order_index
      FROM games
      ORDER BY order_index ASC, name ASC
      `
    );

    const codeOrder = gameRows.map(g => g.code);
    const codeSet = new Set(
      wantedCodes.length ? wantedCodes : codeOrder
    );

    // Fetch all timewise entries for the day
    const [tw] = await pool.query(
      `
      SELECT t.game_id, t.slot_min, t.value, g.code
      FROM timewise_results t
      JOIN games g ON g.id = t.game_id
      WHERE t.date_str = ?
      ORDER BY t.slot_min ASC, g.order_index ASC, g.name ASC
      `,
      [dateStr]
    );

    // Group into rows by slot_min → { slotMin, values:{ CODE: value } }
    const rowsMap = new Map(); // slotMin -> {slotMin, values:{}}
    for (const r of tw) {
      const code = r.code;
      if (!codeSet.has(code)) continue;
      const slot = r.slot_min;
      if (!rowsMap.has(slot)) rowsMap.set(slot, { slotMin: slot, values: {} });
      rowsMap.get(slot).values[code] = r.value || 'XX';
    }

    const rows = [...rowsMap.values()].sort((a, b) => a.slotMin - b.slotMin);
    // Return full games list (frontend can decide to show/hide columns)
    return res.json({
      ok: true,
      data: { dateStr, games: gameRows, rows }
    });
  } catch (e) {
    console.error('listTimewise error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * GET /api/v1/results/snapshot?dateStr=YYYY-MM-DD&time=HH:MM
 * Optional: &games=GALI,DESAWER (limits keys)
 * For each game code, returns the last value where slot_min <= given time.
 * Shape: { ok:true, data:{ dateStr, time:"HH:MM", values:{ CODE:".." } } }
 */
exports.getSnapshot = async (req, res) => {
  try {
    const dateStr = String(req.query.dateStr || '').trim();
    const timeStr = String(req.query.time || '').trim();
    if (!dateStr || !timeStr) {
      return res.status(400).json({ ok: false, error: 'dateStr and time are required' });
    }
    const slotMax = toMinutesFromTimeString(timeStr);
    if (slotMax == null) {
      return res.status(400).json({ ok: false, error: 'Invalid time format (use HH:MM or HH:MM AM/PM)' });
    }

    // desired codes (if provided)
    const wantedCodes = String(req.query.games || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    // base games (for filling XX)
    const [gameRows] = await pool.query(
      `
      SELECT id, code
      FROM games
      ORDER BY order_index ASC, name ASC
      `
    );

    const codeSet = new Set(
      wantedCodes.length ? wantedCodes : gameRows.map(g => g.code)
    );

    // Latest row per game_id where date matches and slot_min <= slotMax
    // Using "max(id)" as the latest, since rows are append-only per time.
    const [rows] = await pool.query(
      `
      SELECT g.code, t.value
      FROM timewise_results t
      JOIN (
        SELECT game_id, MAX(id) AS id
        FROM timewise_results
        WHERE date_str = ? AND slot_min <= ?
        GROUP BY game_id
      ) latest ON latest.id = t.id
      JOIN games g ON g.id = t.game_id
      `,
      [dateStr, slotMax]
    );

    const values = {};
    // initialize with XX
    for (const g of gameRows) {
      if (codeSet.has(g.code)) values[g.code] = 'XX';
    }
    // overlay with fetched latest values
    for (const r of rows) {
      if (codeSet.has(r.code)) values[r.code] = r.value || 'XX';
    }

    return res.json({
      ok: true,
      data: { dateStr, time: minutesToHHMM(slotMax), values }
    });
  } catch (e) {
    console.error('getSnapshot error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/v1/results/timewise
 * body: { gameCode, time, value, dateStr }
 * Appends a new row (history), no overwrites.
 */
exports.upsertTimewise = async (req, res) => {
  try {
    const { gameCode, time, value, dateStr } = req.body;
    if (!gameCode || !dateStr) {
      return res.status(400).json({ ok: false, error: 'Missing gameCode or dateStr' });
    }

    const [[game]] = await pool.query('SELECT id FROM games WHERE code = ?', [String(gameCode).trim().toUpperCase()]);
    if (!game) return res.status(404).json({ ok: false, error: 'Game not found' });

    const slotMin = toMinutesFromTimeString(time);
    if (slotMin == null) return res.status(400).json({ ok: false, error: 'Invalid time format' });

    const [ins] = await pool.query(
      'INSERT INTO timewise_results (game_id, date_str, slot_min, value, source) VALUES (?, ?, ?, ?, ?)',
      [game.id, dateStr, slotMin, value || 'XX', 'manual']
    );

    return res.status(201).json({
      ok: true,
      data: { _id: ins.insertId, gameCode: String(gameCode).trim().toUpperCase(), dateStr, slotMin, value }
    });
  } catch (e) {
    // surface duplicate errors etc., though with append-only we normally won't hit uniques
    console.error('upsertTimewise error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * DELETE /api/v1/results/timewise/:id
 */
exports.deleteTimewise = async (req, res) => {
  try {
    const id = +req.params.id;
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid ID' });

    const [[hit]] = await pool.query('SELECT id FROM timewise_results WHERE id = ?', [id]);
    if (!hit) return res.status(404).json({ ok: false, error: 'Not found' });

    await pool.query('DELETE FROM timewise_results WHERE id = ?', [id]);
    return res.json({ ok: true, message: 'Deleted successfully' });
  } catch (e) {
    console.error('deleteTimewise error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * GET /api/v1/results/monthly?year=YYYY&month=M[1-12]
 * Optional: &games=GALI,DESAWER (limit columns)
 * Returns rows: [{dateStr, CODE1:"..", CODE2:".."}]
 */
exports.listMonthly = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, error: 'year and month required' });
    }

    // e.g. 2025-10-01 .. 2025-10-31
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    // naive to next month first day (MySQL BETWEEN range easier if you want), we’ll filter by LIKE
    const ym = `${year}-${String(month).padStart(2, '0')}`;

    const wantedCodes = String(req.query.games || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const [gameRows] = await pool.query(
      `SELECT id, code FROM games ORDER BY order_index ASC, name ASC`
    );

    const codes = wantedCodes.length
      ? wantedCodes
      : gameRows.map(g => g.code);

    // Get latest per game per day in that month
    // We use max(id) per (game, date_str) as the day's final entry
    const [rows] = await pool.query(
      `
      SELECT t.date_str, g.code, t.value
      FROM timewise_results t
      JOIN (
        SELECT date_str, game_id, MAX(id) AS id
        FROM timewise_results
        WHERE date_str LIKE CONCAT(?, '%')
        GROUP BY date_str, game_id
      ) last ON last.id = t.id
      JOIN games g ON g.id = t.game_id
      ORDER BY t.date_str ASC, g.order_index ASC
      `,
      [ym]
    );

    // Build map dateStr -> record with only desired codes
    const byDate = new Map();
    for (const r of rows) {
      if (!codes.includes(r.code)) continue;
      if (!byDate.has(r.date_str)) byDate.set(r.date_str, { dateStr: r.date_str });
      byDate.get(r.date_str)[r.code] = r.value || 'XX';
    }

    const outRows = [...byDate.values()].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    return res.json({
      ok: true,
      data: {
        year,
        month,
        games: codes,
        rows: outRows
      }
    });
  } catch (e) {
    console.error('listMonthly error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

// src/dal/results.dal.js
const { query } = require('../db.mysql');

/**
 * Upsert a result for (gameId, dateStr, slotMin).
 */
async function create({ gameId, dateStr, slotMin, value, source = 'manual', note = '' }) {
  await query(
    `INSERT INTO results (game_id, date_str, slot_min, value, source, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       value = VALUES(value),
       source = VALUES(source),
       note = VALUES(note)`,
    [gameId, dateStr, slotMin, value, source, note]
  );
  const rows = await query(
    'SELECT * FROM results WHERE game_id = ? AND date_str = ? AND slot_min = ?',
    [gameId, dateStr, slotMin]
  );
  return rows[0];
}

/**
 * Latest (max slot_min) row per game for a given date.
 */
async function latestByGameIds(gameIds, dateStr) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) return [];
  const placeholders = gameIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT r.*
     FROM results r
     JOIN (
       SELECT game_id, MAX(slot_min) AS max_slot
       FROM results
       WHERE date_str = ? AND game_id IN (${placeholders})
       GROUP BY game_id
     ) t ON t.game_id = r.game_id AND t.max_slot = r.slot_min
     ORDER BY r.game_id ASC`,
    [dateStr, ...gameIds]
  );
  return rows;
}

/**
 * All rows for a day ordered by time then game.
 */
async function rowsForDate(dateStr) {
  return await query(
    'SELECT * FROM results WHERE date_str = ? ORDER BY slot_min ASC, game_id ASC',
    [dateStr]
  );
}

/**
 * Optional helper: fetch values for a month for selected games.
 * year: number (e.g., 2025), month: 1-12
 */
async function monthlyChart({ year, month, gameIds }) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) return [];
  const like = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}%`;
  const placeholders = gameIds.map(() => '?').join(',');
  const sql = `
    SELECT game_id, date_str, value
    FROM results
    WHERE date_str LIKE ? AND game_id IN (${placeholders})
    ORDER BY date_str ASC
  `;
  return await query(sql, [like, ...gameIds]);
}

module.exports = { create, latestByGameIds, rowsForDate, monthlyChart };

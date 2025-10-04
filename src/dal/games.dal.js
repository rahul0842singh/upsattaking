// src/dal/games.dal.js
const { query } = require('../db.mysql');

async function list() {
  return await query('SELECT * FROM games ORDER BY order_index ASC, name ASC');
}

async function findByCode(code) {
  const rows = await query('SELECT * FROM games WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}

async function create({ name, code, defaultTime = '', orderIndex = 999 }) {
  const res = await query(
    'INSERT INTO games (name, code, default_time, order_index) VALUES (?, ?, ?, ?)',
    [name, code, defaultTime, orderIndex]
  );
  return await getById(res.insertId);
}

async function getById(id) {
  const rows = await query('SELECT * FROM games WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateByCode(code, patch) {
  const fields = [];
  const values = [];
  if (patch.name != null) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.defaultTime != null) { fields.push('default_time = ?'); values.push(patch.defaultTime); }
  if (patch.orderIndex != null) { fields.push('order_index = ?'); values.push(patch.orderIndex); }
  if (fields.length === 0) return await findByCode(code);
  values.push(code);
  await query(`UPDATE games SET ${fields.join(', ')} WHERE code = ?`, values);
  return await findByCode(code);
}

async function delByCode(code) {
  await query('DELETE FROM games WHERE code = ?', [code]);
  return true;
}

async function bulkUpsert(list) {
  if (list.length === 0) return { inserted: 0, updated: 0 };
  const values = list.map(g => [g.name, g.code, g.defaultTime || '', g.orderIndex || 999]);
  const sql = `
    INSERT INTO games (name, code, default_time, order_index)
    VALUES ${values.map(() => '(?, ?, ?, ?)').join(',')}
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      default_time = VALUES(default_time),
      order_index = VALUES(order_index)
  `;
  const flat = values.flat();
  const res = await query(sql, flat);
  // MySQL doesn't give per-row upsert counts; return total affected approximation
  return { affectedRows: res.affectedRows };
}

module.exports = { list, findByCode, create, updateByCode, delByCode, bulkUpsert };
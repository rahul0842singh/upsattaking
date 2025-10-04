// scripts/migrateFromMongoToMySQL.js
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const mysql = require('mysql2/promise');

(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }

  // MySQL
  const DSN = process.env.MYSQL_URL;
  const mysqlConfig = DSN ? DSN : {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'satta_king',
    multipleStatements: true
  };
  const sql = await mysql.createConnection(mysqlConfig);

  // Mongo
  const mc = new MongoClient(mongoUri);
  await mc.connect();
  const db = mc.db(); // use default db in URI

  try {
    // 1) Games
    const gamesCol = db.collection('games');
    const games = await gamesCol.find({}).toArray();
    console.log(`Found ${games.length} games`);

    const codeToId = new Map();
    for (const g of games) {
      const [res] = await sql.execute(
        `INSERT INTO games (name, code, default_time, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), default_time=VALUES(default_time), order_index=VALUES(order_index)`,
        [g.name, (g.code||'').toUpperCase(), g.defaultTime || '', g.orderIndex || 999]
      );
      // fetch id
      const [rows] = await sql.execute('SELECT id FROM games WHERE code = ? LIMIT 1', [(g.code||'').toUpperCase()]);
      if (rows[0]) codeToId.set((g.code||'').toUpperCase(), rows[0].id);
    }

    // 2) Users
    const usersCol = db.collection('users');
    const users = await usersCol.find({}).toArray();
    console.log(`Found ${users.length} users`);

    for (const u of users) {
      await sql.execute(
        `INSERT INTO users (name, email, role, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)`,
        [u.name, (u.email||'').toLowerCase(), u.role || 'viewer', u.passwordHash || u.password_hash || '']
      );
    }

    // 3) Results
    const resultsCol = db.collection('results');
    const results = await resultsCol.find({}).toArray();
    console.log(`Found ${results.length} results`);

    for (const r of results) {
      // r.game may be ObjectId or a populated object; try both
      let gameCode = r.gameCode || r.game_code;
      if (!gameCode && r.game && typeof r.game === 'object') {
        if (r.game.code) gameCode = r.game.code;
      }
      // If we only have ObjectId, try to look up from games collection
      if (!gameCode && r.game) {
        try {
          const gdoc = await gamesCol.findOne({ _id: r.game });
          if (gdoc && gdoc.code) gameCode = gdoc.code;
        } catch {}
      }
      const gameId = codeToId.get(String(gameCode||'').toUpperCase());
      if (!gameId) {
        console.warn('Skip result without resolvable game:', r._id);
        continue;
      }
      await sql.execute(
        `INSERT INTO results (game_id, date_str, slot_min, value, source, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE value=VALUES(value), source=VALUES(source), note=VALUES(note)`,
        [gameId, r.dateStr, r.slotMin, r.value, r.source || 'manual', r.note || '']
      );
    }

    // 4) OTP tokens
    const otpCol = db.collection('otptokens');
    const otps = await otpCol.find({}).toArray();
    console.log(`Found ${otps.length} OTP tokens`);
    for (const o of otps) {
      await sql.execute(
        `INSERT INTO otp_tokens (email, otp_hash, expires_at, attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE attempts=VALUES(attempts)`,
        [String(o.email||'').toLowerCase(), o.otpHash || o.otp_hash || '', o.expiresAt ? new Date(o.expiresAt) : new Date(), o.attempts || 0]
      );
    }

    console.log('✅ Migration complete');
  } catch (e) {
    console.error('❌ Migration error:', e);
  } finally {
    await mc.close();
    await sql.end();
  }
})();
# Satta Backend — MySQL Conversion

This folder contains:
- Updated server code that swaps MongoDB/Mongoose for MySQL using `mysql2/promise`.
- SQL schema + indexes (`db/schema.sql`).
- A one-off migration script (`scripts/migrateFromMongoToMySQL.js`) to copy data from your existing MongoDB into MySQL.
- Environment template (`.env.mysql.example`).

## 1) Install & Setup

```bash
cp .env.mysql.example .env
# Fill in MYSQL_* values. Keep your existing MongoDB env for the migration script.
npm install
npm run db:prepare     # creates schema + indexes
```

## 2) Migrate data from MongoDB -> MySQL (one-time)

> **Back up first!** Run on a test DB before production.

```bash
node scripts/migrateFromMongoToMySQL.js
```

This will:
- Read collections from MongoDB (`games`, `users`, `results`, `otptokens`)
- Upsert into MySQL tables with equivalent constraints & indexes
- Skip duplicates where unique keys already exist

## 3) Start the server

```bash
npm start
```

## 4) Notes

- TTL for OTPs: Mongo used a TTL index. In MySQL we emulate via a scheduled event (if enabled) and an index on `expires_at`. Alternatively, run the cleanup cron daily: `node scripts/cleanupExpiredOtps.js`.
- Queries are tuned with essential indexes identical to the original Mongoose schemas (unique and compound).
- API routes and validators remain the same; only the data layer changed.
- If you previously relied on Mongo `_id` strings in clients, responses now return numeric `id` fields. For backward compatibility, controllers map `id` to `_id` in JSON where helpful.
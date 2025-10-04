// scripts/cleanupExpiredOtps.js
require('dotenv').config();
const { query } = require('../src/db.mysql');

(async () => {
  const res = await query('DELETE FROM otp_tokens WHERE expires_at <= NOW()');
  console.log('Deleted expired OTP rows');
  process.exit(0);
})();
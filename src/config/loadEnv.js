// Load .env only when running locally
if (process.env.NODE_ENV !== 'production') {
  try {
    const fs = require('fs');
    const path = require('path');
    const dotenv = require('dotenv');

    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env')
    ];
    const file = candidates.find(p => fs.existsSync(p));
    if (file) {
      dotenv.config({ path: file });
      console.log(`[env] Loaded ${path.basename(file)}`);
    } else {
      // stay silent in dev if none found
    }
  } catch {
    // dotenv not installed; ignore
  }
}

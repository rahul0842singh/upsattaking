-- MySQL schema for Satta Backend
CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(32) NOT NULL,
  default_time VARCHAR(16) NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 999,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_games_code (code),
  KEY idx_games_order (order_index, name)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  date_str CHAR(10) NOT NULL,      -- YYYY-MM-DD
  slot_min SMALLINT NOT NULL,      -- 0..1439
  value VARCHAR(8) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_results (game_id, date_str, slot_min),
  KEY idx_results_dateslot (date_str, slot_min),
  CONSTRAINT fk_results_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_otp_email (email),
  KEY idx_otp_expires (expires_at)
);

-- Optional: emulate TTL with an event (requires event_scheduler=ON)
-- CREATE EVENT IF NOT EXISTS ev_cleanup_otps
-- ON SCHEDULE EVERY 1 HOUR
-- DO
--   DELETE FROM otp_tokens WHERE expires_at <= NOW();
const { getLocalDb } = require('../database/db');

class ConfigService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
  }

  getServerUrl() {
    const db = this.getDb();
    const row = db.prepare("SELECT value FROM app_config WHERE key = 'server_url'").get();
    return row && row.value ? row.value.trim() : '';
  }

  setServerUrl(url) {
    const db = this.getDb();
    const cleanUrl = url ? url.trim() : '';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO app_config (key, value, updated_at)
      VALUES ('server_url', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(cleanUrl, now);

    return cleanUrl;
  }

  get(key, defaultValue = null) {
    const db = this.getDb();
    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  set(key, value) {
    const db = this.getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO app_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(key, String(value), now);
  }
}

module.exports = new ConfigService();

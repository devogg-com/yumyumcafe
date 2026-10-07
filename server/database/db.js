const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('../../src/shared/schema');

let dbInstance = null;

function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'yum_yum_server.sqlite');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  initSchema(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      // ignore
    }
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  closeDb
};

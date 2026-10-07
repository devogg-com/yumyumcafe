const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('../../shared/schema');

let localDbInstance = null;

function getLocalDb(customPath = null) {
  if (localDbInstance && !customPath) {
    return localDbInstance;
  }

  let dbPath = customPath;

  if (!dbPath) {
    let baseDir;
    try {
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        baseDir = app.getPath('userData');
      }
    } catch (e) {
      // Running in pure Node or test environment
    }

    if (!baseDir) {
      baseDir = path.join(__dirname, '..', '..', '..', 'data');
    }

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    dbPath = path.join(baseDir, 'yum_yum_pos.sqlite');
  } else {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  initSchema(db);

  if (!customPath) {
    localDbInstance = db;
  }
  return db;
}

function closeLocalDb() {
  if (localDbInstance) {
    try {
      localDbInstance.close();
    } catch (e) {
      // ignore
    }
    localDbInstance = null;
  }
}

module.exports = {
  getLocalDb,
  closeLocalDb
};

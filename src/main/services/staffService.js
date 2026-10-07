const crypto = require('crypto');
const { getLocalDb } = require('../database/db');

class StaffService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
  }

  getStaff(accountId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT id, account_id, name, created_at, updated_at
      FROM staff
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY name ASC
    `).all(accountId);
  }

  addStaff(accountId, name) {
    if (!name || !name.trim()) throw new Error('Staff name is required.');
    const db = this.getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO staff (id, account_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, accountId, name.trim(), now, now);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'staff', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  }

  deleteStaff(accountId, id) {
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM staff WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!existing) throw new Error('Staff member not found.');

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE staff
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND account_id = ?
      `).run(now, now, id, accountId);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'staff', ?, 'delete', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return true;
  }
}

module.exports = new StaffService();

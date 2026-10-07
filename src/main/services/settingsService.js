const { getLocalDb } = require('../database/db');
const configService = require('./configService');

class SettingsService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
  }

  getSettings(accountId) {
    const db = this.getDb();
    let settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(accountId);

    if (!settings) {
      const now = new Date().toISOString();
      const globalServerUrl = configService.getServerUrl();
      db.prepare(`
        INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
        VALUES (?, 'Yum Yum Cafe', '', '', '', '', '', '', ?, '80mm', ?, ?)
      `).run(accountId, globalServerUrl, now, now);
      settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(accountId);
    }

    // Ensure server_url falls back to persistent app_config if blank in settings
    if (!settings.server_url) {
      settings.server_url = configService.getServerUrl();
    }

    return settings;
  }

  updateSettings(accountId, data) {
    const {
      cafe_name,
      owner_name,
      address,
      phone,
      logo_path,
      upi_id,
      upi_qr_data,
      server_url,
      receipt_paper_width
    } = data;

    const db = this.getDb();
    const now = new Date().toISOString();

    // Persist server_url to app_config as well
    if (server_url !== undefined) {
      configService.setServerUrl(server_url);
    }

    const existing = db.prepare('SELECT account_id FROM settings WHERE account_id = ?').get(accountId);

    if (existing) {
      db.prepare(`
        UPDATE settings
        SET cafe_name = COALESCE(?, cafe_name),
            owner_name = COALESCE(?, owner_name),
            address = COALESCE(?, address),
            phone = COALESCE(?, phone),
            logo_path = COALESCE(?, logo_path),
            upi_id = COALESCE(?, upi_id),
            upi_qr_data = COALESCE(?, upi_qr_data),
            server_url = COALESCE(?, server_url),
            receipt_paper_width = COALESCE(?, receipt_paper_width),
            updated_at = ?
        WHERE account_id = ?
      `).run(
        cafe_name !== undefined ? cafe_name : null,
        owner_name !== undefined ? owner_name : null,
        address !== undefined ? address : null,
        phone !== undefined ? phone : null,
        logo_path !== undefined ? logo_path : null,
        upi_id !== undefined ? upi_id : null,
        upi_qr_data !== undefined ? upi_qr_data : null,
        server_url !== undefined ? server_url : null,
        receipt_paper_width !== undefined ? receipt_paper_width : null,
        now,
        accountId
      );
    } else {
      db.prepare(`
        INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId,
        cafe_name || 'Yum Yum Cafe',
        owner_name || '',
        address || '',
        phone || '',
        logo_path || '',
        upi_id || '',
        upi_qr_data || '',
        server_url || '',
        receipt_paper_width || '80mm',
        now,
        now
      );
    }

    // Also update accounts table if cafe_name or owner_name changed
    if (cafe_name || owner_name) {
      db.prepare(`
        UPDATE accounts
        SET cafe_name = COALESCE(?, cafe_name),
            owner_name = COALESCE(?, owner_name),
            updated_at = ?
        WHERE id = ?
      `).run(cafe_name || null, owner_name || null, now, accountId);
    }

    // Add to sync_queue
    db.prepare(`
      INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
      VALUES (?, ?, 'settings', ?, 'upsert', ?)
    `).run(require('crypto').randomUUID(), accountId, accountId, now);

    return this.getSettings(accountId);
  }
}

module.exports = new SettingsService();

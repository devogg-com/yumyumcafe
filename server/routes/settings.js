const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get settings for current account
router.get('/', (req, res) => {
  try {
    const db = getDb();
    let settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(req.account.id);

    if (!settings) {
      // Create default settings if not exists
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
        VALUES (?, ?, ?, '', '', '', '', '', '', '80mm', ?, ?)
      `).run(req.account.id, req.account.cafe_name || 'Yum Yum Cafe', req.account.owner_name || '', now, now);

      settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(req.account.id);
    }

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve settings.' });
  }
});

// Update settings
router.put('/', (req, res) => {
  try {
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
    } = req.body;

    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT account_id FROM settings WHERE account_id = ?').get(req.account.id);

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
        req.account.id
      );
    } else {
      db.prepare(`
        INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.account.id,
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

    // Also update cafe_name and owner_name in accounts table if updated here
    if (cafe_name || owner_name) {
      db.prepare(`
        UPDATE accounts
        SET cafe_name = COALESCE(?, cafe_name),
            owner_name = COALESCE(?, owner_name),
            updated_at = ?
        WHERE id = ?
      `).run(cafe_name || null, owner_name || null, now, req.account.id);
    }

    const updated = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(req.account.id);

    res.json({
      success: true,
      message: 'Settings updated successfully.',
      settings: updated
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
});

module.exports = router;

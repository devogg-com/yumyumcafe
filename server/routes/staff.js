const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get staff list
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const staff = db.prepare(`
      SELECT id, account_id, name, created_at, updated_at
      FROM staff
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY name ASC
    `).all(req.account.id);

    res.json({
      success: true,
      staff
    });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve staff list.' });
  }
});

// Add staff
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Staff name is required.' });
    }

    const db = getDb();
    const id = req.body.id || crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO staff (id, account_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.account.id, name.trim(), now, now);

    const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      message: 'Staff added successfully.',
      staff: created
    });
  } catch (err) {
    console.error('Error adding staff:', err);
    res.status(500).json({ success: false, message: 'Failed to add staff.' });
  }
});

// Delete staff
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM staff WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE staff
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(now, now, id, req.account.id);

    res.json({
      success: true,
      message: 'Staff member removed successfully.'
    });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ success: false, message: 'Failed to remove staff.' });
  }
});

module.exports = router;

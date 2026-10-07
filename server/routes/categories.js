const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all active categories for account
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT id, account_id, name, display_order, created_at, updated_at
      FROM categories
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC
    `).all(req.account.id);

    res.json({
      success: true,
      categories
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
});

// Create new category
router.post('/', (req, res) => {
  try {
    const { name, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const db = getDb();
    const id = req.body.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine default display order if not provided
    let order = display_order;
    if (order === undefined || order === null) {
      const maxOrder = db.prepare(`
        SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
        FROM categories
        WHERE account_id = ? AND deleted_at IS NULL
      `).get(req.account.id);
      order = maxOrder.next_order;
    }

    db.prepare(`
      INSERT INTO categories (id, account_id, name, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.account.id, name.trim(), order, now, now);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: created
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_order } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          display_order = COALESCE(?, display_order),
          updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(name !== undefined ? name.trim() : null, display_order !== undefined ? display_order : null, now, id, req.account.id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Category updated successfully.',
      category: updated
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// Delete category (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE categories
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(now, now, id, req.account.id);

    res.json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

// Reorder categories
router.put('/reorder/batch', (req, res) => {
  try {
    const { items } = req.body; // array of { id, display_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid reorder items list.' });
    }

    const db = getDb();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE categories
      SET display_order = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `);

    db.transaction(() => {
      for (const item of items) {
        if (item.id && typeof item.display_order === 'number') {
          updateStmt.run(item.display_order, now, item.id, req.account.id);
        }
      }
    })();

    const categories = db.prepare(`
      SELECT id, account_id, name, display_order, created_at, updated_at
      FROM categories
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC
    `).all(req.account.id);

    res.json({
      success: true,
      message: 'Categories reordered successfully.',
      categories
    });
  } catch (err) {
    console.error('Error reordering categories:', err);
    res.status(500).json({ success: false, message: 'Failed to reorder categories.' });
  }
});

module.exports = router;

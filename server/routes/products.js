const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get products (with optional filtering)
router.get('/', (req, res) => {
  try {
    const { category_id, search, available_only } = req.query;
    const db = getDb();

    let query = `
      SELECT p.id, p.account_id, p.category_id, p.name, p.price, p.is_available, p.image_data,
             p.created_at, p.updated_at, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.account_id = ? AND p.deleted_at IS NULL
    `;
    const params = [req.account.id];

    if (category_id && category_id !== 'all') {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (available_only === 'true' || available_only === '1') {
      query += ` AND p.is_available = 1`;
    }

    if (search && search.trim()) {
      query += ` AND LOWER(p.name) LIKE ?`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const products = db.prepare(query).all(...params);

    res.json({
      success: true,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
});

// Create product
router.post('/', (req, res) => {
  try {
    const { category_id, name, price, is_available, image_data } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid price is required.' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Please select a category.' });
    }

    const db = getDb();
    const id = req.body.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const avail = is_available === false || is_available === 0 ? 0 : 1;

    db.prepare(`
      INSERT INTO products (id, account_id, category_id, name, price, is_available, image_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.account.id,
      category_id,
      name.trim(),
      Number(price),
      avail,
      image_data || '',
      now,
      now
    );

    const product = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, is_available, image_data } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const now = new Date().toISOString();
    const parsedPrice = price !== undefined ? Number(price) : null;
    const avail = is_available !== undefined ? (is_available ? 1 : 0) : null;

    db.prepare(`
      UPDATE products
      SET category_id = COALESCE(?, category_id),
          name = COALESCE(?, name),
          price = COALESCE(?, price),
          is_available = COALESCE(?, is_available),
          image_data = COALESCE(?, image_data),
          updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(
      category_id || null,
      name !== undefined ? name.trim() : null,
      parsedPrice,
      avail,
      image_data !== undefined ? image_data : null,
      now,
      id,
      req.account.id
    );

    const product = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// Delete product (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(now, now, id, req.account.id);

    res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;

const crypto = require('crypto');
const { getLocalDb } = require('../database/db');

class MenuService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
  }

  // --- Categories ---

  getCategories(accountId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT id, account_id, name, display_order, created_at, updated_at
      FROM categories
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC
    `).all(accountId);
  }

  createCategory(accountId, name, displayOrder = null) {
    if (!name || !name.trim()) throw new Error('Category name is required.');
    const db = this.getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    let order = displayOrder;
    if (order === null || order === undefined) {
      const maxRow = db.prepare(`
        SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
        FROM categories
        WHERE account_id = ? AND deleted_at IS NULL
      `).get(accountId);
      order = maxRow.next_order;
    }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO categories (id, account_id, name, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, accountId, name.trim(), order, now, now);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'category', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  updateCategory(accountId, id, name, displayOrder) {
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!existing) throw new Error('Category not found.');

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE categories
        SET name = COALESCE(?, name),
            display_order = COALESCE(?, display_order),
            updated_at = ?
        WHERE id = ? AND account_id = ?
      `).run(name !== undefined ? name.trim() : null, displayOrder !== undefined ? displayOrder : null, now, id, accountId);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'category', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  deleteCategory(accountId, id) {
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!existing) throw new Error('Category not found.');

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE categories
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND account_id = ?
      `).run(now, now, id, accountId);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'category', ?, 'delete', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return true;
  }

  reorderCategories(accountId, items) {
    if (!Array.isArray(items)) throw new Error('Invalid items list for reorder.');
    const db = this.getDb();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE categories
      SET display_order = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `);

    const queueStmt = db.prepare(`
      INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
      VALUES (?, ?, 'category', ?, 'upsert', ?)
    `);

    db.transaction(() => {
      for (const item of items) {
        if (item.id && typeof item.display_order === 'number') {
          updateStmt.run(item.display_order, now, item.id, accountId);
          queueStmt.run(crypto.randomUUID(), accountId, item.id, now);
        }
      }
    })();

    return this.getCategories(accountId);
  }

  // --- Products ---

  getProducts(accountId, filters = {}) {
    const { category_id, search, available_only } = filters;
    const db = this.getDb();

    let query = `
      SELECT p.id, p.account_id, p.category_id, p.name, p.price, p.is_available, p.image_data,
             p.created_at, p.updated_at, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.account_id = ? AND p.deleted_at IS NULL
    `;
    const params = [accountId];

    if (category_id && category_id !== 'all') {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (available_only) {
      query += ` AND p.is_available = 1`;
    }

    if (search && search.trim()) {
      query += ` AND LOWER(p.name) LIKE ?`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    query += ` ORDER BY p.name ASC`;
    return db.prepare(query).all(...params);
  }

  createProduct(accountId, data) {
    const { category_id, name, price, is_available, image_data } = data;
    if (!name || !name.trim()) throw new Error('Product name is required.');
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      throw new Error('A valid price is required.');
    }
    if (!category_id) throw new Error('Please select a category.');

    const db = this.getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const avail = is_available === false || is_available === 0 ? 0 : 1;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO products (id, account_id, category_id, name, price, is_available, image_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, accountId, category_id, name.trim(), Number(price), avail, image_data || '', now, now);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'product', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  }

  updateProduct(accountId, id, data) {
    const { category_id, name, price, is_available, image_data } = data;
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!existing) throw new Error('Product not found.');

    const now = new Date().toISOString();
    const parsedPrice = price !== undefined ? Number(price) : null;
    const avail = is_available !== undefined ? (is_available ? 1 : 0) : null;

    db.transaction(() => {
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
        accountId
      );

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'product', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  }

  deleteProduct(accountId, id) {
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!existing) throw new Error('Product not found.');

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE products
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND account_id = ?
      `).run(now, now, id, accountId);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'product', ?, 'delete', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return true;
  }
}

module.exports = new MenuService();

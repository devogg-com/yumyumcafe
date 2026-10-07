const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// PUSH: Client sends locally created/updated records to server
router.post('/push', (req, res) => {
  try {
    const { categories = [], products = [], staff = [], bills = [], settings } = req.body;
    const db = getDb();
    const accountId = req.account.id;
    const now = new Date().toISOString();

    const stats = {
      categories: 0,
      products: 0,
      staff: 0,
      bills: 0,
      settings: 0
    };

    db.transaction(() => {
      // 1. Categories
      const upsertCategory = db.prepare(`
        INSERT INTO categories (id, account_id, name, display_order, created_at, updated_at, deleted_at)
        VALUES (@id, @account_id, @name, @display_order, @created_at, @updated_at, @deleted_at)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          display_order = excluded.display_order,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at
        WHERE excluded.updated_at >= categories.updated_at
      `);

      for (const cat of categories) {
        if (cat.id && cat.name) {
          upsertCategory.run({
            id: cat.id,
            account_id: accountId,
            name: cat.name,
            display_order: cat.display_order || 0,
            created_at: cat.created_at || now,
            updated_at: cat.updated_at || now,
            deleted_at: cat.deleted_at || null
          });
          stats.categories++;
        }
      }

      // 2. Products
      const upsertProduct = db.prepare(`
        INSERT INTO products (id, account_id, category_id, name, price, is_available, image_data, created_at, updated_at, deleted_at)
        VALUES (@id, @account_id, @category_id, @name, @price, @is_available, @image_data, @created_at, @updated_at, @deleted_at)
        ON CONFLICT(id) DO UPDATE SET
          category_id = excluded.category_id,
          name = excluded.name,
          price = excluded.price,
          is_available = excluded.is_available,
          image_data = excluded.image_data,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at
        WHERE excluded.updated_at >= products.updated_at
      `);

      for (const prod of products) {
        if (prod.id && prod.name) {
          upsertProduct.run({
            id: prod.id,
            account_id: accountId,
            category_id: prod.category_id,
            name: prod.name,
            price: Number(prod.price) || 0,
            is_available: prod.is_available === 0 ? 0 : 1,
            image_data: prod.image_data || '',
            created_at: prod.created_at || now,
            updated_at: prod.updated_at || now,
            deleted_at: prod.deleted_at || null
          });
          stats.products++;
        }
      }

      // 3. Staff
      const upsertStaff = db.prepare(`
        INSERT INTO staff (id, account_id, name, created_at, updated_at, deleted_at)
        VALUES (@id, @account_id, @name, @created_at, @updated_at, @deleted_at)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at
        WHERE excluded.updated_at >= staff.updated_at
      `);

      for (const s of staff) {
        if (s.id && s.name) {
          upsertStaff.run({
            id: s.id,
            account_id: accountId,
            name: s.name,
            created_at: s.created_at || now,
            updated_at: s.updated_at || now,
            deleted_at: s.deleted_at || null
          });
          stats.staff++;
        }
      }

      // 4. Bills & Bill items
      const checkBill = db.prepare('SELECT id, updated_at FROM bills WHERE id = ?');
      const insertBill = db.prepare(`
        INSERT INTO bills (
          id, account_id, bill_number, bill_sequence, bill_date, bill_time,
          staff_name, subtotal, discount_type, discount_value, discount_amount,
          grand_total, payment_method, status, created_at, updated_at, deleted_at
        ) VALUES (
          @id, @account_id, @bill_number, @bill_sequence, @bill_date, @bill_time,
          @staff_name, @subtotal, @discount_type, @discount_value, @discount_amount,
          @grand_total, @payment_method, @status, @created_at, @updated_at, @deleted_at
        )
      `);

      const updateBill = db.prepare(`
        UPDATE bills
        SET status = @status,
            deleted_at = @deleted_at,
            updated_at = @updated_at
        WHERE id = @id AND account_id = @account_id AND @updated_at >= updated_at
      `);

      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO bill_items (id, bill_id, product_id, product_name, quantity, unit_price, total_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const b of bills) {
        if (!b.id) continue;
        const existing = checkBill.get(b.id);
        if (existing) {
          updateBill.run({
            id: b.id,
            account_id: accountId,
            status: b.status || 'completed',
            deleted_at: b.deleted_at || null,
            updated_at: b.updated_at || now
          });
        } else {
          insertBill.run({
            id: b.id,
            account_id: accountId,
            bill_number: b.bill_number,
            bill_sequence: b.bill_sequence || 0,
            bill_date: b.bill_date,
            bill_time: b.bill_time,
            staff_name: b.staff_name || 'Staff',
            subtotal: Number(b.subtotal) || 0,
            discount_type: b.discount_type || 'none',
            discount_value: Number(b.discount_value) || 0,
            discount_amount: Number(b.discount_amount) || 0,
            grand_total: Number(b.grand_total) || 0,
            payment_method: b.payment_method || 'Cash',
            status: b.status || 'completed',
            created_at: b.created_at || now,
            updated_at: b.updated_at || now,
            deleted_at: b.deleted_at || null
          });

          // Insert items
          if (Array.isArray(b.items)) {
            for (const item of b.items) {
              insertItem.run(
                item.id,
                b.id,
                item.product_id || null,
                item.product_name,
                item.quantity,
                item.unit_price,
                item.total_price,
                item.created_at || b.created_at || now
              );
            }
          }
        }
        stats.bills++;
      }

      // 5. Settings
      if (settings && settings.cafe_name) {
        db.prepare(`
          INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
          VALUES (@account_id, @cafe_name, @owner_name, @address, @phone, @logo_path, @upi_id, @upi_qr_data, @server_url, @receipt_paper_width, @created_at, @updated_at)
          ON CONFLICT(account_id) DO UPDATE SET
            cafe_name = excluded.cafe_name,
            owner_name = excluded.owner_name,
            address = excluded.address,
            phone = excluded.phone,
            logo_path = excluded.logo_path,
            upi_id = excluded.upi_id,
            upi_qr_data = excluded.upi_qr_data,
            receipt_paper_width = excluded.receipt_paper_width,
            updated_at = excluded.updated_at
          WHERE excluded.updated_at >= settings.updated_at
        `).run({
          account_id: accountId,
          cafe_name: settings.cafe_name,
          owner_name: settings.owner_name || '',
          address: settings.address || '',
          phone: settings.phone || '',
          logo_path: settings.logo_path || '',
          upi_id: settings.upi_id || '',
          upi_qr_data: settings.upi_qr_data || '',
          server_url: settings.server_url || '',
          receipt_paper_width: settings.receipt_paper_width || '80mm',
          created_at: settings.created_at || now,
          updated_at: settings.updated_at || now
        });
        stats.settings = 1;
      }
    })();

    res.json({
      success: true,
      message: 'Push synchronization completed.',
      stats,
      server_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error during push sync:', err);
    res.status(500).json({ success: false, message: 'Push sync failed: ' + err.message });
  }
});

// PULL: Server returns changes since client's last sync timestamp
router.post('/pull', (req, res) => {
  try {
    const { since } = req.body;
    const db = getDb();
    const accountId = req.account.id;

    let catQuery = 'SELECT * FROM categories WHERE account_id = ?';
    let prodQuery = 'SELECT * FROM products WHERE account_id = ?';
    let staffQuery = 'SELECT * FROM staff WHERE account_id = ?';
    let billsQuery = 'SELECT * FROM bills WHERE account_id = ?';

    const params = [accountId];

    if (since && since.trim()) {
      catQuery += ' AND updated_at > ?';
      prodQuery += ' AND updated_at > ?';
      staffQuery += ' AND updated_at > ?';
      billsQuery += ' AND updated_at > ?';
      params.push(since);
    }

    const categories = db.prepare(catQuery).all(...params);
    const products = db.prepare(prodQuery).all(...params);
    const staff = db.prepare(staffQuery).all(...params);
    const bills = db.prepare(billsQuery).all(...params);

    // Fetch bill items for the pulled bills
    const billIds = bills.map(b => b.id);
    let billItems = [];
    if (billIds.length > 0) {
      billItems = db.prepare(`
        SELECT * FROM bill_items WHERE bill_id IN (${billIds.map(() => '?').join(',')})
      `).all(...billIds);

      const itemsByBill = {};
      for (const item of billItems) {
        if (!itemsByBill[item.bill_id]) itemsByBill[item.bill_id] = [];
        itemsByBill[item.bill_id].push(item);
      }
      for (const bill of bills) {
        bill.items = itemsByBill[bill.id] || [];
      }
    }

    const settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(accountId);

    res.json({
      success: true,
      data: {
        categories,
        products,
        staff,
        bills,
        settings
      },
      server_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error during pull sync:', err);
    res.status(500).json({ success: false, message: 'Pull sync failed: ' + err.message });
  }
});

module.exports = router;

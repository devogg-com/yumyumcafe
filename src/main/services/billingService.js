const crypto = require('crypto');
const { getLocalDb } = require('../database/db');

function formatBillNumber(seq) {
  return `YYC-${String(seq).padStart(6, '0')}`;
}

class BillingService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
  }

  createBill(accountId, data) {
    const {
      items,
      staff_name,
      discount_type = 'none',
      discount_value = 0,
      payment_method,
      bill_date,
      bill_time
    } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required to generate a bill.');
    }

    if (!payment_method || (payment_method !== 'Cash' && payment_method !== 'UPI')) {
      throw new Error('Payment method must be either Cash or UPI.');
    }

    const db = this.getDb();
    const billId = data.id || crypto.randomUUID();
    const now = new Date();
    const dateStr = bill_date || now.toISOString().split('T')[0];
    const timeStr = bill_time || now.toTimeString().split(' ')[0];
    const staff = staff_name && staff_name.trim() ? staff_name.trim() : 'Staff';

    // Compute subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.unit_price);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error('Invalid quantity or price for item: ' + (item.product_name || item.name));
      }
      const itemTotal = Number((qty * price).toFixed(2));
      subtotal += itemTotal;
      validatedItems.push({
        id: item.id || crypto.randomUUID(),
        product_id: item.product_id || null,
        product_name: (item.product_name || item.name || 'Item').trim(),
        quantity: qty,
        unit_price: price,
        total_price: itemTotal
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    // Calculate discount
    let discType = discount_type;
    let discVal = parseFloat(discount_value) || 0;
    let discountAmount = 0;

    if (discType === 'percent') {
      if (discVal > 100) discVal = 100;
      if (discVal < 0) discVal = 0;
      discountAmount = Number(((subtotal * discVal) / 100).toFixed(2));
    } else if (discType === 'fixed') {
      if (discVal < 0) discVal = 0;
      discountAmount = Number(Math.min(discVal, subtotal).toFixed(2));
    } else {
      discType = 'none';
      discVal = 0;
      discountAmount = 0;
    }

    const grandTotal = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

    let finalBillNumber;
    let finalSequence;

    // Atomic transaction for sequential numbering, bill insertion, items insertion, and sync queue
    db.transaction(() => {
      // Find next sequence atomically
      const seqRow = db.prepare(`
        SELECT COALESCE(MAX(bill_sequence), 0) + 1 AS next_seq
        FROM bills
        WHERE account_id = ?
      `).get(accountId);

      finalSequence = seqRow.next_seq;
      finalBillNumber = formatBillNumber(finalSequence);

      db.prepare(`
        INSERT INTO bills (
          id, account_id, bill_number, bill_sequence, bill_date, bill_time,
          staff_name, subtotal, discount_type, discount_value, discount_amount,
          grand_total, payment_method, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        billId,
        accountId,
        finalBillNumber,
        finalSequence,
        dateStr,
        timeStr,
        staff,
        subtotal,
        discType,
        discVal,
        discountAmount,
        grandTotal,
        payment_method,
        now.toISOString(),
        now.toISOString()
      );

      const insertItemStmt = db.prepare(`
        INSERT INTO bill_items (id, bill_id, product_id, product_name, quantity, unit_price, total_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of validatedItems) {
        insertItemStmt.run(
          item.id,
          billId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price,
          now.toISOString()
        );
      }

      // Add to sync queue
      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'bill', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, billId, now.toISOString());
    })();

    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    createdBill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);

    return createdBill;
  }

  getBills(accountId, filters = {}) {
    const {
      search,
      bill_number,
      date,
      start_date,
      end_date,
      payment_method,
      status,
      limit = 100,
      offset = 0
    } = filters;

    const db = this.getDb();
    let whereClause = `WHERE b.account_id = ? AND b.deleted_at IS NULL`;
    const params = [accountId];

    if (bill_number && bill_number.trim()) {
      whereClause += ` AND b.bill_number LIKE ?`;
      params.push(`%${bill_number.trim()}%`);
    }

    if (date) {
      whereClause += ` AND b.bill_date = ?`;
      params.push(date);
    }

    if (start_date && end_date) {
      whereClause += ` AND b.bill_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    } else if (start_date) {
      whereClause += ` AND b.bill_date >= ?`;
      params.push(start_date);
    } else if (end_date) {
      whereClause += ` AND b.bill_date <= ?`;
      params.push(end_date);
    }

    if (payment_method && payment_method !== 'all') {
      whereClause += ` AND b.payment_method = ?`;
      params.push(payment_method);
    }

    if (status && status !== 'all') {
      whereClause += ` AND b.status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      whereClause += ` AND (b.bill_number LIKE ? OR b.staff_name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const bills = db.prepare(`
      SELECT b.*
      FROM bills b
      ${whereClause}
      ORDER BY b.bill_date DESC, b.bill_time DESC, b.bill_sequence DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit, 10), parseInt(offset, 10));

    // Attach items
    const billIds = bills.map(b => b.id);
    if (billIds.length > 0) {
      const items = db.prepare(`
        SELECT * FROM bill_items WHERE bill_id IN (${billIds.map(() => '?').join(',')})
      `).all(...billIds);

      const itemsByBill = {};
      for (const item of items) {
        if (!itemsByBill[item.bill_id]) itemsByBill[item.bill_id] = [];
        itemsByBill[item.bill_id].push(item);
      }
      for (const bill of bills) {
        bill.items = itemsByBill[bill.id] || [];
      }
    }

    return bills;
  }

  getBillById(accountId, id) {
    const db = this.getDb();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND account_id = ?').get(id, accountId);
    if (!bill) return null;
    bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
    return bill;
  }

  cancelBill(accountId, id) {
    const db = this.getDb();
    const bill = db.prepare('SELECT id, status FROM bills WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, accountId);
    if (!bill) throw new Error('Bill not found.');
    if (bill.status === 'cancelled') throw new Error('Bill is already cancelled.');

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE bills
        SET status = 'cancelled', updated_at = ?
        WHERE id = ? AND account_id = ?
      `).run(now, id, accountId);

      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'bill', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, id, now);
    })();

    return true;
  }
}

module.exports = new BillingService();

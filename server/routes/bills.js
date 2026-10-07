const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * Format sequential bill number with 6 digit padding: YYC-000001
 */
function formatBillNumber(seq) {
  return `YYC-${String(seq).padStart(6, '0')}`;
}

// Create a new bill
router.post('/', (req, res) => {
  try {
    const {
      id: customId,
      items,
      staff_name,
      discount_type,
      discount_value,
      payment_method,
      bill_date,
      bill_time,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required in the bill.' });
    }

    if (!payment_method || (payment_method !== 'Cash' && payment_method !== 'UPI')) {
      return res.status(400).json({ success: false, message: 'Payment method must be either Cash or UPI.' });
    }

    const db = getDb();
    const billId = customId || crypto.randomUUID();
    const now = new Date();
    const dateStr = bill_date || now.toISOString().split('T')[0];
    const timeStr = bill_time || now.toTimeString().split(' ')[0];
    const staff = staff_name && staff_name.trim() ? staff_name.trim() : 'Staff';

    // Calculate subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.unit_price);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({ success: false, message: 'Invalid quantity or unit price for item.' });
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
    let discType = discount_type || 'none';
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

    // Transaction for atomic sequence number generation and insertion
    let finalBillNumber;
    let finalSequence;

    db.transaction(() => {
      // Find next sequence atomically
      const seqRow = db.prepare(`
        SELECT COALESCE(MAX(bill_sequence), 0) + 1 AS next_seq
        FROM bills
        WHERE account_id = ?
      `).get(req.account.id);

      finalSequence = seqRow.next_seq;
      finalBillNumber = formatBillNumber(finalSequence);

      // Insert bill
      db.prepare(`
        INSERT INTO bills (
          id, account_id, bill_number, bill_sequence, bill_date, bill_time,
          staff_name, subtotal, discount_type, discount_value, discount_amount,
          grand_total, payment_method, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        billId,
        req.account.id,
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

      // Insert line items
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
    })();

    // Retrieve created bill with items
    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    createdBill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);

    res.status(201).json({
      success: true,
      message: 'Bill created successfully.',
      bill: createdBill
    });
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(500).json({ success: false, message: 'Failed to create bill.' });
  }
});

// Get bills with filtering and pagination
router.get('/', (req, res) => {
  try {
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
    } = req.query;

    const db = getDb();
    let whereClause = `WHERE b.account_id = ? AND b.deleted_at IS NULL`;
    const params = [req.account.id];

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

    // Attach items to each bill
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

    res.json({
      success: true,
      bills
    });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve bills.' });
  }
});

// Get single bill by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND account_id = ?').get(id, req.account.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);

    res.json({
      success: true,
      bill
    });
  } catch (err) {
    console.error('Error fetching bill:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve bill.' });
  }
});

// Cancel bill (audit-safe: marks status as cancelled)
router.post('/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const bill = db.prepare('SELECT id, status FROM bills WHERE id = ? AND account_id = ? AND deleted_at IS NULL').get(id, req.account.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    if (bill.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Bill is already cancelled.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE bills
      SET status = 'cancelled', updated_at = ?
      WHERE id = ? AND account_id = ?
    `).run(now, id, req.account.id);

    res.json({
      success: true,
      message: 'Bill has been cancelled successfully.'
    });
  } catch (err) {
    console.error('Error cancelling bill:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel bill.' });
  }
});

module.exports = router;

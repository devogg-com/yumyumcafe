const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Daily Report
router.get('/daily', (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const db = getDb();

    // Summary metrics for the target date
    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_bills,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bills,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bills,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN subtotal ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) AS total_discounts,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) AS net_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales
      FROM bills
      WHERE account_id = ? AND bill_date = ? AND deleted_at IS NULL
    `).get(req.account.id, targetDate);

    // Bills on that day
    const bills = db.prepare(`
      SELECT b.*
      FROM bills b
      WHERE b.account_id = ? AND b.bill_date = ? AND b.deleted_at IS NULL
      ORDER BY b.bill_time DESC
    `).all(req.account.id, targetDate);

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

    res.json({
      success: true,
      date: targetDate,
      summary: {
        total_bills: summary.total_bills || 0,
        completed_bills: summary.completed_bills || 0,
        cancelled_bills: summary.cancelled_bills || 0,
        gross_sales: Number(summary.gross_sales.toFixed(2)),
        total_discounts: Number(summary.total_discounts.toFixed(2)),
        net_sales: Number(summary.net_sales.toFixed(2)),
        cash_sales: Number(summary.cash_sales.toFixed(2)),
        upi_sales: Number(summary.upi_sales.toFixed(2))
      },
      bills
    });
  } catch (err) {
    console.error('Error in daily report:', err);
    res.status(500).json({ success: false, message: 'Failed to generate daily report.' });
  }
});

// Monthly Report
router.get('/monthly', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const defaultMonth = today.substring(0, 7); // 'YYYY-MM'
    const targetMonth = req.query.month || defaultMonth;
    const db = getDb();

    // Summary metrics for the month
    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_bills,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bills,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bills,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN subtotal ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) AS total_discounts,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) AS net_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales
      FROM bills
      WHERE account_id = ? AND bill_date LIKE ? AND deleted_at IS NULL
    `).get(req.account.id, `${targetMonth}%`);

    // Day-by-day breakdown
    const dailyBreakdown = db.prepare(`
      SELECT
        bill_date AS date,
        COUNT(*) AS total_bills,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bills,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bills,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) AS net_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) AS discounts
      FROM bills
      WHERE account_id = ? AND bill_date LIKE ? AND deleted_at IS NULL
      GROUP BY bill_date
      ORDER BY bill_date ASC
    `).all(req.account.id, `${targetMonth}%`);

    res.json({
      success: true,
      month: targetMonth,
      summary: {
        total_bills: summary.total_bills || 0,
        completed_bills: summary.completed_bills || 0,
        cancelled_bills: summary.cancelled_bills || 0,
        gross_sales: Number(summary.gross_sales.toFixed(2)),
        total_discounts: Number(summary.total_discounts.toFixed(2)),
        net_sales: Number(summary.net_sales.toFixed(2)),
        cash_sales: Number(summary.cash_sales.toFixed(2)),
        upi_sales: Number(summary.upi_sales.toFixed(2))
      },
      daily_breakdown: dailyBreakdown.map(d => ({
        ...d,
        net_sales: Number(d.net_sales.toFixed(2)),
        cash_sales: Number(d.cash_sales.toFixed(2)),
        upi_sales: Number(d.upi_sales.toFixed(2)),
        discounts: Number(d.discounts.toFixed(2))
      }))
    });
  } catch (err) {
    console.error('Error in monthly report:', err);
    res.status(500).json({ success: false, message: 'Failed to generate monthly report.' });
  }
});

// Dashboard summary metrics
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const db = getDb();

    const todayStats = db.prepare(`
      SELECT
        COUNT(*) AS total_bills,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bills,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) AS today_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) AS discount
      FROM bills
      WHERE account_id = ? AND bill_date = ? AND deleted_at IS NULL
    `).get(req.account.id, today);

    const recentBills = db.prepare(`
      SELECT *
      FROM bills
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY bill_date DESC, bill_time DESC, bill_sequence DESC
      LIMIT 10
    `).all(req.account.id);

    res.json({
      success: true,
      date: today,
      stats: {
        today_sales: Number(todayStats.today_sales.toFixed(2)),
        today_bills: todayStats.completed_bills || 0,
        cash_sales: Number(todayStats.cash_sales.toFixed(2)),
        upi_sales: Number(todayStats.upi_sales.toFixed(2)),
        discount: Number(todayStats.discount.toFixed(2))
      },
      recent_bills: recentBills
    });
  } catch (err) {
    console.error('Error in dashboard metrics:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics.' });
  }
});

module.exports = router;

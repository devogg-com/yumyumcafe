const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const BillingService = require('../src/main/services/billingService').constructor;
const ReportsService = require('../src/main/services/reportsService').constructor;

function runTest() {
  console.log('--- TEST 5: Financial & Sales Reports (Daily & Monthly) ---');

  const db = new Database(':memory:');
  initSchema(db);
  const dbGetter = () => db;
  const billing = new BillingService(dbGetter);
  const reports = new ReportsService(dbGetter);

  const accountId = 'acc-reports-test';
  db.prepare(`
    INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
    VALUES (?, 'Yum Yum Cafe', 'Owner', 'rep@yumyum.com', 'reporter', 'hash', 'q', 'a', datetime('now'), datetime('now'))
  `).run(accountId);

  const today = '2026-10-06';

  // Bill 1: Cash, ₹300 subtotal, ₹0 discount, ₹300 net
  billing.createBill(accountId, {
    items: [{ product_name: 'Burger Combo', quantity: 1, unit_price: 300 }],
    staff_name: 'Staff A',
    payment_method: 'Cash',
    bill_date: today
  });

  // Bill 2: UPI, ₹400 subtotal, ₹40 discount (10%), ₹360 net
  const bill2 = billing.createBill(accountId, {
    items: [{ product_name: 'Pizza Combo', quantity: 1, unit_price: 400 }],
    staff_name: 'Staff B',
    payment_method: 'UPI',
    discount_type: 'percent',
    discount_value: 10,
    bill_date: today
  });

  // Bill 3: Cash, ₹200 subtotal, ₹0 discount, ₹200 net -> then cancelled!
  const bill3 = billing.createBill(accountId, {
    items: [{ product_name: 'Cold Coffee', quantity: 2, unit_price: 100 }],
    staff_name: 'Staff A',
    payment_method: 'Cash',
    bill_date: today
  });
  billing.cancelBill(accountId, bill3.id);

  // 1. Verify Daily Report
  const daily = reports.getDailyReport(accountId, today);
  assert.strictEqual(daily.date, today);
  assert.strictEqual(daily.summary.total_bills, 3);
  assert.strictEqual(daily.summary.completed_bills, 2);
  assert.strictEqual(daily.summary.cancelled_bills, 1);
  assert.strictEqual(daily.summary.cash_sales, 300); // Only completed bill 1 counted!
  assert.strictEqual(daily.summary.upi_sales, 360);
  assert.strictEqual(daily.summary.total_discounts, 40);
  assert.strictEqual(daily.summary.net_sales, 660); // 300 + 360 = 660

  // 2. Verify Monthly Report
  const monthly = reports.getMonthlyReport(accountId, '2026-10');
  assert.strictEqual(monthly.summary.net_sales, 660);
  assert.strictEqual(monthly.summary.cash_sales, 300);
  assert.strictEqual(monthly.summary.upi_sales, 360);
  assert.strictEqual(monthly.daily_breakdown.length, 1);
  assert.strictEqual(monthly.daily_breakdown[0].date, today);
  assert.strictEqual(monthly.daily_breakdown[0].net_sales, 660);

  // 3. Verify Dashboard
  const dash = reports.getDashboard(accountId, today);
  assert.strictEqual(dash.stats.cash_sales, 300);
  assert.strictEqual(dash.stats.upi_sales, 360);
  assert.strictEqual(dash.stats.today_bills, 2);

  console.log('✓ Daily report metrics (completed, cancelled, net sales, cash, upi) verified');
  console.log('✓ Monthly aggregated report and daily breakdown verified');
  console.log('✓ Dashboard real-time telemetry verified');

  db.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest();
  console.log('Reports tests passed!');
}

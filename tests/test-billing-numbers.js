const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const BillingService = require('../src/main/services/billingService').constructor;

function runTest() {
  console.log('--- TEST 4: Billing Sequences, Pricing, Discounts & Auditing ---');

  const db = new Database(':memory:');
  initSchema(db);
  const dbGetter = () => db;
  const billing = new BillingService(dbGetter);

  const accountId = 'acc-billing-test';
  db.prepare(`
    INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
    VALUES (?, 'Yum Yum Cafe', 'Owner', 'bill@yumyum.com', 'biller', 'hash', 'q', 'a', datetime('now'), datetime('now'))
  `).run(accountId);

  // 1. Create Bill 1: Cash payment, no discount
  const bill1 = billing.createBill(accountId, {
    items: [
      { product_name: 'Espresso', quantity: 2, unit_price: 100 },
      { product_name: 'Croissant', quantity: 1, unit_price: 150 }
    ],
    staff_name: 'Rohan',
    payment_method: 'Cash',
    discount_type: 'none',
    discount_value: 0
  });

  assert.strictEqual(bill1.bill_number, 'YYC-000001', 'First bill must be YYC-000001');
  assert.strictEqual(bill1.subtotal, 350);
  assert.strictEqual(bill1.discount_amount, 0);
  assert.strictEqual(bill1.grand_total, 350);
  assert.strictEqual(bill1.payment_method, 'Cash');
  assert.strictEqual(bill1.status, 'completed');
  assert.strictEqual(bill1.items.length, 2);

  // 2. Create Bill 2: UPI payment, 10% discount
  const bill2 = billing.createBill(accountId, {
    items: [
      { product_name: 'Cold Coffee', quantity: 2, unit_price: 120 }
    ],
    staff_name: 'Priya',
    payment_method: 'UPI',
    discount_type: 'percent',
    discount_value: 10
  });

  assert.strictEqual(bill2.bill_number, 'YYC-000002', 'Second bill must be YYC-000002');
  assert.strictEqual(bill2.subtotal, 240);
  assert.strictEqual(bill2.discount_amount, 24);
  assert.strictEqual(bill2.grand_total, 216);
  assert.strictEqual(bill2.payment_method, 'UPI');

  // 3. Create Bill 3: Cash payment, flat ₹50 discount
  const bill3 = billing.createBill(accountId, {
    items: [
      { product_name: 'Chicken Burger', quantity: 1, unit_price: 250 }
    ],
    staff_name: 'Rohan',
    payment_method: 'Cash',
    discount_type: 'fixed',
    discount_value: 50
  });

  assert.strictEqual(bill3.bill_number, 'YYC-000003', 'Third bill must be YYC-000003');
  assert.strictEqual(bill3.subtotal, 250);
  assert.strictEqual(bill3.discount_amount, 50);
  assert.strictEqual(bill3.grand_total, 200);

  // 4. Validate sequential ordering without random duplicates
  const allBills = billing.getBills(accountId);
  assert.strictEqual(allBills.length, 3);
  const billNumbers = allBills.map(b => b.bill_number).sort();
  assert.deepStrictEqual(billNumbers, ['YYC-000001', 'YYC-000002', 'YYC-000003']);

  // 5. Filter by payment method
  const upiBills = billing.getBills(accountId, { payment_method: 'UPI' });
  assert.strictEqual(upiBills.length, 1);
  assert.strictEqual(upiBills[0].bill_number, 'YYC-000002');

  const cashBills = billing.getBills(accountId, { payment_method: 'Cash' });
  assert.strictEqual(cashBills.length, 2);

  // 6. Test cancellation (audit-safe: marks status as cancelled, does NOT delete record)
  billing.cancelBill(accountId, bill2.id);
  const cancelledBill = billing.getBillById(accountId, bill2.id);
  assert.strictEqual(cancelledBill.status, 'cancelled');

  // Cancelled bills should not be deleted
  const countAfterCancel = billing.getBills(accountId).length;
  assert.strictEqual(countAfterCancel, 3, 'Audit trail must be preserved when a bill is cancelled');

  // 7. Verify illegal payment methods are rejected
  assert.throws(() => {
    billing.createBill(accountId, {
      items: [{ product_name: 'Tea', quantity: 1, unit_price: 30 }],
      payment_method: 'Credit Card' // Card and Credit are NOT allowed per spec!
    });
  }, /Payment method must be either Cash or UPI/);

  console.log('✓ Sequential bill numbering (YYC-000001, YYC-000002...) strictly verified');
  console.log('✓ Subtotal, percentage discount, and flat discount calculations verified');
  console.log('✓ Strict enforcement of Cash & UPI payment methods verified');
  console.log('✓ Audit-safe bill cancellation verified');

  db.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest();
  console.log('Billing tests passed!');
}

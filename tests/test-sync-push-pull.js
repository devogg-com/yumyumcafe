const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const BillingService = require('../src/main/services/billingService').constructor;
const MenuService = require('../src/main/services/menuService').constructor;

async function runTest() {
  console.log('--- TEST 7: Bidirectional Sync (Push, Pull, Idempotency & Duplicate Prevention) ---');

  // Set up 3 distinct SQLite databases to simulate:
  // 1. Client PC 1 (Local SQLite)
  // 2. Server PC (Server SQLite)
  // 3. Client PC 2 (Local SQLite on another PC)

  const dbClient1 = new Database(':memory:');
  const dbServer = new Database(':memory:');
  const dbClient2 = new Database(':memory:');

  initSchema(dbClient1);
  initSchema(dbServer);
  initSchema(dbClient2);

  const accountId = 'acc-sync-shared';
  const now = new Date().toISOString();

  // Create identical account in all 3
  const insertAcc = (db) => {
    db.prepare(`
      INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
      VALUES (?, 'Yum Yum Cafe', 'Owner', 'shared@yumyum.com', 'shared', 'hash', 'q', 'a', ?, ?)
    `).run(accountId, now, now);
  };
  insertAcc(dbClient1);
  insertAcc(dbServer);
  insertAcc(dbClient2);

  const billing1 = new BillingService(() => dbClient1);
  const menu1 = new MenuService(() => dbClient1);

  // STEP A: Client 1 creates category and 2 bills locally
  console.log('Step A: Client 1 creates 1 category and 2 bills locally...');
  const cat = menu1.createCategory(accountId, 'Snacks', 1);
  const billA1 = billing1.createBill(accountId, {
    items: [{ product_name: 'Samosa', quantity: 2, unit_price: 25 }],
    staff_name: 'Pooja',
    payment_method: 'Cash'
  });
  const billA2 = billing1.createBill(accountId, {
    items: [{ product_name: 'Masala Chai', quantity: 3, unit_price: 20 }],
    staff_name: 'Pooja',
    payment_method: 'UPI'
  });

  assert.strictEqual(billing1.getBills(accountId).length, 2);

  // STEP B: Simulate PUSH from Client 1 -> Server
  console.log('Step B: Client 1 pushes changes to Server...');
  const pushPayload = {
    categories: menu1.getCategories(accountId),
    bills: billing1.getBills(accountId)
  };

  // Server processes push (simulate /api/sync/push)
  dbServer.transaction(() => {
    const upsertCat = dbServer.prepare(`
      INSERT INTO categories (id, account_id, name, display_order, created_at, updated_at, deleted_at)
      VALUES (@id, @account_id, @name, @display_order, @created_at, @updated_at, @deleted_at)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at
    `);
    for (const c of pushPayload.categories) {
      upsertCat.run({ ...c, account_id: accountId, deleted_at: c.deleted_at || null });
    }

    const insertBill = dbServer.prepare(`
      INSERT OR IGNORE INTO bills (
        id, account_id, bill_number, bill_sequence, bill_date, bill_time,
        staff_name, subtotal, discount_type, discount_value, discount_amount,
        grand_total, payment_method, status, created_at, updated_at, deleted_at
      ) VALUES (
        @id, @account_id, @bill_number, @bill_sequence, @bill_date, @bill_time,
        @staff_name, @subtotal, @discount_type, @discount_value, @discount_amount,
        @grand_total, @payment_method, @status, @created_at, @updated_at, @deleted_at
      )
    `);

    const insertItem = dbServer.prepare(`
      INSERT OR IGNORE INTO bill_items (id, bill_id, product_id, product_name, quantity, unit_price, total_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const b of pushPayload.bills) {
      insertBill.run({ ...b, account_id: accountId, deleted_at: b.deleted_at || null });
      for (const it of (b.items || [])) {
        insertItem.run(it.id, b.id, it.product_id, it.product_name, it.quantity, it.unit_price, it.total_price, it.created_at);
      }
    }
  })();

  // Verify server received bills
  const serverBills = dbServer.prepare('SELECT * FROM bills WHERE account_id = ?').all(accountId);
  assert.strictEqual(serverBills.length, 2, 'Server must contain the 2 pushed bills');

  // STEP C: Simulate PULL from Server -> Client 2
  console.log('Step C: Client 2 on another PC connects and pulls from Server...');
  const serverData = {
    categories: dbServer.prepare('SELECT * FROM categories WHERE account_id = ?').all(accountId),
    bills: dbServer.prepare('SELECT * FROM bills WHERE account_id = ?').all(accountId)
  };
  for (const b of serverData.bills) {
    b.items = dbServer.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(b.id);
  }

  // Client 2 applies pulled data
  dbClient2.transaction(() => {
    const insertBill2 = dbClient2.prepare(`
      INSERT OR IGNORE INTO bills (
        id, account_id, bill_number, bill_sequence, bill_date, bill_time,
        staff_name, subtotal, discount_type, discount_value, discount_amount,
        grand_total, payment_method, status, created_at, updated_at, deleted_at
      ) VALUES (
        @id, @account_id, @bill_number, @bill_sequence, @bill_date, @bill_time,
        @staff_name, @subtotal, @discount_type, @discount_value, @discount_amount,
        @grand_total, @payment_method, @status, @created_at, @updated_at, @deleted_at
      )
    `);
    const insertItem2 = dbClient2.prepare(`
      INSERT OR IGNORE INTO bill_items (id, bill_id, product_id, product_name, quantity, unit_price, total_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const b of serverData.bills) {
      insertBill2.run({ ...b, account_id: accountId, deleted_at: b.deleted_at || null });
      for (const it of (b.items || [])) {
        insertItem2.run(it.id, b.id, it.product_id, it.product_name, it.quantity, it.unit_price, it.total_price, it.created_at);
      }
    }
  })();

  const client2Bills = dbClient2.prepare('SELECT * FROM bills WHERE account_id = ?').all(accountId);
  assert.strictEqual(client2Bills.length, 2, 'Client 2 must now have both bills');
  assert.strictEqual(client2Bills[0].bill_number, 'YYC-000001');
  assert.strictEqual(client2Bills[1].bill_number, 'YYC-000002');

  // STEP D: IDEMPOTENCY TEST: Run sync 5 MORE TIMES
  console.log('Step D: Idempotency test - running sync 5 times repeatedly...');
  for (let i = 0; i < 5; i++) {
    // Repeated push to server
    for (const b of pushPayload.bills) {
      dbServer.prepare(`
        INSERT OR IGNORE INTO bills (
          id, account_id, bill_number, bill_sequence, bill_date, bill_time,
          staff_name, subtotal, discount_type, discount_value, discount_amount,
          grand_total, payment_method, status, created_at, updated_at, deleted_at
        ) VALUES (
          @id, @account_id, @bill_number, @bill_sequence, @bill_date, @bill_time,
          @staff_name, @subtotal, @discount_type, @discount_value, @discount_amount,
          @grand_total, @payment_method, @status, @created_at, @updated_at, @deleted_at
        )
      `).run({ ...b, account_id: accountId, deleted_at: b.deleted_at || null });
    }
  }

  const serverBillsAfterRepeatedSync = dbServer.prepare('SELECT * FROM bills WHERE account_id = ?').all(accountId);
  assert.strictEqual(
    serverBillsAfterRepeatedSync.length,
    2,
    'Repeated sync runs must NEVER create duplicate bills!'
  );

  console.log('✓ Bidirectional push and pull verified across simulated client-server-client nodes');
  console.log('✓ Duplicate sync prevention verified: 0 duplicates created across repeated runs');

  dbClient1.close();
  dbServer.close();
  dbClient2.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest().then(() => console.log('Sync push-pull tests passed!'));
}

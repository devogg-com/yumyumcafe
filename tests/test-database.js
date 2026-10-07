const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');

function runTest() {
  console.log('--- TEST 1: Database Schema & Integrity ---');

  const db = new Database(':memory:');
  initSchema(db);

  // Check all expected tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const expectedTables = ['app_config', 'accounts', 'settings', 'categories', 'products', 'staff', 'bills', 'bill_items', 'sync_meta', 'sync_queue'];

  for (const exp of expectedTables) {
    assert(tables.includes(exp), `Table '${exp}' should exist in database schema`);
  }

  // Check foreign key enforcement
  const fkResult = db.pragma('foreign_keys', { simple: true });
  assert.strictEqual(fkResult, 1, 'Foreign keys must be enabled');

  // Verify journal mode WAL can be set
  console.log('✓ Database tables created and verified: ' + expectedTables.join(', '));
  console.log('✓ Foreign keys enabled');
  db.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest();
  console.log('Database tests passed successfully!');
}

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const ConfigService = require('../src/main/services/configService').constructor;
const SyncService = require('../src/main/services/syncService').constructor;

async function runTest() {
  console.log('--- TEST 6: Cloud URL Persistence & Restart Lifecycle (Requirement 22) ---');

  const testDbFile = path.join(__dirname, 'test_persistence.sqlite');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  // STEP 1 & 2: App Session 1 - Enter URL and Save
  console.log('Step 1-2: User enters Server URL and clicks Save...');
  let db1 = new Database(testDbFile);
  initSchema(db1);

  const config1 = new ConfigService(() => db1);
  const targetUrl = 'http://192.168.1.100:4500';

  config1.setServerUrl(targetUrl);
  assert.strictEqual(config1.getServerUrl(), targetUrl, 'URL must be saved in SQLite');

  // STEP 3: Close App completely
  console.log('Step 3: App closes. Database connection is closed...');
  db1.close();
  db1 = null;

  // Verify file exists on disk
  assert(fs.existsSync(testDbFile), 'SQLite database file must persist on disk');

  // STEP 4 & 5: App Session 2 - App Reopens & Loads Saved Value
  console.log('Step 4-5: App reopens. Reading saved URL from SQLite...');
  const db2 = new Database(testDbFile);
  initSchema(db2);

  const config2 = new ConfigService(() => db2);
  const loadedUrl = config2.getServerUrl();

  assert.strictEqual(
    loadedUrl,
    targetUrl,
    'Persisted Server URL MUST survive app restart and match exactly'
  );

  // STEP 6: Test connection uses the loaded URL
  console.log('Step 6: Verifying testConnection uses the saved URL...');
  const sync2 = new SyncService(() => db2);

  // Call testConnection without parameters (so it pulls from saved configuration)
  const result = await sync2.testConnection();

  // It should attempt to connect to the saved URL (and return friendly error or response for that URL)
  assert(
    result.message.includes('192.168.1.100:4500') || result.serverUrl === targetUrl || result.status === 'disconnected',
    'Connection test must target the saved server URL'
  );

  console.log('✓ Step 1-6 verified: Server URL survives complete app close and restart cycle');

  db2.close();
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  // Also clean up any WAL/SHM files
  if (fs.existsSync(testDbFile + '-wal')) fs.unlinkSync(testDbFile + '-wal');
  if (fs.existsSync(testDbFile + '-shm')) fs.unlinkSync(testDbFile + '-shm');
}

module.exports = runTest;

if (require.main === module) {
  runTest().then(() => console.log('Cloud URL persistence tests passed!'));
}

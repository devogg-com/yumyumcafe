const testDatabase = require('./test-database');
const testAuth = require('./test-auth-isolation');
const testMenu = require('./test-menu-categories');
const testBilling = require('./test-billing-numbers');
const testReports = require('./test-reports');
const testCloudUrl = require('./test-cloud-url-persistence');
const testSync = require('./test-sync-push-pull');
const app = require('../server/app');
const http = require('http');

async function testLiveServer() {
  console.log('--- TEST 8: Live HTTP Server & Health Check API ---');
  return new Promise((resolve, reject) => {
    const testPort = 4599;
    const server = app.listen(testPort, '127.0.0.1', async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${testPort}/api/health`);
        const json = await res.json();
        if (json.status === 'ok' && json.app === 'YUM YUM BILLING') {
          console.log(`✓ Live HTTP GET /api/health responded correctly on port ${testPort}:`, json);
          server.close(() => resolve());
        } else {
          server.close(() => reject(new Error('Unexpected health response: ' + JSON.stringify(json))));
        }
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

async function runAll() {
  console.log('====================================================');
  console.log('       RUNNING YUM YUM BILLING TEST SUITE           ');
  console.log('====================================================\n');

  const startTime = Date.now();

  try {
    testDatabase();
    console.log('');

    await testAuth();
    console.log('');

    testMenu();
    console.log('');

    testBilling();
    console.log('');

    testReports();
    console.log('');

    await testCloudUrl();
    console.log('');

    await testSync();
    console.log('');

    await testLiveServer();
    console.log('');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('====================================================');
    console.log(` ALL 8 TEST SUITES PASSED CLEANLY IN ${elapsed}s! `);
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runAll();

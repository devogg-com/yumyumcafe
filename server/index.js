const app = require('./app');
const { getLanIPv4 } = require('./utils/network');
const { getDb, closeDb } = require('./database/db');

const PORT = parseInt(process.env.PORT, 10) || 4500;
const HOST = '0.0.0.0'; // Must bind to 0.0.0.0 so other PCs on LAN can connect

// Ensure DB is initialized
try {
  getDb();
  console.log('[DB] SQLite Server database initialized successfully.');
} catch (err) {
  console.error('[DB] Failed to initialize SQLite database:', err);
  process.exit(1);
}

const server = app.listen(PORT, HOST, () => {
  const lanIp = getLanIPv4();
  console.log('====================================================');
  console.log('            YUM YUM BILLING - LOCAL SERVER          ');
  console.log('                  FOR YUM YUM CAFE                  ');
  console.log('====================================================');
  console.log(` Status:       ONLINE & READY`);
  console.log(` Listening on: 0.0.0.0:${PORT}`);
  console.log('----------------------------------------------------');
  console.log(` Local Access: http://localhost:${PORT}`);
  console.log(` LAN Access:   http://${lanIp}:${PORT}`);
  console.log('----------------------------------------------------');
  console.log(` Health Check: http://${lanIp}:${PORT}/api/health`);
  console.log('====================================================');
  console.log(' * To connect from another PC on the same Wi-Fi/LAN:');
  console.log(`   Enter Server URL: http://${lanIp}:${PORT}`);
  console.log(' * Ensure Windows Firewall allows TCP port ' + PORT);
  console.log('====================================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down server gracefully...');
  server.close(() => {
    closeDb();
    console.log('[SERVER] Server closed. Database connection released.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

module.exports = server;

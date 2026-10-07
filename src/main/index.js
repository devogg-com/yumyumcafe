const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { getLocalDb, closeLocalDb } = require('./database/db');
const { registerIpcHandlers } = require('./ipc');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '..', '..', 'build', 'icon_256.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Yum Yum Billing - Yum Yum Cafe',
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Remove standard menu bar for sleek, distraction-free POS experience
  mainWindow.setMenuBarVisibility(false);

  // Open external links in user's default browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load renderer
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null);

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    // Open devtools in development if needed
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize local SQLite
  try {
    getLocalDb();
    console.log('[LOCAL DB] Local SQLite database initialized successfully.');
  } catch (err) {
    console.error('[LOCAL DB] Error initializing local database:', err);
  }

  // Register all IPC handlers
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeLocalDb();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

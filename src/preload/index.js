const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yumYumAPI', {
  isElectron: true,

  // Config
  getServerUrl: () => ipcRenderer.invoke('config:get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('config:set-server-url', url),

  // Auth
  auth: {
    register: (data) => ipcRenderer.invoke('auth:register', data),
    login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
    loginRemember: (username, password, rememberMe) => ipcRenderer.invoke('auth:login-remember', { username, password, rememberMe }),
    getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSecurityQuestion: (usernameOrEmail) => ipcRenderer.invoke('auth:get-security-question', usernameOrEmail),
    resetPassword: (payload) => ipcRenderer.invoke('auth:reset-password', payload)
  },

  // Settings
  settings: {
    get: (accountId) => ipcRenderer.invoke('settings:get', accountId),
    update: (accountId, data) => ipcRenderer.invoke('settings:update', { accountId, data })
  },

  // Categories
  categories: {
    getAll: (accountId) => ipcRenderer.invoke('categories:get-all', accountId),
    create: (accountId, name, displayOrder) => ipcRenderer.invoke('categories:create', { accountId, name, displayOrder }),
    update: (accountId, id, name, displayOrder) => ipcRenderer.invoke('categories:update', { accountId, id, name, displayOrder }),
    delete: (accountId, id) => ipcRenderer.invoke('categories:delete', { accountId, id }),
    reorder: (accountId, items) => ipcRenderer.invoke('categories:reorder', { accountId, items })
  },

  // Products
  products: {
    getAll: (accountId, filters) => ipcRenderer.invoke('products:get-all', { accountId, filters }),
    create: (accountId, data) => ipcRenderer.invoke('products:create', { accountId, data }),
    update: (accountId, id, data) => ipcRenderer.invoke('products:update', { accountId, id, data }),
    delete: (accountId, id) => ipcRenderer.invoke('products:delete', { accountId, id })
  },

  // Staff
  staff: {
    getAll: (accountId) => ipcRenderer.invoke('staff:get-all', accountId),
    add: (accountId, name) => ipcRenderer.invoke('staff:add', { accountId, name }),
    delete: (accountId, id) => ipcRenderer.invoke('staff:delete', { accountId, id })
  },

  // Bills
  bills: {
    create: (accountId, data) => ipcRenderer.invoke('bills:create', { accountId, data }),
    getAll: (accountId, filters) => ipcRenderer.invoke('bills:get-all', { accountId, filters }),
    getById: (accountId, id) => ipcRenderer.invoke('bills:get-by-id', { accountId, id }),
    cancel: (accountId, id) => ipcRenderer.invoke('bills:cancel', { accountId, id })
  },

  // Reports
  reports: {
    getDaily: (accountId, date) => ipcRenderer.invoke('reports:get-daily', { accountId, date }),
    getMonthly: (accountId, month) => ipcRenderer.invoke('reports:get-monthly', { accountId, month }),
    getDashboard: (accountId) => ipcRenderer.invoke('reports:get-dashboard', accountId)
  },

  // Printer
  printer: {
    printBill: (bill, settings, silent = false) => ipcRenderer.invoke('printer:print-bill', { bill, settings, silent }),
    exportPdf: (bill, settings) => ipcRenderer.invoke('printer:export-pdf', { bill, settings }),
    getReceiptHtml: (bill, settings) => ipcRenderer.invoke('printer:get-receipt-html', { bill, settings })
  },

  // Sync
  sync: {
    testConnection: (customUrl) => ipcRenderer.invoke('sync:test-connection', customUrl),
    syncNow: (accountId, token) => ipcRenderer.invoke('sync:sync-now', { accountId, token }),
    getStatus: (accountId) => ipcRenderer.invoke('sync:get-status', accountId)
  },

  // Assets
  assets: {
    getLogoBase64: () => ipcRenderer.invoke('assets:get-logo-base64'),
    validateQr: (data) => ipcRenderer.invoke('assets:validate-qr', data)
  }
});

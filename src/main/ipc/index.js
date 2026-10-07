const { ipcMain } = require('electron');
const configService = require('../services/configService');
const authService = require('../services/authService');
const settingsService = require('../services/settingsService');
const menuService = require('../services/menuService');
const staffService = require('../services/staffService');
const billingService = require('../services/billingService');
const reportsService = require('../services/reportsService');
const syncService = require('../services/syncService');
const assetService = require('../services/assetService');
const printerService = require('../services/printerService');

function registerIpcHandlers() {
  // Helper to wrap IPC handlers with safe response format
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        const result = await fn(...args);
        return { success: true, data: result };
      } catch (err) {
        console.error(`[IPC Error on ${channel}]:`, err);
        return { success: false, error: err.message || 'Operation failed' };
      }
    });
  };

  // --- Configuration ---
  handle('config:get-server-url', () => configService.getServerUrl());
  handle('config:set-server-url', (url) => configService.setServerUrl(url));

  // --- Authentication ---
  handle('auth:register', (data) => authService.register(data));
  handle('auth:login', ({ username, password }) => authService.login(username, password));
  handle('auth:login-remember', ({ username, password, rememberMe }) => authService.loginWithRememberMe(username, password, rememberMe));
  handle('auth:get-current-user', () => authService.getCurrentUser());
  handle('auth:logout', () => authService.logout());
  handle('auth:get-security-question', (usernameOrEmail) => authService.getSecurityQuestion(usernameOrEmail));
  handle('auth:reset-password', ({ username_or_email, security_answer, new_password, confirm_password }) =>
    authService.resetPassword(username_or_email, security_answer, new_password, confirm_password)
  );

  // --- Settings ---
  handle('settings:get', (accountId) => settingsService.getSettings(accountId));
  handle('settings:update', ({ accountId, data }) => settingsService.updateSettings(accountId, data));

  // --- Categories ---
  handle('categories:get-all', (accountId) => menuService.getCategories(accountId));
  handle('categories:create', ({ accountId, name, displayOrder }) => menuService.createCategory(accountId, name, displayOrder));
  handle('categories:update', ({ accountId, id, name, displayOrder }) => menuService.updateCategory(accountId, id, name, displayOrder));
  handle('categories:delete', ({ accountId, id }) => menuService.deleteCategory(accountId, id));
  handle('categories:reorder', ({ accountId, items }) => menuService.reorderCategories(accountId, items));

  // --- Products ---
  handle('products:get-all', ({ accountId, filters }) => menuService.getProducts(accountId, filters));
  handle('products:create', ({ accountId, data }) => menuService.createProduct(accountId, data));
  handle('products:update', ({ accountId, id, data }) => menuService.updateProduct(accountId, id, data));
  handle('products:delete', ({ accountId, id }) => menuService.deleteProduct(accountId, id));

  // --- Staff ---
  handle('staff:get-all', (accountId) => staffService.getStaff(accountId));
  handle('staff:add', ({ accountId, name }) => staffService.addStaff(accountId, name));
  handle('staff:delete', ({ accountId, id }) => staffService.deleteStaff(accountId, id));

  // --- Bills ---
  handle('bills:create', ({ accountId, data }) => billingService.createBill(accountId, data));
  handle('bills:get-all', ({ accountId, filters }) => billingService.getBills(accountId, filters));
  handle('bills:get-by-id', ({ accountId, id }) => billingService.getBillById(accountId, id));
  handle('bills:cancel', ({ accountId, id }) => billingService.cancelBill(accountId, id));

  // --- Reports ---
  handle('reports:get-daily', ({ accountId, date }) => reportsService.getDailyReport(accountId, date));
  handle('reports:get-monthly', ({ accountId, month }) => reportsService.getMonthlyReport(accountId, month));
  handle('reports:get-dashboard', (accountId) => reportsService.getDashboard(accountId));

  // --- Printing & PDF ---
  handle('printer:print-bill', ({ bill, settings, silent }) => printerService.printBill(bill, settings, silent));
  handle('printer:export-pdf', ({ bill, settings }) => printerService.exportBillPdf(bill, settings));
  handle('printer:get-receipt-html', ({ bill, settings }) => printerService.getReceiptHtml(bill, settings));

  // --- Synchronization ---
  handle('sync:test-connection', (customUrl) => syncService.testConnection(customUrl));
  handle('sync:sync-now', ({ accountId, token }) => syncService.syncNow(accountId, token));
  handle('sync:get-status', (accountId) => ({
    lastSync: syncService.getLastSyncTime(accountId),
    pendingChanges: syncService.getPendingChangesCount(accountId)
  }));

  // --- Assets & Logo ---
  handle('assets:get-logo-base64', () => assetService.getLogoBase64());
  handle('assets:validate-qr', (data) => assetService.validateQrImage(data));
}

module.exports = {
  registerIpcHandlers
};

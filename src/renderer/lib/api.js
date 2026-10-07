/**
 * Unified API bridge for Yum Yum Billing.
 * Seamlessly delegates to Electron IPC (local-first) or HTTP REST API.
 */

class ApiBridge {
  constructor() {
    this.token = localStorage.getItem('yyc_token') || null;
    this.serverUrl = localStorage.getItem('yyc_server_url') || '';
  }

  isElectron() {
    return typeof window !== 'undefined' && window.yumYumAPI && window.yumYumAPI.isElectron;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('yyc_token', token);
    } else {
      localStorage.removeItem('yyc_token');
    }
  }

  getToken() {
    return this.token;
  }

  // Server URL persistence
  async getServerUrl() {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.getServerUrl();
      if (res && res.success && res.data) {
        this.serverUrl = res.data;
        localStorage.setItem('yyc_server_url', res.data);
        return res.data;
      }
    }
    return this.serverUrl || localStorage.getItem('yyc_server_url') || '';
  }

  async setServerUrl(url) {
    this.serverUrl = url;
    localStorage.setItem('yyc_server_url', url);
    if (this.isElectron()) {
      await window.yumYumAPI.setServerUrl(url);
    }
    return url;
  }

  // --- Auth ---
  async register(data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.auth.register(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpPost('/api/auth/register', data);
  }

  async login(username, password, rememberMe = false) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.auth.loginRemember(username, password, rememberMe);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPost('/api/auth/login', { username, password });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getCurrentUser() {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.auth.getCurrentUser();
      return res.success ? res.data : null;
    }
    if (!this.token) return null;
    try {
      const res = await this.httpGet('/api/auth/me');
      return res.account;
    } catch (e) {
      return null;
    }
  }

  async logout() {
    this.setToken(null);
    if (this.isElectron()) {
      await window.yumYumAPI.auth.logout();
    }
    return true;
  }

  async getSecurityQuestion(usernameOrEmail) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.auth.getSecurityQuestion(usernameOrEmail);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpGet(`/api/auth/security-question?username_or_email=${encodeURIComponent(usernameOrEmail)}`);
    return res.security_question;
  }

  async resetPassword(data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.auth.resetPassword(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpPost('/api/auth/reset-password', data);
  }

  // --- Settings ---
  async getSettings(accountId) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.settings.get(accountId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpGet('/api/settings');
    return res.settings;
  }

  async updateSettings(accountId, data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.settings.update(accountId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPut('/api/settings', data);
    return res.settings;
  }

  // --- Categories ---
  async getCategories(accountId) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.categories.getAll(accountId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpGet('/api/categories');
    return res.categories;
  }

  async createCategory(accountId, name, displayOrder) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.categories.create(accountId, name, displayOrder);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPost('/api/categories', { name, display_order: displayOrder });
    return res.category;
  }

  async updateCategory(accountId, id, name, displayOrder) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.categories.update(accountId, id, name, displayOrder);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPut(`/api/categories/${id}`, { name, display_order: displayOrder });
    return res.category;
  }

  async deleteCategory(accountId, id) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.categories.delete(accountId, id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpDelete(`/api/categories/${id}`);
  }

  async reorderCategories(accountId, items) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.categories.reorder(accountId, items);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPut('/api/categories/reorder/batch', { items });
    return res.categories;
  }

  // --- Products ---
  async getProducts(accountId, filters = {}) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.products.getAll(accountId, filters);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const params = new URLSearchParams(filters);
    const res = await this.httpGet(`/api/products?${params.toString()}`);
    return res.products;
  }

  async createProduct(accountId, data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.products.create(accountId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPost('/api/products', data);
    return res.product;
  }

  async updateProduct(accountId, id, data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.products.update(accountId, id, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPut(`/api/products/${id}`, data);
    return res.product;
  }

  async deleteProduct(accountId, id) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.products.delete(accountId, id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpDelete(`/api/products/${id}`);
  }

  // --- Staff ---
  async getStaff(accountId) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.staff.getAll(accountId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpGet('/api/staff');
    return res.staff;
  }

  async addStaff(accountId, name) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.staff.add(accountId, name);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPost('/api/staff', { name });
    return res.staff;
  }

  async deleteStaff(accountId, id) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.staff.delete(accountId, id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpDelete(`/api/staff/${id}`);
  }

  // --- Bills ---
  async createBill(accountId, data) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.bills.create(accountId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpPost('/api/bills', data);
    return res.bill;
  }

  async getBills(accountId, filters = {}) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.bills.getAll(accountId, filters);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const params = new URLSearchParams(filters);
    const res = await this.httpGet(`/api/bills?${params.toString()}`);
    return res.bills;
  }

  async getBillById(accountId, id) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.bills.getById(accountId, id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    const res = await this.httpGet(`/api/bills/${id}`);
    return res.bill;
  }

  async cancelBill(accountId, id) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.bills.cancel(accountId, id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpPost(`/api/bills/${id}/cancel`, {});
  }

  // --- Reports ---
  async getDailyReport(accountId, date) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.reports.getDaily(accountId, date);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpGet(`/api/reports/daily?date=${date || ''}`);
  }

  async getMonthlyReport(accountId, month) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.reports.getMonthly(accountId, month);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpGet(`/api/reports/monthly?month=${month || ''}`);
  }

  async getDashboard(accountId) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.reports.getDashboard(accountId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return this.httpGet('/api/reports/dashboard');
  }

  // --- Printing / PDF ---
  async printBill(bill, settings, silent = false) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.printer.printBill(bill, settings, silent);
      return res;
    }
    window.print();
    return { success: true };
  }

  async exportPdf(bill, settings) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.printer.exportPdf(bill, settings);
      return res;
    }
    window.print();
    return { success: true };
  }

  // --- Sync ---
  async testConnection(customUrl) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.sync.testConnection(customUrl);
      return res.data || res;
    }
    const url = customUrl || this.serverUrl;
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/api/health`);
      const data = await res.json();
      return { ok: res.ok && data.status === 'ok', serverInfo: data };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }

  async syncNow(accountId, token) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.sync.syncNow(accountId, token);
      if (!res.success) throw new Error(res.error);
      return res.data;
    }
    return { success: true, message: 'Already connected directly to server.' };
  }

  async getSyncStatus(accountId) {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.sync.getStatus(accountId);
      return res.data || {};
    }
    return { lastSync: 'Direct Server Mode', pendingChanges: 0 };
  }

  async getLogoBase64() {
    if (this.isElectron()) {
      const res = await window.yumYumAPI.assets.getLogoBase64();
      if (res.success) return res.data;
    }
    // Fallback: try loading directly from relative path or assets
    return './assets/Yum Yum Cafe Logo.jpg';
  }

  // --- HTTP Helpers ---
  async httpGet(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async httpPost(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  async httpPut(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  async httpDelete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async request(endpoint, options = {}) {
    const base = (this.serverUrl || 'http://localhost:4500').replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(`${base}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed with HTTP ${res.status}`);
    }
    return data;
  }
}

export default new ApiBridge();

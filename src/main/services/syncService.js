const { getLocalDb } = require('../database/db');
const configService = require('./configService');

class SyncService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
    this.authToken = null;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  async testConnection(customUrl = null) {
    const rawUrl = customUrl || configService.getServerUrl();
    if (!rawUrl || !rawUrl.trim()) {
      return {
        ok: false,
        status: 'disconnected',
        message: 'No Server URL configured. Please enter the Server URL.'
      };
    }

    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      // Use global fetch (Node 18+) with 4-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cleanUrl}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (!res.ok) {
        return {
          ok: false,
          status: 'error',
          latency,
          message: `Server returned HTTP status ${res.status}.`
        };
      }

      const data = await res.json();
      if (data.status === 'ok' && data.app === 'YUM YUM BILLING') {
        return {
          ok: true,
          status: 'connected',
          latency,
          serverInfo: data,
          serverUrl: cleanUrl,
          message: `Connected successfully to ${cleanUrl} (${latency}ms)`
        };
      } else {
        return {
          ok: false,
          status: 'invalid_server',
          latency,
          message: 'The URL responded, but it is not a valid Yum Yum Billing server.'
        };
      }
    } catch (err) {
      let friendlyMsg = 'Server connection failed. Please check the Server URL and make sure the server PC is running and accessible on the network.';
      if (err.name === 'AbortError') {
        friendlyMsg = 'Connection timed out. Please verify the Server PC IP address and ensure TCP port 4500 is allowed in Windows Firewall.';
      } else if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('fetch failed'))) {
        friendlyMsg = `Could not connect to ${cleanUrl}. Please ensure the server is running on the host PC and port 4500 is open in firewall.`;
      }
      return {
        ok: false,
        status: 'disconnected',
        error: err.message,
        message: friendlyMsg
      };
    }
  }

  getLastSyncTime(accountId) {
    const db = this.getDb();
    const row = db.prepare("SELECT value FROM sync_meta WHERE account_id = ? AND key = 'last_sync_time'").get(accountId);
    return row ? row.value : null;
  }

  setLastSyncTime(accountId, timestamp) {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO sync_meta (account_id, key, value)
      VALUES (?, 'last_sync_time', ?)
      ON CONFLICT(account_id, key) DO UPDATE SET value = excluded.value
    `).run(accountId, timestamp);
  }

  getPendingChangesCount(accountId) {
    const db = this.getDb();
    const row = db.prepare('SELECT COUNT(*) AS count FROM sync_queue WHERE account_id = ? AND synced_at IS NULL').get(accountId);
    return row ? row.count : 0;
  }

  async syncNow(accountId, token = null) {
    const effectiveToken = token || this.authToken;
    const rawUrl = configService.getServerUrl();

    if (!rawUrl || !rawUrl.trim()) {
      throw new Error('Cannot sync: No Server URL is configured.');
    }

    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    const health = await this.testConnection(cleanUrl);
    if (!health.ok) {
      throw new Error(health.message);
    }

    if (!effectiveToken) {
      throw new Error('Cannot sync: Not authenticated with server. Please log in or connect your account.');
    }

    const db = this.getDb();
    const lastSync = this.getLastSyncTime(accountId);

    // 1. GATHER LOCAL CHANGES TO PUSH
    let catQuery = 'SELECT * FROM categories WHERE account_id = ?';
    let prodQuery = 'SELECT * FROM products WHERE account_id = ?';
    let staffQuery = 'SELECT * FROM staff WHERE account_id = ?';
    let billsQuery = 'SELECT * FROM bills WHERE account_id = ?';
    const params = [accountId];

    if (lastSync) {
      catQuery += ' AND updated_at > ?';
      prodQuery += ' AND updated_at > ?';
      staffQuery += ' AND updated_at > ?';
      billsQuery += ' AND updated_at > ?';
      params.push(lastSync);
    }

    const categories = db.prepare(catQuery).all(...params);
    const products = db.prepare(prodQuery).all(...params);
    const staff = db.prepare(staffQuery).all(...params);
    const bills = db.prepare(billsQuery).all(...params);

    // Attach items to bills
    const billIds = bills.map(b => b.id);
    if (billIds.length > 0) {
      const items = db.prepare(`
        SELECT * FROM bill_items WHERE bill_id IN (${billIds.map(() => '?').join(',')})
      `).all(...billIds);
      const itemsByBill = {};
      for (const item of items) {
        if (!itemsByBill[item.bill_id]) itemsByBill[item.bill_id] = [];
        itemsByBill[item.bill_id].push(item);
      }
      for (const bill of bills) {
        bill.items = itemsByBill[bill.id] || [];
      }
    }

    const settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(accountId);

    // 2. PUSH TO SERVER
    let pushRes;
    try {
      const res = await fetch(`${cleanUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({
          categories,
          products,
          staff,
          bills,
          settings
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Push sync failed with HTTP ${res.status}`);
      }

      pushRes = await res.json();
    } catch (err) {
      throw new Error(`Sync Push failed: ${err.message}`);
    }

    // 3. PULL FROM SERVER
    let pullData;
    let serverTime;
    try {
      const res = await fetch(`${cleanUrl}/api/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({ since: lastSync })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Pull sync failed with HTTP ${res.status}`);
      }

      const pullRes = await res.json();
      pullData = pullRes.data;
      serverTime = pullRes.server_time;
    } catch (err) {
      throw new Error(`Sync Pull failed: ${err.message}`);
    }

    // 4. APPLY PULLED DATA LOCALLY
    const stats = {
      pushed: {
        categories: categories.length,
        products: products.length,
        staff: staff.length,
        bills: bills.length
      },
      pulled: {
        categories: 0,
        products: 0,
        staff: 0,
        bills: 0
      }
    };

    db.transaction(() => {
      // Upsert pulled categories
      if (pullData.categories && pullData.categories.length > 0) {
        const upsertCat = db.prepare(`
          INSERT INTO categories (id, account_id, name, display_order, created_at, updated_at, deleted_at)
          VALUES (@id, @account_id, @name, @display_order, @created_at, @updated_at, @deleted_at)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            display_order = excluded.display_order,
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at
          WHERE excluded.updated_at >= categories.updated_at
        `);
        for (const cat of pullData.categories) {
          upsertCat.run({ ...cat, account_id: accountId });
          stats.pulled.categories++;
        }
      }

      // Upsert pulled products
      if (pullData.products && pullData.products.length > 0) {
        const upsertProd = db.prepare(`
          INSERT INTO products (id, account_id, category_id, name, price, is_available, image_data, created_at, updated_at, deleted_at)
          VALUES (@id, @account_id, @category_id, @name, @price, @is_available, @image_data, @created_at, @updated_at, @deleted_at)
          ON CONFLICT(id) DO UPDATE SET
            category_id = excluded.category_id,
            name = excluded.name,
            price = excluded.price,
            is_available = excluded.is_available,
            image_data = excluded.image_data,
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at
          WHERE excluded.updated_at >= products.updated_at
        `);
        for (const prod of pullData.products) {
          upsertProd.run({ ...prod, account_id: accountId });
          stats.pulled.products++;
        }
      }

      // Upsert pulled staff
      if (pullData.staff && pullData.staff.length > 0) {
        const upsertStaff = db.prepare(`
          INSERT INTO staff (id, account_id, name, created_at, updated_at, deleted_at)
          VALUES (@id, @account_id, @name, @created_at, @updated_at, @deleted_at)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at
          WHERE excluded.updated_at >= staff.updated_at
        `);
        for (const s of pullData.staff) {
          upsertStaff.run({ ...s, account_id: accountId });
          stats.pulled.staff++;
        }
      }

      // Upsert pulled bills
      if (pullData.bills && pullData.bills.length > 0) {
        const checkBill = db.prepare('SELECT id, updated_at FROM bills WHERE id = ?');
        const insertBill = db.prepare(`
          INSERT INTO bills (
            id, account_id, bill_number, bill_sequence, bill_date, bill_time,
            staff_name, subtotal, discount_type, discount_value, discount_amount,
            grand_total, payment_method, status, created_at, updated_at, deleted_at
          ) VALUES (
            @id, @account_id, @bill_number, @bill_sequence, @bill_date, @bill_time,
            @staff_name, @subtotal, @discount_type, @discount_value, @discount_amount,
            @grand_total, @payment_method, @status, @created_at, @updated_at, @deleted_at
          )
        `);

        const updateBill = db.prepare(`
          UPDATE bills
          SET status = @status,
              deleted_at = @deleted_at,
              updated_at = @updated_at
          WHERE id = @id AND @updated_at >= updated_at
        `);

        const insertItem = db.prepare(`
          INSERT OR IGNORE INTO bill_items (id, bill_id, product_id, product_name, quantity, unit_price, total_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const b of pullData.bills) {
          const existing = checkBill.get(b.id);
          if (existing) {
            updateBill.run({
              id: b.id,
              status: b.status,
              deleted_at: b.deleted_at || null,
              updated_at: b.updated_at
            });
          } else {
            insertBill.run({
              id: b.id,
              account_id: accountId,
              bill_number: b.bill_number,
              bill_sequence: b.bill_sequence || 0,
              bill_date: b.bill_date,
              bill_time: b.bill_time,
              staff_name: b.staff_name,
              subtotal: b.subtotal,
              discount_type: b.discount_type || 'none',
              discount_value: b.discount_value || 0,
              discount_amount: b.discount_amount || 0,
              grand_total: b.grand_total,
              payment_method: b.payment_method,
              status: b.status || 'completed',
              created_at: b.created_at,
              updated_at: b.updated_at,
              deleted_at: b.deleted_at || null
            });

            if (Array.isArray(b.items)) {
              for (const item of b.items) {
                insertItem.run(
                  item.id,
                  b.id,
                  item.product_id || null,
                  item.product_name,
                  item.quantity,
                  item.unit_price,
                  item.total_price,
                  item.created_at || b.created_at
                );
              }
            }
          }
          stats.pulled.bills++;
        }
      }

      // Mark sync_queue items as synced
      db.prepare("UPDATE sync_queue SET synced_at = ? WHERE account_id = ? AND synced_at IS NULL").run(serverTime, accountId);

      // Save last sync time
      this.setLastSyncTime(accountId, serverTime);
    })();

    return {
      success: true,
      message: 'Synchronization successful.',
      stats,
      serverTime
    };
  }
}

module.exports = new SyncService();

/**
 * Shared database schema and migrations for Yum Yum Billing.
 * Used by both desktop POS SQLite and server SQLite.
 */

function initSchema(db) {
  // Enable foreign keys and WAL mode for high performance and durability
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(`
    -- Local application config (persists app-wide settings like server_url across restarts)
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    -- Accounts / Users
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      cafe_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cafe Settings (per account)
    CREATE TABLE IF NOT EXISTS settings (
      account_id TEXT PRIMARY KEY,
      cafe_name TEXT NOT NULL,
      owner_name TEXT,
      address TEXT,
      phone TEXT,
      logo_path TEXT,
      upi_id TEXT,
      upi_qr_data TEXT,
      server_url TEXT DEFAULT '',
      receipt_paper_width TEXT DEFAULT '80mm',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Products / Menu Items
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      image_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Staff Members (names selectable on billing screen)
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Bills
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      bill_number TEXT NOT NULL,
      bill_sequence INTEGER NOT NULL,
      bill_date TEXT NOT NULL,
      bill_time TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Bill Line Items
    CREATE TABLE IF NOT EXISTS bill_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    -- Sync Metadata (stores last_sync_time, client_id, etc. per account)
    CREATE TABLE IF NOT EXISTS sync_meta (
      account_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (account_id, key)
    );

    -- Local Sync Queue (tracks changes to push to server)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT
    );

    -- Indexes for high performance querying
    CREATE INDEX IF NOT EXISTS idx_products_acc_cat ON products(account_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_products_acc_avail ON products(account_id, is_available);
    CREATE INDEX IF NOT EXISTS idx_categories_acc_order ON categories(account_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_bills_acc_date ON bills(account_id, bill_date);
    CREATE INDEX IF NOT EXISTS idx_bills_acc_billno ON bills(account_id, bill_number);
    CREATE INDEX IF NOT EXISTS idx_bills_acc_seq ON bills(account_id, bill_sequence);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
    CREATE INDEX IF NOT EXISTS idx_staff_acc ON staff(account_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_acc ON sync_queue(account_id, synced_at);
  `);
}

module.exports = {
  initSchema
};

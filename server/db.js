import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const dbPath = path.resolve(__dirname, 'quickbite.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize Database Tables
 * 1. Users: Students and Canteen/Shop Vendors
 * 2. MenuItems: Swiggy-style item data, Unsplash image URLs, badges, categories
 * 3. Orders: Order tokens, UTR numbers, items array (JSON), pickup times, status
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('student', 'vendor', 'admin')),
      shop_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS MenuItems (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      desc TEXT,
      price REAL NOT NULL,
      badge TEXT,
      is_veg INTEGER NOT NULL DEFAULT 1,
      image TEXT NOT NULL,
      alt TEXT NOT NULL,
      fallback_image TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      prep_time_minutes INTEGER NOT NULL DEFAULT 3,
      in_stock_quantity INTEGER NOT NULL DEFAULT 20,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Orders (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT DEFAULT 'Student',
      shop_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      pickup_time TEXT NOT NULL,
      due_time TEXT NOT NULL,
      estimated_time TEXT,
      total REAL NOT NULL,
      utr TEXT,
      items TEXT NOT NULL,
      upi_string TEXT,
      student_socket_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_menu_shop ON MenuItems(shop_id);
    CREATE INDEX IF NOT EXISTS idx_menu_category ON MenuItems(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_shop ON Orders(shop_name);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON Orders(created_at DESC);

    CREATE TABLE IF NOT EXISTS UserBudget (
      user_id TEXT PRIMARY KEY,
      budget REAL NOT NULL DEFAULT 2000,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS PromoCodes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 100,
      is_redeemed INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.prepare("INSERT OR IGNORE INTO UserBudget (user_id, budget) VALUES ('usr-std-01', 2000)").run();
  } catch (err) {
    // ignore
  }

  // Ensure bitecoins_balance, current_streak, and last_order_date exist on Users
  try {
    const userTableInfo = db.prepare("PRAGMA table_info(Users)").all();
    if (!userTableInfo.some((col) => col.name === 'bitecoins_balance')) {
      db.exec("ALTER TABLE Users ADD COLUMN bitecoins_balance INTEGER NOT NULL DEFAULT 0;");
      console.log('[Database] Added bitecoins_balance column to Users table');
    }
    if (!userTableInfo.some((col) => col.name === 'current_streak')) {
      db.exec("ALTER TABLE Users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 1;");
      console.log('[Database] Added current_streak column to Users table');
    }
    if (!userTableInfo.some((col) => col.name === 'last_order_date')) {
      db.exec("ALTER TABLE Users ADD COLUMN last_order_date TEXT;");
      console.log('[Database] Added last_order_date column to Users table');
    }

    // Set initial BiteCoins balance to 520 and 3-Day Coffee Streak for default student Aarav Sharma
    db.prepare(`
      UPDATE Users
      SET bitecoins_balance = CASE WHEN bitecoins_balance < 520 THEN 520 ELSE bitecoins_balance END,
          current_streak = CASE WHEN current_streak < 3 THEN 3 ELSE current_streak END,
          last_order_date = '2026-09-30'
      WHERE id = 'usr-std-01'
    `).run();
  } catch (err) {
    console.error('[Database Migration Warning Users Loyalty]', err.message);
  }

  // Ensure student_socket_id column exists if table was created previously
  try {
    const tableInfo = db.prepare("PRAGMA table_info(Orders)").all();
    const hasStudentSocketId = tableInfo.some((col) => col.name === 'student_socket_id');
    if (!hasStudentSocketId) {
      db.exec("ALTER TABLE Orders ADD COLUMN student_socket_id TEXT;");
      console.log('[Database] Added student_socket_id column to Orders table');
    }
  } catch (err) {
    console.error('[Database Migration Warning Orders]', err.message);
  }

  // Ensure prep_time_minutes column exists in MenuItems table
  try {
    const menuTableInfo = db.prepare("PRAGMA table_info(MenuItems)").all();
    const hasPrepTime = menuTableInfo.some((col) => col.name === 'prep_time_minutes');
    if (!hasPrepTime) {
      db.exec("ALTER TABLE MenuItems ADD COLUMN prep_time_minutes INTEGER NOT NULL DEFAULT 3;");
      console.log('[Database] Added prep_time_minutes column to MenuItems table');
    }

    // Populate realistic prep times for items
    db.prepare(`
      UPDATE MenuItems
      SET prep_time_minutes = CASE
        WHEN LOWER(name) LIKE '%juice%' OR LOWER(category_id) = 'juices' THEN 2
        WHEN LOWER(name) LIKE '%samosa%' THEN 5
        WHEN LOWER(name) LIKE '%shake%' OR LOWER(category_id) = 'shakes' OR LOWER(name) LIKE '%smoothie%' THEN 4
        WHEN LOWER(name) LIKE '%sandwich%' OR LOWER(name) LIKE '%roll%' OR LOWER(name) LIKE '%fries%' THEN 5
        WHEN LOWER(name) LIKE '%thali%' OR LOWER(name) LIKE '%meal%' OR LOWER(name) LIKE '%dosa%' THEN 8
        WHEN LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%cappuccino%' OR LOWER(name) LIKE '%chai%' OR LOWER(name) LIKE '%tea%' THEN 3
        WHEN LOWER(name) LIKE '%maggi%' OR LOWER(name) LIKE '%pav%' THEN 4
        ELSE 3
      END
    `).run();
  } catch (err) {
    console.error('[Database Migration Warning MenuItems]', err.message);
  }

  // Ensure in_stock_quantity column exists in MenuItems table
  try {
    const menuTableInfo = db.prepare("PRAGMA table_info(MenuItems)").all();
    const hasInStock = menuTableInfo.some((col) => col.name === 'in_stock_quantity');
    if (!hasInStock) {
      db.exec("ALTER TABLE MenuItems ADD COLUMN in_stock_quantity INTEGER NOT NULL DEFAULT 20;");
      console.log('[Database] Added in_stock_quantity column to MenuItems table');
    }

    // Set reasonable default stock for any item where it might be null or <= 0
    db.prepare(`
      UPDATE MenuItems
      SET in_stock_quantity = 20
      WHERE in_stock_quantity IS NULL
    `).run();
  } catch (err) {
    console.error('[Database Migration Warning MenuItems in_stock_quantity]', err.message);
  }

  // Ensure low-cost reward items exist in MenuItems (Cutting Chai & Veg Patty)
  try {
    const insertRewardItem = db.prepare(`
      INSERT OR IGNORE INTO MenuItems (
        id, shop_id, shop_name, category, category_id, name, desc,
        price, badge, is_veg, image, alt, fallback_image, is_available,
        display_order, prep_time_minutes, in_stock_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRewardItem.run(
      'jc-tea-special',
      'juice-center',
      'Juice Center',
      'Beverages',
      'beverages',
      'AIT Special Cutting Chai',
      'Freshly brewed hot aromatic Indian masala tea with cardamom and ginger.',
      15,
      'Popular',
      1,
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
      'Hot Masala Chai',
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
      1,
      98,
      2,
      50
    );

    insertRewardItem.run(
      'jc-sn-patty',
      'juice-center',
      'Juice Center',
      'Snacks',
      'snacks',
      'Crispy Golden Veg Patty',
      'Flaky puff pastry stuffed with spiced potato and peas filling.',
      20,
      'Bestseller',
      1,
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
      'Crispy Veg Patty',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
      1,
      99,
      2,
      50
    );

    insertRewardItem.run(
      'jc-bev-coldcoffee',
      'juice-center',
      'Juice Center',
      'Beverages',
      'beverages',
      'Signature Chilled Cold Coffee',
      'Thick blended creamy cold coffee brewed fresh and topped with cocoa powder.',
      40,
      'Bestseller',
      1,
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop',
      'Chilled Cold Coffee',
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop',
      1,
      100,
      3,
      40
    );
  } catch (err) {
    console.error('[Database Seed Reward Items Error]', err.message);
  }

  console.log(`[Database] SQLite database initialized at: ${dbPath}`);
}

// Automatically initialize schema on module load
initDatabase();

export default db;

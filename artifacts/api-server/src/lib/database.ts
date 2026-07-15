import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../../../pos-data.db");

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    initSchema();
    seedIfEmpty();
  }
  return db;
}

export function runTransaction<T>(fn: () => T): T {
  const d = getDb();
  d.exec("BEGIN");
  try {
    const result = fn();
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      store_name TEXT NOT NULL DEFAULT 'My Mobile Shop',
      owner_name TEXT,
      address TEXT,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      ntn TEXT,
      footer_message TEXT DEFAULT 'Thank You For Shopping! Visit Again.',
      logo TEXT,
      currency TEXT NOT NULL DEFAULT 'Rs',
      receipt_size TEXT NOT NULL DEFAULT '80mm',
      low_stock_threshold INTEGER NOT NULL DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('admin','cashier')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      mobile TEXT,
      address TEXT,
      email TEXT,
      balance REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      color TEXT,
      imei TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      warranty TEXT,
      image TEXT,
      notes TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT,
      address TEXT,
      email TEXT,
      balance REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      subtotal REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_percent REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      return_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','card','easypaisa','jazzcash','credit')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','returned')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      barcode TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty() {
  db.exec("INSERT OR IGNORE INTO settings (id, store_name) VALUES (1, 'Umair Mobile Gallery UMG')");

  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (userCount > 0) return;

  logger.info("Seeding initial data...");

  const adminHash = bcrypt.hashSync("admin123", 10);
  const cashierHash = bcrypt.hashSync("cashier123", 10);

  db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)").run("admin", adminHash, "Administrator", "admin");
  db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)").run("cashier", cashierHash, "Ali Hassan", "cashier");

  const cats = ["Smartphones", "Feature Phones", "Accessories", "Chargers", "Covers", "Others"];
  for (const c of cats) {
    db.prepare("INSERT INTO categories (name) VALUES (?)").run(c);
  }
  // cat IDs: Smartphones=1, Feature Phones=2

  db.prepare("INSERT INTO suppliers (name, company, mobile, address) VALUES (?,?,?,?)").run("Mobile Distributor", "Mobile Dist Sambrial", "03001234567", "Sambrial, Pakistan");

  // barcode, name, brand, model, category_id, color, imei, purchase_price, sale_price, stock_qty, supplier_id, warranty, image, notes, low_stock_threshold
  const products: any[][] = [
    // ── Smartphones ──────────────────────────────────────────────────────
    ["HP10001",  "Honor Play 10",     "Honor",    "Play 10",    1, null, null,  22000,  25000,  5, 1, "1 Year",    null, null, 2],
    ["SGA05001", "Samsung Galaxy A05","Samsung",  "Galaxy A05", 1, null, null,  19000,  22000,  4, 1, "1 Year",    null, null, 2],
    ["VY04001",  "Vivo Y04",          "Vivo",     "Y04",        1, null, null,  25000,  28000,  3, 1, "1 Year",    null, null, 2],
    ["OA5I001",  "Oppo A5i",          "Oppo",     "A5i",        1, null, null,  23000,  26000,  3, 1, "1 Year",    null, null, 2],
    ["RD15C001", "Redmi 15C",         "Xiaomi",   "15C",        1, null, null,  21000,  24000,  5, 1, "1 Year",    null, null, 2],
    ["RD14C001", "Redmi 14C",         "Xiaomi",   "14C",        1, null, null,  19000,  22000,  4, 1, "1 Year",    null, null, 2],
    ["RDA3001",  "Redmi A3",          "Xiaomi",   "A3",         1, null, null,  17500,  20000,  6, 1, "1 Year",    null, null, 2],
    ["RN60X001", "Realme Note 60x",   "Realme",   "Note 60x",   1, null, null,  27000,  30000,  2, 1, "1 Year",    null, null, 2],
    ["RN60001",  "Realme Note 60",    "Realme",   "Note 60",    1, null, null,  25000,  28000,  3, 1, "1 Year",    null, null, 2],
    ["SN15001",  "Sparx Neo 15",      "Sparx",    "Neo 15",     1, null, null,  16000,  18000,  4, 1, "6 Months",  null, null, 2],
    ["IS10001",  "Infinix Smart 10",  "Infinix",  "Smart 10",   1, null, null,  17500,  20000,  3, 1, "1 Year",    null, null, 2],
    ["TSG001",   "Tecno Spark Go",    "Tecno",    "Spark Go",   1, null, null,  15500,  18000,  4, 1, "6 Months",  null, null, 2],
    ["TV40S001", "Tecno V40s",        "Tecno",    "V40s",       1, null, null,  19500,  22000,  2, 1, "1 Year",    null, null, 2],
    ["IA50C001", "Itel A50C",         "Itel",     "A50C",       1, null, null,  14000,  16000,  5, 1, "6 Months",  null, null, 2],
    ["IA470001", "Itel A470",         "Itel",     "A470",       1, null, null,  13000,  15000,  4, 1, "6 Months",  null, null, 2],
    ["IC100001", "Itel City 100",     "Itel",     "City 100",   1, null, null,  10500,  12000,  5, 1, "6 Months",  null, null, 2],
    ["GFE700001","Gfive 4G E700",     "Gfive",    "E700",       1, null, null,   7000,   8000,  3, 1, "6 Months",  null, null, 2],
    // ── Feature Phones ───────────────────────────────────────────────────
    ["FLK001",   "Falak",             "Falak",    "Falak",      2, null, null,   1200,   1500, 10, 1, "3 Months",  null, null, 3],
    ["2EYE001",  "2EYE",              "2EYE",     "2EYE",       2, null, null,   1200,   1500,  8, 1, "3 Months",  null, null, 3],
    ["GFGOLD01", "Gfive Gold",        "Gfive",    "Gold",       2, null, null,    800,   1000, 12, 1, "3 Months",  null, null, 3],
    ["GFC108",   "Gfive C108",        "Gfive",    "C108",       2, null, null,    950,   1200,  8, 1, "3 Months",  null, null, 3],
    ["GFHERO01", "Gfive Hero",        "Gfive",    "Hero",       2, null, null,   1200,   1500, 10, 1, "3 Months",  null, null, 3],
    ["GFBRAV01", "Gfive Bravo",       "Gfive",    "Bravo",      2, null, null,    950,   1200,  8, 1, "3 Months",  null, null, 3],
    ["GFTIG01",  "Gfive Tiger",       "Gfive",    "Tiger",      2, null, null,   1200,   1500,  7, 1, "3 Months",  null, null, 3],
    ["GFSMART1", "Gfive Smart",       "Gfive",    "Smart",      2, null, null,   1200,   1500,  6, 1, "3 Months",  null, null, 3],
    ["PWR17001", "Power 17",          "Power",    "Power 17",   2, null, null,   1200,   1500,  8, 1, "3 Months",  null, null, 3],
    ["IT2165",   "it2165",            "it",       "it2165",     2, null, null,   1500,   1800,  6, 1, "3 Months",  null, null, 3],
    ["YLV200FM", "Yelain V200s FM",   "Yelain",   "V200s FM",   2, null, null,   1200,   1500,  9, 1, "3 Months",  null, null, 3],
    ["GURPWR1",  "Guru Power",        "Guru",     "Guru Power", 2, null, null,   1200,   1500, 10, 1, "3 Months",  null, null, 3],
  ];
  const insertProduct = db.prepare("INSERT INTO products (barcode,name,brand,model,category_id,color,imei,purchase_price,sale_price,stock_qty,supplier_id,warranty,image,notes,low_stock_threshold) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  for (const p of products) {
    insertProduct.run(...p);
  }

  db.prepare("INSERT INTO customers (name, mobile, address) VALUES (?,?,?)").run("Walk-in Customer", null, null);

  db.prepare("UPDATE settings SET store_name=?, owner_name=?, address=?, phone=?, whatsapp=?, footer_message=?, logo=? WHERE id=1").run(
    "Umair Mobile Gallery", "Umair", "Street no 1 Mor Sambrial", "03349999602",
    "03349999602",
    "Thank You For Shopping! Visit Again.",
    "/umg-logo.jpg"
  );

  logger.info("Seeding complete. Admin: admin/admin123, Cashier: cashier/cashier123");
}

export function nextInvoiceNo(prefix: "INV" | "PUR"): string {
  const d = getDb();
  let count = 1;
  if (prefix === "INV") {
    const row = d.prepare("SELECT COUNT(*) as c FROM sales").get() as any;
    count = Number(row.c) + 1;
  } else {
    const row = d.prepare("SELECT COUNT(*) as c FROM purchases").get() as any;
    count = Number(row.c) + 1;
  }
  return `${prefix}-${String(count).padStart(5, "0")}`;
}

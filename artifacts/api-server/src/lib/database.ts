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

  const cats = ["Mobile Phones", "Accessories", "Chargers", "Headphones", "Covers", "Power Banks", "Smart Watches", "Others"];
  for (const c of cats) {
    db.prepare("INSERT INTO categories (name) VALUES (?)").run(c);
  }

  db.prepare("INSERT INTO suppliers (name, company, mobile, address) VALUES (?,?,?,?)").run("Tech Distributors", "Tech Dist Pvt Ltd", "03001234567", "Lahore, Pakistan");
  db.prepare("INSERT INTO suppliers (name, company, mobile, address) VALUES (?,?,?,?)").run("Mobile World", "Mobile World Ltd", "03111234567", "Karachi, Pakistan");

  const products: any[][] = [
    ["8901234567890", "Samsung Galaxy A15", "Samsung", "A15", 1, "Blue", null, 35000, 42000, 15, 1, "1 Year", null, null, 3],
    ["8901234567891", "iPhone 15", "Apple", "15", 1, "Black", null, 180000, 215000, 5, 1, "1 Year", null, null, 2],
    ["8901234567892", "Type-C Cable", "Anker", "A8452", 3, "White", null, 200, 600, 50, 2, "6 Months", null, null, 10],
    ["8901234567893", "Samsung Back Cover", "Samsung", "A15 Cover", 5, "Black", null, 150, 500, 30, 2, "3 Months", null, null, 10],
    ["8901234567894", "Wireless Earbuds", "JBL", "Wave 100", 4, "White", null, 1500, 3500, 8, 1, "6 Months", null, null, 3],
    ["8901234567895", "Power Bank 20000mAh", "Romoss", "20000", 6, "Black", null, 2000, 4500, 12, 2, "1 Year", null, null, 5],
    ["8901234567896", "Smart Watch Pro", "Xiaomi", "Mi Band 8", 7, "Silver", null, 4000, 8500, 2, 1, "6 Months", null, null, 3],
    ["8901234567897", "Fast Charger 65W", "Baseus", "65W", 3, "White", null, 800, 1800, 25, 2, "6 Months", null, null, 8],
  ];
  const insertProduct = db.prepare("INSERT INTO products (barcode,name,brand,model,category_id,color,imei,purchase_price,sale_price,stock_qty,supplier_id,warranty,image,notes,low_stock_threshold) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  for (const p of products) {
    insertProduct.run(...p);
  }

  db.prepare("INSERT INTO customers (name, mobile, address) VALUES (?,?,?)").run("Ali Ahmad", "03001234567", "Main Bazar Lahore");
  db.prepare("INSERT INTO customers (name, mobile, address) VALUES (?,?,?)").run("Sara Khan", "03111234567", "Gulberg, Lahore");
  db.prepare("INSERT INTO customers (name, mobile, address) VALUES (?,?,?)").run("Walk-in Customer", null, null);

  db.prepare("UPDATE settings SET store_name=?, owner_name=?, address=?, phone=?, whatsapp=?, footer_message=?, logo=? WHERE id=1").run(
    "Umair Mobile Gallery UMG", "Umair", "Street no 1 Mor Sambrial", "03349999602",
    "03349999602",
    "Thank You For Shopping! Visit Again.",
    "/umg-logo.jpg"
  );

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const insertSale = db.prepare("INSERT INTO sales (invoice_no,customer_id,cashier_id,subtotal,discount_percent,discount_amount,tax_percent,tax_amount,grand_total,paid_amount,return_amount,payment_method,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const insertSaleItem = db.prepare("INSERT INTO sale_items (sale_id,product_id,product_name,barcode,quantity,unit_price,discount,total) VALUES (?,?,?,?,?,?,?,?)");

  const s1 = insertSale.run("INV-00001", 1, 1, 43700, 0, 700, 0, 0, 43000, 45000, 2000, "cash", "completed", `${today}T10:30:00`);
  const s1id = Number(s1.lastInsertRowid);
  insertSaleItem.run(s1id, 1, "Samsung Galaxy A15", "8901234567890", 1, 42000, 0, 42000);
  insertSaleItem.run(s1id, 3, "Type-C Cable", "8901234567892", 2, 600, 0, 1200);
  insertSaleItem.run(s1id, 4, "Samsung Back Cover", "8901234567893", 1, 500, 0, 500);

  const s2 = insertSale.run("INV-00002", 2, 1, 3500, 0, 0, 0, 0, 3500, 3500, 0, "easypaisa", "completed", `${today}T14:00:00`);
  insertSaleItem.run(Number(s2.lastInsertRowid), 5, "Wireless Earbuds", "8901234567894", 1, 3500, 0, 3500);

  const s3 = insertSale.run("INV-00003", 1, 1, 8500, 5, 425, 0, 0, 8075, 8075, 0, "card", "completed", `${yesterday}T11:00:00`);
  insertSaleItem.run(Number(s3.lastInsertRowid), 7, "Smart Watch Pro", "8901234567896", 1, 8500, 0, 8500);

  db.prepare("INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)").run("Shop Rent", "Monthly rent", 25000, today);
  db.prepare("INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)").run("Electricity", "Electricity bill", 5000, today);
  db.prepare("INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)").run("Internet", "Monthly internet", 2500, yesterday);

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

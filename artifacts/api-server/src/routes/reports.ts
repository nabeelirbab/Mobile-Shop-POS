import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/reports/dashboard", requireAuth, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const todaySales = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total, COUNT(*) as cnt FROM sales WHERE date(created_at) = ? AND status='completed'`).get(today) as any;
  const monthlySales = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total FROM sales WHERE date(created_at) >= ? AND status='completed'`).get(monthStart) as any;

  // Monthly profit = revenue - cost of goods sold
  const monthlyCost = db.prepare(`
    SELECT COALESCE(SUM(si.quantity * p.purchase_price),0) as cost
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE date(s.created_at) >= ? AND s.status='completed'
  `).get(monthStart) as any;

  const totalProducts = (db.prepare("SELECT COUNT(*) as c FROM products").get() as any).c;
  const totalCustomers = (db.prepare("SELECT COUNT(*) as c FROM customers").get() as any).c;
  const lowStockCount = (db.prepare("SELECT COUNT(*) as c FROM products WHERE stock_qty <= low_stock_threshold").get() as any).c;

  const recentSales = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as cashier_name
    FROM sales s LEFT JOIN customers c ON s.customer_id=c.id LEFT JOIN users u ON s.cashier_id=u.id
    ORDER BY s.created_at DESC LIMIT 10
  `).all().map((s: any) => ({ ...s, items: db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(s.id) }));

  const lowStockProducts = db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN suppliers s ON p.supplier_id=s.id
    WHERE p.stock_qty <= p.low_stock_threshold ORDER BY p.stock_qty ASC LIMIT 10
  `).all();

  res.json({
    today_sales: todaySales.total,
    today_sales_count: todaySales.cnt,
    monthly_sales: monthlySales.total,
    monthly_profit: monthlySales.total - (monthlyCost?.cost ?? 0),
    total_products: totalProducts,
    total_customers: totalCustomers,
    low_stock_count: lowStockCount,
    recent_sales: recentSales,
    low_stock_products: lowStockProducts,
  });
});

router.get("/reports/sales", requireAuth, (req, res) => {
  const db = getDb();
  const { period = "daily", date_from, date_to } = req.query as any;

  let groupFormat = "%Y-%m-%d";
  if (period === "weekly") groupFormat = "%Y-W%W";
  else if (period === "monthly") groupFormat = "%Y-%m";
  else if (period === "yearly") groupFormat = "%Y";

  let where = "WHERE status='completed'";
  const params: any[] = [];
  if (date_from) { where += " AND date(created_at) >= ?"; params.push(date_from); }
  if (date_to) { where += " AND date(created_at) <= ?"; params.push(date_to); }

  const data = db.prepare(`
    SELECT
      strftime('${groupFormat}', created_at) as date,
      COUNT(*) as sales_count,
      COALESCE(SUM(grand_total + discount_amount),0) as total_sales,
      COALESCE(SUM(discount_amount),0) as total_discount,
      COALESCE(SUM(tax_amount),0) as total_tax,
      COALESCE(SUM(grand_total),0) as net_total
    FROM sales ${where}
    GROUP BY strftime('${groupFormat}', created_at)
    ORDER BY date ASC
  `).all(...params) as any[];

  const totals = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as t, COUNT(*) as c FROM sales ${where}`).get(...params) as any;

  res.json({ period, data, total_sales: totals.t, total_count: totals.c });
});

router.get("/reports/profit", requireAuth, (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query as any;
  let where = "WHERE s.status='completed'";
  const params: any[] = [];
  if (date_from) { where += " AND date(s.created_at) >= ?"; params.push(date_from); }
  if (date_to) { where += " AND date(s.created_at) <= ?"; params.push(date_to); }

  const data = db.prepare(`
    SELECT
      date(s.created_at) as date,
      COALESCE(SUM(s.grand_total),0) as revenue,
      COALESCE(SUM(si.quantity * p.purchase_price),0) as cost,
      COALESCE(SUM(s.grand_total) - SUM(si.quantity * p.purchase_price),0) as profit
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products p ON p.id = si.product_id
    ${where}
    GROUP BY date(s.created_at)
    ORDER BY date ASC
  `).all(...params) as any[];

  const expWhere = "WHERE 1=1" + (date_from ? ` AND date >= '${date_from}'` : "") + (date_to ? ` AND date <= '${date_to}'` : "");
  const totalExpenses = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses ${expWhere}`).get() as any).t;
  const totalRevenue = data.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalCost = data.reduce((s: number, r: any) => s + r.cost, 0);

  res.json({
    total_revenue: totalRevenue,
    total_cost: totalCost,
    gross_profit: totalRevenue - totalCost,
    total_expenses: totalExpenses,
    net_profit: totalRevenue - totalCost - totalExpenses,
    data,
  });
});

router.get("/reports/expenses", requireAuth, (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query as any;
  let where = "WHERE 1=1";
  const params: any[] = [];
  if (date_from) { where += " AND date >= ?"; params.push(date_from); }
  if (date_to) { where += " AND date <= ?"; params.push(date_to); }

  const data = db.prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC`).all(...params) as any[];
  const totalExpenses = data.reduce((s: number, e: any) => s + e.amount, 0);
  const byCategory = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses ${where} GROUP BY category ORDER BY total DESC`).all(...params) as any[];

  res.json({ total_expenses: totalExpenses, by_category: byCategory, data });
});

router.get("/reports/purchases", requireAuth, (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query as any;
  let where = "WHERE 1=1";
  const params: any[] = [];
  if (date_from) { where += " AND date(p.created_at) >= ?"; params.push(date_from); }
  if (date_to) { where += " AND date(p.created_at) <= ?"; params.push(date_to); }

  const rows = db.prepare(`
    SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id=s.id ${where} ORDER BY p.created_at DESC
  `).all(...params) as any[];
  const data = rows.map((r: any) => ({ ...r, items: db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(r.id) }));
  const totalPurchases = data.reduce((s: number, r: any) => s + r.total_amount, 0);

  res.json({ total_purchases: totalPurchases, total_count: data.length, data });
});

router.get("/reports/stock", requireAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.id, p.name, p.barcode, c.name as category_name, p.stock_qty, p.low_stock_threshold,
           p.purchase_price, p.sale_price,
           (p.stock_qty * p.purchase_price) as stock_value
    FROM products p LEFT JOIN categories c ON p.category_id=c.id
    ORDER BY p.name
  `).all() as any[];
  res.json(rows.map((r: any) => ({
    ...r,
    status: r.stock_qty <= 0 ? "out" : r.stock_qty <= r.low_stock_threshold ? "low" : "ok",
  })));
});

router.get("/reports/best-selling", requireAuth, (req, res) => {
  const db = getDb();
  const { limit = 10, date_from, date_to } = req.query as any;
  let where = "WHERE s.status='completed'";
  const params: any[] = [];
  if (date_from) { where += " AND date(s.created_at) >= ?"; params.push(date_from); }
  if (date_to) { where += " AND date(s.created_at) <= ?"; params.push(date_to); }

  const rows = db.prepare(`
    SELECT si.product_id, si.product_name, p.barcode,
           SUM(si.quantity) as total_qty,
           SUM(si.total) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    ${where}
    GROUP BY si.product_id
    ORDER BY total_qty DESC
    LIMIT ?
  `).all(...params, Number(limit));
  res.json(rows);
});

export default router;

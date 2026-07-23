import { Router } from "express";
import { getDb, nextInvoiceNo, runTransaction } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function buildSale(db: any, row: any) {
  return {
    ...row,
    items: db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(row.id),
  };
}

router.get("/sales", requireAuth, (req, res) => {
  const db = getDb();
  const { search, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query as any;
  const parts: string[] = ["1=1"];
  const params: any[] = [];

  if (search) {
    parts.push("(s.invoice_no LIKE ? OR c.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (customer_id) { parts.push("s.customer_id = ?"); params.push(Number(customer_id)); }
  if (date_from) { parts.push("date(s.created_at) >= ?"); params.push(date_from); }
  if (date_to) { parts.push("date(s.created_at) <= ?"); params.push(date_to); }

  const where = "WHERE " + parts.join(" AND ");
  const total = Number((db.prepare(`SELECT COUNT(*) as c FROM sales s LEFT JOIN customers c ON s.customer_id=c.id ${where}`).get(...params) as any).c);
  const rows = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as cashier_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), (Number(page) - 1) * Number(limit));
  res.json({ sales: rows.map((r: any) => buildSale(db, r)), total, page: Number(page), limit: Number(limit) });
});

router.get("/sales/:id", requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as cashier_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ?
  `).get(Number(req.params["id"])) as any;
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(buildSale(db, row));
});

router.post("/sales", requireAuth, (req, res) => {
  const db = getDb();
  const { customer_id, items, discount_percent = 0, discount_amount = 0, tax_percent = 0, paid_amount = 0, payment_method = "cash", notes } = req.body as any;
  if (!items || !items.length) { res.status(400).json({ error: "Items required" }); return; }

  const subtotal = items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity - i.discount), 0);
  const discountAmt = Number(discount_amount) + (subtotal * Number(discount_percent) / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * Number(tax_percent) / 100;
  const grandTotal = afterDiscount + taxAmt;
  const returnAmount = Math.max(0, Number(paid_amount) - grandTotal);
  const invoice_no = nextInvoiceNo("INV");
  const cashier_id = req.user!.id;

  try {
    const saleId = runTransaction(() => {
      const r = db.prepare(`
        INSERT INTO sales (invoice_no,customer_id,cashier_id,subtotal,discount_percent,discount_amount,tax_percent,tax_amount,grand_total,paid_amount,return_amount,payment_method,notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(invoice_no, customer_id ?? null, cashier_id, subtotal, discount_percent, discountAmt, tax_percent, taxAmt, grandTotal, paid_amount, returnAmount, payment_method, notes ?? null);

      const saleId = Number(r.lastInsertRowid);
      for (const item of items) {
        const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id) as any;
        if (!prod) throw new Error(`Product ${item.product_id} not found`);
        const itemTotal = item.unit_price * item.quantity - item.discount;
        const saleProductName = (typeof item.product_name === "string" && item.product_name.trim())
          ? item.product_name.trim()
          : prod.name;
        db.prepare("INSERT INTO sale_items (sale_id,product_id,product_name,barcode,quantity,unit_price,discount,total) VALUES (?,?,?,?,?,?,?,?)")
          .run(saleId, item.product_id, saleProductName, prod.barcode ?? null, item.quantity, item.unit_price, item.discount, itemTotal);
        db.prepare("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?").run(item.quantity, item.product_id);
      }
      if (payment_method === "credit" && customer_id) {
        db.prepare("UPDATE customers SET balance = balance + ? WHERE id = ?").run(grandTotal - Number(paid_amount), customer_id);
      }
      return saleId;
    });

    const row = db.prepare(`
      SELECT s.*, c.name as customer_name, u.name as cashier_name
      FROM sales s LEFT JOIN customers c ON s.customer_id=c.id LEFT JOIN users u ON s.cashier_id=u.id
      WHERE s.id = ?
    `).get(saleId) as any;
    res.status(201).json(buildSale(db, row));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/sales/:id/return", requireAuth, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as any;
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  if (sale.status === "returned") { res.status(400).json({ error: "Already returned" }); return; }
  const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(id) as any[];

  runTransaction(() => {
    db.prepare("UPDATE sales SET status = 'returned' WHERE id = ?").run(id);
    for (const item of items) {
      db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    if (sale.payment_method === "credit" && sale.customer_id) {
      db.prepare("UPDATE customers SET balance = MAX(0, balance - ?) WHERE id = ?").run(sale.grand_total - sale.paid_amount, sale.customer_id);
    }
  });
  res.json({ message: "Sale returned successfully" });
});

router.delete("/sales/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as any;
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(id) as any[];
  runTransaction(() => {
    for (const item of items) {
      db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    db.prepare("DELETE FROM sales WHERE id = ?").run(id);
  });
  res.json({ message: "Deleted" });
});

export default router;

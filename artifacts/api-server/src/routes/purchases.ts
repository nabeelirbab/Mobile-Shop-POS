import { Router } from "express";
import { getDb, nextInvoiceNo, runTransaction } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function buildPurchase(db: any, row: any) {
  return {
    ...row,
    items: db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(row.id),
  };
}

router.get("/purchases", requireAuth, (req, res) => {
  const db = getDb();
  const { supplier_id, date_from, date_to, page = 1, limit = 50 } = req.query as any;
  const parts: string[] = ["1=1"];
  const params: any[] = [];
  if (supplier_id) { parts.push("p.supplier_id = ?"); params.push(Number(supplier_id)); }
  if (date_from) { parts.push("date(p.created_at) >= ?"); params.push(date_from); }
  if (date_to) { parts.push("date(p.created_at) <= ?"); params.push(date_to); }

  const where = "WHERE " + parts.join(" AND ");
  const total = Number((db.prepare(`SELECT COUNT(*) as c FROM purchases p LEFT JOIN suppliers s ON p.supplier_id=s.id ${where}`).get(...params) as any).c);
  const rows = db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), (Number(page) - 1) * Number(limit));
  res.json({ purchases: rows.map((r: any) => buildPurchase(db, r)), total, page: Number(page), limit: Number(limit) });
});

router.get("/purchases/:id", requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id=s.id WHERE p.id=?`).get(Number(req.params["id"])) as any;
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(buildPurchase(db, row));
});

router.post("/purchases", requireAuth, (req, res) => {
  const db = getDb();
  const { supplier_id, items, paid_amount = 0, notes } = req.body as any;
  if (!items || !items.length) { res.status(400).json({ error: "Items required" }); return; }

  const totalAmount = items.reduce((sum: number, i: any) => sum + i.unit_cost * i.quantity, 0);
  const invoice_no = nextInvoiceNo("PUR");

  try {
    const purchaseId = runTransaction(() => {
      const r = db.prepare("INSERT INTO purchases (invoice_no,supplier_id,total_amount,paid_amount,notes) VALUES (?,?,?,?,?)")
        .run(invoice_no, supplier_id ?? null, totalAmount, paid_amount, notes ?? null);
      const purchaseId = Number(r.lastInsertRowid);
      for (const item of items) {
        const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id) as any;
        if (!prod) throw new Error(`Product ${item.product_id} not found`);
        db.prepare("INSERT INTO purchase_items (purchase_id,product_id,product_name,quantity,unit_cost,total) VALUES (?,?,?,?,?,?)")
          .run(purchaseId, item.product_id, prod.name, item.quantity, item.unit_cost, item.unit_cost * item.quantity);
        db.prepare("UPDATE products SET stock_qty = stock_qty + ?, purchase_price = ? WHERE id = ?").run(item.quantity, item.unit_cost, item.product_id);
      }
      if (supplier_id && totalAmount > Number(paid_amount)) {
        db.prepare("UPDATE suppliers SET balance = balance + ? WHERE id = ?").run(totalAmount - Number(paid_amount), supplier_id);
      }
      return purchaseId;
    });

    const row = db.prepare("SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id=s.id WHERE p.id=?").get(purchaseId) as any;
    res.status(201).json(buildPurchase(db, row));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/purchases/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
  if (!purchase) { res.status(404).json({ error: "Not found" }); return; }
  const items = db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(id) as any[];
  runTransaction(() => {
    for (const item of items) {
      db.prepare("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
  });
  res.json({ message: "Deleted" });
});

export default router;

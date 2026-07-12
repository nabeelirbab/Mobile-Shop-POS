import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/customers", requireAuth, (req, res) => {
  const db = getDb();
  const { search } = req.query as any;
  let sql = "SELECT * FROM customers WHERE 1=1";
  const params: any[] = [];
  if (search) {
    sql += " AND (name LIKE ? OR mobile LIKE ? OR email LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  sql += " ORDER BY name";
  res.json(db.prepare(sql).all(...params));
});

router.get("/customers/:id", requireAuth, (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT * FROM customers WHERE id = ?").get(Number(req.params["id"]));
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json(c);
});

router.get("/customers/:id/history", requireAuth, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as cashier_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC
  `).all(id);
  const result = sales.map((s: any) => ({
    ...s,
    items: db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(s.id),
  }));
  res.json(result);
});

router.post("/customers", requireAuth, (req, res) => {
  const db = getDb();
  const { name, mobile, address, email, balance = 0, notes } = req.body as any;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const r = db.prepare("INSERT INTO customers (name,mobile,address,email,balance,notes) VALUES (?,?,?,?,?,?)").run(name, mobile ?? null, address ?? null, email ?? null, balance, notes ?? null);
  res.status(201).json(db.prepare("SELECT * FROM customers WHERE id = ?").get(r.lastInsertRowid));
});

router.put("/customers/:id", requireAuth, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const c = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as any;
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const { name, mobile, address, email, balance, notes } = req.body as any;
  db.prepare("UPDATE customers SET name=?,mobile=?,address=?,email=?,balance=?,notes=? WHERE id=?").run(
    name ?? c.name, mobile ?? c.mobile, address ?? c.address, email ?? c.email,
    balance !== undefined ? balance : c.balance, notes ?? c.notes, id
  );
  res.json(db.prepare("SELECT * FROM customers WHERE id = ?").get(id));
});

router.delete("/customers/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM customers WHERE id = ?").run(Number(req.params["id"]));
  res.json({ message: "Deleted" });
});

export default router;

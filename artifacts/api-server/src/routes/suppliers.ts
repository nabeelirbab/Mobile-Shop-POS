import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/suppliers", requireAuth, (req, res) => {
  const db = getDb();
  const { search } = req.query as any;
  let sql = "SELECT * FROM suppliers WHERE 1=1";
  const params: any[] = [];
  if (search) {
    sql += " AND (name LIKE ? OR company LIKE ? OR mobile LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  sql += " ORDER BY name";
  res.json(db.prepare(sql).all(...params));
});

router.get("/suppliers/:id", requireAuth, (req, res) => {
  const db = getDb();
  const s = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(Number(req.params["id"]));
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.get("/suppliers/:id/history", requireAuth, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const purchases = db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.supplier_id = ?
    ORDER BY p.created_at DESC
  `).all(id);
  const result = purchases.map((p: any) => ({
    ...p,
    items: db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(p.id),
  }));
  res.json(result);
});

router.post("/suppliers", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const { name, company, mobile, address, email, balance = 0, notes } = req.body as any;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const r = db.prepare("INSERT INTO suppliers (name,company,mobile,address,email,balance,notes) VALUES (?,?,?,?,?,?,?)").run(name, company ?? null, mobile ?? null, address ?? null, email ?? null, balance, notes ?? null);
  res.status(201).json(db.prepare("SELECT * FROM suppliers WHERE id = ?").get(r.lastInsertRowid));
});

router.put("/suppliers/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const s = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id) as any;
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  const { name, company, mobile, address, email, balance, notes } = req.body as any;
  db.prepare("UPDATE suppliers SET name=?,company=?,mobile=?,address=?,email=?,balance=?,notes=? WHERE id=?").run(
    name ?? s.name, company ?? s.company, mobile ?? s.mobile, address ?? s.address, email ?? s.email,
    balance !== undefined ? balance : s.balance, notes ?? s.notes, id
  );
  res.json(db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id));
});

router.delete("/suppliers/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM suppliers WHERE id = ?").run(Number(req.params["id"]));
  res.json({ message: "Deleted" });
});

export default router;

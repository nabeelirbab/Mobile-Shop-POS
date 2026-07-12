import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/expenses", requireAuth, (req, res) => {
  const db = getDb();
  const { date_from, date_to, category } = req.query as any;
  let sql = "SELECT * FROM expenses WHERE 1=1";
  const params: any[] = [];
  if (date_from) { sql += " AND date >= ?"; params.push(date_from); }
  if (date_to) { sql += " AND date <= ?"; params.push(date_to); }
  if (category) { sql += " AND category = ?"; params.push(category); }
  sql += " ORDER BY date DESC, id DESC";
  res.json(db.prepare(sql).all(...params));
});

router.post("/expenses", requireAuth, (req, res) => {
  const db = getDb();
  const { category, description, amount, date } = req.body as any;
  if (!category || !amount || !date) { res.status(400).json({ error: "Category, amount and date required" }); return; }
  const r = db.prepare("INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)").run(category, description ?? null, amount, date);
  res.status(201).json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(r.lastInsertRowid));
});

router.put("/expenses/:id", requireAuth, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const e = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id) as any;
  if (!e) { res.status(404).json({ error: "Not found" }); return; }
  const { category, description, amount, date } = req.body as any;
  db.prepare("UPDATE expenses SET category=?,description=?,amount=?,date=? WHERE id=?").run(
    category ?? e.category, description ?? e.description, amount ?? e.amount, date ?? e.date, id
  );
  res.json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(id));
});

router.delete("/expenses/:id", requireAuth, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM expenses WHERE id = ?").run(Number(req.params["id"]));
  res.json({ message: "Deleted" });
});

export default router;

import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/categories", requireAuth, (_req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

router.post("/categories", requireAuth, requireAdmin, (req, res) => {
  const { name, description } = req.body as any;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const db = getDb();
  try {
    const r = db.prepare("INSERT INTO categories (name, description) VALUES (?,?)").run(name, description ?? null);
    res.status(201).json(db.prepare("SELECT * FROM categories WHERE id = ?").get(r.lastInsertRowid));
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") { res.status(400).json({ error: "Category already exists" }); return; }
    throw e;
  }
});

router.put("/categories/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const { name, description } = req.body as any;
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as any;
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  db.prepare("UPDATE categories SET name=?, description=? WHERE id=?").run(name ?? cat.name, description ?? cat.description, id);
  res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(id));
});

router.delete("/categories/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM categories WHERE id = ?").run(Number(req.params["id"]));
  res.json({ message: "Deleted" });
});

export default router;

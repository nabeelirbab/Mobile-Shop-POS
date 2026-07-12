import { Router } from "express";
import { getDb, runTransaction } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const TABLES = ["settings", "users", "categories", "suppliers", "products", "customers", "sales", "sale_items", "purchases", "purchase_items", "expenses"];

router.get("/backup/export", requireAuth, requireAdmin, (_req, res) => {
  const db = getDb();
  const data: Record<string, any[]> = {};
  for (const table of TABLES) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  res.json({
    version: "1.0",
    exported_at: new Date().toISOString(),
    tables: TABLES,
    data,
  });
});

router.post("/backup/import", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const backup = req.body as any;
  if (!backup || !backup.data) {
    res.status(400).json({ error: "Invalid backup file" }); return;
  }

  runTransaction(() => {
    const reversed = [...TABLES].reverse();
    for (const table of reversed) {
      db.exec(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const rows = backup.data[table];
      if (!rows || !rows.length) continue;
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => "?").join(",");
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`);
      for (const row of rows) {
        stmt.run(...cols.map((c) => row[c]));
      }
    }
  });

  res.json({ message: "Backup imported successfully" });
});

export default router;

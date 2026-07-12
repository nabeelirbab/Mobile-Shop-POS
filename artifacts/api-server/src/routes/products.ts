import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category_name, s.name as supplier_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN suppliers s ON p.supplier_id = s.id
`;

router.get("/products/barcode/:barcode", requireAuth, (req, res) => {
  const db = getDb();
  const product = db.prepare(`${PRODUCT_SELECT} WHERE p.barcode = ?`).get(req.params["barcode"]);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(product);
});

router.get("/products", requireAuth, (req, res) => {
  const db = getDb();
  const { search, category_id, low_stock, page = 1, limit = 50 } = req.query as any;
  let where = "WHERE 1=1";
  const params: any[] = [];

  if (search) {
    where += " AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR p.model LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (category_id) {
    where += " AND p.category_id = ?";
    params.push(Number(category_id));
  }
  if (low_stock === "true") {
    where += " AND p.stock_qty <= p.low_stock_threshold";
  }

  const offset = (Number(page) - 1) * Number(limit);
  const total = (db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params) as any).c;
  const products = db.prepare(`${PRODUCT_SELECT} ${where} ORDER BY p.name LIMIT ? OFFSET ?`).all(...params, Number(limit), offset);
  res.json({ products, total, page: Number(page), limit: Number(limit) });
});

router.get("/products/:id", requireAuth, (req, res) => {
  const db = getDb();
  const product = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(req.params["id"]));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

router.post("/products", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const { barcode, name, brand, model, category_id, color, imei, purchase_price, sale_price, stock_qty, supplier_id, warranty, image, notes, low_stock_threshold = 5 } = req.body as any;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const r = db.prepare(`INSERT INTO products (barcode,name,brand,model,category_id,color,imei,purchase_price,sale_price,stock_qty,supplier_id,warranty,image,notes,low_stock_threshold) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    barcode ?? null, name, brand ?? null, model ?? null, category_id ?? null, color ?? null, imei ?? null,
    purchase_price ?? 0, sale_price ?? 0, stock_qty ?? 0, supplier_id ?? null,
    warranty ?? null, image ?? null, notes ?? null, low_stock_threshold
  );
  res.status(201).json(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(r.lastInsertRowid));
});

router.put("/products/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
  if (!p) { res.status(404).json({ error: "Not found" }); return; }
  const { barcode, name, brand, model, category_id, color, imei, purchase_price, sale_price, stock_qty, supplier_id, warranty, image, notes, low_stock_threshold } = req.body as any;
  db.prepare(`UPDATE products SET barcode=?,name=?,brand=?,model=?,category_id=?,color=?,imei=?,purchase_price=?,sale_price=?,stock_qty=?,supplier_id=?,warranty=?,image=?,notes=?,low_stock_threshold=? WHERE id=?`).run(
    barcode ?? p.barcode, name ?? p.name, brand ?? p.brand, model ?? p.model,
    category_id !== undefined ? category_id : p.category_id,
    color ?? p.color, imei ?? p.imei,
    purchase_price ?? p.purchase_price, sale_price ?? p.sale_price,
    stock_qty ?? p.stock_qty,
    supplier_id !== undefined ? supplier_id : p.supplier_id,
    warranty ?? p.warranty, image ?? p.image, notes ?? p.notes,
    low_stock_threshold ?? p.low_stock_threshold, id
  );
  res.json(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id));
});

router.delete("/products/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(Number(req.params["id"]));
  res.json({ message: "Deleted" });
});

export default router;

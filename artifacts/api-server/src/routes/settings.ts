import { Router } from "express";
import { getDb } from "../lib/database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/settings", requireAuth, (_req, res) => {
  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  res.json(settings);
});

router.put("/settings", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const current = db.prepare("SELECT * FROM settings WHERE id = 1").get() as any;
  const { store_name, owner_name, address, phone, whatsapp, email, ntn, footer_message, logo, currency, receipt_size, low_stock_threshold } = req.body as any;
  db.prepare(`
    UPDATE settings SET
      store_name=?, owner_name=?, address=?, phone=?, whatsapp=?, email=?, ntn=?,
      footer_message=?, logo=?, currency=?, receipt_size=?, low_stock_threshold=?
    WHERE id=1
  `).run(
    store_name ?? current.store_name,
    owner_name ?? current.owner_name,
    address ?? current.address,
    phone ?? current.phone,
    whatsapp ?? current.whatsapp,
    email ?? current.email,
    ntn ?? current.ntn,
    footer_message ?? current.footer_message,
    logo !== undefined ? logo : current.logo,
    currency ?? current.currency,
    receipt_size ?? current.receipt_size,
    low_stock_threshold ?? current.low_stock_threshold
  );
  res.json(db.prepare("SELECT * FROM settings WHERE id = 1").get());
});

export default router;

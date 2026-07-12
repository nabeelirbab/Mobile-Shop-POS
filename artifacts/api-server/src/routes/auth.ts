import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/database.js";
import { signToken, requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = signToken({ id: user.id, username: user.username, name: user.name, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, created_at: user.created_at } });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, username, name, role, created_at FROM users WHERE id = ?").get(req.user!.id) as any;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.get("/auth/users", requireAuth, requireAdmin, (_req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id").all();
  res.json(users);
});

router.post("/auth/users", requireAuth, requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body as any;
  if (!username || !password || !name || !role) {
    res.status(400).json({ error: "All fields required" }); return;
  }
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)").run(username, hash, name, role);
    const user = db.prepare("SELECT id, username, name, role, created_at FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
    res.status(201).json(user);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") { res.status(400).json({ error: "Username already exists" }); return; }
    throw e;
  }
});

router.put("/auth/users/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  const { username, password, name, role } = req.body as any;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const hash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  db.prepare("UPDATE users SET username=?, password_hash=?, name=?, role=? WHERE id=?").run(
    username || user.username, hash, name || user.name, role || user.role, id
  );
  const updated = db.prepare("SELECT id, username, name, role, created_at FROM users WHERE id = ?").get(id);
  res.json(updated);
});

router.delete("/auth/users/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params["id"]);
  if (req.user!.id === id) { res.status(400).json({ error: "Cannot delete yourself" }); return; }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ message: "User deleted" });
});

export default router;

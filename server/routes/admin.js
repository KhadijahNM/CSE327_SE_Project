const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db/db1");
const { normalizeEmail, cleanText } = require("../utils/helpers");
const { findUserByEmail } = require("../utils/dbHelpers");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, fullname, display_name, email, role, status, phone, gender, dob, created_at FROM users ORDER BY created_at DESC"
    );

    res.json({
      ok: true,
      users: rows.map(row => ({
        id: row.id,
        name: row.display_name || row.fullname || row.email,
        fullName: row.fullname || "",
        displayName: row.display_name || "",
        email: row.email,
        role: row.role || "user",
        status: row.status || "active",
        phone: row.phone || "",
        gender: row.gender || "",
        dob: row.dob ? new Date(row.dob).toISOString().slice(0, 10) : "",
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to fetch users.", error: err.message });
  }
});

router.post("/api/admin/users", requireAdmin, async (req, res) => {
  const fullName = cleanText(req.body?.fullName || req.body?.name);
  const displayName = cleanText(req.body?.displayName);
  const email = normalizeEmail(req.body?.email);
  const role = cleanText(req.body?.role)?.toLowerCase() === "admin" ? "admin" : "user";
  const status = cleanText(req.body?.status)?.toLowerCase() === "inactive" ? "inactive" : "active";
  const password = req.body?.password ? String(req.body.password) : "ChangeMe123!";

  if (!fullName || !email) {
    return res.status(400).json({ ok: false, message: "Name and email are required." });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ ok: false, message: "Email already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (fullname, display_name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)",
      [fullName, displayName, email, hashedPassword, role, status]
    );

    res.status(201).json({
      ok: true,
      message: "User created successfully.",
      user: { id: result.insertId, fullName, displayName: displayName || "", email, role, status }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to create user.", error: err.message });
  }
});

router.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const fullName = cleanText(req.body?.fullName || req.body?.name);
  const displayName = cleanText(req.body?.displayName);
  const email = normalizeEmail(req.body?.email);
  const role = cleanText(req.body?.role)?.toLowerCase() === "admin" ? "admin" : "user";
  const status = cleanText(req.body?.status)?.toLowerCase() === "inactive" ? "inactive" : "active";

  if (!id || !fullName || !email) {
    return res.status(400).json({ ok: false, message: "Valid id, name, and email are required." });
  }

  try {
    const [existingRows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ ok: false, message: "User not found." });

    const [emailRows] = await db.query("SELECT id FROM users WHERE email = ? AND id <> ?", [email, id]);
    if (emailRows.length) return res.status(400).json({ ok: false, message: "Email already in use." });

    await db.query(
      "UPDATE users SET fullname = ?, display_name = ?, email = ?, role = ?, status = ? WHERE id = ?",
      [fullName, displayName, email, role, status, id]
    );

    res.json({ ok: true, message: "User updated successfully." });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to update user.", error: err.message });
  }
});

router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Valid user id is required." });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "User not found." });
    if (rows[0].email === req.adminUser.email) {
      return res.status(400).json({ ok: false, message: "You cannot delete your own admin account." });
    }

    await db.query("DELETE FROM reports WHERE user_id = ?", [id]);
    await db.query("DELETE FROM donations WHERE user_id = ?", [id]);
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ ok: true, message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to delete user.", error: err.message });
  }
});

router.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT role, status, created_at FROM users ORDER BY created_at ASC"
    );
    const [reports] = await db.query(
      "SELECT disease, risk_label, created_at FROM reports ORDER BY created_at ASC"
    );

    res.json({ ok: true, users, reports });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to fetch admin stats.", error: err.message });
  }
});

module.exports = router;

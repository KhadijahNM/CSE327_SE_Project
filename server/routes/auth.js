const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db/db1");
const { normalizeEmail, cleanText, cleanDate, serializeUser } = require("../utils/helpers");
const { findUserByEmail } = require("../utils/dbHelpers");

const router = express.Router();

router.get("/api/me", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) return res.json({ name: "Demo User" });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ ok: false, message: "User not found." });
    res.json({ ok: true, ...serializeUser(user) });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.put("/api/me", async (req, res) => {
  const rawId = req.body?.id;
  const userId = Number.isInteger(rawId) ? rawId : Number.parseInt(rawId, 10);
  const email = normalizeEmail(req.body?.email);
  const fullNameInput = cleanText(req.body?.fullName);
  const displayNameInput = cleanText(req.body?.displayName);
  const phoneInput = cleanText(req.body?.phone);
  const dobInput = cleanDate(req.body?.dob);
  const genderInput = cleanText(req.body?.gender);

  if (!email && !Number.isInteger(userId)) {
    return res.status(400).json({ ok: false, message: "Email or user id is required." });
  }

  try {
    let existingUser = null;

    if (Number.isInteger(userId)) {
      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
      existingUser = rows[0] || null;
    }

    if (!existingUser && email) {
      existingUser = await findUserByEmail(email);
    }

    if (existingUser) {
      const fullName = fullNameInput !== null ? fullNameInput : existingUser.fullname;
      const displayName = displayNameInput !== null ? displayNameInput : existingUser.display_name;
      const phone = phoneInput !== null ? phoneInput : existingUser.phone;
      const dob = dobInput !== null ? dobInput : existingUser.dob;
      const gender = genderInput !== null ? genderInput : existingUser.gender;

      await db.query(
        "UPDATE users SET fullname = ?, display_name = ?, phone = ?, dob = ?, gender = ? WHERE id = ?",
        [fullName, displayName, phone, dob, gender, existingUser.id]
      );

      const [updatedRows] = await db.query("SELECT * FROM users WHERE id = ?", [existingUser.id]);
      return res.json({
        ok: true,
        message: "Profile updated successfully.",
        user: serializeUser(updatedRows[0])
      });
    } else {
      if (!email) {
        return res.status(404).json({ ok: false, message: "User not found." });
      }

      const fullName = fullNameInput || "";
      const displayName = displayNameInput || null;
      const phone = phoneInput || null;
      const dob = dobInput || null;
      const gender = genderInput || null;

      await db.query(
        "INSERT INTO users (fullname, display_name, email, phone, dob, gender) VALUES (?, ?, ?, ?, ?, ?)",
        [fullName, displayName, email, phone, dob, gender]
      );

      const savedUser = await findUserByEmail(email);
      return res.json({
        ok: true,
        message: "Profile updated successfully.",
        user: serializeUser(savedUser)
      });
    }
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ ok: false, message: "Email and password required." });

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) return res.status(400).json({ ok: false, message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (fullname, email, password, role, status) VALUES (?, ?, ?, 'user', 'active')",
      [fullname || "", normalizedEmail, hashed]
    );
    res.json({ ok: true, message: "Account created successfully! Please log in." });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ ok: false, message: "Email and password required." });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    if (!rows.length) return res.status(401).json({ ok: false, message: "Invalid email or password." });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ ok: false, message: "Invalid email or password." });

    res.json({ ok: true, message: `Welcome back, ${user.fullname || user.email}!`, user: serializeUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.post("/admin/login", async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!normalizedEmail || !password) {
    return res.status(400).json({ ok: false, message: "Email and password required." });
  }

  try {
    const user = await findUserByEmail(normalizedEmail);
    if (!user || user.role !== "admin") {
      return res.status(401).json({ ok: false, message: "Invalid admin credentials." });
    }

    const match = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!match) return res.status(401).json({ ok: false, message: "Invalid admin credentials." });

    res.json({
      ok: true,
      message: `Welcome back, ${user.fullname || "Admin"}!`,
      user: { ...serializeUser(user), provider: "admin" }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.post("/api/auth/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !currentPassword || !newPassword) return res.status(400).json({ ok: false, message: "All fields required." });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "User not found." });

    const user = rows[0];
    if (!user.password) return res.status(400).json({ ok: false, message: "This account uses a social sign-in method and cannot change password here." });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ ok: false, message: "Current password is incorrect." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE email = ?", [hashed, normalizedEmail]);
    res.json({ ok: true, message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

router.delete("/api/auth/account", async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedEmail) return res.status(400).json({ ok: false, message: "Email is required." });

  try {
    const user = await findUserByEmail(normalizedEmail);
    if (!user) return res.status(404).json({ ok: false, message: "User not found." });

    await db.query("DELETE FROM reports WHERE user_id = ?", [user.id]);
    await db.query("DELETE FROM donations WHERE user_id = ?", [user.id]);
    await db.query("DELETE FROM users WHERE id = ?", [user.id]);

    res.json({ ok: true, message: "Account deleted successfully." });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

module.exports = router;

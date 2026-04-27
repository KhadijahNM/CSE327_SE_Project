const express = require("express");
const db = require("../db/db1");
const { normalizeEmail } = require("../utils/helpers");
const { findUserByEmail } = require("../utils/dbHelpers");

const router = express.Router();

router.post("/api/donations", async (req, res) => {
  const { amount, currency } = req.body || {};
  const email = normalizeEmail(req.headers["x-user-email"]);
  if (!amount) return res.status(400).json({ ok: false, error: "Amount required" });

  try {
    const user = email ? await findUserByEmail(email) : null;
    const [result] = await db.query(
      "INSERT INTO donations (user_id, amount, currency) VALUES (?, ?, ?)",
      [user?.id || null, amount, currency || "BDT"]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/api/donations/recent", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (!email) return res.json([]);

    const user = await findUserByEmail(email);
    if (!user) return res.json([]);

    [rows] = await db.query(
      "SELECT amount, currency, created_at FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

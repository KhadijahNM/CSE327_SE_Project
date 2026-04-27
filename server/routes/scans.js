const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../db/db1");
const { normalizeEmail } = require("../utils/helpers");
const { findUserByEmail } = require("../utils/dbHelpers");
const ScanFacade = require("../services/ScanFacade");
const ResponseBuilder = require("../utils/ResponseBuilder");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../../assets/uploads/") });

router.get("/api/scans/latest", async (req, res) => {
  const response = new ResponseBuilder();
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (!email) return res.json(response.setData(null).build());

    const user = await findUserByEmail(email);
    if (!user) return res.json(response.setData(null).build());

    [rows] = await db.query(
      "SELECT disease, risk_score, risk_label, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );

    res.json(rows[0] || null); // Keep backwards compatibility
  } catch (err) {
    res.status(500).json(response.setError(err.message).build());
  }
});

router.get("/api/scans/recent", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (!email) return res.json([]);

    const user = await findUserByEmail(email);
    if (!user) return res.json([]);

    [rows] = await db.query(
      "SELECT disease, risk_score, risk_label, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json(new ResponseBuilder().setError(err.message).build());
  }
});

router.delete("/api/scans", async (req, res) => {
  const response = new ResponseBuilder();
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json(response.setError("Email is required.").build());

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json(response.setError("User not found.").build());

    const [result] = await db.query("DELETE FROM reports WHERE user_id = ?", [user.id]);
    res.json(response.setSuccess(true).setDeletedCount(result.affectedRows).build());
  } catch (err) {
    res.status(500).json(response.setError("Server error.").setMessage(err.message).build());
  }
});

router.post("/api/scans/upload", upload.single("image"), async (req, res) => {
  const response = new ResponseBuilder();
  const test = (req.query.test || "dr").toLowerCase();
  const email = normalizeEmail(req.headers["x-user-email"]);
  
  if (!req.file) return res.status(400).json(response.setError("No file uploaded").build());

  const result = await ScanFacade.processScan(email, req.file, test);
  
  if (result.success) {
    res.json(response.setSuccess(true).setData(result.data).build());
  } else {
    res.json(response.setSuccess(true).setFallback(result.fallback, "Demo result — Roboflow unavailable", result.errorMsg).build());
  }
});

module.exports = router;

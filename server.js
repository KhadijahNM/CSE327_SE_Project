const express = require("express");
const cors = require("cors");
const multer = require("multer");

// IMPORTANT: db1.js should be in the same folder as server.js (backend/)
const db = require("./db1");

const app = express();
app.use(cors());
app.use(express.json());

// Uploads go to backend/uploads/
const upload = multer({ dest: "uploads/" });

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Demo user (later: replace with real login/JWT user)
app.get("/api/me", (req, res) => {
  res.json({ name: "Demo User" });
});

/* ------------------ SCANS (Dashboard uses these) ------------------ */

// Latest scan from DB
app.get("/api/scans/latest", (req, res) => {
  db.get(
    "SELECT disease, risk_score, risk_label, created_at FROM reports ORDER BY created_at DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json(row || null);
    }
  );
});

// Recent scans from DB
app.get("/api/scans/recent", (req, res) => {
  db.all(
    "SELECT disease, risk_score, risk_label, created_at FROM reports ORDER BY created_at DESC LIMIT 10",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json(rows || []);
    }
  );
});

// Upload + demo prediction + SAVE into DB (THIS is the missing dynamic part)
app.post("/api/scans/upload", upload.single("image"), (req, res) => {
  const test = (req.query.test || "dr").toLowerCase();

  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded" });
  }

  // Demo prediction (replace later with ML)
  const map = {
    dr: { disease: "Diabetic Retinopathy", risk_score: 30, risk_label: "Medium" },
    glaucoma: { disease: "Glaucoma", risk_score: 35, risk_label: "Medium" },
    cataract: { disease: "Cataract", risk_score: 18, risk_label: "Low" },
    dryeye: { disease: "Dry Eye (prototype)", risk_score: 40, risk_label: "Medium" }
  };
  const pred = map[test] || map.dr;

  // Save report to DB so dashboard becomes dynamic
  db.run(
    "INSERT INTO reports (disease, risk_score, risk_label) VALUES (?,?,?)",
    [pred.disease, pred.risk_score, pred.risk_label],
    function (err) {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, id: this.lastID, ...pred });
    }
  );
});

/* ------------------ USAGE (Optional dynamic later) ------------------ */

app.get("/api/usage/today", (req, res) => {
  // Keep it static for now (you can make it DB-based later)
  res.json({ minutes: 260 });
});

app.post("/api/usage/break", (req, res) => {
  res.json({ ok: true, saved: true });
});

/* ------------------ DONATIONS (Save into DB) ------------------ */

app.post("/api/donations", (req, res) => {
  const { amount, currency } = req.body || {};
  if (!amount) {
    return res.status(400).json({ ok: false, error: "Amount required" });
  }

  db.run(
    "INSERT INTO donations (amount, currency) VALUES (?,?)",
    [amount, currency || "BDT"],
    function (err) {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// (Optional) view donation history
app.get("/api/donations/recent", (req, res) => {
  db.all(
    "SELECT amount, currency, created_at FROM donations ORDER BY created_at DESC LIMIT 10",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json(rows || []);
    }
  );
});

/* ------------------ CHATBOT (Still demo) ------------------ */

app.post("/api/agents/chat", (req, res) => {
  const msg = req.body?.message ? String(req.body.message) : "";
  const reply =
    "Demo reply: I can explain your risk score and suggest habits like 20-20-20. " +
    "For any serious symptoms, please consult an eye specialist.";
  res.json({ ok: true, reply: msg ? reply : "Ask me a question!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
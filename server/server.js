const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const db = require("./db/db1");

const app = express();
app.use(cors());
app.use(express.json());

// Serve HTML files directly (fixes 403)
app.use(express.static(path.join(__dirname, "../client/html")));
// Serve CSS, JS, and other assets
app.use(express.static(path.join(__dirname, "../client")));

const upload = multer({
  dest: path.join(__dirname, "../assets/uploads/")
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/html/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/html/login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/html/dashboard.html"));
});

app.get("/diagnostics", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/html/diagnostics.html"));
});

app.get("/donation", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/html/donation.html"));
});

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Demo user
app.get("/api/me", (req, res) => {
  res.json({ name: "Demo User" });
});

/* ------------------ SCANS ------------------ */

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

// Upload + save
app.post("/api/scans/upload", upload.single("image"), (req, res) => {
  const test = (req.query.test || "dr").toLowerCase();

  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded" });
  }

  const map = {
    dr: { disease: "Diabetic Retinopathy", risk_score: 30, risk_label: "Medium" },
    glaucoma: { disease: "Glaucoma", risk_score: 35, risk_label: "Medium" },
    cataract: { disease: "Cataract", risk_score: 18, risk_label: "Low" },
    dryeye: { disease: "Dry Eye (prototype)", risk_score: 40, risk_label: "Medium" }
  };

  const pred = map[test] || map.dr;

  db.run(
    "INSERT INTO reports (disease, risk_score, risk_label) VALUES (?,?,?)",
    [pred.disease, pred.risk_score, pred.risk_label],
    function (err) {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, id: this.lastID, ...pred });
    }
  );
});

/* ------------------ DONATIONS ------------------ */

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

/* ------------------ CHATBOT ------------------ */

app.post("/api/agents/chat", (req, res) => {
  const msg = req.body?.message ? String(req.body.message) : "";
  const reply =
    "Demo reply: I can explain your risk score and suggest habits like 20-20-20. " +
    "For any serious symptoms, please consult an eye specialist.";

  res.json({ ok: true, reply: msg ? reply : "Ask me a question!" });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
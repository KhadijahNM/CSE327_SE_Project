const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const db = require("./db/db1");

const app = express();
app.use(cors());
app.use(express.json());

// Serve HTML files directly
app.use(express.static(path.join(__dirname, "../client/html")));
// Serve CSS, JS, and other assets
app.use(express.static(path.join(__dirname, "../client")));

const upload = multer({
  dest: path.join(__dirname, "../assets/uploads/")
});

// ── Roboflow config ──
const ROBOFLOW_API_KEY = "BokJ1ufaiBnRuJiilWP1";
const ROBOFLOW_WORKSPACE = "zubos-workspace";

const WORKFLOWS = {
  glaucoma: "detect-and-classify-3",
  dr:       "diabetic-retinopathy-optiguardai",
  cataract: "cataract-for-optiguardai",
  dryeye:   "dry-eye-for-optiguardai"
};

// ── Gemini config ──
const GEMINI_API_KEY = "AIzaSyCl2R7W8bcRx9cOk8hqMFI2NEg6AmVm2tw";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are OptiGuard AI's eye health assistant. You help patients understand their eye scan results, explain eye conditions, and provide general eye care advice.

You specialise in:
- Diabetic Retinopathy (DR) — damage to the retina from diabetes
- Glaucoma — optic nerve damage from eye pressure
- Cataracts — clouding of the eye lens
- Dry Eye Syndrome — insufficient tear production

Guidelines:
- Be warm, clear, and reassuring
- Explain medical terms in simple language
- Always recommend consulting an eye specialist for serious concerns
- Give practical tips like the 20-20-20 rule for screen strain
- Keep responses concise (2-4 sentences unless more detail is needed)
- Never diagnose — only explain and advise`;

// ── Page routes ──
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../client/html/index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../client/html/login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../client/html/dashboard.html")));
app.get("/diagnostics", (req, res) => res.sendFile(path.join(__dirname, "../client/html/diagnostics.html")));
app.get("/donation", (req, res) => res.sendFile(path.join(__dirname, "../client/html/donation.html")));
app.get("/settings", (req, res) => res.sendFile(path.join(__dirname, "../client/html/settings.html")));
app.get("/test-history", (req, res) => res.sendFile(path.join(__dirname, "../client/html/test-history.html")));

// ── Health check ──
app.get("/api/health", (req, res) => res.json({ ok: true }));

function normalizeEmail(value) {
  return value ? String(value).trim().toLowerCase() : "";
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function cleanDate(value) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function serializeUser(user) {
  if (!user) return null;
  const fullName = user.fullname || "";
  const displayName = user.display_name || (fullName ? fullName.split(" ")[0] : "");

  return {
    id: user.id,
    name: displayName || fullName || user.email,
    fullName,
    displayName,
    email: user.email,
    phone: user.phone || "",
    dob: user.dob ? new Date(user.dob).toISOString().slice(0, 10) : "",
    gender: user.gender || ""
  };
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  return rows[0] || null;
}

app.get("/api/me", async (req, res) => {
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

app.put("/api/me", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const fullName = cleanText(req.body?.fullName);
  const displayName = cleanText(req.body?.displayName);
  const phone = cleanText(req.body?.phone);
  const dob = cleanDate(req.body?.dob);
  const gender = cleanText(req.body?.gender);

  if (!email) return res.status(400).json({ ok: false, message: "Email is required." });
  if (!fullName) return res.status(400).json({ ok: false, message: "Full name is required." });

  try {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      await db.query(
        "UPDATE users SET fullname = ?, display_name = ?, phone = ?, dob = ?, gender = ? WHERE email = ?",
        [fullName, displayName, phone, dob, gender, email]
      );
    } else {
      await db.query(
        "INSERT INTO users (fullname, display_name, email, phone, dob, gender) VALUES (?, ?, ?, ?, ?, ?)",
        [fullName, displayName, email, phone, dob, gender]
      );
    }

    const savedUser = await findUserByEmail(email);
    res.json({ ok: true, message: "Profile updated successfully.", user: serializeUser(savedUser) });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

/* ================== AUTH ================== */

// Signup
app.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ ok: false, message: "Email and password required." });

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) return res.status(400).json({ ok: false, message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)", [fullname || "", normalizedEmail, hashed]);
    res.json({ ok: true, message: "Account created successfully! Please log in." });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
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

// Change password
app.post("/api/auth/change-password", async (req, res) => {
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

app.delete("/api/auth/account", async (req, res) => {
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

/* ================== SCANS ================== */

app.get("/api/scans/latest", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (email) {
      const user = await findUserByEmail(email);
      if (!user) return res.json(null);
      [rows] = await db.query(
        "SELECT disease, risk_score, risk_label, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
    } else {
      [rows] = await db.query(
        "SELECT disease, risk_score, risk_label, created_at FROM reports ORDER BY created_at DESC LIMIT 1"
      );
    }
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/scans/recent", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (email) {
      const user = await findUserByEmail(email);
      if (!user) return res.json([]);
      [rows] = await db.query(
        "SELECT disease, risk_score, risk_label, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        [user.id]
      );
    } else {
      [rows] = await db.query(
        "SELECT disease, risk_score, risk_label, created_at FROM reports ORDER BY created_at DESC LIMIT 10"
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/scans", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ ok: false, message: "Email is required." });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ ok: false, message: "User not found." });

    const [result] = await db.query("DELETE FROM reports WHERE user_id = ?", [user.id]);
    res.json({ ok: true, deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
});

// ── Roboflow inference ──
async function callRoboflow(workflowId, imagePath) {
  const base64Image = fs.readFileSync(imagePath).toString("base64");
  const url = `https://serverless.roboflow.com/${ROBOFLOW_WORKSPACE}/workflows/${workflowId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: ROBOFLOW_API_KEY,
      inputs: { image: { type: "base64", value: base64Image } }
    })
  });

  if (!response.ok) throw new Error(`Roboflow error ${response.status}: ${await response.text()}`);
  return await response.json();
}

function parseGlaucoma(result) {
  const predictions =
    result?.outputs?.[0]?.predictions?.predictions ||
    result?.outputs?.[0]?.model_predictions?.predictions || [];

  if (!predictions.length) return { risk_score: 10, risk_label: "Low", detail: "No optic abnormalities detected" };

  const cup  = predictions.find(p => p.class?.toLowerCase().includes("cup"));
  const disc = predictions.find(p => p.class?.toLowerCase().includes("disc"));

  if (cup && disc) {
    const cdr = Math.sqrt((cup.width * cup.height) / (disc.width * disc.height));
    if (cdr > 0.7) return { risk_score: Math.min(Math.round(70 + (cdr - 0.7) * 100), 95), risk_label: "High",   detail: `High cup-to-disc ratio (${cdr.toFixed(2)}) — consult a specialist` };
    if (cdr > 0.5) return { risk_score: Math.round(40 + (cdr - 0.5) * 150),               risk_label: "Medium", detail: `Moderate cup-to-disc ratio (${cdr.toFixed(2)}) — monitor regularly` };
    return               { risk_score: Math.round(cdr * 80),                               risk_label: "Low",    detail: `Normal cup-to-disc ratio (${cdr.toFixed(2)})` };
  }
  return { risk_score: 35, risk_label: "Medium", detail: "Partial optic structure detected — recommend full scan" };
}

function parseClassification(result, diseaseName) {
  const outputs    = result?.outputs?.[0] || {};
  const topClass   = outputs?.top || outputs?.predicted_classes?.[0] || "";
  const confidence = outputs?.confidence || outputs?.top_class_confidence || 0;
  const conf       = typeof confidence === "number" ? confidence : parseFloat(confidence) || 0;
  const confPct    = Math.round(conf * 100);
  const cls        = (topClass || "").toLowerCase();

  let risk_score, risk_label, detail;

  if (cls.includes("no") || cls.includes("normal") || cls.includes("healthy") || cls === "0") {
    risk_score = Math.round(confPct * 0.3); risk_label = "Low";
    detail = `No ${diseaseName} detected (${confPct}% confidence)`;
  } else if (cls.includes("mild") || cls.includes("early") || cls === "1") {
    risk_score = 25 + Math.round(confPct * 0.3); risk_label = "Low";
    detail = `Mild ${diseaseName} signs detected (${confPct}% confidence)`;
  } else if (cls.includes("moderate") || cls === "2") {
    risk_score = 45 + Math.round(confPct * 0.25); risk_label = "Medium";
    detail = `Moderate ${diseaseName} detected (${confPct}% confidence)`;
  } else if (cls.includes("severe") || cls.includes("proliferative") || cls === "3" || cls === "4") {
    risk_score = 70 + Math.round(confPct * 0.25); risk_label = "High";
    detail = `Severe ${diseaseName} detected (${confPct}% confidence) — seek specialist`;
  } else if (cls.includes("positive") || cls.includes("detected") || cls.includes("yes")) {
    risk_score = 50 + Math.round(confPct * 0.3);
    risk_label = confPct > 70 ? "High" : "Medium";
    detail = `${diseaseName} detected (${confPct}% confidence)`;
  } else {
    risk_score = confPct > 0 ? Math.round(confPct * 0.6) : 20;
    risk_label = risk_score > 60 ? "High" : risk_score > 35 ? "Medium" : "Low";
    detail = `${diseaseName} analysis complete — class: ${topClass || "unknown"} (${confPct}% confidence)`;
  }

  risk_score = Math.max(5, Math.min(95, risk_score));
  return { risk_score, risk_label, detail };
}

// Upload + scan
app.post("/api/scans/upload", upload.single("image"), async (req, res) => {
  const test = (req.query.test || "dr").toLowerCase();
  const email = normalizeEmail(req.headers["x-user-email"]);
  if (!req.file) return res.status(400).json({ ok: false, error: "No file uploaded" });

  const diseaseNames = { dr: "Diabetic Retinopathy", glaucoma: "Glaucoma", cataract: "Cataract", dryeye: "Dry Eye" };
  const workflowId = WORKFLOWS[test];
  let currentUser = null;

  try {
    currentUser = email ? await findUserByEmail(email) : null;
    console.log(`Running Roboflow [${test}] → workflow: ${workflowId}`);
    const roboflowResult = await callRoboflow(workflowId, req.file.path);
    console.log(`Roboflow [${test}] result:`, JSON.stringify(roboflowResult, null, 2));

    const parsed = test === "glaucoma" ? parseGlaucoma(roboflowResult) : parseClassification(roboflowResult, diseaseNames[test]);
    const pred = { disease: diseaseNames[test], ...parsed };

    await db.query(
      "INSERT INTO reports (user_id, disease, risk_score, risk_label) VALUES (?, ?, ?, ?)",
      [currentUser?.id || null, pred.disease, pred.risk_score, pred.risk_label]
    );

    fs.unlink(req.file.path, () => {});
    res.json({ ok: true, ...pred });

  } catch (err) {
    console.error(`[${test}] Scan error:`, err.message);
    fs.unlink(req.file?.path, () => {});

    const fallbacks = {
      dr:       { disease: "Diabetic Retinopathy", risk_score: 30, risk_label: "Medium" },
      glaucoma: { disease: "Glaucoma",             risk_score: 30, risk_label: "Medium" },
      cataract: { disease: "Cataract",             risk_score: 18, risk_label: "Low"    },
      dryeye:   { disease: "Dry Eye",              risk_score: 40, risk_label: "Medium" }
    };
    const fallback = fallbacks[test] || fallbacks.dr;

    try {
      await db.query(
        "INSERT INTO reports (user_id, disease, risk_score, risk_label) VALUES (?, ?, ?, ?)",
        [currentUser?.id || null, fallback.disease, fallback.risk_score, fallback.risk_label]
      );
    } catch (dbErr) { console.error("DB fallback error:", dbErr.message); }

    res.json({ ok: true, ...fallback, detail: "Demo result — Roboflow unavailable", warning: err.message });
  }
});

/* ================== DONATIONS ================== */

app.post("/api/donations", async (req, res) => {
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

app.get("/api/donations/recent", async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    let rows;

    if (email) {
      const user = await findUserByEmail(email);
      if (!user) return res.json([]);
      [rows] = await db.query(
        "SELECT amount, currency, created_at FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        [user.id]
      );
    } else {
      [rows] = await db.query(
        "SELECT amount, currency, created_at FROM donations ORDER BY created_at DESC LIMIT 10"
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ================== CHATBOT ================== */

app.post("/api/agents/chat", async (req, res) => {
  const msg     = req.body?.message ? String(req.body.message).trim() : "";
  const history = req.body?.history || [];

  if (!msg) return res.json({ ok: true, reply: "Ask me a question about your eye health!" });

  try {
    const contents = [];
    for (const turn of history) {
      if (turn.role && turn.text) {
        contents.push({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.text }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: msg }] });

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents
      })
    });

    if (!response.ok) throw new Error(`Gemini error ${response.status}: ${await response.text()}`);

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
    res.json({ ok: true, reply });

  } catch (err) {
    console.error("Gemini chatbot error:", err.message);
    res.json({ ok: true, reply: "I'm having trouble connecting right now. For eye health concerns, please consult a specialist. Tip: follow the 20-20-20 rule — every 20 minutes, look 20 feet away for 20 seconds!" });
  }
});

/* ================== START ================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);

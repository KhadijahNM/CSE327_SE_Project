const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_API_KEY}`;

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

// ── Routes ──
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../client/html/index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../client/html/login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../client/html/dashboard.html")));
app.get("/diagnostics", (req, res) => res.sendFile(path.join(__dirname, "../client/html/diagnostics.html")));
app.get("/donation", (req, res) => res.sendFile(path.join(__dirname, "../client/html/donation.html")));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/me", (req, res) => res.json({ name: "Demo User" }));

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

// ── Call Roboflow workflow with base64 image ──
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

// ── Risk parsers ──

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
  const outputs     = result?.outputs?.[0] || {};
  const topClass    = outputs?.top || outputs?.predicted_classes?.[0] || "";
  const confidence  = outputs?.confidence || outputs?.top_class_confidence || 0;
  const conf        = typeof confidence === "number" ? confidence : parseFloat(confidence) || 0;
  const confPct     = Math.round(conf * 100);
  const cls         = (topClass || "").toLowerCase();

  let risk_score, risk_label, detail;

  if (cls.includes("no") || cls.includes("normal") || cls.includes("healthy") || cls === "0") {
    risk_score = Math.round(confPct * 0.3);
    risk_label = "Low";
    detail = `No ${diseaseName} detected (${confPct}% confidence)`;
  } else if (cls.includes("mild") || cls.includes("early") || cls === "1") {
    risk_score = 25 + Math.round(confPct * 0.3);
    risk_label = "Low";
    detail = `Mild ${diseaseName} signs detected (${confPct}% confidence)`;
  } else if (cls.includes("moderate") || cls === "2") {
    risk_score = 45 + Math.round(confPct * 0.25);
    risk_label = "Medium";
    detail = `Moderate ${diseaseName} detected (${confPct}% confidence)`;
  } else if (cls.includes("severe") || cls.includes("proliferative") || cls === "3" || cls === "4") {
    risk_score = 70 + Math.round(confPct * 0.25);
    risk_label = "High";
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

// ── Upload + scan ──
app.post("/api/scans/upload", upload.single("image"), async (req, res) => {
  const test = (req.query.test || "dr").toLowerCase();

  if (!req.file) return res.status(400).json({ ok: false, error: "No file uploaded" });

  const diseaseNames = {
    dr:       "Diabetic Retinopathy",
    glaucoma: "Glaucoma",
    cataract: "Cataract",
    dryeye:   "Dry Eye"
  };

  const workflowId = WORKFLOWS[test];

  try {
    console.log(`Running Roboflow [${test}] → workflow: ${workflowId}`);
    const roboflowResult = await callRoboflow(workflowId, req.file.path);
    console.log(`Roboflow [${test}] result:`, JSON.stringify(roboflowResult, null, 2));

    const parsed = test === "glaucoma"
      ? parseGlaucoma(roboflowResult)
      : parseClassification(roboflowResult, diseaseNames[test]);

    const pred = { disease: diseaseNames[test], ...parsed };

    db.run(
      "INSERT INTO reports (disease, risk_score, risk_label) VALUES (?,?,?)",
      [pred.disease, pred.risk_score, pred.risk_label],
      function (err) {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        fs.unlink(req.file.path, () => {});
        res.json({ ok: true, id: this.lastID, ...pred });
      }
    );

  } catch (err) {
    console.error(`[${test}] Roboflow error:`, err.message);
    fs.unlink(req.file?.path, () => {});

    const fallbacks = {
      dr:       { disease: "Diabetic Retinopathy", risk_score: 30, risk_label: "Medium" },
      glaucoma: { disease: "Glaucoma",             risk_score: 30, risk_label: "Medium" },
      cataract: { disease: "Cataract",             risk_score: 18, risk_label: "Low"    },
      dryeye:   { disease: "Dry Eye",              risk_score: 40, risk_label: "Medium" }
    };

    const fallback = fallbacks[test] || fallbacks.dr;
    db.run(
      "INSERT INTO reports (disease, risk_score, risk_label) VALUES (?,?,?)",
      [fallback.disease, fallback.risk_score, fallback.risk_label],
      function (dbErr) {
        if (dbErr) return res.status(500).json({ ok: false, error: dbErr.message });
        res.json({ ok: true, id: this.lastID, ...fallback, detail: "Demo result — Roboflow unavailable", warning: err.message });
      }
    );
  }
});

/* ------------------ DONATIONS ------------------ */

app.post("/api/donations", (req, res) => {
  const { amount, currency } = req.body || {};
  if (!amount) return res.status(400).json({ ok: false, error: "Amount required" });

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

/* ------------------ CHATBOT (Gemini) ------------------ */

app.post("/api/agents/chat", async (req, res) => {
  const msg     = req.body?.message ? String(req.body.message).trim() : "";
  const history = req.body?.history || []; // optional conversation history

  if (!msg) return res.json({ ok: true, reply: "Ask me a question about your eye health!" });

  try {
    // Build conversation contents for Gemini
    const contents = [];

    // Add history (user/model turns)
    for (const turn of history) {
      if (turn.role && turn.text) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: msg }]
    });

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";

    res.json({ ok: true, reply });

  } catch (err) {
    console.error("Gemini chatbot error:", err.message);
    // Fallback reply
    res.json({
      ok: true,
      reply: "I'm having trouble connecting right now. For eye health concerns, please consult a specialist. Tip: follow the 20-20-20 rule — every 20 minutes, look 20 feet away for 20 seconds!"
    });
  }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);

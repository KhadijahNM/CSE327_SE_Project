const express = require("express");
const cors = require("cors");
const path = require("path");

const pagesRouter = require("./routes/pages");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const scansRouter = require("./routes/scans");
const donationsRouter = require("./routes/donations");
const chatRouter = require("./routes/chat");

// Import helpers to re-export for tests
const { normalizeEmail, cleanText, cleanDate, serializeUser } = require("./utils/helpers");
const { parseGlaucoma, parseClassification } = require("./services/aiService");
require("./utils/EventObserver"); // Initialize EventObserver

const app = express();
app.use(cors());
app.use(express.json());

// Serve HTML files directly
app.use(express.static(path.join(__dirname, "../client/html")));
// Serve CSS, JS, and other assets
app.use(express.static(path.join(__dirname, "../client")));

// Mount Routers
app.use("/", pagesRouter);
app.use("/", authRouter);
app.use("/", adminRouter);
app.use("/", scansRouter);
app.use("/", donationsRouter);
app.use("/", chatRouter);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ================== START ================== */

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const initDB = require("./db/init");
  initDB().then(() => {
    app.listen(PORT, () =>
      console.log(`Backend running on http://localhost:${PORT}`)
    );
  }).catch(err => {
    console.error("MySQL init error:", err.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  normalizeEmail,
  cleanText,
  cleanDate,
  serializeUser,
  parseGlaucoma,
  parseClassification
};

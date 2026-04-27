const express = require("express");
const { callGemini } = require("../services/aiService");

const router = express.Router();

router.post("/api/agents/chat", async (req, res) => {
  const msg = req.body?.message ? String(req.body.message).trim() : "";
  const history = req.body?.history || [];

  if (!msg) return res.json({ ok: true, reply: "Ask me a question about your eye health!" });

  try {
    const reply = await callGemini(msg, history);
    res.json({ ok: true, reply });
  } catch (err) {
    console.error("Gemini chatbot error:", err.message);
    res.json({ ok: true, reply: "I'm having trouble connecting right now. For eye health concerns, please consult a specialist. Tip: follow the 20-20-20 rule — every 20 minutes, look 20 feet away for 20 seconds!" });
  }
});

module.exports = router;

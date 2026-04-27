const AiModelFactory = require("./factories/AiModelFactory");
const RoboflowAdapter = require("./adapters/RoboflowAdapter");
const GeminiAdapter = require("./adapters/GeminiAdapter");

// ── Config ──────────────────────────────────────────────────────────────────
const ROBOFLOW_API_KEY = "BokJ1ufaiBnRuJiilWP1";
const ROBOFLOW_WORKSPACE = "zubos-workspace";
const GEMINI_API_KEY = "AIzaSyBo2MrPXzZyhXsMYXxOv_rJeSRoGg9kmHo";


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

// Create adapter instances
const roboflowAdapter = new RoboflowAdapter(ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE);
const geminiAdapter = new GeminiAdapter(GEMINI_API_KEY);

// ── Exported Functions ───────────────────────────────────────────────────────

async function callRoboflow(disease, imagePath) {
  const config = AiModelFactory.getModelConfig(disease);
  return roboflowAdapter.analyze(config, imagePath);
}

// Retain legacy parser functions using the new Strategies to ensure no breakage
const GlaucomaStrategy = require("./strategies/GlaucomaStrategy");
const ClassificationStrategy = require("./strategies/ClassificationStrategy");

const glaucomaStrategy = new GlaucomaStrategy();
const classificationStrategy = new ClassificationStrategy();

function parseGlaucoma(result) {
  return glaucomaStrategy.parse(result, "Glaucoma");
}

function parseClassification(result, diseaseName) {
  return classificationStrategy.parse(result, diseaseName);
}

async function callGemini(msg, history) {
  return geminiAdapter.generate(SYSTEM_PROMPT, msg, history);
}

module.exports = {
  MODELS: AiModelFactory.MODELS,
  callRoboflow,
  parseGlaucoma,
  parseClassification,
  callGemini
};

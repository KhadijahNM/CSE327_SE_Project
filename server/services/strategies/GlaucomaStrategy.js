const ParseStrategy = require('./ParseStrategy');

class GlaucomaStrategy extends ParseStrategy {
  parse(result, diseaseName) {
    const predictions =
      result?.outputs?.[0]?.predictions?.predictions ||
      result?.outputs?.[0]?.model_predictions?.predictions ||
      result?.predictions || [];

    if (!predictions.length) {
      return { risk_score: 10, risk_label: "Low", detail: "No optic abnormalities detected" };
    }

    const cup  = predictions.find(p => p.class?.toLowerCase().includes("cup"));
    const disc = predictions.find(p => p.class?.toLowerCase().includes("disc"));

    if (cup && disc) {
      const cdr = Math.sqrt((cup.width * cup.height) / (disc.width * disc.height));
      if (cdr > 0.7) return { risk_score: Math.min(Math.round(70 + (cdr - 0.7) * 100), 95), risk_label: "High",   detail: `High cup-to-disc ratio (${cdr.toFixed(2)}) — consult a specialist` };
      if (cdr > 0.5) return { risk_score: Math.round(40 + (cdr - 0.5) * 150),              risk_label: "Medium", detail: `Moderate cup-to-disc ratio (${cdr.toFixed(2)}) — monitor regularly` };
      return              { risk_score: Math.round(cdr * 80),                               risk_label: "Low",    detail: `Normal cup-to-disc ratio (${cdr.toFixed(2)})` };
    }

    return { risk_score: 35, risk_label: "Medium", detail: "Partial optic structure detected — recommend full scan" };
  }
}

module.exports = GlaucomaStrategy;

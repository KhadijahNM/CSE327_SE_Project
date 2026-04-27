const ParseStrategy = require('./ParseStrategy');

class ClassificationStrategy extends ParseStrategy {
  parse(result, diseaseName) {
    const outputs    = result?.outputs?.[0] || result || {};
    let topClass   = outputs?.top || outputs?.predicted_classes?.[0] || "";
    let confidence = outputs?.confidence ?? outputs?.top_class_confidence ?? 0;

    if (!topClass && outputs?.predictions?.length) {
      const topPred = outputs.predictions.reduce((prev, curr) => (curr.confidence > prev.confidence) ? curr : prev);
      topClass = topPred.class || "";
      confidence = topPred.confidence || 0;
    }

    const conf       = typeof confidence === "number" ? confidence : parseFloat(confidence) || 0;
    const confPct    = Math.round(conf * 100);
    const cls        = topClass.toLowerCase();

    const diseaseKey = diseaseName.toLowerCase().replace(/\s+/g, '');
    const clsKey     = cls.replace(/\s+/g, '');

    let risk_score, risk_label, detail;

    if      (cls.includes("no") || cls.includes("normal") || cls.includes("healthy") || cls === "0") {
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

    } else if (cls.includes("positive") || cls.includes("detected") || cls.includes("yes") || clsKey.includes(diseaseKey)) {
      risk_score = 50 + Math.round(confPct * 0.3);
      risk_label = confPct > 70 ? "High" : "Medium";
      detail = `${diseaseName} detected (${confPct}% confidence)`;

    } else {
      risk_score = confPct > 0 ? Math.round(confPct * 0.6) : 20;
      risk_label = risk_score > 60 ? "High" : risk_score > 35 ? "Medium" : "Low";
      detail = `${diseaseName} analysis complete — class: ${topClass || "unknown"} (${confPct}% confidence)`;
    }

    return {
      risk_score: Math.max(5, Math.min(95, risk_score)),
      risk_label,
      detail,
    };
  }
}

module.exports = ClassificationStrategy;

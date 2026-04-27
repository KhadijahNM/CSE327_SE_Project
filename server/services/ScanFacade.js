const fs = require("fs");
const db = require("../db/db1");
const { findUserByEmail } = require("../utils/dbHelpers");
const { callRoboflow, parseGlaucoma, parseClassification } = require("./aiService");
const EventObserver = require("../utils/EventObserver");

class ScanFacade {
  static async processScan(email, file, testType) {
    const diseaseNames = { dr: "Diabetic Retinopathy", glaucoma: "Glaucoma", cataract: "Cataract", dryeye: "Dry Eye" };
    let currentUser = null;

    try {
      currentUser = email ? await findUserByEmail(email) : null;
      console.log(`Running Roboflow [${testType}]`);
      const roboflowResult = await callRoboflow(testType, file.path);
      console.log(`Roboflow [${testType}] result:`, JSON.stringify(roboflowResult, null, 2));

      const parsed = testType === "glaucoma"
        ? parseGlaucoma(roboflowResult)
        : parseClassification(roboflowResult, diseaseNames[testType]);
      
      const pred = { disease: diseaseNames[testType], ...parsed };

      await db.query(
        "INSERT INTO reports (user_id, disease, risk_score, risk_label) VALUES (?, ?, ?, ?)",
        [currentUser?.id || null, pred.disease, pred.risk_score, pred.risk_label]
      );

      fs.unlink(file.path, () => { });
      
      EventObserver.emit('SCAN_COMPLETED', { test: testType, risk_score: pred.risk_score });
      
      return { success: true, data: pred };

    } catch (err) {
      console.error(`[${testType}] Scan error:`, err.message);
      fs.unlink(file?.path, () => { });

      const fallbacks = {
        dr: { disease: "Diabetic Retinopathy", risk_score: 30, risk_label: "Medium" },
        glaucoma: { disease: "Glaucoma", risk_score: 30, risk_label: "Medium" },
        cataract: { disease: "Cataract", risk_score: 18, risk_label: "Low" },
        dryeye: { disease: "Dry Eye", risk_score: 40, risk_label: "Medium" }
      };
      const fallback = fallbacks[testType] || fallbacks.dr;

      try {
        await db.query(
          "INSERT INTO reports (user_id, disease, risk_score, risk_label) VALUES (?, ?, ?, ?)",
          [currentUser?.id || null, fallback.disease, fallback.risk_score, fallback.risk_label]
        );
      } catch (dbErr) { console.error("DB fallback error:", dbErr.message); }

      EventObserver.emit('SCAN_FAILED', { test: testType, error: err.message });
      
      return { success: false, fallback, errorMsg: err.message };
    }
  }
}

module.exports = ScanFacade;

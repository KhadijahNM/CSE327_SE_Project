const { normalizeEmail } = require("../utils/helpers");
const { findUserByEmail } = require("../utils/dbHelpers");

async function requireAdmin(req, res, next) {
  const adminEmail = normalizeEmail(req.headers["x-admin-email"] || req.query.adminEmail || req.body?.adminEmail);
  if (!adminEmail) return res.status(401).json({ ok: false, message: "Admin authentication required." });

  try {
    const adminUser = await findUserByEmail(adminEmail);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admin access denied." });
    }

    req.adminUser = adminUser;
    next();
  } catch (err) {
    res.status(500).json({ ok: false, message: "Server error.", error: err.message });
  }
}

module.exports = {
  requireAdmin
};

const db = require("../db/db1");
const { normalizeEmail } = require("./helpers");

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  return rows[0] || null;
}

module.exports = {
  findUserByEmail
};

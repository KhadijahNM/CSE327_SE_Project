const mysql = require("mysql2");

const db = mysql.createPool({
  uri: "mysql://root:uhrZHmxuMqoCwvCfCfYAQMYWZTDllUkw@roundhouse.proxy.rlwy.net:14486/railway",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ── Create tables if they don't exist ──
const initSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    disease VARCHAR(255),
    risk_score INT,
    risk_label VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'BDT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Run each statement separately
const statements = initSQL.split(";").map(s => s.trim()).filter(s => s.length > 0);

const extraColumns = [
  "ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL",
  "ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL",
  "ALTER TABLE users ADD COLUMN dob DATE NULL",
  "ALTER TABLE users ADD COLUMN gender VARCHAR(50) NULL"
];

(async () => {
  try {
    const conn = await db.promise().getConnection();
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    for (const stmt of extraColumns) {
      try {
        await conn.query(stmt);
      } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") throw err;
      }
    }
    conn.release();
    console.log("MySQL connected & tables ready ✓");
  } catch (err) {
    console.error("MySQL init error:", err.message);
    process.exit(1);
  }
})();

module.exports = db.promise();

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "optiguard_khadija.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB error:", err.message);
  else console.log("SQLite connected:", dbPath);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disease TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_label TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'BDT',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
});

module.exports = db;
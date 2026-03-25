// server.js
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const path = require("path");   
app.use(express.static(__dirname));  

// ======================
// MySQL Connection
// ======================
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",          // change if your MySQL user is different
  password: "",          // add your MySQL password if set
  database: "optiguard_ai"
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

// ======================
// Signup Route
// ======================
app.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO user_info (fullname, email, password_hash) VALUES (?, ?, ?)";

    db.query(sql, [fullname, email, hashedPassword], (err, result) => {
      if (err) {
        console.error("Signup Error:", err);
        return res.json({
          message: "❌ Error creating account",
          error: err.sqlMessage || err.message
        });
      }
      res.json({ message: "✅ Account created successfully" });
    });
  } catch (error) {
    console.error("Signup Exception:", error);
    res.json({ message: "❌ Error creating account", error: error.message });
  }
});

// ======================
// Login Route
// ======================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM user_info WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login Error:", err);
      return res.json({
        message: "❌ Server Error",
        error: err.sqlMessage || err.message
      });
    }

    if (results.length === 0) {
      return res.json({ message: "❌ User not found" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.json({ message: "❌ Invalid password" });
    }

    res.json({ message: "✅ Login successful" });
  });
});

// ======================
// Root Route
// ======================
app.get("/", (req, res) => {
  res.send("🚀 Backend is running and ready!");
});

// ======================
// Start Server
// ======================
app.listen(3000, () => {
  console.log("🚀 Server running on http://127.0.0.1:3000");
});

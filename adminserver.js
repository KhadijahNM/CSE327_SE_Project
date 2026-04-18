const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- MySQL Connection Pool ---
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // replace with your MySQL username
  password: '',          // replace with your MySQL password
  database: 'optiguard_ai'    // replace with your database name
});

// --- API Routes ---

// GET: Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST: Add a new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    const [result] = await pool.query(
      "INSERT INTO users (name, email, role, status) VALUES (?, ?, ?, ?)",
      [name, email, role, status]
    );
    res.status(201).json({ id: result.insertId, name, email, role, status });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to add user" });
  }
});

// PUT: Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    await pool.query(
      "UPDATE users SET name=?, email=?, role=?, status=? WHERE id=?",
      [name, email, role, status, id]
    );
    res.json({ id, name, email, role, status });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update user" });
  }
});

// DELETE: Remove user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id=?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to delete user" });
  }
});

// GET: Stats for charts
app.get('/api/stats', async (req, res) => {
  try {
    const [[active]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE status='Active'");
    const [[inactive]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE status='Inactive'");
    const [[newLogin]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE status='New'");
    res.json({
      activeCount: active.count,
      inactiveCount: inactive.count,
      newLoginCount: newLogin.count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send("Admin Server is running...");
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Server running at http://localhost:${PORT}`);
});

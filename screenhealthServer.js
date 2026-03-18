// screenhealthServer.js
// ----------------------
// Backend for ScreenHealth using Node.js, Express, and MySQL
// Stores brightness, blue light filter, and preset values in a MySQL database

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // modern async MySQL driver

const app = express();
app.use(cors());            // allow frontend requests from other origins
app.use(express.json());    // parse JSON request bodies

// ----------------------
// MySQL connection pool
// ----------------------
// Replace with your own MySQL credentials
const pool = mysql.createPool({
  host: 'localhost',        // MySQL server host
  user: 'root',             // your MySQL username
  password: 'password',     // your MySQL password
  database: 'screenhealth'  // database name we created earlier
});

// ----------------------
// API Routes
// ----------------------

// GET current settings
// Returns brightness, blueLight, and preset from the database
app.get('/api/settings', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
  res.json(rows[0]);
});

// POST update brightness
// Accepts { value: number } in request body
app.post('/api/brightness', async (req, res) => {
  const { value } = req.body;
  await pool.query('UPDATE settings SET brightness = ? WHERE id = 1', [value]);
  res.json({ success: true, brightness: value });
});

// POST update blue light filter
// Accepts { value: number } in request body
app.post('/api/bluelight', async (req, res) => {
  const { value } = req.body;
  await pool.query('UPDATE settings SET blueLight = ? WHERE id = 1', [value]);
  res.json({ success: true, blueLight: value });
});

// POST apply preset
// Accepts { preset: "Standard" | "Reading" | "Night" } in request body
// Updates brightness and blueLight values based on preset logic
app.post('/api/preset', async (req, res) => {
  const { preset } = req.body;
  let brightness = 65;
  let blueLight = 40;

  if (preset === 'Reading') {
    brightness = 50;
    blueLight = 70;
  } else if (preset === 'Night') {
    brightness = 30;
    blueLight = 90;
  }

  await pool.query(
    'UPDATE settings SET brightness = ?, blueLight = ?, preset = ? WHERE id = 1',
    [brightness, blueLight, preset]
  );

  res.json({ success: true, settings: { brightness, blueLight, preset } });
});

// ----------------------
// Start server
// ----------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`ScreenHealth backend running on http://localhost:${PORT}`);
});

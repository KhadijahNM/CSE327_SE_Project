const express = require("express");
const cors = require("cors");

const db = require("./report_db");

const app = express();

app.use(cors());
app.use(express.json());

/* Test Route */
app.get("/", (req, res) => {
  res.send("Backend is working!");
});

/* Reports API */
app.get("/reports", (req, res) => {
  const sql = "SELECT * FROM reports ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

/* Start Server */
const PORT = 5001;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});  

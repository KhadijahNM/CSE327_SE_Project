// Import mysql2 package
const mysql = require("mysql2");

// Create database connection
const db = mysql.createConnection({

  host: process.env.DB_HOST || "localhost",   // Database host
  user: process.env.DB_USER || "root",        // MySQL username
  password: process.env.DB_PASSWORD || "",    // MySQL password
  database: process.env.DB_NAME || "optiguard_ai" // Your database name

});

// Connect to database
db.connect((err) => {

  if (err) {
    console.error("MySQL Connection Error:", err);
  } else {
    console.log("MySQL Connected Successfully");
  }

});

// Export connection
module.exports = db;

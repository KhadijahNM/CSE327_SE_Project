const mysql = require("mysql2");

class DatabasePoolSingleton {
  static #instance = null;

  static getInstance() {
    if (!DatabasePoolSingleton.#instance) {
      const pool = mysql.createPool({
        uri: "mysql://root:uhrZHmxuMqoCwvCfCfYAQMYWZTDllUkw@roundhouse.proxy.rlwy.net:14486/railway",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      DatabasePoolSingleton.#instance = pool.promise();
    }
    return DatabasePoolSingleton.#instance;
  }
}

module.exports = DatabasePoolSingleton.getInstance();

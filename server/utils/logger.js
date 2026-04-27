class LoggerSingleton {
  static #instance = null;

  static getInstance() {
    if (!LoggerSingleton.#instance) {
      LoggerSingleton.#instance = new LoggerSingleton();
    }
    return LoggerSingleton.#instance;
  }

  log(message, ...optionalParams) {
    console.log(`[INFO] ${new Date().toISOString()}:`, message, ...optionalParams);
  }

  error(message, ...optionalParams) {
    console.error(`[ERROR] ${new Date().toISOString()}:`, message, ...optionalParams);
  }
}

module.exports = LoggerSingleton.getInstance();

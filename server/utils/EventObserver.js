const EventEmitter = require('events');
const logger = require('./logger');

class EventObserver extends EventEmitter {
  constructor() {
    super();
    this.initListeners();
  }

  initListeners() {
    this.on('SCAN_COMPLETED', (data) => {
      logger.log(`[Observer] Scan completed for ${data.test} with risk score: ${data.risk_score}`);
    });

    this.on('SCAN_FAILED', (data) => {
      logger.error(`[Observer] Scan failed for ${data.test}: ${data.error}`);
    });
  }
}

// Export as Singleton instance
module.exports = new EventObserver();

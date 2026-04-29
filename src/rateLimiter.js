class RateLimiter {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
    this.queue = [];
  }

  async waitForSlot() {
    return new Promise((resolve) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest >= this.interval) {
        this.lastRequestTime = now;
        resolve();
      } else {
        const waitTime = this.interval - timeSinceLastRequest;
        setTimeout(() => {
          this.lastRequestTime = Date.now();
          resolve();
        }, waitTime);
      }
    });
  }

  async add(task) {
    await this.waitForSlot();
    return task();
  }

  getRate() {
    return this.requestsPerSecond;
  }

  setRate(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
  }
}

module.exports = RateLimiter;

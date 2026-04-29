class RateLimiter {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
    this.queue = [];
    this.isProcessing = false;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue[0];
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.interval) {
        const waitTime = this.interval - timeSinceLastRequest;
        await new Promise(_resolve => setTimeout(_resolve, waitTime));
      }

      this.lastRequestTime = Date.now();
      
      try {
        const result = await task();
        this.queue.shift();
        resolve(result);
      } catch (error) {
        this.queue.shift();
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  getRate() {
    return this.requestsPerSecond;
  }

  setRate(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
  }

  getQueueLength() {
    return this.queue.length;
  }

  getIsProcessing() {
    return this.isProcessing;
  }
}

module.exports = RateLimiter;

class ConcurrencyLimiter {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;
      
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }

  getRunningCount() {
    return this.running;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

module.exports = ConcurrencyLimiter;

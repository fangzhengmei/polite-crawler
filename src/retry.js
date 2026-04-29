const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 1;
  }

  async execute(task) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
          await delay(delayMs);
        }
      }
    }
    
    throw lastError;
  }

  setMaxRetries(maxRetries) {
    this.maxRetries = maxRetries;
  }

  setRetryDelay(retryDelay) {
    this.retryDelay = retryDelay;
  }

  setBackoffMultiplier(backoffMultiplier) {
    this.backoffMultiplier = backoffMultiplier;
  }
}

module.exports = RetryHandler;

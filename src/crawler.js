const axios = require('axios');
const ConcurrencyLimiter = require('./concurrency');
const RateLimiter = require('./rateLimiter');
const RetryHandler = require('./retry');
const PersistenceStore = require('./persistence');

class PoliteCrawler {
  constructor(options = {}) {
    this.concurrencyLimiter = new ConcurrencyLimiter(options.maxConcurrency || 5);
    this.rateLimiter = new RateLimiter(options.requestsPerSecond || 10);
    this.retryHandler = new RetryHandler({
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      backoffMultiplier: options.backoffMultiplier || 1
    });
    
    this.persistenceStore = options.persistenceStore || null;
    this.httpClient = options.httpClient || axios;
    
    this.onSuccess = options.onSuccess || null;
    this.onError = options.onError || null;
  }

  async fetchUrl(url) {
    if (this.persistenceStore && this.persistenceStore.has(url)) {
      if (this.onSuccess) {
        this.onSuccess(url, null, true);
      }
      return { url, cached: true };
    }

    const fetchTask = async () => {
      const response = await this.httpClient.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'PoliteCrawler/1.0'
        }
      });
      return {
        url,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    };

    try {
      const result = await this.retryHandler.execute(fetchTask);
      
      if (this.persistenceStore) {
        this.persistenceStore.add(url);
      }
      
      if (this.onSuccess) {
        this.onSuccess(url, result, false);
      }
      
      return result;
    } catch (error) {
      if (this.onError) {
        this.onError(url, error);
      }
      throw error;
    }
  }

  async crawl(urls) {
    const results = [];
    const errors = [];

    const taskPromises = urls.map(url => {
      return this.concurrencyLimiter.add(async () => {
        return this.rateLimiter.add(async () => {
          try {
            const result = await this.fetchUrl(url);
            results.push({ url, result, success: true });
            return result;
          } catch (error) {
            errors.push({ url, error, success: false });
            return { url, error, success: false };
          }
        });
      });
    });

    await Promise.allSettled(taskPromises);

    return {
      results,
      errors,
      total: urls.length,
      successful: results.length,
      failed: errors.length
    };
  }

  setConcurrency(maxConcurrency) {
    this.concurrencyLimiter = new ConcurrencyLimiter(maxConcurrency);
  }

  setRateLimit(requestsPerSecond) {
    this.rateLimiter.setRate(requestsPerSecond);
  }

  setRetryOptions(options) {
    if (options.maxRetries !== undefined) {
      this.retryHandler.setMaxRetries(options.maxRetries);
    }
    if (options.retryDelay !== undefined) {
      this.retryHandler.setRetryDelay(options.retryDelay);
    }
    if (options.backoffMultiplier !== undefined) {
      this.retryHandler.setBackoffMultiplier(options.backoffMultiplier);
    }
  }

  setPersistenceStore(storagePath) {
    this.persistenceStore = new PersistenceStore(storagePath);
  }

  getSuccessfulUrls() {
    return this.persistenceStore ? this.persistenceStore.getAll() : [];
  }
}

module.exports = PoliteCrawler;

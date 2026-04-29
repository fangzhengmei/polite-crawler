const PoliteCrawler = require('../src/crawler');
const ConcurrencyLimiter = require('../src/concurrency');
const RateLimiter = require('../src/rateLimiter');
const RetryHandler = require('../src/retry');
const PersistenceStore = require('../src/persistence');

// Mock all dependencies
jest.mock('../src/concurrency');
jest.mock('../src/rateLimiter');
jest.mock('../src/retry');
jest.mock('../src/persistence');

describe('PoliteCrawler', () => {
  beforeEach(() => {
    // Clear all mock calls and instances before each test
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const crawler = new PoliteCrawler();
      
      expect(ConcurrencyLimiter).toHaveBeenCalledWith(5);
      expect(RateLimiter).toHaveBeenCalledWith(10);
      expect(RetryHandler).toHaveBeenCalledWith({
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 1
      });
    });

    test('should initialize with custom options', () => {
      const options = {
        maxConcurrency: 10,
        requestsPerSecond: 5,
        maxRetries: 5,
        retryDelay: 2000,
        backoffMultiplier: 2
      };
      
      const crawler = new PoliteCrawler(options);
      
      expect(ConcurrencyLimiter).toHaveBeenCalledWith(10);
      expect(RateLimiter).toHaveBeenCalledWith(5);
      expect(RetryHandler).toHaveBeenCalledWith({
        maxRetries: 5,
        retryDelay: 2000,
        backoffMultiplier: 2
      });
    });
  });

  describe('fetchUrl', () => {
    test('should return cached result if URL already exists in persistence', async () => {
      const mockPersistenceStore = {
        has: jest.fn().mockReturnValue(true),
        add: jest.fn(),
        getAll: jest.fn().mockReturnValue(['https://example.com/page1'])
      };
      
      const crawler = new PoliteCrawler({
        persistenceStore: mockPersistenceStore
      });
      
      const result = await crawler.fetchUrl('https://example.com/page1');
      
      expect(mockPersistenceStore.has).toHaveBeenCalledWith('https://example.com/page1');
      expect(mockPersistenceStore.add).not.toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://example.com/page1', cached: true });
    });

    test('should fetch URL and add to persistence on success', async () => {
      const mockHttpClient = {
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: '<html>Test</html>',
          headers: { 'content-type': 'text/html' }
        })
      };
      
      const mockPersistenceStore = {
        has: jest.fn().mockReturnValue(false),
        add: jest.fn(),
        getAll: jest.fn().mockReturnValue([])
      };
      
      // Mock RetryHandler.execute to return the result directly
      RetryHandler.prototype.execute.mockImplementation(async (task) => {
        return await task();
      });
      
      const crawler = new PoliteCrawler({
        httpClient: mockHttpClient,
        persistenceStore: mockPersistenceStore
      });
      
      const result = await crawler.fetchUrl('https://example.com/page1');
      
      expect(mockPersistenceStore.has).toHaveBeenCalledWith('https://example.com/page1');
      expect(mockHttpClient.get).toHaveBeenCalledWith('https://example.com/page1', expect.anything());
      expect(mockPersistenceStore.add).toHaveBeenCalledWith('https://example.com/page1');
      expect(result).toEqual({
        url: 'https://example.com/page1',
        status: 200,
        data: '<html>Test</html>',
        headers: { 'content-type': 'text/html' }
      });
    });

    test('should throw error on fetch failure', async () => {
      const testError = new Error('Network error');
      
      const mockHttpClient = {
        get: jest.fn().mockRejectedValue(testError)
      };
      
      const mockPersistenceStore = {
        has: jest.fn().mockReturnValue(false),
        add: jest.fn(),
        getAll: jest.fn().mockReturnValue([])
      };
      
      // Mock RetryHandler.execute to throw the error
      RetryHandler.prototype.execute.mockRejectedValue(testError);
      
      const crawler = new PoliteCrawler({
        httpClient: mockHttpClient,
        persistenceStore: mockPersistenceStore
      });
      
      await expect(crawler.fetchUrl('https://example.com/page1')).rejects.toThrow('Network error');
      expect(mockPersistenceStore.add).not.toHaveBeenCalled();
    });
  });

  describe('crawl', () => {
    test('should crawl multiple URLs with success and failure', async () => {
      const mockHttpClient = {
        get: jest.fn((url) => {
          if (url === 'https://example.com/success') {
            return Promise.resolve({
              status: 200,
              data: 'Success',
              headers: {}
            });
          } else {
            return Promise.reject(new Error('Failed'));
          }
        })
      };
      
      // Mock RetryHandler.execute
      RetryHandler.prototype.execute.mockImplementation(async (task) => {
        return await task();
      });
      
      // Mock ConcurrencyLimiter.add to execute tasks directly
      ConcurrencyLimiter.prototype.add.mockImplementation(async (task) => {
        return await task();
      });
      
      // Mock RateLimiter.add to execute tasks directly
      RateLimiter.prototype.add.mockImplementation(async (task) => {
        return await task();
      });
      
      const crawler = new PoliteCrawler({
        httpClient: mockHttpClient
      });
      
      const urls = [
        'https://example.com/success',
        'https://example.com/failure'
      ];
      
      const result = await crawler.crawl(urls);
      
      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results.length).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('Configuration methods', () => {
    test('should allow setting concurrency dynamically', () => {
      const crawler = new PoliteCrawler({ maxConcurrency: 5 });
      
      crawler.setConcurrency(10);
      
      expect(ConcurrencyLimiter).toHaveBeenLastCalledWith(10);
    });

    test('should allow setting rate limit dynamically', () => {
      const crawler = new PoliteCrawler({ requestsPerSecond: 10 });
      
      crawler.setRateLimit(5);
      
      expect(RateLimiter.prototype.setRate).toHaveBeenCalledWith(5);
    });

    test('should allow setting retry options dynamically', () => {
      const crawler = new PoliteCrawler();
      
      crawler.setRetryOptions({
        maxRetries: 5,
        retryDelay: 2000,
        backoffMultiplier: 2
      });
      
      expect(RetryHandler.prototype.setMaxRetries).toHaveBeenCalledWith(5);
      expect(RetryHandler.prototype.setRetryDelay).toHaveBeenCalledWith(2000);
      expect(RetryHandler.prototype.setBackoffMultiplier).toHaveBeenCalledWith(2);
    });

    test('should allow setting persistence store dynamically', () => {
      const crawler = new PoliteCrawler();
      
      crawler.setPersistenceStore('/path/to/store.json');
      
      expect(PersistenceStore).toHaveBeenCalledWith('/path/to/store.json');
    });
  });
});

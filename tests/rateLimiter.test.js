const RateLimiter = require('../src/rateLimiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with correct rate', () => {
    const requestsPerSecond = 5;
    const limiter = new RateLimiter(requestsPerSecond);
    expect(limiter.getRate()).toBe(requestsPerSecond);
  });

  test('should allow changing rate dynamically', () => {
    const limiter = new RateLimiter(5);
    expect(limiter.getRate()).toBe(5);
    
    limiter.setRate(10);
    expect(limiter.getRate()).toBe(10);
  });

  test('should respect rate limit', async () => {
    const requestsPerSecond = 2;
    const limiter = new RateLimiter(requestsPerSecond);
    const interval = 1000 / requestsPerSecond;
    
    const executionTimes = [];
    
    const task = async () => {
      executionTimes.push(Date.now());
      return 'done';
    };
    
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 4; i++) {
      promises.push(limiter.add(task));
    }
    
    // Fast-forward time
    jest.advanceTimersByTime(interval * 3);
    
    await Promise.all(promises);
    
    // Check that tasks were executed with at least interval between them
    for (let i = 1; i < executionTimes.length; i++) {
      const timeBetween = executionTimes[i] - executionTimes[i-1];
      expect(timeBetween).toBeGreaterThanOrEqual(interval - 10); // Allow small margin
    }
  });

  test('should execute tasks immediately when rate limit allows', async () => {
    const limiter = new RateLimiter(100); // High rate
    const executionTimes = [];
    
    const task = async () => {
      executionTimes.push(Date.now());
      return 'done';
    };
    
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(limiter.add(task));
    }
    
    await Promise.all(promises);
    
    // All tasks should have executed almost immediately
    for (const time of executionTimes) {
      expect(time - startTime).toBeLessThan(100);
    }
  });

  test('should return task result correctly', async () => {
    const limiter = new RateLimiter(10);
    const expectedResult = 'test result';
    
    const task = async () => expectedResult;
    const result = await limiter.add(task);
    
    expect(result).toBe(expectedResult);
  });

  test('should propagate errors from tasks', async () => {
    const limiter = new RateLimiter(10);
    const errorMessage = 'Task failed';
    
    const failingTask = async () => {
      throw new Error(errorMessage);
    };
    
    await expect(limiter.add(failingTask)).rejects.toThrow(errorMessage);
  });
});

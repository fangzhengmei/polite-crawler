const RetryHandler = require('../src/retry');

describe('RetryHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should execute task successfully on first attempt', async () => {
    const handler = new RetryHandler({ maxRetries: 3, retryDelay: 100 });
    const expectedResult = 'success';
    let attemptCount = 0;
    
    const task = async () => {
      attemptCount++;
      return expectedResult;
    };
    
    const result = await handler.execute(task);
    
    expect(result).toBe(expectedResult);
    expect(attemptCount).toBe(1);
  });

  test('should retry failed task up to maxRetries times', async () => {
    const maxRetries = 3;
    const handler = new RetryHandler({ maxRetries, retryDelay: 100 });
    let attemptCount = 0;
    const errorMessage = 'Task failed';
    
    const task = async () => {
      attemptCount++;
      throw new Error(errorMessage);
    };
    
    const promise = handler.execute(task);
    
    // Fast-forward through all retries
    for (let i = 0; i < maxRetries; i++) {
      jest.advanceTimersByTime(100);
    }
    
    await expect(promise).rejects.toThrow(errorMessage);
    expect(attemptCount).toBe(maxRetries + 1); // First attempt + maxRetries
  });

  test('should succeed on retry when task starts succeeding', async () => {
    const maxRetries = 3;
    const handler = new RetryHandler({ maxRetries, retryDelay: 100 });
    let attemptCount = 0;
    const expectedResult = 'success';
    const failCount = 2; // Fail first 2 times, then succeed
    
    const task = async () => {
      attemptCount++;
      if (attemptCount <= failCount) {
        throw new Error('Task failed');
      }
      return expectedResult;
    };
    
    const promise = handler.execute(task);
    
    // Fast-forward through delays
    for (let i = 0; i < failCount; i++) {
      jest.advanceTimersByTime(100);
    }
    
    const result = await promise;
    
    expect(result).toBe(expectedResult);
    expect(attemptCount).toBe(failCount + 1);
  });

  test('should use exponential backoff when backoffMultiplier is set', async () => {
    const maxRetries = 3;
    const retryDelay = 100;
    const backoffMultiplier = 2;
    const handler = new RetryHandler({ maxRetries, retryDelay, backoffMultiplier });
    let attemptCount = 0;
    
    const task = async () => {
      attemptCount++;
      throw new Error('Task failed');
    };
    
    const promise = handler.execute(task);
    
    // First delay: 100ms * 2^0 = 100ms
    // Second delay: 100ms * 2^1 = 200ms
    // Third delay: 100ms * 2^2 = 400ms
    jest.advanceTimersByTime(100); // First retry
    jest.advanceTimersByTime(200); // Second retry
    jest.advanceTimersByTime(400); // Third retry
    
    await expect(promise).rejects.toThrow('Task failed');
    expect(attemptCount).toBe(maxRetries + 1);
  });

  test('should allow setting retry options dynamically', () => {
    const handler = new RetryHandler();
    
    expect(handler.maxRetries).toBe(3);
    expect(handler.retryDelay).toBe(1000);
    expect(handler.backoffMultiplier).toBe(1);
    
    handler.setMaxRetries(5);
    handler.setRetryDelay(500);
    handler.setBackoffMultiplier(2);
    
    expect(handler.maxRetries).toBe(5);
    expect(handler.retryDelay).toBe(500);
    expect(handler.backoffMultiplier).toBe(2);
  });
});

const RateLimiter = require('../src/rateLimiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct rate', () => {
      const requestsPerSecond = 5;
      const limiter = new RateLimiter(requestsPerSecond);
      expect(limiter.getRate()).toBe(requestsPerSecond);
      expect(limiter.getQueueLength()).toBe(0);
      expect(limiter.getIsProcessing()).toBe(false);
    });

    test('should allow changing rate dynamically', () => {
      const limiter = new RateLimiter(5);
      expect(limiter.getRate()).toBe(5);
      
      limiter.setRate(10);
      expect(limiter.getRate()).toBe(10);
    });

    test('should initialize with positive decimal rates', () => {
      const limiter = new RateLimiter(0.5); // 1 request every 2 seconds
      expect(limiter.getRate()).toBe(0.5);
    });
  });

  describe('Parameter validation', () => {
    describe('Constructor validation', () => {
      test('should throw TypeError for non-number types', () => {
        expect(() => new RateLimiter('5')).toThrow(TypeError);
        expect(() => new RateLimiter('5')).toThrow('必须是数字类型');
        
        expect(() => new RateLimiter(null)).toThrow(TypeError);
        expect(() => new RateLimiter(undefined)).toThrow(TypeError);
        expect(() => new RateLimiter(true)).toThrow(TypeError);
        expect(() => new RateLimiter({})).toThrow(TypeError);
        expect(() => new RateLimiter([])).toThrow(TypeError);
      });

      test('should throw RangeError for NaN', () => {
        expect(() => new RateLimiter(NaN)).toThrow(RangeError);
        expect(() => new RateLimiter(NaN)).toThrow('不能是 NaN');
      });

      test('should throw RangeError for Infinity', () => {
        expect(() => new RateLimiter(Infinity)).toThrow(RangeError);
        expect(() => new RateLimiter(-Infinity)).toThrow(RangeError);
        expect(() => new RateLimiter(Infinity)).toThrow('必须是有限数字');
      });

      test('should throw RangeError for zero', () => {
        expect(() => new RateLimiter(0)).toThrow(RangeError);
        expect(() => new RateLimiter(0)).toThrow('必须大于 0');
      });

      test('should throw RangeError for negative numbers', () => {
        expect(() => new RateLimiter(-1)).toThrow(RangeError);
        expect(() => new RateLimiter(-5)).toThrow(RangeError);
        expect(() => new RateLimiter(-0.5)).toThrow(RangeError);
        expect(() => new RateLimiter(-1)).toThrow('必须大于 0');
      });

      test('should not throw for valid positive numbers', () => {
        expect(() => new RateLimiter(1)).not.toThrow();
        expect(() => new RateLimiter(10)).not.toThrow();
        expect(() => new RateLimiter(100)).not.toThrow();
        expect(() => new RateLimiter(0.1)).not.toThrow();
        expect(() => new RateLimiter(0.5)).not.toThrow();
        expect(() => new RateLimiter(1.5)).not.toThrow();
      });
    });

    describe('setRate validation', () => {
      test('should throw TypeError for non-number types', () => {
        const limiter = new RateLimiter(5);
        
        expect(() => limiter.setRate('10')).toThrow(TypeError);
        expect(() => limiter.setRate(null)).toThrow(TypeError);
        expect(() => limiter.setRate(undefined)).toThrow(TypeError);
        expect(() => limiter.setRate(true)).toThrow(TypeError);
        expect(() => limiter.setRate({})).toThrow(TypeError);
        expect(() => limiter.setRate([])).toThrow(TypeError);
      });

      test('should throw RangeError for NaN', () => {
        const limiter = new RateLimiter(5);
        expect(() => limiter.setRate(NaN)).toThrow(RangeError);
      });

      test('should throw RangeError for Infinity', () => {
        const limiter = new RateLimiter(5);
        expect(() => limiter.setRate(Infinity)).toThrow(RangeError);
        expect(() => limiter.setRate(-Infinity)).toThrow(RangeError);
      });

      test('should throw RangeError for zero', () => {
        const limiter = new RateLimiter(5);
        expect(() => limiter.setRate(0)).toThrow(RangeError);
      });

      test('should throw RangeError for negative numbers', () => {
        const limiter = new RateLimiter(5);
        expect(() => limiter.setRate(-1)).toThrow(RangeError);
        expect(() => limiter.setRate(-5)).toThrow(RangeError);
        expect(() => limiter.setRate(-0.5)).toThrow(RangeError);
      });

      test('should not throw for valid positive numbers', () => {
        const limiter = new RateLimiter(5);
        
        expect(() => limiter.setRate(1)).not.toThrow();
        expect(() => limiter.setRate(10)).not.toThrow();
        expect(() => limiter.setRate(100)).not.toThrow();
        expect(() => limiter.setRate(0.1)).not.toThrow();
        expect(() => limiter.setRate(0.5)).not.toThrow();
        expect(() => limiter.setRate(1.5)).not.toThrow();
      });

      test('should maintain previous rate when setRate throws error', () => {
        const limiter = new RateLimiter(5);
        const originalRate = limiter.getRate();
        
        try {
          limiter.setRate(-1);
        } catch (e) {
          // Expected error
        }
        
        expect(limiter.getRate()).toBe(originalRate);
      });

      test('should update rate successfully after validation', () => {
        const limiter = new RateLimiter(5);
        
        limiter.setRate(10);
        expect(limiter.getRate()).toBe(10);
        
        limiter.setRate(2.5);
        expect(limiter.getRate()).toBe(2.5);
      });
    });

    describe('Error messages', () => {
      test('should include received type in TypeError message', () => {
        try {
          new RateLimiter('invalid');
        } catch (error) {
          expect(error.message).toContain('string');
        }
        
        try {
          new RateLimiter(null);
        } catch (error) {
          expect(error.message).toContain('object');
        }
      });

      test('should include received value in RangeError for non-positive numbers', () => {
        try {
          new RateLimiter(0);
        } catch (error) {
          expect(error.message).toContain('0');
        }
        
        try {
          new RateLimiter(-5);
        } catch (error) {
          expect(error.message).toContain('-5');
        }
      });
    });
  });

  describe('Basic functionality', () => {
    test('should execute tasks immediately when rate limit allows', async () => {
      const limiter = new RateLimiter(100); // High rate
      const executionTimes = [];
      
      const task = async () => {
        executionTimes.push(Date.now());
        return 'done';
      };
      
      // Execute one task
      const promise = limiter.add(task);
      
      // Since rate is high and no previous requests, should execute immediately
      jest.advanceTimersByTime(0);
      
      const result = await promise;
      
      expect(result).toBe('done');
      expect(executionTimes.length).toBe(1);
    });

    test('should return task result correctly', async () => {
      const limiter = new RateLimiter(10);
      const expectedResult = 'test result';
      
      const task = async () => expectedResult;
      
      const promise = limiter.add(task);
      jest.advanceTimersByTime(0);
      
      const result = await promise;
      
      expect(result).toBe(expectedResult);
    });

    test('should propagate errors from tasks', async () => {
      const limiter = new RateLimiter(10);
      const errorMessage = 'Task failed';
      
      const failingTask = async () => {
        throw new Error(errorMessage);
      };
      
      const promise = limiter.add(failingTask);
      jest.advanceTimersByTime(0);
      
      await expect(promise).rejects.toThrow(errorMessage);
    });
  });

  describe('Rate limiting behavior', () => {
    test('should respect rate limit with sequential tasks', async () => {
      const requestsPerSecond = 2;
      const limiter = new RateLimiter(requestsPerSecond);
      const interval = 1000 / requestsPerSecond;
      
      const executionTimes = [];
      
      const createTask = (id) => async () => {
        executionTimes.push({ id, time: Date.now() });
        return id;
      };
      
      // Add first task
      const promise1 = limiter.add(createTask(1));
      jest.advanceTimersByTime(0);
      expect(await promise1).toBe(1);
      expect(executionTimes.length).toBe(1);
      
      // Add second task - should wait for interval
      const promise2 = limiter.add(createTask(2));
      
      // Before advancing time, task should not have executed
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Advance by less than interval - task should still not execute
      jest.advanceTimersByTime(interval - 10);
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Advance by remaining time - task should execute
      jest.advanceTimersByTime(10);
      expect(await promise2).toBe(2);
      expect(executionTimes.length).toBe(2);
      
      // Check that tasks were executed with at least interval between them
      const timeBetween = executionTimes[1].time - executionTimes[0].time;
      expect(timeBetween).toBeGreaterThanOrEqual(interval - 10); // Allow small margin
    });
  });

  describe('Concurrent scenarios', () => {
    test('should handle concurrent requests correctly by queuing them', async () => {
      const requestsPerSecond = 2;
      const limiter = new RateLimiter(requestsPerSecond);
      const interval = 1000 / requestsPerSecond;
      
      const executionTimes = [];
      
      const createTask = (id) => async () => {
        executionTimes.push({ id, time: Date.now() });
        return id;
      };
      
      // Add multiple tasks concurrently
      const promise1 = limiter.add(createTask(1));
      const promise2 = limiter.add(createTask(2));
      const promise3 = limiter.add(createTask(3));
      
      // All tasks should be in queue
      expect(limiter.getQueueLength()).toBe(3);
      expect(limiter.getIsProcessing()).toBe(true);
      
      // First task should execute immediately
      jest.advanceTimersByTime(0);
      expect(await promise1).toBe(1);
      expect(executionTimes.length).toBe(1);
      expect(executionTimes[0].id).toBe(1);
      
      // Second task should wait for interval
      expect(limiter.getIsProcessing()).toBe(true);
      jest.advanceTimersByTime(interval);
      expect(await promise2).toBe(2);
      expect(executionTimes.length).toBe(2);
      expect(executionTimes[1].id).toBe(2);
      
      // Third task should wait another interval
      expect(limiter.getIsProcessing()).toBe(true);
      jest.advanceTimersByTime(interval);
      expect(await promise3).toBe(3);
      expect(executionTimes.length).toBe(3);
      expect(executionTimes[2].id).toBe(3);
      
      // All tasks completed
      expect(limiter.getIsProcessing()).toBe(false);
      expect(limiter.getQueueLength()).toBe(0);
      
      // Verify proper spacing between executions
      for (let i = 1; i < executionTimes.length; i++) {
        const timeBetween = executionTimes[i].time - executionTimes[i-1].time;
        expect(timeBetween).toBeGreaterThanOrEqual(interval - 10); // Allow small margin
      }
    });

    test('should not allow bypassing rate limit with concurrent requests', async () => {
      const requestsPerSecond = 1; // 1 request per second = 1000ms interval
      const limiter = new RateLimiter(requestsPerSecond);
      const interval = 1000;
      
      const executionTimes = [];
      
      const createTask = (id) => async () => {
        executionTimes.push({ id, time: Date.now() });
        return id;
      };
      
      // Simulate 5 concurrent requests
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(limiter.add(createTask(i)));
      }
      
      // All tasks should be in queue
      expect(limiter.getQueueLength()).toBe(5);
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Task 1 should execute immediately
      jest.advanceTimersByTime(0);
      
      // Tasks 2-5 should wait for their turn
      // Let's advance time in intervals
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(interval);
      }
      
      // Wait for all promises to resolve
      const results = await Promise.all(promises);
      
      // Verify all tasks executed in order
      expect(results).toEqual([1, 2, 3, 4, 5]);
      expect(executionTimes.length).toBe(5);
      
      // Verify tasks were executed in order
      for (let i = 0; i < 5; i++) {
        expect(executionTimes[i].id).toBe(i + 1);
      }
      
      // Verify proper spacing between executions
      for (let i = 1; i < executionTimes.length; i++) {
        const timeBetween = executionTimes[i].time - executionTimes[i-1].time;
        expect(timeBetween).toBeGreaterThanOrEqual(interval - 10); // Allow small margin
      }
    });

    test('should handle concurrent requests with mixed success and failure', async () => {
      const requestsPerSecond = 2;
      const limiter = new RateLimiter(requestsPerSecond);
      const interval = 1000 / requestsPerSecond;
      
      const results = [];
      
      const createSuccessTask = (id) => async () => {
        results.push({ id, status: 'success' });
        return `success-${id}`;
      };
      
      const createFailingTask = (id) => async () => {
        results.push({ id, status: 'failure' });
        throw new Error(`Error-${id}`);
      };
      
      // Add mixed tasks concurrently
      const promise1 = limiter.add(createSuccessTask(1));
      const promise2 = limiter.add(createFailingTask(2));
      const promise3 = limiter.add(createSuccessTask(3));
      
      // All tasks should be in queue
      expect(limiter.getQueueLength()).toBe(3);
      
      // Process all tasks
      jest.advanceTimersByTime(0); // Task 1
      jest.advanceTimersByTime(interval); // Task 2
      jest.advanceTimersByTime(interval); // Task 3
      
      // Check results
      expect(await promise1).toBe('success-1');
      await expect(promise2).rejects.toThrow('Error-2');
      expect(await promise3).toBe('success-3');
      
      // Verify all tasks executed in order
      expect(results.length).toBe(3);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[2].id).toBe(3);
      
      // Verify task 2 failed but task 3 still executed
      expect(results[1].status).toBe('failure');
      expect(results[2].status).toBe('success');
    });
  });

  describe('Queue management', () => {
    test('should track queue length correctly', async () => {
      const limiter = new RateLimiter(1);
      
      expect(limiter.getQueueLength()).toBe(0);
      
      // Add tasks
      const task1 = limiter.add(async () => 1);
      expect(limiter.getQueueLength()).toBe(1);
      
      const task2 = limiter.add(async () => 2);
      expect(limiter.getQueueLength()).toBe(2);
      
      const task3 = limiter.add(async () => 3);
      expect(limiter.getQueueLength()).toBe(3);
      
      // Process tasks
      jest.advanceTimersByTime(0);
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(1000);
      
      await Promise.all([task1, task2, task3]);
      
      // Queue should be empty
      expect(limiter.getQueueLength()).toBe(0);
    });

    test('should track isProcessing flag correctly', async () => {
      const limiter = new RateLimiter(1);
      
      expect(limiter.getIsProcessing()).toBe(false);
      
      // Add a task
      const task1 = limiter.add(async () => 1);
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Process first task
      jest.advanceTimersByTime(0);
      await task1;
      
      // Processing should be complete since queue is empty
      expect(limiter.getIsProcessing()).toBe(false);
      
      // Add more tasks
      const task2 = limiter.add(async () => 2);
      const task3 = limiter.add(async () => 3);
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Process task 2
      jest.advanceTimersByTime(0);
      await task2;
      
      // Should still be processing because task 3 is in queue
      expect(limiter.getIsProcessing()).toBe(true);
      
      // Process task 3
      jest.advanceTimersByTime(1000);
      await task3;
      
      // Now processing should be complete
      expect(limiter.getIsProcessing()).toBe(false);
    });
  });
});

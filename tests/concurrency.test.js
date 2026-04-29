const ConcurrencyLimiter = require('../src/concurrency');

describe('ConcurrencyLimiter', () => {
  test('should limit concurrent executions to maxConcurrency', async () => {
    const maxConcurrency = 2;
    const limiter = new ConcurrencyLimiter(maxConcurrency);
    const runningTasks = [];
    const results = [];
    
    const createTask = (id, delay) => {
      return async () => {
        runningTasks.push(id);
        expect(runningTasks.length).toBeLessThanOrEqual(maxConcurrency);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const index = runningTasks.indexOf(id);
        if (index > -1) {
          runningTasks.splice(index, 1);
        }
        
        results.push(id);
        return id;
      };
    };
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(limiter.add(createTask(i, 100)));
    }
    
    await Promise.all(promises);
    
    expect(results.length).toBe(5);
  });

  test('should execute tasks in order', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const results = [];
    
    const createTask = (id) => {
      return async () => {
        results.push(id);
        return id;
      };
    };
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(limiter.add(createTask(i)));
    }
    
    await Promise.all(promises);
    
    expect(results).toEqual([0, 1, 2, 3, 4]);
  });

  test('should return correct running count and queue length', async () => {
    const limiter = new ConcurrencyLimiter(2);
    
    expect(limiter.getRunningCount()).toBe(0);
    expect(limiter.getQueueLength()).toBe(0);
    
    const task1 = new Promise(resolve => {
      limiter.add(async () => {
        expect(limiter.getRunningCount()).toBe(1);
        resolve();
      });
    });
    
    await task1;
    
    expect(limiter.getRunningCount()).toBe(0);
    expect(limiter.getQueueLength()).toBe(0);
  });

  test('should handle task failures', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const errorMessage = 'Task failed';
    
    const failingTask = async () => {
      throw new Error(errorMessage);
    };
    
    await expect(limiter.add(failingTask)).rejects.toThrow(errorMessage);
    
    // After failure, should still be able to run other tasks
    const successTask = async () => 'success';
    const result = await limiter.add(successTask);
    expect(result).toBe('success');
  });
});

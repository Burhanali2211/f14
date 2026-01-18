type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ThrottledFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;
  let result: ReturnType<T> | undefined;

  const throttled = function (this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const remaining = wait - (now - lastCallTime);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCallTime = now;
      result = func.apply(this, args);
      lastArgs = null;
    } else if (!timeout) {
      lastArgs = args;
      timeout = setTimeout(() => {
        lastCallTime = Date.now();
        timeout = null;
        if (lastArgs) {
          result = func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }

    return result;
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
    lastCallTime = 0;
  };

  throttled.flush = function (this: any): ReturnType<T> | undefined {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      timeout = null;
      lastCallTime = Date.now();
      result = func.apply(this, lastArgs);
      lastArgs = null;
    }
    return result;
  };

  return throttled;
}

type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let result: ReturnType<T> | undefined;

  const debounced = function (this: any, ...args: Parameters<T>): void {
    lastArgs = args;

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate && lastArgs) {
        result = func.apply(this, lastArgs);
        lastArgs = null;
      }
    }, wait);

    if (callNow) {
      result = func.apply(this, args);
    }
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };

  debounced.flush = function (this: any): ReturnType<T> | undefined {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      if (lastArgs) {
        result = func.apply(this, lastArgs);
        lastArgs = null;
      }
    }
    return result;
  };

  return debounced;
}

interface BatchRequest<T, R> {
  key: string;
  data: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

interface BatchProcessorOptions<T, R> {
  maxBatchSize?: number;
  maxWaitTime?: number;
  processor: (items: T[]) => Promise<R[]>;
}

export class BatchProcessor<T, R> {
  private queue: BatchRequest<T, R>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private maxBatchSize: number;
  private maxWaitTime: number;
  private processor: (items: T[]) => Promise<R[]>;

  constructor(options: BatchProcessorOptions<T, R>) {
    this.maxBatchSize = options.maxBatchSize || 50;
    this.maxWaitTime = options.maxWaitTime || 50;
    this.processor = options.processor;
  }

  add(key: string, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, data, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.maxWaitTime);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    const items = batch.map((req) => req.data);

    try {
      const results = await this.processor(items);
      
      batch.forEach((req, index) => {
        if (results[index] !== undefined) {
          req.resolve(results[index]);
        } else {
          req.reject(new Error(`No result for batch item ${index}`));
        }
      });
    } catch (error) {
      batch.forEach((req) => {
        req.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }

    if (this.queue.length > 0) {
      this.timeout = setTimeout(() => this.flush(), this.maxWaitTime);
    }
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    this.queue.forEach((req) => {
      req.reject(new Error('Batch processor cleared'));
    });
    this.queue = [];
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const DEDUP_WINDOW = 100;

export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached && now - cached.timestamp < DEDUP_WINDOW) {
    return cached.promise;
  }

  const promise = requestFn().finally(() => {
    setTimeout(() => {
      requestCache.delete(key);
    }, DEDUP_WINDOW);
  });

  requestCache.set(key, { promise, timestamp: now });
  return promise;
}

export function clearRequestCache(): void {
  requestCache.clear();
}

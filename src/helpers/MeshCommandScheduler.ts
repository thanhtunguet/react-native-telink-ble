// Utility scheduler to coordinate mesh command execution with
// configurable concurrency and throttling. This helps prevent
// overwhelming the BLE mesh network while still allowing responsive
// command dispatching.

export interface MeshCommandSchedulerOptions {
  concurrency?: number;
  minIntervalMs?: number;
  maxQueueSize?: number;
  defaultTimeoutMs?: number;
}

export interface ScheduleOptions {
  priority?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface ScheduledTask<T> {
  execute: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  priority: number;
  enqueuedAt: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  abortListener?: () => void;
}

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_INTERVAL = 25;
const DEFAULT_TIMEOUT = 15000;

export class MeshCommandScheduler {
  private readonly concurrency: number;
  private readonly minIntervalMs: number;
  private readonly maxQueueSize: number;
  private readonly defaultTimeoutMs: number;

  private running = 0;
  private lastDispatch = 0;
  private readonly queue: Array<ScheduledTask<any>> = [];
  private readonly idleResolvers: Array<() => void> = [];

  constructor(options: MeshCommandSchedulerOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    this.minIntervalMs = Math.max(0, options.minIntervalMs ?? DEFAULT_INTERVAL);
    this.maxQueueSize = options.maxQueueSize ?? Number.POSITIVE_INFINITY;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT;
  }

  /**
   * Schedule a command for execution respecting concurrency, throttling and timeouts.
   */
  schedule<T>(
    operation: () => Promise<T>,
    options: ScheduleOptions = {}
  ): Promise<T> {
    if (
      this.queue.length >= this.maxQueueSize &&
      this.running >= this.concurrency
    ) {
      return Promise.reject(new Error('Mesh command scheduler queue is full'));
    }

    return new Promise<T>((resolve, reject) => {
      const task: ScheduledTask<T> = {
        execute: operation,
        resolve,
        reject,
        priority: options.priority ?? 0,
        enqueuedAt: Date.now(),
        timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
        signal: options.signal,
      };

      if (task.signal) {
        if (task.signal.aborted) {
          reject(new Error('Scheduled command aborted before execution'));
          return;
        }

        task.abortListener = () => {
          this.cancelTask(task);
          reject(new Error('Scheduled command aborted'));
        };
        task.signal.addEventListener('abort', task.abortListener, {
          once: true,
        });
      }

      this.queue.push(task);
      this.sortQueue();
      this.tryDispatch();
    });
  }

  /**
   * Wait until all pending commands have been processed.
   */
  async waitForIdle(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  /**
   * Remove all pending commands without executing them.
   */
  clearQueue(): void {
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      if (task.abortListener && task.signal) {
        task.signal.removeEventListener('abort', task.abortListener);
      }
      task.reject(new Error('Scheduled command cancelled'));
    }
  }

  private cancelTask(task: ScheduledTask<any>): void {
    const index = this.queue.indexOf(task);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  private tryDispatch(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        break;
      }
      if (next.signal?.aborted) {
        next.reject(new Error('Scheduled command aborted before execution'));
        continue;
      }

      this.running++;
      this.dispatchTask(next);
    }
  }

  private dispatchTask(task: ScheduledTask<any>): void {
    const now = Date.now();
    const elapsed = now - this.lastDispatch;
    const delay = Math.max(0, this.minIntervalMs - elapsed);

    const runTask = () => {
      this.lastDispatch = Date.now();

      let timeoutHandle: NodeJS.Timeout | undefined;
      let completed = false;

      const finalize = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (task.abortListener && task.signal) {
          task.signal.removeEventListener('abort', task.abortListener);
        }
        this.running = Math.max(0, this.running - 1);
        if (this.running === 0 && this.queue.length === 0) {
          while (this.idleResolvers.length) {
            const resolver = this.idleResolvers.shift();
            resolver?.();
          }
        }
        // Attempt to dispatch remaining tasks
        this.tryDispatch();
      };

      if (task.timeoutMs && task.timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          if (!completed) {
            completed = true;
            task.reject(
              new Error(`Mesh command timed out after ${task.timeoutMs}ms`)
            );
            finalize();
          }
        }, task.timeoutMs).unref?.();
      }

      Promise.resolve()
        .then(task.execute)
        .then((result) => {
          if (completed) {
            return;
          }
          completed = true;
          task.resolve(result);
          finalize();
        })
        .catch((error) => {
          if (completed) {
            return;
          }
          completed = true;
          task.reject(error);
          finalize();
        });
    };

    if (delay > 0) {
      setTimeout(runTask, delay).unref?.();
    } else {
      runTask();
    }
  }
}

export default MeshCommandScheduler;

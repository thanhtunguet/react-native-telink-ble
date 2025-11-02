import { ErrorRecoveryManager, TelinkError } from '../errors';
import { TelinkErrorCode } from '../types';
import { MeshCommandScheduler } from '../helpers/MeshCommandScheduler';

describe('MeshCommandScheduler', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits concurrency for scheduled commands', async () => {
    const scheduler = new MeshCommandScheduler({
      concurrency: 2,
      minIntervalMs: 0,
    });

    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 6 }).map((_, index) =>
      scheduler.schedule(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 5));
        concurrent--;
        return index;
      })
    );

    await Promise.all(tasks);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('honours minimum interval between commands', async () => {
    jest.useFakeTimers({ now: 0 });
    const scheduler = new MeshCommandScheduler({
      concurrency: 1,
      minIntervalMs: 50,
    });

    const timestamps: number[] = [];

    const tasks = Array.from({ length: 3 }).map(() =>
      scheduler.schedule(async () => {
        timestamps.push(Date.now());
      })
    );

    await jest.advanceTimersByTimeAsync(200);
    await scheduler.waitForIdle();
    await Promise.all(tasks);
    jest.useRealTimers();

    expect(timestamps).toHaveLength(3);
    const first = timestamps[0]!;
    const second = timestamps[1]!;
    const third = timestamps[2]!;
    expect(second - first).toBeGreaterThanOrEqual(50);
    expect(third - second).toBeGreaterThanOrEqual(50);
  });
});

describe('ErrorRecoveryManager', () => {
  it('retries operations with exponential backoff', async () => {
    const delays: number[] = [];
    const manager = new ErrorRecoveryManager({
      delayFn: async (ms) => {
        delays.push(ms);
      },
    });

    let attempts = 0;

    const result = await manager.withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      },
      {
        maxRetries: 2,
        baseDelayMs: 100,
        jitterMs: 0,
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 200]);
  });

  it('throws TelinkError when retries are exhausted', async () => {
    const manager = new ErrorRecoveryManager({
      delayFn: async () => {},
    });

    await expect(
      manager.withRetry(
        async () => {
          throw new Error('always fails');
        },
        1,
        10
      )
    ).rejects.toBeInstanceOf(TelinkError);
  });

  it('recovers network state using provided loader', async () => {
    const mockRuntime = {
      isBluetoothEnabled: jest.fn().mockResolvedValue(true),
      requestBluetoothPermission: jest.fn(),
      loadMeshNetwork: jest.fn().mockResolvedValue(undefined),
    };

    const manager = new ErrorRecoveryManager({
      telink: mockRuntime,
      loadNetworkState: async () => 'serialized_state',
      delayFn: async () => {},
    });

    await manager.recoverNetworkState();
    expect(mockRuntime.loadMeshNetwork).toHaveBeenCalledWith(
      'serialized_state'
    );
  });

  it('fails connection recovery when permission is denied', async () => {
    const mockRuntime = {
      isBluetoothEnabled: jest.fn().mockResolvedValue(false),
      requestBluetoothPermission: jest.fn().mockResolvedValue(false),
      loadMeshNetwork: jest.fn(),
    };

    const manager = new ErrorRecoveryManager({
      telink: mockRuntime,
      delayFn: async () => {},
    });

    await expect(manager.recoverConnection()).rejects.toMatchObject({
      code: TelinkErrorCode.BLUETOOTH_PERMISSION_DENIED,
    });
  });
});

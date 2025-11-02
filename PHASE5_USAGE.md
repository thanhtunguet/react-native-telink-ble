# Phase 5: Optimisation & Testing – Usage Guide

Phase 5 introduces performance-aware command scheduling, richer error handling, and foundational tests to make day-to-day development smoother. This guide explains how to take advantage of the new APIs.

## Table of Contents

1. [Command Scheduling & Throttling](#command-scheduling--throttling)
2. [Enhanced Device Control Options](#enhanced-device-control-options)
3. [Error Handling & Recovery Utilities](#error-handling--recovery-utilities)
4. [Testing Helpers](#testing-helpers)

---

## Command Scheduling & Throttling

Use `MeshCommandScheduler` to prevent flooding the mesh while still keeping UIs responsive. The scheduler supports configurable concurrency, throttling intervals, queue limits, and abort signals.

```typescript
import {
  DeviceController,
  MeshCommandScheduler,
  type MeshCommandSchedulerOptions,
} from 'react-native-telink-ble';

const schedulerOptions: MeshCommandSchedulerOptions = {
  concurrency: 4,     // run up to four commands at once
  minIntervalMs: 20,  // keep ~20 ms between dispatches
  maxQueueSize: 100,  // optional queue cap
};

const controller = new DeviceController({
  scheduler: new MeshCommandScheduler(schedulerOptions),
});

await controller.executeBatch(
  [
    { type: 'onoff', target: 0x0001, value: true },
    { type: 'level', target: 0x0002, value: 60 },
    { type: 'color', target: 0x0003, value: { hue: 210, saturation: 80, lightness: 55 } },
  ],
  120 // optional delay (ms) between batch items
);
```

`GroupManager` accepts the same options:

```typescript
import { GroupManager } from 'react-native-telink-ble';

const groups = new GroupManager({ scheduler: new MeshCommandScheduler({ concurrency: 2 }) });
await groups.controlGroup(0xc001, true, { transitionTime: 500, priority: 1 });
```

---

## Enhanced Device Control Options

`ControlOptions` gains new signal values:

- `retries`: maximum retry attempts (per command)
- `delay`: delay before the command executes (also used as retry backoff when provided)
- `timeout`: per-command timeout (ms)
- `priority`: queue priority (higher runs sooner)

```typescript
await controller.setDeviceState(
  [0x0001, 0x0002, 0x0003],
  true,
  {
    transitionTime: 300,
    retries: 2,
    delay: 150,
    priority: 2,
  }
);
```

---

## Error Handling & Recovery Utilities

Phase 5 introduces structured errors via `TelinkError` and recovery helpers inside `ErrorRecoveryManager`.

### Catching TelinkError

```typescript
import {
  TelinkError,
  TelinkErrorCode,
  ErrorRecoveryManager,
} from 'react-native-telink-ble';

const recovery = new ErrorRecoveryManager();
recovery.setNetworkStateLoader(async () => loadMeshStateFromStorage()); // implement your own persistence

try {
  await controller.setDeviceLevel(0x0001, 75, { retries: 1 });
} catch (error) {
  if (error instanceof TelinkError) {
    switch (error.code) {
      case TelinkErrorCode.CONNECTION_TIMEOUT:
        await recovery.recoverConnection();
        break;
      case TelinkErrorCode.NETWORK_NOT_INITIALIZED:
        await recovery.recoverNetworkState();
        break;
      default:
        console.warn('Mesh error:', error.message);
    }
  }
}
```

### Automated Retry

```typescript
await recovery.withRetry(
  () => controller.setDeviceState(0x0001, false, { timeout: 8000 }),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    jitterMs: 0,
  }
);
```

---

## Testing Helpers

The scheduler exposes `waitForIdle()` which is handy for deterministic tests:

```typescript
test('batch dispatch drains fully', async () => {
  const scheduler = new MeshCommandScheduler({ concurrency: 1, minIntervalMs: 10 });

  const started: number[] = [];
  const work = Array.from({ length: 3 }).map((_, index) =>
    scheduler.schedule(async () => {
      started.push(index);
    })
  );

  await scheduler.waitForIdle();
  await Promise.all(work);
  expect(started).toEqual([0, 1, 2]);
});
```

The accompanying Jest suite (`yarn test`) demonstrates practical techniques for unit testing retried operations and scheduler behaviour.

---

Phase 5 equips the library with performance-aware command dispatch, resilient recovery tools, and practical tests—laying the groundwork for production deployments and future optimisation work.

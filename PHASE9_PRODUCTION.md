# Phase 9: Production Readiness & Quality Assurance

## Overview
Phase 9 focuses on production readiness, including testing strategies, performance optimization, CI/CD setup, error tracking, and npm package publishing preparation.

---

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Performance Optimization](#performance-optimization)
3. [Error Tracking & Analytics](#error-tracking--analytics)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Production Deployment](#production-deployment)
6. [Package Publishing](#package-publishing)

---

## Testing Strategy

### 1. Unit Tests

#### Jest Configuration
```json
// jest.config.js
module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['<rootDir>/example/', '<rootDir>/lib/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types.ts',
    '!src/index.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### Hook Testing Examples
```typescript
// src/hooks/__tests__/useScanning.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useScanning } from '../useScanning';

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  NativeModules: {
    TelinkBle: {
      startScanning: jest.fn(),
      stopScanning: jest.fn(),
    },
  },
}));

describe('useScanning', () => {
  it('should start scanning', async () => {
    const { result } = renderHook(() => useScanning());

    await act(async () => {
      await result.current.startScanning();
    });

    expect(result.current.isScanning).toBe(true);
  });

  it('should stop scanning', async () => {
    const { result } = renderHook(() => useScanning());

    await act(async () => {
      await result.current.startScanning();
      await result.current.stopScanning();
    });

    expect(result.current.isScanning).toBe(false);
  });

  it('should auto-stop after duration', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useScanning({ autoStopAfter: 5000 })
    );

    await act(async () => {
      await result.current.startScanning();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    jest.useRealTimers();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Scanning failed');
    require('react-native').NativeModules.TelinkBle.startScanning.mockRejectedValueOnce(
      error
    );

    const { result } = renderHook(() => useScanning());

    await act(async () => {
      try {
        await result.current.startScanning();
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

#### Component Testing
```typescript
// src/context/__tests__/TelinkMeshContext.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { TelinkMeshProvider, useTelinkMeshContext } from '../TelinkMeshContext';

function TestComponent() {
  const { isInitialized, nodes } = useTelinkMeshContext();
  return <Text>{isInitialized ? 'Initialized' : 'Not Initialized'}</Text>;
}

describe('TelinkMeshProvider', () => {
  it('should provide context to children', () => {
    const { getByText } = render(
      <TelinkMeshProvider>
        <TestComponent />
      </TelinkMeshProvider>
    );

    expect(getByText('Not Initialized')).toBeTruthy();
  });

  it('should auto-initialize when configured', async () => {
    const config = {
      networkName: 'Test Network',
      networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
      appKey: '63964771734fbd76e3b40519d1d94a48',
      ivIndex: 0,
      sequenceNumber: 0,
    };

    const { getByText } = render(
      <TelinkMeshProvider autoInitialize initialConfig={config}>
        <TestComponent />
      </TelinkMeshProvider>
    );

    await waitFor(() => {
      expect(getByText('Initialized')).toBeTruthy();
    });
  });
});
```

### 2. Integration Tests

```typescript
// e2e/provisioning.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Device Provisioning Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should scan and provision a device', async () => {
    // Navigate to scan screen
    await element(by.text('Scan')).tap();

    // Start scanning
    await element(by.text('Start Scan')).tap();

    // Wait for device to be found
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Provision first device
    await element(by.id('provision-button-0')).tap();

    // Wait for provisioning to complete
    await waitFor(element(by.text('Device provisioned successfully!')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('should control provisioned device', async () => {
    // Navigate to devices screen
    await element(by.text('Devices')).tap();

    // Turn on first device
    await element(by.id('turn-on-button-0')).tap();

    // Verify state changed
    await detoxExpect(element(by.id('device-status-0'))).toHaveText('ON');
  });
});
```

### 3. Stress Testing

```typescript
// tests/stress/network-stress.test.ts
describe('Network Stress Tests', () => {
  it('should handle 100 devices', async () => {
    const devices = Array.from({ length: 100 }, (_, i) => ({
      address: 0x0001 + i,
      name: `Device ${i}`,
    }));

    // Provision all devices
    for (const device of devices) {
      await provisionDevice(device);
    }

    expect(nodes.length).toBe(100);
  });

  it('should handle rapid commands', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(turnOn(0x0001));
    }

    await Promise.all(promises);
  });

  it('should maintain performance with large groups', async () => {
    // Create group with 50 devices
    await createGroup(0xC001, 'Large Group');
    for (let i = 0; i < 50; i++) {
      await addDeviceToGroup(0x0001 + i, 0xC001);
    }

    const startTime = Date.now();
    await turnOnGroup(0xC001);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
```

---

## Performance Optimization

### 1. Memory Management

```typescript
// src/helpers/MemoryOptimizer.ts
export class MemoryOptimizer {
  private static readonly MAX_CACHE_SIZE = 100;
  private static cache = new Map<string, any>();

  static cacheWithLimit<T>(key: string, value: T): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static getFromCache<T>(key: string): T | undefined {
    return this.cache.get(key);
  }
}
```

### 2. Command Queuing

```typescript
// src/helpers/CommandQueue.ts
export class CommandQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 5;

  async enqueue<T>(command: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await command();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      await Promise.allSettled(batch.map((cmd) => cmd()));
    }

    this.processing = false;
  }
}
```

### 3. Native Module Optimization

```kotlin
// android/src/main/java/com/telinkble/TelinkBleModule.kt
class TelinkBleModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    // Connection pool for better performance
    private val connectionPool = mutableMapOf<Int, Connection>()
    private val commandQueue = LinkedBlockingQueue<Command>()
    private val workerThread = HandlerThread("TelinkBleWorker").apply { start() }

    @ReactMethod
    fun sendBatchCommands(commands: ReadableArray, promise: Promise) {
        workerThread.post {
            try {
                val results = mutableListOf<Any>()
                for (i in 0 until commands.size()) {
                    val cmd = commands.getMap(i)
                    val result = executeCommand(cmd)
                    results.add(result)
                }
                promise.resolve(Arguments.makeNativeArray(results))
            } catch (e: Exception) {
                promise.reject("BATCH_COMMAND_ERROR", e.message, e)
            }
        }
    }

    // Implement connection pooling
    private fun getOrCreateConnection(address: Int): Connection {
        return connectionPool.getOrPut(address) {
            createConnection(address)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        connectionPool.values.forEach { it.close() }
        connectionPool.clear()
        workerThread.quitSafely()
    }
}
```

---

## Error Tracking & Analytics

### 1. Sentry Integration

```typescript
// src/services/ErrorTracking.ts
import * as Sentry from '@sentry/react-native';

export function initializeErrorTracking() {
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    beforeSend(event) {
      // Filter sensitive data
      if (event.extra) {
        delete event.extra.networkKey;
        delete event.extra.appKey;
      }
      return event;
    },
  });
}

export function trackMeshError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    tags: {
      module: 'telink-ble',
    },
    extra: context,
  });
}

export function trackProvisioningEvent(
  device: DiscoveredDevice,
  success: boolean
) {
  Sentry.addBreadcrumb({
    category: 'provisioning',
    message: `Device ${device.address} - ${success ? 'success' : 'failed'}`,
    level: success ? 'info' : 'error',
    data: {
      deviceAddress: device.address,
      rssi: device.rssi,
    },
  });
}
```

### 2. Performance Monitoring

```typescript
// src/services/PerformanceMonitoring.ts
import * as Sentry from '@sentry/react-native';

export class PerformanceMonitor {
  static startTransaction(name: string) {
    return Sentry.startTransaction({
      name,
      op: 'mesh.operation',
    });
  }

  static async trackOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const transaction = this.startTransaction(name);
    const span = transaction.startChild({
      op: name,
    });

    try {
      const result = await operation();
      span.setStatus('ok');
      return result;
    } catch (error) {
      span.setStatus('unknown_error');
      throw error;
    } finally {
      span.finish();
      transaction.finish();
    }
  }
}

// Usage
await PerformanceMonitor.trackOperation(
  'provision-device',
  () => provisionDevice(device)
);
```

### 3. Analytics Integration

```typescript
// src/services/Analytics.ts
import analytics from '@react-native-firebase/analytics';

export class MeshAnalytics {
  static async trackDeviceProvisioned(device: MeshNode) {
    await analytics().logEvent('device_provisioned', {
      device_address: device.unicastAddress,
      device_type: device.compositionData?.productId,
    });
  }

  static async trackGroupCreated(group: MeshGroup) {
    await analytics().logEvent('group_created', {
      group_address: group.address,
      device_count: group.devices.length,
    });
  }

  static async trackNetworkHealth(report: NetworkHealthReport) {
    await analytics().logEvent('network_health_check', {
      total_nodes: report.totalNodes,
      active_nodes: report.activeNodes,
      health_status: report.overallHealth,
    });
  }
}
```

---

## CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run linter
        run: yarn lint

      - name: Run type check
        run: yarn typecheck

      - name: Run tests
        run: yarn test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests

  build-android:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Setup JDK
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Build Android
        run: |
          cd android
          ./gradlew assembleRelease

  build-ios:
    runs-on: macos-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: yarn install

      - name: Install pods
        run: cd example/ios && pod install

      - name: Build iOS
        run: |
          cd example/ios
          xcodebuild -workspace TelinkBleExample.xcworkspace \
            -scheme TelinkBleExample \
            -configuration Release \
            -sdk iphoneos

  publish:
    runs-on: ubuntu-latest
    needs: [build-android, build-ios]
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Build package
        run: yarn prepare

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2. Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "yarn test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## Production Deployment

### 1. Release Checklist

```markdown
## Pre-Release Checklist

- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No linting errors
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped in package.json
- [ ] Native code tested on real devices
- [ ] Performance benchmarks reviewed
- [ ] Security audit completed
- [ ] Example app tested
- [ ] Breaking changes documented
```

### 2. Versioning Strategy

```bash
# Use semantic versioning
# MAJOR.MINOR.PATCH

# Patch release (bug fixes)
npm version patch

# Minor release (new features, backward compatible)
npm version minor

# Major release (breaking changes)
npm version major

# Pre-release
npm version prerelease --preid=beta
```

### 3. Production Configuration

```typescript
// src/config/production.ts
export const ProductionConfig = {
  // Optimize for production
  enableLogging: false,
  enableAnalytics: true,
  enableCrashReporting: true,

  // Performance settings
  maxConcurrentCommands: 10,
  commandTimeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,

  // Memory management
  maxCacheSize: 100,
  cacheExpiration: 300000, // 5 minutes

  // Network settings
  healthCheckInterval: 60000, // 1 minute
  reconnectAttempts: 5,
  reconnectDelay: 2000,
};
```

---

## Package Publishing

### 1. Package.json Configuration

```json
{
  "name": "react-native-telink-ble",
  "version": "1.0.0",
  "description": "Comprehensive React Native library for Telink BLE Mesh networking",
  "main": "lib/commonjs/index.js",
  "module": "lib/module/index.js",
  "types": "lib/typescript/index.d.ts",
  "react-native": "src/index.tsx",
  "source": "src/index.tsx",
  "files": [
    "src",
    "lib",
    "android",
    "ios",
    "cpp",
    "react-native-telink-ble.podspec",
    "!lib/typescript/example",
    "!**/__tests__",
    "!**/__fixtures__",
    "!**/__mocks__"
  ],
  "scripts": {
    "prepare": "bob build",
    "release": "release-it"
  },
  "keywords": [
    "react-native",
    "telink",
    "ble",
    "bluetooth",
    "mesh",
    "iot",
    "smart-home"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/react-native-telink-ble.git"
  },
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/yourusername/react-native-telink-ble/issues"
  },
  "homepage": "https://github.com/yourusername/react-native-telink-ble#readme",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  },
  "devDependencies": {
    "@react-native-community/bob": "^0.18.0",
    "release-it": "^15.0.0"
  }
}
```

### 2. Release Script

```json
// .release-it.json
{
  "git": {
    "commitMessage": "chore: release ${version}",
    "tagName": "v${version}"
  },
  "npm": {
    "publish": true
  },
  "github": {
    "release": true
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  }
}
```

### 3. Documentation for NPM

```markdown
<!-- README.md -->
# React Native Telink BLE

Comprehensive React Native library for Telink BLE Mesh networking with full TypeScript support.

## Features

✅ Complete Telink BLE Mesh API coverage
✅ TypeScript support with full type definitions
✅ React Hooks for easy integration
✅ Context Provider for global state management
✅ Comprehensive error handling
✅ Performance optimized
✅ Production ready

## Installation

\`\`\`bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
\`\`\`

## Quick Start

\`\`\`tsx
import { TelinkMeshProvider, useScanning } from 'react-native-telink-ble';

function App() {
  return (
    <TelinkMeshProvider autoInitialize>
      <YourApp />
    </TelinkMeshProvider>
  );
}
\`\`\`

## Documentation

- [API Reference](https://github.com/yourusername/react-native-telink-ble/blob/main/docs/API.md)
- [Examples](https://github.com/yourusername/react-native-telink-ble/blob/main/PHASE8_EXAMPLES.md)
- [Troubleshooting](https://github.com/yourusername/react-native-telink-ble/blob/main/docs/TROUBLESHOOTING.md)

## License

MIT
```

---

## Monitoring & Maintenance

### 1. Health Checks

```typescript
// src/services/HealthCheck.ts
export class LibraryHealthCheck {
  static async performHealthCheck(): Promise<HealthCheckReport> {
    const checks = {
      bluetooth: await this.checkBluetooth(),
      permissions: await this.checkPermissions(),
      network: await this.checkNetworkState(),
      native: await this.checkNativeModule(),
    };

    return {
      healthy: Object.values(checks).every((c) => c.status === 'ok'),
      checks,
      timestamp: new Date(),
    };
  }

  private static async checkBluetooth() {
    // Check if Bluetooth is available and enabled
  }

  private static async checkPermissions() {
    // Check if all required permissions are granted
  }

  private static async checkNetworkState() {
    // Check if mesh network is initialized and healthy
  }

  private static async checkNativeModule() {
    // Verify native module is loaded correctly
  }
}
```

### 2. Automated Alerts

```typescript
// src/services/Alerting.ts
export class AlertingService {
  static async checkAndAlert() {
    const health = await LibraryHealthCheck.performHealthCheck();

    if (!health.healthy) {
      // Send alert to monitoring service
      await this.sendAlert({
        severity: 'error',
        message: 'Library health check failed',
        details: health.checks,
      });
    }
  }

  private static async sendAlert(alert: Alert) {
    // Send to monitoring service (e.g., PagerDuty, Slack)
  }
}
```

---

## Conclusion

Phase 9 ensures the library is production-ready with comprehensive testing, performance optimization, error tracking, and a solid CI/CD pipeline. Following these guidelines will result in a stable, performant, and maintainable library ready for npm publication and widespread adoption.

### Next Steps
1. Run full test suite
2. Perform security audit
3. Set up CI/CD pipeline
4. Configure error tracking
5. Publish to npm
6. Monitor production usage
7. Iterate based on feedback

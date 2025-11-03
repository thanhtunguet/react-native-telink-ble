# React Native Telink BLE

[![npm version](https://badge.fury.io/js/react-native-telink-ble.svg)](https://badge.fury.io/js/react-native-telink-ble)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-react--native-lightgrey)](https://reactnative.dev/)

A comprehensive React Native library for Telink BLE mesh networking, providing seamless integration with Telink's native libraries for building powerful IoT applications.

## Features

🚀 **Comprehensive Mesh Networking**
- Full SIG Mesh specification compliance
- Network initialization and management
- Device provisioning and configuration
- Group and scene management

📱 **Cross-Platform Support**
- Native Android support via TelinkBleMeshLib
- Native iOS support via TelinkSigMeshLib
- Unified JavaScript API

🔧 **Device Control**
- Generic On/Off, Level, and Color control
- Scene management and recall
- Vendor-specific commands
- Batch operations for efficiency

⚡ **Real-time Events**
- Device discovery and status updates
- Provisioning progress tracking
- Network health monitoring
- Message handling

🛡️ **Robust Error Handling**
- Comprehensive error codes
- Automatic retry mechanisms
- Connection recovery strategies
- Type-safe error handling

⚛️ **React Hooks & Context** (NEW)
- 8 specialized React Hooks for easy integration
- Global state management with TelinkMeshProvider
- TypeScript support with full type inference
- Event-driven real-time updates
- Production-ready hooks for all mesh operations

## Installation

```bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
```

### iOS Setup

Add the following to your `ios/Podfile`:

```ruby
pod 'react-native-telink-ble', :path => '../node_modules/react-native-telink-ble'
```

Run:
```bash
cd ios && pod install
```

### Android Setup

Add to your `android/app/build.gradle`:

```gradle
dependencies {
    implementation project(':react-native-telink-ble')
}
```

### Permissions

#### iOS (Info.plist)
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to communicate with mesh devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to communicate with mesh devices</string>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Quick Start

```typescript
import TelinkBle, { 
  MeshNetworkManager, 
  DeviceController, 
  ProvisioningWorkflow,
  MeshEventType 
} from 'react-native-telink-ble';

// Initialize mesh network
const networkManager = new MeshNetworkManager();
await networkManager.createNetwork({
  networkName: 'MyMeshNetwork',
  networkKey: 'your-network-key',
  appKey: 'your-app-key',
  ivIndex: 0,
  sequenceNumber: 0
});

// Start scanning for devices
await TelinkBle.startScanning();

// Listen for discovered devices
TelinkBle.addEventListener(MeshEventType.DEVICE_FOUND, (device) => {
  console.log('Found device:', device);
});

// Provision a device
const provisioning = new ProvisioningWorkflow();
const meshNode = await provisioning.provisionDevice(discoveredDevice);

// Control devices
const controller = new DeviceController();
await controller.setDeviceState(meshNode.unicastAddress, true); // Turn on
await controller.setDeviceLevel(meshNode.unicastAddress, 50);   // 50% brightness
```

## React Hooks Usage (Recommended)

For React applications, we recommend using the built-in hooks for easier integration:

```typescript
import React from 'react';
import {
  TelinkMeshProvider,
  useScanning,
  useDeviceControl,
  useGroups,
  useProvisioning,
  useNetworkHealth,
} from 'react-native-telink-ble';

// Wrap your app with the provider
function App() {
  return (
    <TelinkMeshProvider
      autoInitialize={true}
      initialConfig={{
        networkName: 'MyNetwork',
        networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
        appKey: '63964771734fbd76e3b40519d1d94a48',
        ivIndex: 0,
        sequenceNumber: 0,
      }}
      autoStartHealthMonitoring={true}
    >
      <DeviceController />
    </TelinkMeshProvider>
  );
}

// Use hooks in your components
function DeviceController() {
  // Device scanning
  const { isScanning, discoveredDevices, startScanning, stopScanning } = useScanning({
    filters: { rssiThreshold: -70 },
    autoStopAfter: 30000,
  });

  // Device control
  const { turnOn, turnOff, setLevel } = useDeviceControl();

  // Group management
  const { groups, createGroup, turnOnGroup } = useGroups({ autoLoad: true });

  // Provisioning
  const { provisionDevice, isProvisioning } = useProvisioning();

  // Network health
  const { healthReport } = useNetworkHealth({ autoStart: true });

  return (
    <View>
      <Button
        title={isScanning ? 'Stop Scan' : 'Start Scan'}
        onPress={isScanning ? stopScanning : startScanning}
      />
      <FlatList
        data={discoveredDevices}
        renderItem={({ item }) => (
          <DeviceItem
            device={item}
            onProvision={() => provisionDevice(item, {
              unicastAddress: 0x0001,
              networkKeyIndex: 0,
              flags: 0,
              ivIndex: 0,
            })}
          />
        )}
      />
    </View>
  );
}
```

### Available Hooks

1. **useScanning** - Device discovery and BLE scanning
2. **useDeviceControl** - Device on/off, level, and color control
3. **useGroups** - Group management and control
4. **useProvisioning** - Device provisioning workflows
5. **useFirmwareUpdate** - OTA firmware updates
6. **useNetworkHealth** - Network monitoring and diagnostics
7. **useVendorCommands** - Vendor-specific commands
8. **useTelinkMesh** - Core mesh network operations

See [API_REFERENCE.md](./API_REFERENCE.md) for complete hook documentation.

## API Reference

### Network Management

#### `MeshNetworkManager`

```typescript
class MeshNetworkManager {
  // Network lifecycle
  async createNetwork(config: MeshNetworkConfig): Promise<void>
  async loadNetwork(networkData: string): Promise<void>
  async saveNetwork(): Promise<string>
  
  // Key management
  async addApplicationKey(appKey: string, appKeyIndex: number): Promise<void>
  async rotateNetworkKey(newKey: string): Promise<void>
  
  // Group management
  async createGroup(groupAddress: number, name: string): Promise<MeshGroup>
  async manageGroupSubscriptions(nodeAddress: number, groups: number[], operation: 'add' | 'remove'): Promise<void>
}
```

### Device Discovery & Provisioning

#### Device Scanning

```typescript
// Start scanning with optional filters
await TelinkBle.startScanning({
  duration: 30000, // 30 seconds
  rssiThreshold: -80
});

// Stop scanning
await TelinkBle.stopScanning();

// Get discovered devices
const devices = await TelinkBle.getDiscoveredDevices();
```

#### Provisioning

```typescript
class ProvisioningWorkflow {
  // Standard provisioning
  async provisionDevice(device: DiscoveredDevice): Promise<MeshNode>
  
  // Fast provisioning for multiple devices
  async fastProvisionDevices(devices: DiscoveredDevice[]): Promise<MeshNode[]>
  
  // Remote provisioning through existing nodes
  async remoteProvisionDevice(targetDevice: DiscoveredDevice, proxyNode: MeshNode): Promise<MeshNode>
}
```

### Device Control

#### `DeviceController`

```typescript
class DeviceController {
  // Basic control
  async setDeviceState(target: number | number[], isOn: boolean, options?: ControlOptions): Promise<void>
  async setDeviceLevel(target: number | number[], level: number, options?: ControlOptions): Promise<void>
  
  // Color control
  async setDeviceColor(target: number | number[], color: ColorHSL, options?: ControlOptions): Promise<void>
  
  // Scene management
  async recallScene(sceneId: number, groupAddress?: number): Promise<void>
  async storeScene(sceneId: number, devices: SceneDevice[]): Promise<void>
  
  // Vendor commands
  async sendCustomCommand(target: number, vendorOpcode: number, data: Uint8Array, companyId: number): Promise<Uint8Array>
  
  // Batch operations
  async executeBatchCommands(commands: BatchCommand[]): Promise<BatchResult[]>
}
```

### Event Handling

```typescript
// Event types
enum MeshEventType {
  DEVICE_FOUND = 'deviceFound',
  PROVISIONING_PROGRESS = 'provisioningProgress',
  DEVICE_STATUS_CHANGED = 'deviceStatusChanged',
  MESSAGE_RECEIVED = 'messageReceived',
  NETWORK_CONNECTED = 'networkConnected',
  // ... more events
}

// Event listeners
TelinkBle.addEventListener(MeshEventType.DEVICE_FOUND, (device: DiscoveredDevice) => {
  // Handle device discovery
});

TelinkBle.addEventListener(MeshEventType.PROVISIONING_PROGRESS, (progress: ProvisioningProgress) => {
  console.log(`Provisioning: ${progress.step} - ${progress.progress}%`);
});

TelinkBle.addEventListener(MeshEventType.DEVICE_STATUS_CHANGED, (status: DeviceStatus) => {
  console.log(`Device ${status.nodeAddress} is ${status.isOnline ? 'online' : 'offline'}`);
});
```

## Type Definitions

### Core Interfaces

```typescript
interface MeshNetworkConfig {
  networkName: string;
  networkKey: string;
  appKey: string;
  ivIndex: number;
  sequenceNumber: number;
}

interface DiscoveredDevice {
  address: string;
  name?: string;
  rssi: number;
  advertisementData: {
    uuid?: string;
    deviceUuid?: string;
    meshMessage?: string;
  };
}

interface MeshNode {
  unicastAddress: number;
  deviceKey: string;
  uuid: string;
  name?: string;
  compositionData?: CompositionData;
  networkKeys: number[];
  appKeys: number[];
}

interface ControlOptions {
  transitionTime?: number;
  delay?: number;
  acknowledged?: boolean;
  retries?: number;
}

interface ColorHSL {
  hue: number;        // 0-360
  saturation: number; // 0-100
  lightness: number;  // 0-100
}
```

## Advanced Usage

### Group Control

```typescript
// Create a group
await networkManager.createGroup(0xC001, 'Living Room Lights');

// Add devices to group
await networkManager.manageGroupSubscriptions(0x0001, [0xC001], 'add');
await networkManager.manageGroupSubscriptions(0x0002, [0xC001], 'add');

// Control entire group
await controller.setDeviceState(0xC001, true); // Turn on all devices in group
```

### Scene Management

```typescript
// Store current state as scene
await controller.storeScene(1, [
  { address: 0x0001, level: 80, color: { hue: 120, saturation: 100, lightness: 50 } },
  { address: 0x0002, level: 60, color: { hue: 240, saturation: 80, lightness: 40 } }
]);

// Recall scene
await controller.recallScene(1);
```

### Batch Operations

```typescript
// Execute multiple commands efficiently
const commands = [
  { type: 'onoff', target: 0x0001, value: true },
  { type: 'level', target: 0x0002, value: 75 },
  { type: 'color', target: 0x0003, value: { hue: 180, saturation: 90, lightness: 60 } }
];

await controller.executeBatch(commands, 150);

// Customise scheduling if you need higher throughput
// (Requires importing MeshCommandScheduler from the package)
const tunedController = new DeviceController({
  scheduler: new MeshCommandScheduler({ concurrency: 4, minIntervalMs: 15 }),
});
```

### Network Health Monitoring

```typescript
// Monitor network health
const summary = await networkManager.generateSummaryReport();
console.log(`Network has ${summary.activeNodes}/${summary.totalNodes} active nodes`);
console.log(`Average latency: ${summary.averageLatency}ms`);
console.log(`Overall health: ${summary.overallHealth}`);
```

### Error Handling

```typescript
import { TelinkError, TelinkErrorCode, ErrorRecoveryManager } from 'react-native-telink-ble';

const recovery = new ErrorRecoveryManager();
recovery.setNetworkStateLoader(async () => {
  // Retrieve a previously persisted mesh state snapshot
  return await loadMeshStateFromStorage();
});

try {
  await controller.setDeviceState(0x0001, true);
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
        console.error('Mesh error:', error.message);
    }
  }
}

// Automatic retry with exponential backoff
await recovery.withRetry(() => controller.setDeviceState(0x0001, true), {
  maxRetries: 3,
  baseDelayMs: 1000,
  jitterMs: 0,
});
```

## Firmware Updates

```typescript
// Start firmware update
await TelinkBle.startFirmwareUpdate(nodeAddress, firmwareData);

// Monitor progress
TelinkBle.addEventListener('firmwareUpdateProgress', (progress) => {
  console.log(`Firmware update: ${progress.percentage}%`);
});

// Handle completion
TelinkBle.addEventListener('firmwareUpdateCompleted', (result) => {
  console.log('Firmware update completed:', result.success);
});
```

## Performance Considerations

### Connection Management
- The library automatically manages BLE connections
- Connection pooling is used for efficiency
- Automatic reconnection on connection loss

### Memory Usage
- Events are automatically cleaned up
- Large datasets are paginated
- Efficient binary data handling

### Battery Optimization
- Configurable scan intervals
- Optimized message queuing
- Background operation support

## Troubleshooting

### Common Issues

#### Bluetooth Permission Denied
```typescript
// Check permissions before starting
const hasPermission = await TelinkBle.checkBluetoothPermission();
if (!hasPermission) {
  await TelinkBle.requestBluetoothPermission();
}
```

#### Device Not Found
```typescript
// Increase scan duration or adjust RSSI threshold
await TelinkBle.startScanning({
  duration: 60000,
  rssiThreshold: -90
});
```

#### Provisioning Fails
```typescript
// Ensure device is in provisioning mode
// Check network key validity
// Verify unique unicast address
```

### Debug Mode

```typescript
// Enable debug logging
TelinkBle.setDebugMode(true);

// Listen for debug events
TelinkBle.addEventListener('debug', (message) => {
  console.log('TelinkBle Debug:', message);
});
```

## Examples

Complete example applications are available in the `/example` directory:

- **Basic Mesh App**: Simple on/off control
- **Advanced Controller**: Full feature demonstration
- **Smart Home Demo**: Real-world usage scenarios

### Advanced Documentation

📖 **[Complete Examples & Best Practices](./PHASE8_EXAMPLES.md)**
- Full-featured Smart Home application
- Advanced use cases and patterns
- Performance optimization techniques
- Troubleshooting guides

🚀 **[Production Readiness Guide](./PHASE9_PRODUCTION.md)**
- Testing strategies with 80%+ coverage
- CI/CD pipeline setup
- Error tracking and analytics
- Performance monitoring
- NPM package publishing

📚 **[API Reference](./API_REFERENCE.md)**
- Complete API documentation
- All hooks and classes
- Type definitions
- Platform-specific notes

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/thanhtunguet/react-native-telink-ble/wiki)
- 🐛 [Issue Tracker](https://github.com/thanhtunguet/react-native-telink-ble/issues)
- 💬 [Discussions](https://github.com/thanhtunguet/react-native-telink-ble/discussions)

## Acknowledgments

- Telink Semiconductor for the native mesh libraries
- React Native community for the excellent framework
- Contributors and maintainers

---

**Note**: This library requires React Native 0.60+ and supports both the new architecture (Fabric/TurboModules) and the legacy architecture.

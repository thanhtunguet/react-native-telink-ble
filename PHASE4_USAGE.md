# Phase 4: Advanced Features - Usage Guide

This document demonstrates how to use the Phase 4 advanced features implemented in the React Native Telink BLE library.

## Table of Contents

1. [Remote Provisioning](#remote-provisioning)
2. [Firmware Updates (OTA)](#firmware-updates-ota)
3. [Network Health Monitoring](#network-health-monitoring)
4. [Vendor-Specific Commands](#vendor-specific-commands)

---

## Remote Provisioning

Remote provisioning allows you to add new devices to the mesh network through existing nodes (proxy nodes), extending the range beyond direct Bluetooth connectivity.

### Basic Remote Provisioning

```typescript
import {
  RemoteProvisioningManager,
  Phase4EventType,
} from 'react-native-telink-ble';

// Create remote provisioning manager
const remoteProvisioner = new RemoteProvisioningManager({
  startAddress: 0x0010,
  networkKeyIndex: 0,
  ivIndex: 0,
  defaultProxyNodeAddress: 0x0001, // An existing provisioned node with proxy capability
});

// Remote provision a device
try {
  // Device must be discovered first (via standard scanning)
  const discoveredDevice = {
    address: 'AA:BB:CC:DD:EE:FF',
    name: 'TelinkMesh',
    rssi: -75,
    advertisementData: {
      uuid: '...',
    },
  };

  const meshNode = await remoteProvisioner.remoteProvisionDevice(
    discoveredDevice
  );
  console.log('Device provisioned remotely:', meshNode);
} catch (error) {
  console.error('Remote provisioning failed:', error);
}
```

### Remote Provisioning with Progress Tracking

```typescript
// Listen to remote provisioning events
const progressSub = remoteProvisioner.onRemoteProvisioningProgress(
  (progress) => {
    console.log(
      `Progress: ${progress.step} - ${progress.progress}% via proxy ${progress.proxyNodeAddress}`
    );
  }
);

const completedSub = remoteProvisioner.onRemoteProvisioningCompleted(
  (result) => {
    console.log(
      `Remote provisioning completed in ${result.provisioningTime}ms`
    );
    console.log(`New node address: ${result.nodeAddress}`);
  }
);

const failedSub = remoteProvisioner.onRemoteProvisioningFailed((event) => {
  console.error('Remote provisioning failed:', event.error);
});

// Don't forget to cleanup
// remoteProvisioner.removeEventListener(progressSub);
// remoteProvisioner.removeEventListener(completedSub);
// remoteProvisioner.removeEventListener(failedSub);
```

### Remote Provisioning with Retry

```typescript
// Automatically retry on failure
const meshNode = await remoteProvisioner.remoteProvisionDeviceWithRetry(
  discoveredDevice,
  0x0001, // Proxy node address
  3, // Max retries
  3000 // Delay between retries (ms)
);
```

### Batch Remote Provisioning

```typescript
// Remote provision multiple devices in batches
const devicesToProvision = [device1, device2, device3, device4, device5];

const provisionedNodes = await remoteProvisioner.remoteProvisionDevicesInBatches(
  devicesToProvision,
  0x0001, // Proxy node address
  3, // Batch size (provision 3 at a time)
  5000 // Delay between batches (ms)
);

console.log(`Successfully provisioned ${provisionedNodes.length} devices`);
```

### Using Multiple Proxy Nodes

```typescript
// Change proxy node dynamically
remoteProvisioner.setDefaultProxyNode(0x0002);

// Or specify per provision
const node1 = await remoteProvisioner.remoteProvisionDevice(device1, 0x0001);
const node2 = await remoteProvisioner.remoteProvisionDevice(device2, 0x0003);
```

---

## Firmware Updates (OTA)

Over-the-air firmware updates allow you to update device firmware remotely without physical access.

### Basic Firmware Update

```typescript
import {
  FirmwareUpdateManager,
  FirmwareInfo,
} from 'react-native-telink-ble';

// Create firmware update manager
const firmwareManager = new FirmwareUpdateManager();

// Prepare firmware info
const firmwareInfo: FirmwareInfo = {
  version: '2.0.0',
  companyId: 0x0211, // Telink company ID
  firmwareId: 0x0001,
  size: 65536, // 64KB
  checksum: 'abc123def456...',
  releaseDate: '2025-01-01',
  minimumRequiredVersion: '1.0.0',
};

// Base64 encoded firmware data or file path
const firmwareData = 'base64encodeddata...';

// Start firmware update
try {
  const result = await firmwareManager.updateFirmware(
    0x0001, // Node address
    firmwareData,
    firmwareInfo
  );

  console.log('Firmware update successful:');
  console.log(`Previous version: ${result.previousVersion}`);
  console.log(`New version: ${result.newVersion}`);
  console.log(`Duration: ${result.duration}ms`);
} catch (error) {
  console.error('Firmware update failed:', error);
}
```

### Firmware Update with Progress Tracking

```typescript
// Listen to update progress
const progressSub = firmwareManager.onUpdateProgress((progress) => {
  console.log(`Node ${progress.nodeAddress}:`);
  console.log(`Stage: ${progress.stage}`);
  console.log(`Progress: ${progress.percentage}%`);
  console.log(
    `Transferred: ${progress.bytesTransferred}/${progress.totalBytes} bytes`
  );
  console.log(`Speed: ${progress.transferRate} bytes/sec`);
  console.log(`ETA: ${progress.estimatedTimeRemaining} seconds`);
});

const completedSub = firmwareManager.onUpdateCompleted((result) => {
  if (result.success) {
    console.log(`✅ Update completed for node ${result.nodeAddress}`);
  }
});

const failedSub = firmwareManager.onUpdateFailed((event) => {
  console.error(`❌ Update failed for node ${event.nodeAddress}:`, event.error);
});
```

### Update with Options

```typescript
// Update with custom options
const result = await firmwareManager.updateFirmware(
  0x0001,
  firmwareData,
  firmwareInfo,
  {
    updatePolicy: 'verify-and-apply', // 'verify-only' | 'verify-and-apply' | 'force-apply'
    chunkSize: 512, // Bytes per transfer chunk
    transferMode: 'reliable', // 'reliable' | 'fast'
  }
);
```

### Firmware Update with Retry

```typescript
const result = await firmwareManager.updateFirmwareWithRetry(
  0x0001,
  firmwareData,
  firmwareInfo,
  2, // Max retries
  5000 // Delay between retries (ms)
);
```

### Update Multiple Devices

```typescript
const updates = [
  { nodeAddress: 0x0001, firmwareData: fw1Data, firmwareInfo: fw1Info },
  { nodeAddress: 0x0002, firmwareData: fw2Data, firmwareInfo: fw2Info },
  { nodeAddress: 0x0003, firmwareData: fw3Data, firmwareInfo: fw3Info },
];

const results = await firmwareManager.updateMultipleDevices(
  updates,
  10000 // Delay between device updates (ms)
);

// Check results
results.forEach((result) => {
  if (result.success) {
    console.log(`✅ Node ${result.nodeAddress} updated successfully`);
  } else {
    console.error(`❌ Node ${result.nodeAddress} failed: ${result.error}`);
  }
});
```

### Firmware Version Management

```typescript
// Get current firmware version
const currentVersion = await firmwareManager.getCurrentFirmwareVersion(0x0001);
console.log(`Current version: ${currentVersion}`);

// Check if update is needed
const needsUpdate = await firmwareManager.needsUpdate(0x0001, '2.0.0');
if (needsUpdate) {
  console.log('Device needs update');
}

// Verify firmware without applying
const isValid = await firmwareManager.verifyFirmwareOnly(0x0001, firmwareInfo);
if (isValid) {
  console.log('Firmware is valid and compatible');
}
```

### Cancel Firmware Update

```typescript
// Cancel ongoing update
await firmwareManager.cancelUpdate(0x0001);

// Check active updates
const activeUpdates = firmwareManager.getActiveUpdates();
console.log(`Active updates: ${activeUpdates.size}`);
```

---

## Network Health Monitoring

Monitor the health and performance of your mesh network in real-time.

### Start Network Monitoring

```typescript
import { NetworkHealthMonitor } from 'react-native-telink-ble';

const healthMonitor = new NetworkHealthMonitor();

// Start monitoring with custom config
await healthMonitor.startMonitoring({
  checkInterval: 30000, // Check every 30 seconds
  includeRssi: true,
  includeHops: true,
  includeLatency: true,
  nodeAddresses: [], // Empty array = monitor all nodes, or specify [0x0001, 0x0002, ...]
});

console.log('Network health monitoring started');
```

### Get Health Report

```typescript
// Get current health report
const report = await healthMonitor.getHealthReport();

console.log('Network Health Report:');
console.log(`Total Nodes: ${report.totalNodes}`);
console.log(`Active Nodes: ${report.activeNodes}`);
console.log(`Average RSSI: ${report.averageRssi} dBm`);
console.log(`Average Latency: ${report.averageLatency} ms`);
console.log(`Network Reliability: ${report.networkReliability}%`);

// Inspect individual nodes
report.nodes.forEach((node) => {
  console.log(`\nNode ${node.nodeAddress}:`);
  console.log(`  Online: ${node.isOnline}`);
  console.log(`  RSSI: ${node.rssi} dBm`);
  console.log(`  Latency: ${node.latency} ms`);
  console.log(`  Hop Count: ${node.hopCount}`);
  console.log(`  Packet Loss: ${node.packetLossRate}%`);
});
```

### Get Network Topology

```typescript
// Get mesh network topology
const topology = await healthMonitor.getTopology();

console.log('Network Topology:');
topology.nodes.forEach((node) => {
  console.log(`Node ${node.address}:`);
  console.log(`  Type: ${node.type}`);
  console.log(`  Relay: ${node.isRelay}`);
  console.log(`  Proxy: ${node.isProxy}`);
  console.log(`  Friend: ${node.isFriend}`);
  console.log(`  Low Power: ${node.isLowPower}`);
});

// Analyze connections
topology.connections.forEach((conn) => {
  console.log(
    `Connection: ${conn.fromAddress} → ${conn.toAddress} (RSSI: ${conn.rssi}, Quality: ${conn.quality}%)`
  );
});
```

### Advanced Network Analysis

```typescript
// Analyze network health with recommendations
const analysis = await healthMonitor.analyzeNetworkHealth();

console.log(`Overall Status: ${analysis.status}`); // 'excellent' | 'good' | 'fair' | 'poor'

console.log('\nMetrics:');
console.log(`  Reliability: ${analysis.metrics.reliability}%`);
console.log(`  Coverage: ${analysis.metrics.coverage}%`);
console.log(`  Performance: ${analysis.metrics.performance}%`);

if (analysis.issues.length > 0) {
  console.log('\nIssues Found:');
  analysis.issues.forEach((issue) => console.log(`  ⚠️ ${issue}`));
}

if (analysis.recommendations.length > 0) {
  console.log('\nRecommendations:');
  analysis.recommendations.forEach((rec) => console.log(`  💡 ${rec}`));
}
```

### Find Problematic Nodes

```typescript
const problems = await healthMonitor.findProblematicNodes();

console.log(`Offline Nodes: ${problems.offline.length}`);
problems.offline.forEach((node) => {
  console.log(`  Node ${node.nodeAddress} - Last seen: ${node.lastSeen}`);
});

console.log(`Weak Signal Nodes: ${problems.weakSignal.length}`);
problems.weakSignal.forEach((node) => {
  console.log(`  Node ${node.nodeAddress} - RSSI: ${node.rssi} dBm`);
});

console.log(`High Latency Nodes: ${problems.highLatency.length}`);
problems.highLatency.forEach((node) => {
  console.log(`  Node ${node.nodeAddress} - Latency: ${node.latency} ms`);
});

console.log(`Packet Loss Nodes: ${problems.packetLoss.length}`);
problems.packetLoss.forEach((node) => {
  console.log(
    `  Node ${node.nodeAddress} - Loss Rate: ${node.packetLossRate}%`
  );
});
```

### Generate Summary Report

```typescript
const summary = await healthMonitor.generateSummaryReport();

console.log('Network Summary:');
console.log(`  Overall Health: ${summary.overallHealth}`);
console.log(`  Active/Total: ${summary.activeNodes}/${summary.totalNodes}`);
console.log(`  Offline Nodes: ${summary.offlineNodes}`);
console.log(`  Average RSSI: ${summary.averageRssi} dBm`);
console.log(`  Average Latency: ${summary.averageLatency} ms`);
console.log(`  Reliability: ${summary.reliability}%`);
console.log(`  Critical Issues: ${summary.criticalIssues}`);
console.log(`  Warnings: ${summary.warnings}`);
```

### Real-time Health Updates

```typescript
// Listen to health updates
const healthSub = healthMonitor.onHealthUpdated((report) => {
  console.log('Health report updated:', report.timestamp);
  console.log(`Active nodes: ${report.activeNodes}/${report.totalNodes}`);
});

const nodeHealthSub = healthMonitor.onNodeHealthChanged((node) => {
  console.log(`Node ${node.nodeAddress} health changed:`);
  console.log(`  Online: ${node.isOnline}`);
  console.log(`  RSSI: ${node.rssi} dBm`);
});

const topologySub = healthMonitor.onTopologyChanged((topology) => {
  console.log('Network topology changed');
  console.log(`Nodes: ${topology.nodes.length}`);
  console.log(`Connections: ${topology.connections.length}`);
});

// Stop monitoring
await healthMonitor.stopMonitoring();
```

---

## Vendor-Specific Commands

Send custom vendor-specific commands to devices for proprietary functionality.

### Basic Vendor Command

```typescript
import { VendorCommandManager } from 'react-native-telink-ble';

const vendorManager = new VendorCommandManager();

// Register to receive messages from a vendor
await vendorManager.registerCompany(0x0211); // Telink company ID

// Send vendor command
const response = await vendorManager.sendCommand(
  0x0001, // Target node address
  0x0211, // Company ID
  0x0100, // Vendor opcode
  [0x01, 0x02, 0x03], // Command parameters
  {
    acknowledged: true,
    timeout: 5000,
  }
);

if (response) {
  console.log('Vendor command response:', response);
  console.log(`From: ${response.sourceAddress}`);
  console.log(`Data: ${response.data}`);
}
```

### Send Command with Response Promise

```typescript
try {
  const response = await vendorManager.sendCommandWithResponse(
    0x0001, // Target
    0x0211, // Company ID
    0x0100, // Opcode
    [0x01, 0x02], // Parameters
    5000 // Timeout
  );

  console.log('Response received:', response.data);
} catch (error) {
  console.error('Command failed or timed out:', error);
}
```

### Broadcast to Multiple Devices

```typescript
const targets = [0x0001, 0x0002, 0x0003, 0x0004];

const results = await vendorManager.broadcastCommand(
  targets,
  0x0211, // Company ID
  0x0100, // Opcode
  [0xFF], // Parameters
  200 // Delay between commands (ms)
);

// Check results
results.forEach((response, nodeAddress) => {
  if (response) {
    console.log(`Node ${nodeAddress}: Success`);
  } else {
    console.log(`Node ${nodeAddress}: Failed`);
  }
});
```

### Check Vendor Model Support

```typescript
// Get all vendor models supported by a device
const models = await vendorManager.getDeviceVendorModels(0x0001);

models.forEach((model) => {
  console.log(`Company: 0x${model.companyId.toString(16)}`);
  console.log(`Model: 0x${model.modelId.toString(16)}`);
  console.log(`Opcodes: ${model.supportedOpcodes.map((op) => `0x${op.toString(16)}`).join(', ')}`);
});

// Check if specific model is supported
const isSupported = await vendorManager.supportsVendorModel(
  0x0001, // Node address
  0x0211, // Company ID
  0x0001 // Model ID
);

console.log(`Vendor model supported: ${isSupported}`);
```

### Listen to Vendor Messages

```typescript
// Listen to all vendor messages
const allVendorSub = vendorManager.onVendorMessage((message) => {
  console.log(`Vendor message from ${message.sourceAddress}`);
  console.log(`Company: 0x${message.companyId.toString(16)}`);
  console.log(`Opcode: 0x${message.opcode.toString(16)}`);
  console.log(`Data: [${message.data.join(', ')}]`);
});

// Listen to messages from specific company
const telinkSub = vendorManager.onCompanyMessage(0x0211, (message) => {
  console.log(`Telink message from ${message.sourceAddress}`);
  console.log(`Opcode: 0x${message.opcode.toString(16)}`);
  console.log(`Data: [${message.data.join(', ')}]`);
});

// Cleanup
vendorManager.removeEventListener(allVendorSub);
vendorManager.removeEventListener(telinkSub);
```

### Using Vendor Command Helpers

```typescript
import { VendorCommandHelpers } from 'react-native-telink-ble';

const helpers = new VendorCommandHelpers(vendorManager);

// Reset device
await helpers.resetDevice(0x0001, 0x0211);

// Get device status
const status = await helpers.getDeviceStatus(0x0001, 0x0211);
console.log('Device status:', status);

// Set custom configuration
await helpers.setConfiguration(0x0001, 0x0211, [0x01, 0x02, 0x03, 0x04]);
```

### Cleanup

```typescript
// Unregister company
await vendorManager.unregisterCompany(0x0211);

// Clear cache
vendorManager.clearCache();

// Full cleanup (unregister all, clear cache, cancel pending commands)
await vendorManager.cleanup();
```

---

## Complete Phase 4 Example

Here's a complete example combining all Phase 4 features:

```typescript
import {
  RemoteProvisioningManager,
  FirmwareUpdateManager,
  NetworkHealthMonitor,
  VendorCommandManager,
} from 'react-native-telink-ble';

async function runPhase4Features() {
  // 1. Remote Provisioning
  const remoteProvisioner = new RemoteProvisioningManager({
    startAddress: 0x0010,
    defaultProxyNodeAddress: 0x0001,
  });

  const newDevice = {
    address: 'AA:BB:CC:DD:EE:FF',
    rssi: -70,
    advertisementData: { uuid: '...' },
  };

  const meshNode = await remoteProvisioner.remoteProvisionDevice(newDevice);
  console.log('✅ Remote provisioning successful');

  // 2. Start Network Monitoring
  const healthMonitor = new NetworkHealthMonitor();
  await healthMonitor.startMonitoring({ checkInterval: 30000 });

  healthMonitor.onHealthUpdated((report) => {
    console.log(`📊 Network health: ${report.activeNodes}/${report.totalNodes} nodes online`);
  });

  // 3. Check Network Health
  const analysis = await healthMonitor.analyzeNetworkHealth();
  console.log(`Network status: ${analysis.status}`);

  // 4. Update Firmware if Needed
  const firmwareManager = new FirmwareUpdateManager();
  const needsUpdate = await firmwareManager.needsUpdate(0x0001, '2.0.0');

  if (needsUpdate) {
    firmwareManager.onUpdateProgress((progress) => {
      console.log(`Firmware update: ${progress.percentage}%`);
    });

    await firmwareManager.updateFirmware(0x0001, firmwareData, firmwareInfo);
    console.log('✅ Firmware updated successfully');
  }

  // 5. Send Vendor Command
  const vendorManager = new VendorCommandManager();
  await vendorManager.registerCompany(0x0211);

  const response = await vendorManager.sendCommand(
    0x0001,
    0x0211,
    0x0100,
    [0x01]
  );
  console.log('✅ Vendor command sent');

  // Cleanup
  await healthMonitor.stopMonitoring();
  await vendorManager.cleanup();
}
```

---

## Next Steps

Phase 4 has completed all advanced features. The next phase will focus on:
- Phase 5: Optimization & Testing
  - Performance optimization
  - Comprehensive error handling improvements
  - Unit and integration testing
  - Documentation refinements

For more information, see:
- [Phase 2 Usage Guide](./PHASE2_USAGE.md) - Core provisioning
- [Phase 3 Usage Guide](./PHASE3_USAGE.md) - Device control
- [Main README](./README.md) - Complete API reference

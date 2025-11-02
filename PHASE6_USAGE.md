# Phase 6: Native Bridge Implementation – Usage Guide

This guide demonstrates how to use the Phase 6 native bridge features for advanced BLE mesh operations. The native implementations provide the foundation for the TypeScript wrapper classes from Phase 4.

---

## Table of Contents

1. [Remote Provisioning](#remote-provisioning)
2. [Firmware Updates (OTA)](#firmware-updates-ota)
3. [Network Health Monitoring](#network-health-monitoring)
4. [Vendor Commands](#vendor-commands)
5. [Event Handling](#event-handling)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Remote Provisioning

Remote provisioning allows you to add new devices to your mesh network through an existing provisioned node (proxy), eliminating the need for direct BLE connection.

### Basic Remote Provisioning

```typescript
import TelinkBle from 'react-native-telink-ble';

// Start remote provisioning through a proxy node
async function remoteProvisionDevice(
  device: DiscoveredDevice,
  proxyNodeAddress: number,
  newDeviceAddress: number
) {
  try {
    const config = {
      proxyNodeAddress,
      unicastAddress: newDeviceAddress,
      networkKeyIndex: 0,
    };

    const result = await TelinkBle.startRemoteProvisioning(device, config);

    console.log('Remote provisioning successful:', result);
    // result = {
    //   success: true,
    //   nodeAddress: 0x0003,
    //   deviceKey: "a1b2c3...",
    //   uuid: "d4e5f6...",
    //   proxyNodeAddress: 0x0002
    // }

    return result;
  } catch (error) {
    console.error('Remote provisioning failed:', error);
    throw error;
  }
}
```

### With Progress Tracking

```typescript
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.TelinkBle);

// Listen to remote provisioning events
eventEmitter.addListener('remoteProvisioningStarted', (event) => {
  console.log('Remote provisioning started:', event);
  // event = { deviceUuid, proxyNodeAddress, unicastAddress }
});

eventEmitter.addListener('remoteProvisioningProgress', (event) => {
  console.log(`Progress: ${event.progress}% - ${event.step}`);
  // Update UI with progress
});

eventEmitter.addListener('remoteProvisioningCompleted', (event) => {
  console.log('Remote provisioning completed:', event);
  // event = { deviceUuid, nodeAddress, proxyNodeAddress }
});

eventEmitter.addListener('remoteProvisioningFailed', (event) => {
  console.error('Remote provisioning failed:', event.error);
});

// Clean up
// Don't forget to remove listeners when component unmounts
```

### Cancel Remote Provisioning

```typescript
async function cancelRemoteProvisioning() {
  try {
    await TelinkBle.cancelRemoteProvisioning();
    console.log('Remote provisioning cancelled');
  } catch (error) {
    console.error('Failed to cancel:', error);
  }
}
```

---

## Firmware Updates (OTA)

Over-the-air firmware updates allow you to update device firmware remotely through the mesh network.

### Basic Firmware Update

```typescript
async function updateDeviceFirmware(
  nodeAddress: number,
  firmwareData: string // Hex string
) {
  try {
    const config = {
      nodeAddress,
      firmwareData,
      chunkSize: 128, // Optional, default 128 bytes
      metadata: {
        version: '2.0.0',
        buildDate: '2024-01-15',
      },
    };

    await TelinkBle.startFirmwareUpdate(config);
    console.log('Firmware update completed');
  } catch (error) {
    console.error('Firmware update failed:', error);
  }
}
```

### With Progress Tracking

```typescript
eventEmitter.addListener('firmwareUpdateStarted', (event) => {
  console.log('Firmware update started:', event);
  // event = { nodeAddress, firmwareSize }
});

eventEmitter.addListener('firmwareUpdateProgress', (event) => {
  const { nodeAddress, percentage, bytesTransferred, totalBytes, stage } = event;

  console.log(`Node ${nodeAddress}: ${percentage}% (${stage})`);
  console.log(`Transferred: ${bytesTransferred}/${totalBytes} bytes`);

  // Calculate transfer speed and ETA
  // Update progress bar UI
});

eventEmitter.addListener('firmwareUpdateCompleted', (event) => {
  console.log(`Firmware update completed for node ${event.nodeAddress}`);
});

eventEmitter.addListener('firmwareUpdateFailed', (event) => {
  console.error(`Update failed for node ${event.nodeAddress}:`, event.error);
});
```

### Query Firmware Version

```typescript
async function checkFirmwareVersion(nodeAddress: number) {
  try {
    const version = await TelinkBle.getFirmwareVersion(nodeAddress);
    console.log(`Current firmware version: ${version}`);
    return version;
  } catch (error) {
    console.error('Failed to get firmware version:', error);
  }
}
```

### Verify Firmware Before Update

```typescript
async function verifyFirmwareIntegrity(
  nodeAddress: number,
  firmwareData: string,
  expectedChecksum: string
) {
  try {
    const isValid = await TelinkBle.verifyFirmware(nodeAddress, {
      data: firmwareData,
      checksum: expectedChecksum,
    });

    if (isValid) {
      console.log('Firmware verification passed');
      // Proceed with update
    } else {
      console.error('Firmware verification failed');
      // Don't proceed
    }

    return isValid;
  } catch (error) {
    console.error('Verification error:', error);
  }
}
```

### Cancel Firmware Update

```typescript
async function cancelFirmwareUpdate(nodeAddress: number) {
  try {
    await TelinkBle.cancelFirmwareUpdate(nodeAddress);
    console.log('Firmware update cancelled');
  } catch (error) {
    console.error('Failed to cancel update:', error);
  }
}
```

---

## Network Health Monitoring

Monitor the health and performance of your mesh network in real-time.

### Start Network Health Monitoring

```typescript
async function startHealthMonitoring() {
  try {
    const config = {
      interval: 30000, // 30 seconds
      includeRSSI: true,
      includeLatency: true,
    };

    await TelinkBle.startNetworkHealthMonitoring(config);
    console.log('Health monitoring started');
  } catch (error) {
    console.error('Failed to start monitoring:', error);
  }
}

// Listen to health updates
eventEmitter.addListener('networkHealthUpdate', (event) => {
  const healthData = event.data;
  console.log('Network health update:', healthData);
  // Update dashboard UI
});
```

### Get Network Health Report

```typescript
async function getNetworkHealth() {
  try {
    const report = await TelinkBle.getNetworkHealthReport();

    console.log('Network Health Report:');
    console.log(`  Total nodes: ${report.totalNodes}`);
    console.log(`  Online: ${report.onlineNodes}`);
    console.log(`  Offline: ${report.offlineNodes}`);
    console.log(`  Average RSSI: ${report.averageRSSI} dBm`);
    console.log(`  Average latency: ${report.averageLatency} ms`);
    console.log(`  Packet loss: ${(report.packetLossRate * 100).toFixed(2)}%`);

    return report;
  } catch (error) {
    console.error('Failed to get health report:', error);
  }
}
```

### Get Individual Node Health

```typescript
async function getNodeHealth(nodeAddress: number) {
  try {
    const status = await TelinkBle.getNodeHealthStatus(nodeAddress);

    console.log(`Node ${nodeAddress} Health:`);
    console.log(`  Online: ${status.isOnline}`);
    console.log(`  RSSI: ${status.rssi} dBm`);
    console.log(`  Latency: ${status.latency} ms`);
    console.log(`  Failed messages: ${status.failedMessages}`);
    console.log(`  Successful messages: ${status.successfulMessages}`);
    console.log(`  Reliability: ${(status.reliability * 100).toFixed(2)}%`);

    return status;
  } catch (error) {
    console.error('Failed to get node health:', error);
  }
}
```

### Get Network Topology

```typescript
async function visualizeNetworkTopology() {
  try {
    const topology = await TelinkBle.getNetworkTopology();

    console.log('Network Topology:');
    topology.nodes.forEach((node) => {
      console.log(`\nNode ${node.address}:`);
      console.log(`  RSSI: ${node.rssi} dBm`);
      console.log(`  Hop count: ${node.hopCount}`);
      console.log(`  Neighbors: ${node.neighbors.join(', ')}`);
    });

    // Use this data to render network graph
    return topology;
  } catch (error) {
    console.error('Failed to get topology:', error);
  }
}
```

### Measure Node Latency

```typescript
async function pingNode(nodeAddress: number) {
  try {
    const latency = await TelinkBle.measureNodeLatency(nodeAddress);
    console.log(`Ping to node ${nodeAddress}: ${latency} ms`);
    return latency;
  } catch (error) {
    console.error('Failed to ping node:', error);
  }
}
```

### Stop Health Monitoring

```typescript
async function stopHealthMonitoring() {
  try {
    await TelinkBle.stopNetworkHealthMonitoring();
    console.log('Health monitoring stopped');
  } catch (error) {
    console.error('Failed to stop monitoring:', error);
  }
}
```

---

## Vendor Commands

Send and receive custom vendor-specific commands for proprietary device features.

### Send Vendor Command

```typescript
async function sendCustomCommand(
  nodeAddress: number,
  companyId: number,
  opcode: number,
  parameters: string // Hex string
) {
  try {
    const command = {
      opcode,
      companyId,
      parameters,
      acknowledged: true, // Wait for response
    };

    const response = await TelinkBle.sendVendorCommand(nodeAddress, command);

    if (response) {
      console.log('Vendor command response:', response);
      // response = { source, opcode, data, success }
      return response;
    }
  } catch (error) {
    console.error('Vendor command failed:', error);
  }
}
```

### Unacknowledged Vendor Command

```typescript
async function sendUnacknowledgedCommand(
  nodeAddress: number,
  companyId: number,
  opcode: number,
  parameters: string
) {
  try {
    const command = {
      opcode,
      companyId,
      parameters,
      acknowledged: false, // Don't wait for response
    };

    await TelinkBle.sendVendorCommand(nodeAddress, command);
    console.log('Command sent');
  } catch (error) {
    console.error('Failed to send command:', error);
  }
}
```

### Get Vendor Models

```typescript
async function discoverVendorModels(nodeAddress: number) {
  try {
    const vendorModels = await TelinkBle.getVendorModels(nodeAddress);

    console.log(`Vendor models on node ${nodeAddress}:`);
    vendorModels.forEach((model) => {
      console.log(`  Company: 0x${model.companyId.toString(16)}`);
      console.log(`  Model: 0x${model.modelId.toString(16)}`);
      console.log(`  Element: 0x${model.elementAddress.toString(16)}`);
      console.log('---');
    });

    return vendorModels;
  } catch (error) {
    console.error('Failed to get vendor models:', error);
  }
}
```

### Register Vendor Message Handler

```typescript
async function setupVendorMessageHandler(companyId: number) {
  try {
    // Register handler for this company's messages
    await TelinkBle.registerVendorMessageHandler(companyId);

    // Listen for incoming vendor messages
    eventEmitter.addListener('vendorMessageReceived', (event) => {
      if (event.companyId === companyId) {
        console.log('Vendor message received:', event);
        // event = { companyId, source, opcode, data }

        // Handle the message based on opcode
        handleVendorMessage(event);
      }
    });

    console.log(`Handler registered for company 0x${companyId.toString(16)}`);
  } catch (error) {
    console.error('Failed to register handler:', error);
  }
}

function handleVendorMessage(message: any) {
  switch (message.opcode) {
    case 0xC0:
      // Handle custom opcode 0xC0
      console.log('Handling opcode 0xC0:', message.data);
      break;
    case 0xC1:
      // Handle custom opcode 0xC1
      console.log('Handling opcode 0xC1:', message.data);
      break;
    default:
      console.log('Unknown opcode:', message.opcode);
  }
}
```

### Unregister Vendor Message Handler

```typescript
async function removeVendorMessageHandler(companyId: number) {
  try {
    await TelinkBle.unregisterVendorMessageHandler(companyId);
    console.log(`Handler unregistered for company 0x${companyId.toString(16)}`);
  } catch (error) {
    console.error('Failed to unregister handler:', error);
  }
}
```

---

## Event Handling

### Complete Event Listener Setup

```typescript
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useEffect } from 'react';

function usePhase6Events() {
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.TelinkBle);

    // Remote provisioning events
    const remoteProvisionStarted = eventEmitter.addListener(
      'remoteProvisioningStarted',
      (event) => console.log('Remote provision started:', event)
    );
    const remoteProvisionProgress = eventEmitter.addListener(
      'remoteProvisioningProgress',
      (event) => console.log('Remote provision progress:', event)
    );
    const remoteProvisionCompleted = eventEmitter.addListener(
      'remoteProvisioningCompleted',
      (event) => console.log('Remote provision completed:', event)
    );
    const remoteProvisionFailed = eventEmitter.addListener(
      'remoteProvisioningFailed',
      (event) => console.error('Remote provision failed:', event)
    );

    // Firmware update events
    const firmwareUpdateStarted = eventEmitter.addListener(
      'firmwareUpdateStarted',
      (event) => console.log('Firmware update started:', event)
    );
    const firmwareUpdateProgress = eventEmitter.addListener(
      'firmwareUpdateProgress',
      (event) => console.log('Firmware update progress:', event)
    );
    const firmwareUpdateCompleted = eventEmitter.addListener(
      'firmwareUpdateCompleted',
      (event) => console.log('Firmware update completed:', event)
    );
    const firmwareUpdateFailed = eventEmitter.addListener(
      'firmwareUpdateFailed',
      (event) => console.error('Firmware update failed:', event)
    );

    // Network health events
    const networkHealthUpdate = eventEmitter.addListener(
      'networkHealthUpdate',
      (event) => console.log('Network health update:', event)
    );

    // Vendor message events
    const vendorMessageReceived = eventEmitter.addListener(
      'vendorMessageReceived',
      (event) => console.log('Vendor message received:', event)
    );

    // Cleanup function
    return () => {
      remoteProvisionStarted.remove();
      remoteProvisionProgress.remove();
      remoteProvisionCompleted.remove();
      remoteProvisionFailed.remove();
      firmwareUpdateStarted.remove();
      firmwareUpdateProgress.remove();
      firmwareUpdateCompleted.remove();
      firmwareUpdateFailed.remove();
      networkHealthUpdate.remove();
      vendorMessageReceived.remove();
    };
  }, []);
}
```

---

## Error Handling

### Common Error Codes

```typescript
enum Phase6ErrorCode {
  // Remote provisioning
  REMOTE_PROVISIONING_ERROR = 'REMOTE_PROVISIONING_ERROR',

  // Firmware updates
  FIRMWARE_UPDATE_ERROR = 'FIRMWARE_UPDATE_ERROR',
  FIRMWARE_VERSION_ERROR = 'FIRMWARE_VERSION_ERROR',
  FIRMWARE_VERIFY_ERROR = 'FIRMWARE_VERIFY_ERROR',

  // Network health
  HEALTH_MONITORING_ERROR = 'HEALTH_MONITORING_ERROR',
  HEALTH_REPORT_ERROR = 'HEALTH_REPORT_ERROR',
  HEALTH_STATUS_ERROR = 'HEALTH_STATUS_ERROR',
  TOPOLOGY_ERROR = 'TOPOLOGY_ERROR',
  LATENCY_ERROR = 'LATENCY_ERROR',

  // Vendor commands
  VENDOR_COMMAND_ERROR = 'VENDOR_COMMAND_ERROR',
  VENDOR_MODELS_ERROR = 'VENDOR_MODELS_ERROR',
  VENDOR_HANDLER_ERROR = 'VENDOR_HANDLER_ERROR',
}
```

### Comprehensive Error Handling

```typescript
async function handlePhase6Operation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | null> {
  try {
    const result = await operation();
    console.log(`${operationName} succeeded:`, result);
    return result;
  } catch (error: any) {
    console.error(`${operationName} failed:`, error);

    // Handle specific error codes
    switch (error.code) {
      case Phase6ErrorCode.REMOTE_PROVISIONING_ERROR:
        console.error('Remote provisioning error:', error.message);
        // Maybe retry with different proxy node
        break;

      case Phase6ErrorCode.FIRMWARE_UPDATE_ERROR:
        console.error('Firmware update error:', error.message);
        // Maybe verify firmware integrity first
        break;

      case Phase6ErrorCode.HEALTH_MONITORING_ERROR:
        console.error('Health monitoring error:', error.message);
        // Maybe adjust monitoring interval
        break;

      case Phase6ErrorCode.VENDOR_COMMAND_ERROR:
        console.error('Vendor command error:', error.message);
        // Maybe device doesn't support this command
        break;

      default:
        console.error('Unknown error:', error);
    }

    return null;
  }
}

// Usage
const result = await handlePhase6Operation(
  () => TelinkBle.startRemoteProvisioning(device, config),
  'Remote Provisioning'
);
```

---

## Best Practices

### 1. Remote Provisioning

```typescript
// ✅ Good: Check proxy node health before remote provisioning
async function safeRemoteProvision(device: any, newAddress: number) {
  const proxyNodes = await findHealthyProxyNodes();

  for (const proxyNode of proxyNodes) {
    try {
      const result = await TelinkBle.startRemoteProvisioning(device, {
        proxyNodeAddress: proxyNode.address,
        unicastAddress: newAddress,
        networkKeyIndex: 0,
      });

      return result;
    } catch (error) {
      console.warn(`Proxy ${proxyNode.address} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All proxy nodes failed');
}

async function findHealthyProxyNodes() {
  const allNodes = await TelinkBle.getAllNodes();
  const healthyNodes = [];

  for (const node of allNodes) {
    const health = await TelinkBle.getNodeHealthStatus(node.unicastAddress);
    if (health.isOnline && health.reliability > 0.8) {
      healthyNodes.push(node);
    }
  }

  return healthyNodes;
}
```

### 2. Firmware Updates

```typescript
// ✅ Good: Verify firmware before updating
async function safeFirmwareUpdate(
  nodeAddress: number,
  firmwareData: string,
  expectedChecksum: string
) {
  // Step 1: Check current version
  const currentVersion = await TelinkBle.getFirmwareVersion(nodeAddress);
  console.log(`Current version: ${currentVersion}`);

  // Step 2: Verify firmware integrity
  const isValid = await TelinkBle.verifyFirmware(nodeAddress, {
    data: firmwareData,
    checksum: expectedChecksum,
  });

  if (!isValid) {
    throw new Error('Firmware verification failed');
  }

  // Step 3: Check node health
  const health = await TelinkBle.getNodeHealthStatus(nodeAddress);
  if (!health.isOnline || health.reliability < 0.7) {
    throw new Error('Node health insufficient for firmware update');
  }

  // Step 4: Perform update
  await TelinkBle.startFirmwareUpdate({
    nodeAddress,
    firmwareData,
    chunkSize: 128,
  });

  // Step 5: Verify new version
  const newVersion = await TelinkBle.getFirmwareVersion(nodeAddress);
  console.log(`New version: ${newVersion}`);
}
```

### 3. Network Health Monitoring

```typescript
// ✅ Good: Adaptive monitoring interval based on network size
async function startAdaptiveHealthMonitoring() {
  const allNodes = await TelinkBle.getAllNodes();
  const nodeCount = allNodes.length;

  // Adjust interval based on network size
  let interval: number;
  if (nodeCount < 10) {
    interval = 15000; // 15 seconds for small networks
  } else if (nodeCount < 50) {
    interval = 30000; // 30 seconds for medium networks
  } else {
    interval = 60000; // 60 seconds for large networks
  }

  await TelinkBle.startNetworkHealthMonitoring({
    interval,
    includeRSSI: true,
    includeLatency: true,
  });

  console.log(`Health monitoring started with ${interval}ms interval`);
}
```

### 4. Vendor Commands

```typescript
// ✅ Good: Check vendor model support before sending commands
async function sendSafeVendorCommand(
  nodeAddress: number,
  companyId: number,
  opcode: number,
  parameters: string
) {
  // Check if device supports this vendor model
  const vendorModels = await TelinkBle.getVendorModels(nodeAddress);
  const hasModel = vendorModels.some(
    (model) => model.companyId === companyId
  );

  if (!hasModel) {
    throw new Error(
      `Device does not support vendor model from company 0x${companyId.toString(16)}`
    );
  }

  // Send command
  const response = await TelinkBle.sendVendorCommand(nodeAddress, {
    opcode,
    companyId,
    parameters,
    acknowledged: true,
  });

  return response;
}
```

### 5. Resource Management

```typescript
// ✅ Good: Clean up resources properly
class Phase6Manager {
  private eventEmitter: NativeEventEmitter;
  private subscriptions: any[] = [];

  constructor() {
    this.eventEmitter = new NativeEventEmitter(NativeModules.TelinkBle);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const events = [
      'remoteProvisioningProgress',
      'firmwareUpdateProgress',
      'networkHealthUpdate',
      'vendorMessageReceived',
    ];

    events.forEach((eventName) => {
      const subscription = this.eventEmitter.addListener(
        eventName,
        this.handleEvent.bind(this)
      );
      this.subscriptions.push(subscription);
    });
  }

  private handleEvent(event: any) {
    // Handle events
  }

  async cleanup() {
    // Stop all ongoing operations
    try {
      await TelinkBle.stopNetworkHealthMonitoring();
      await TelinkBle.cancelRemoteProvisioning();
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Remove all event listeners
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
  }
}
```

---

## Complete Integration Example

```typescript
import React, { useEffect, useState } from 'react';
import TelinkBle from 'react-native-telink-ble';
import { NativeEventEmitter, NativeModules } from 'react-native';

function Phase6Dashboard() {
  const [healthReport, setHealthReport] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.TelinkBle);

    // Monitor network health
    const healthSub = eventEmitter.addListener('networkHealthUpdate', (event) => {
      setHealthReport(event.data);
    });

    // Monitor firmware updates
    const updateSub = eventEmitter.addListener('firmwareUpdateProgress', (event) => {
      setUpdateProgress(event.percentage);
    });

    // Start health monitoring
    TelinkBle.startNetworkHealthMonitoring({
      interval: 30000,
      includeRSSI: true,
      includeLatency: true,
    });

    return () => {
      healthSub.remove();
      updateSub.remove();
      TelinkBle.stopNetworkHealthMonitoring();
    };
  }, []);

  const performRemoteProvisioning = async (device: any) => {
    try {
      const result = await TelinkBle.startRemoteProvisioning(device, {
        proxyNodeAddress: 0x0001,
        unicastAddress: 0x0010,
        networkKeyIndex: 0,
      });
      console.log('Device provisioned:', result);
    } catch (error) {
      console.error('Provisioning failed:', error);
    }
  };

  const updateFirmware = async (nodeAddress: number, firmware: string) => {
    try {
      await TelinkBle.startFirmwareUpdate({
        nodeAddress,
        firmwareData: firmware,
        chunkSize: 128,
      });
      console.log('Firmware updated');
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <div>
      <h1>Phase 6 Dashboard</h1>

      {healthReport && (
        <div>
          <h2>Network Health</h2>
          <p>Online Nodes: {healthReport.onlineNodes}</p>
          <p>Avg RSSI: {healthReport.averageRSSI} dBm</p>
          <p>Avg Latency: {healthReport.averageLatency} ms</p>
        </div>
      )}

      {updateProgress > 0 && (
        <div>
          <h2>Firmware Update</h2>
          <progress value={updateProgress} max={100} />
          <p>{updateProgress}%</p>
        </div>
      )}
    </div>
  );
}

export default Phase6Dashboard;
```

---

## Troubleshooting

### Common Issues

**Issue**: Remote provisioning fails immediately
- **Solution**: Check proxy node is online and has sufficient reliability
- **Solution**: Verify network keys match between proxy and provisioner

**Issue**: Firmware update hangs at certain percentage
- **Solution**: Check network stability and node RSSI
- **Solution**: Try smaller chunk size (64 bytes instead of 128)
- **Solution**: Ensure node has sufficient power/battery

**Issue**: Health monitoring shows all nodes offline
- **Solution**: Verify mesh network is initialized
- **Solution**: Check Bluetooth is enabled and has permissions
- **Solution**: Ensure at least one proxy node is connected

**Issue**: Vendor commands not working
- **Solution**: Verify device supports the vendor model (use `getVendorModels`)
- **Solution**: Check company ID and opcode are correct
- **Solution**: Ensure command parameters are properly formatted

---

For more information, see:
- [PHASE6_COMPLETION.md](./PHASE6_COMPLETION.md) - Implementation details
- [PHASE4_USAGE.md](./PHASE4_USAGE.md) - High-level wrapper classes
- [README.md](./README.md) - General library documentation


# Phase 2: Core Provisioning - Usage Guide

This document demonstrates how to use the Phase 2 core provisioning features implemented in the React Native Telink BLE library.

## Features Implemented

- ✅ Enhanced standard provisioning workflow with detailed events
- ✅ Fast provisioning support for multiple devices
- ✅ Comprehensive error handling for provisioning
- ✅ Provisioning progress events
- ✅ High-level provisioning workflow helper class

## Installation

```bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
```

## Basic Usage

### 1. Standard Device Provisioning

```typescript
import telinkBle, { DiscoveredDevice, ProvisionConfig } from 'react-native-telink-ble';

async function provisionDevice(device: DiscoveredDevice) {
  try {
    // Configure provisioning parameters
    const config: ProvisionConfig = {
      unicastAddress: 1, // Unique address for this device
      networkKeyIndex: 0,
      flags: 0,
      ivIndex: 0,
      attentionDuration: 5, // Seconds to blink LED
    };

    // Start provisioning
    const result = await telinkBle.startProvisioning(device, config);

    if (result.success) {
      console.log('Device provisioned successfully!');
      console.log('Node Address:', result.nodeAddress);
      console.log('Device Key:', result.deviceKey);
      console.log('UUID:', result.uuid);
    }
  } catch (error) {
    console.error('Provisioning failed:', error);
  }
}
```

### 2. Fast Provisioning (Multiple Devices)

```typescript
import telinkBle from 'react-native-telink-ble';

async function fastProvisionDevices(devices: DiscoveredDevice[]) {
  try {
    const startAddress = 1; // Starting unicast address

    // Provision all devices at once
    const results = await telinkBle.startFastProvisioning(devices, startAddress);

    // Check results
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`Device ${index + 1} provisioned at address ${result.nodeAddress}`);
      } else {
        console.error(`Device ${index + 1} failed:`, result.error);
      }
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(`Successfully provisioned ${successCount}/${devices.length} devices`);
  } catch (error) {
    console.error('Fast provisioning failed:', error);
  }
}
```

### 3. Listening to Provisioning Events

```typescript
import telinkBle, { MeshEventType } from 'react-native-telink-ble';

// Listen for provisioning progress
const progressSubscription = telinkBle.addEventListener(
  MeshEventType.PROVISIONING_PROGRESS,
  (event) => {
    console.log(`Progress: ${event.progress}% - ${event.step}`);
    console.log(`Device UUID: ${event.deviceUuid}`);
  }
);

// Listen for provisioning completion
const completedSubscription = telinkBle.addEventListener(
  MeshEventType.PROVISIONING_COMPLETED,
  (event) => {
    console.log(`Device ${event.deviceUuid} provisioned at address ${event.nodeAddress}`);
  }
);

// Listen for provisioning failures
const failedSubscription = telinkBle.addEventListener(
  MeshEventType.PROVISIONING_FAILED,
  (event) => {
    console.error(`Device ${event.deviceUuid} failed: ${event.error}`);
  }
);

// Clean up listeners when done
telinkBle.removeEventListener(progressSubscription);
telinkBle.removeEventListener(completedSubscription);
telinkBle.removeEventListener(failedSubscription);
```

## Using the ProvisioningWorkflow Helper

The `ProvisioningWorkflow` class provides high-level methods for common provisioning scenarios:

### 1. Basic Workflow

```typescript
import { ProvisioningWorkflow } from 'react-native-telink-ble';

// Create workflow instance
const workflow = new ProvisioningWorkflow({
  startAddress: 1,
  networkKeyIndex: 0,
  ivIndex: 0,
});

// Provision a single device
async function provisionSingleDevice(device: DiscoveredDevice) {
  try {
    const node = await workflow.provisionDevice(device);
    console.log('Device provisioned:', node);
  } catch (error) {
    console.error('Provisioning failed:', error);
  }
}
```

### 2. Provision with Automatic Retry

```typescript
async function provisionWithRetry(device: DiscoveredDevice) {
  try {
    const node = await workflow.provisionDeviceWithRetry(
      device,
      3, // Max retries
      2000 // Retry delay in ms
    );
    console.log('Device provisioned after retries:', node);
  } catch (error) {
    console.error('All provisioning attempts failed:', error);
  }
}
```

### 3. Batch Provisioning

```typescript
async function provisionInBatches(devices: DiscoveredDevice[]) {
  try {
    const nodes = await workflow.provisionDevicesInBatches(
      devices,
      5, // Batch size
      3000 // Delay between batches (ms)
    );
    console.log(`Provisioned ${nodes.length} devices`);
  } catch (error) {
    console.error('Batch provisioning failed:', error);
  }
}
```

### 4. Provision and Configure

```typescript
async function provisionAndAddToGroup(device: DiscoveredDevice) {
  try {
    const groupAddress = 0xC000; // Group address
    const node = await workflow.provisionAndConfigure(device, groupAddress);
    console.log('Device provisioned and added to group:', node);
  } catch (error) {
    console.error('Provision and configure failed:', error);
  }
}
```

### 5. Workflow with Event Listeners

```typescript
// Set up event listeners
const progressSub = workflow.onProvisioningProgress((event) => {
  console.log(`${event.step}: ${event.progress}%`);
});

const completedSub = workflow.onProvisioningCompleted((event) => {
  console.log(`Device ${event.deviceUuid} completed at ${event.nodeAddress}`);
});

const failedSub = workflow.onProvisioningFailed((event) => {
  console.error(`Device ${event.deviceUuid} failed: ${event.error}`);
});

// Provision devices
await workflow.fastProvisionDevices(devices);

// Clean up
workflow.removeEventListener(progressSub);
workflow.removeEventListener(completedSub);
workflow.removeEventListener(failedSub);
```

## Complete Example: React Component

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, FlatList } from 'react-native';
import telinkBle, {
  ProvisioningWorkflow,
  DiscoveredDevice,
  MeshNode,
  MeshEventType,
} from 'react-native-telink-ble';

export default function ProvisioningScreen() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [provisionedNodes, setProvisionedNodes] = useState<MeshNode[]>([]);
  const [progress, setProgress] = useState<string>('');

  const workflow = new ProvisioningWorkflow({ startAddress: 1 });

  useEffect(() => {
    // Set up event listeners
    const progressSub = workflow.onProvisioningProgress((event) => {
      setProgress(`${event.step}: ${event.progress}%`);
    });

    const completedSub = workflow.onProvisioningCompleted((event) => {
      setProgress(`Device ${event.nodeAddress} provisioned successfully!`);
    });

    return () => {
      workflow.removeEventListener(progressSub);
      workflow.removeEventListener(completedSub);
    };
  }, []);

  const startScanning = async () => {
    try {
      await telinkBle.startScanning({ duration: 30000 });

      // Get discovered devices after scanning
      setTimeout(async () => {
        const discovered = await telinkBle.getDiscoveredDevices();
        setDevices(discovered);
      }, 30000);
    } catch (error) {
      console.error('Scanning failed:', error);
    }
  };

  const provisionAllDevices = async () => {
    try {
      setProgress('Starting batch provisioning...');
      const nodes = await workflow.provisionDevicesInBatches(devices, 5, 3000);
      setProvisionedNodes(nodes);
      setProgress(`Provisioned ${nodes.length} devices successfully!`);
    } catch (error) {
      setProgress(`Provisioning failed: ${error.message}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Telink BLE Provisioning
      </Text>

      <Button title="Start Scanning" onPress={startScanning} />

      {progress && (
        <Text style={{ marginVertical: 10, color: 'blue' }}>{progress}</Text>
      )}

      <Text style={{ marginTop: 20, fontWeight: 'bold' }}>
        Discovered Devices: {devices.length}
      </Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => (
          <Text>
            {item.name || 'Unknown'} - {item.address} (RSSI: {item.rssi})
          </Text>
        )}
      />

      {devices.length > 0 && (
        <Button title="Provision All Devices" onPress={provisionAllDevices} />
      )}

      <Text style={{ marginTop: 20, fontWeight: 'bold' }}>
        Provisioned Nodes: {provisionedNodes.length}
      </Text>

      <FlatList
        data={provisionedNodes}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <Text>
            Address: {item.unicastAddress} - UUID: {item.uuid}
          </Text>
        )}
      />
    </View>
  );
}
```

## Error Handling

All provisioning methods include comprehensive error handling:

```typescript
import telinkBle, { TelinkErrorCode } from 'react-native-telink-ble';

async function provisionWithErrorHandling(device: DiscoveredDevice) {
  try {
    const result = await telinkBle.startProvisioning(device, config);
  } catch (error: any) {
    if (error.details) {
      switch (error.details.code) {
        case TelinkErrorCode.BLUETOOTH_DISABLED:
          console.error('Please enable Bluetooth');
          break;
        case TelinkErrorCode.DEVICE_NOT_FOUND:
          console.error('Device not found or out of range');
          break;
        case TelinkErrorCode.PROVISIONING_FAILED:
          console.error('Provisioning failed, please retry');
          break;
        case TelinkErrorCode.CONNECTION_TIMEOUT:
          console.error('Connection timed out');
          break;
        default:
          console.error('Unknown error:', error.message);
      }
    }
  }
}
```

## Best Practices

1. **Address Management**: Keep track of used addresses to avoid conflicts
2. **Batch Size**: Use batch provisioning (5-10 devices per batch) for better reliability
3. **Event Listeners**: Always clean up event listeners to prevent memory leaks
4. **Error Handling**: Implement retry logic for transient failures
5. **Progress Feedback**: Use progress events to show status to users
6. **Network State**: Check Bluetooth status before provisioning
7. **Timeout Handling**: Set reasonable timeouts for provisioning operations

## Next Steps

Phase 2 has completed the core provisioning functionality. The next phases will add:
- Phase 3: Device Control (Generic On/Off, Level, Color control)
- Phase 4: Advanced Features (Remote provisioning, Firmware updates)
- Phase 5: Optimization & Testing

## Support

For issues or questions, please visit:
https://github.com/thanhtunguet/react-native-telink-ble/issues

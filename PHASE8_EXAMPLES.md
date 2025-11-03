# Phase 8: Example Application & Advanced Documentation

## Overview
Phase 8 provides comprehensive examples and documentation for using the React Native Telink BLE library in real-world applications.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Complete Example Application](#complete-example-application)
3. [Hook Usage Examples](#hook-usage-examples)
4. [Advanced Use Cases](#advanced-use-cases)
5. [Best Practices](#best-practices)
6. [Performance Optimization](#performance-optimization)

---

## Getting Started

### Installation
```bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
```

### Basic Setup
```tsx
import React from 'react';
import { TelinkMeshProvider } from 'react-native-telink-ble';

const networkConfig = {
  networkName: 'My Mesh Network',
  networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
  appKey: '63964771734fbd76e3b40519d1d94a48',
  ivIndex: 0,
  sequenceNumber: 0,
};

export default function App() {
  return (
    <TelinkMeshProvider
      autoInitialize={true}
      initialConfig={networkConfig}
      autoStartHealthMonitoring={true}
    >
      <YourApp />
    </TelinkMeshProvider>
  );
}
```

---

## Complete Example Application

### Full-Featured Smart Home Controller

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  Switch,
  Slider,
} from 'react-native';
import {
  TelinkMeshProvider,
  useTelinkMeshContext,
  useScanning,
  useProvisioning,
  useDeviceControl,
  useGroups,
  useNetworkHealth,
} from 'react-native-telink-ble';

// Main App Component
function SmartHomeApp() {
  return (
    <TelinkMeshProvider
      autoInitialize={true}
      initialConfig={{
        networkName: 'Smart Home',
        networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
        appKey: '63964771734fbd76e3b40519d1d94a48',
        ivIndex: 0,
        sequenceNumber: 0,
      }}
      autoStartHealthMonitoring={true}
    >
      <HomeScreen />
    </TelinkMeshProvider>
  );
}

// Home Screen with Navigation
function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'devices' | 'groups' | 'scan'>('devices');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Button title="Devices" onPress={() => setActiveTab('devices')} />
        <Button title="Groups" onPress={() => setActiveTab('groups')} />
        <Button title="Scan" onPress={() => setActiveTab('scan')} />
      </View>

      {activeTab === 'devices' && <DeviceListScreen />}
      {activeTab === 'groups' && <GroupManagementScreen />}
      {activeTab === 'scan' && <DeviceScanningScreen />}

      <NetworkHealthIndicator />
    </View>
  );
}

// Device List Screen
function DeviceListScreen() {
  const { nodes } = useTelinkMeshContext();
  const { turnOn, turnOff, setLevel } = useDeviceControl();
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Connected Devices</Text>
      <FlatList
        data={nodes}
        keyExtractor={(item) => item.unicastAddress.toString()}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            isSelected={selectedDevice === item.unicastAddress}
            onSelect={() => setSelectedDevice(item.unicastAddress)}
            onTurnOn={() => turnOn(item.unicastAddress, 1000)}
            onTurnOff={() => turnOff(item.unicastAddress, 1000)}
            onLevelChange={(level) => setLevel(item.unicastAddress, level, 500)}
          />
        )}
      />
    </View>
  );
}

// Device Card Component
interface DeviceCardProps {
  device: any;
  isSelected: boolean;
  onSelect: () => void;
  onTurnOn: () => void;
  onTurnOff: () => void;
  onLevelChange: (level: number) => void;
}

function DeviceCard({
  device,
  isSelected,
  onSelect,
  onTurnOn,
  onTurnOff,
  onLevelChange,
}: DeviceCardProps) {
  const [level, setLevel] = useState(50);

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      <Text style={styles.deviceName}>
        {device.name || `Device ${device.unicastAddress.toString(16)}`}
      </Text>
      <Text style={styles.deviceAddress}>
        Address: 0x{device.unicastAddress.toString(16).toUpperCase()}
      </Text>

      <View style={styles.controls}>
        <Button title="ON" onPress={onTurnOn} />
        <Button title="OFF" onPress={onTurnOff} />
      </View>

      <View style={styles.sliderContainer}>
        <Text>Brightness: {level}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={level}
          onValueChange={setLevel}
          onSlidingComplete={(value) => onLevelChange(value)}
        />
      </View>
    </View>
  );
}

// Device Scanning Screen
function DeviceScanningScreen() {
  const {
    isScanning,
    discoveredDevices,
    startScanning,
    stopScanning,
    sortDevicesByRSSI,
  } = useScanning({
    filters: { rssiThreshold: -70 },
    clearOnStart: true,
    autoStopAfter: 30000,
  });

  const {
    provisionDevice,
    isProvisioning,
    provisioningProgress,
  } = useProvisioning();

  const handleProvision = async (device: any) => {
    try {
      await provisionDevice(device, {
        unicastAddress: 0x0001, // Should be dynamically allocated
        networkKeyIndex: 0,
        flags: 0,
        ivIndex: 0,
      });
      alert('Device provisioned successfully!');
    } catch (error) {
      alert(`Provisioning failed: ${error}`);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Scan for Devices</Text>

      <Button
        title={isScanning ? 'Stop Scan' : 'Start Scan'}
        onPress={isScanning ? stopScanning : () => startScanning()}
      />

      {isProvisioning && (
        <View style={styles.progressContainer}>
          <Text>Provisioning... {provisioningProgress?.progress || 0}%</Text>
          <Text>{provisioningProgress?.step || ''}</Text>
        </View>
      )}

      <FlatList
        data={sortDevicesByRSSI()}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
            <Text>Address: {item.address}</Text>
            <Text>RSSI: {item.rssi} dBm</Text>
            <Button
              title="Provision"
              onPress={() => handleProvision(item)}
              disabled={isProvisioning}
            />
          </View>
        )}
      />
    </View>
  );
}

// Group Management Screen
function GroupManagementScreen() {
  const { nodes } = useTelinkMeshContext();
  const {
    groups,
    createGroup,
    addDeviceToGroup,
    turnOnGroup,
    turnOffGroup,
    setGroupLevel,
  } = useGroups({ autoLoad: true });

  const [newGroupAddress, setNewGroupAddress] = useState(0xC001);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = async () => {
    if (newGroupName) {
      try {
        await createGroup(newGroupAddress, newGroupName);
        alert('Group created successfully!');
        setNewGroupAddress(newGroupAddress + 1);
        setNewGroupName('');
      } catch (error) {
        alert(`Failed to create group: ${error}`);
      }
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Group Management</Text>

      {/* Create Group Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Group</Text>
        <TextInput
          style={styles.input}
          placeholder="Group Name"
          value={newGroupName}
          onChangeText={setNewGroupName}
        />
        <Button title="Create Group" onPress={handleCreateGroup} />
      </View>

      {/* Groups List */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.address.toString()}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            nodes={nodes}
            onTurnOn={() => turnOnGroup(item.address, 1000)}
            onTurnOff={() => turnOffGroup(item.address, 1000)}
            onLevelChange={(level) => setGroupLevel(item.address, level, 500)}
            onAddDevice={(nodeAddress) => addDeviceToGroup(nodeAddress, item.address)}
          />
        )}
      />
    </View>
  );
}

// Group Card Component
interface GroupCardProps {
  group: any;
  nodes: any[];
  onTurnOn: () => void;
  onTurnOff: () => void;
  onLevelChange: (level: number) => void;
  onAddDevice: (nodeAddress: number) => void;
}

function GroupCard({
  group,
  nodes,
  onTurnOn,
  onTurnOff,
  onLevelChange,
  onAddDevice,
}: GroupCardProps) {
  const [level, setLevel] = useState(50);
  const [showDevices, setShowDevices] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text>Address: 0x{group.address.toString(16).toUpperCase()}</Text>
      <Text>Devices: {group.devices?.length || 0}</Text>

      <View style={styles.controls}>
        <Button title="ON" onPress={onTurnOn} />
        <Button title="OFF" onPress={onTurnOff} />
        <Button
          title={showDevices ? 'Hide Devices' : 'Show Devices'}
          onPress={() => setShowDevices(!showDevices)}
        />
      </View>

      <View style={styles.sliderContainer}>
        <Text>Group Brightness: {level}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={level}
          onValueChange={setLevel}
          onSlidingComplete={(value) => onLevelChange(value)}
        />
      </View>

      {showDevices && (
        <View style={styles.deviceList}>
          {group.devices?.map((addr: number) => {
            const node = nodes.find((n) => n.unicastAddress === addr);
            return (
              <Text key={addr}>
                • {node?.name || `Device 0x${addr.toString(16)}`}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Network Health Indicator
function NetworkHealthIndicator() {
  const { networkHealth, isHealthMonitoring } = useTelinkMeshContext();

  if (!isHealthMonitoring || !networkHealth) {
    return null;
  }

  const healthColor =
    networkHealth.overallHealth === 'excellent'
      ? 'green'
      : networkHealth.overallHealth === 'good'
      ? 'orange'
      : 'red';

  return (
    <View style={[styles.healthBar, { backgroundColor: healthColor }]}>
      <Text style={styles.healthText}>
        Network Health: {networkHealth.overallHealth.toUpperCase()}
      </Text>
      <Text style={styles.healthText}>
        Active Nodes: {networkHealth.activeNodes}/{networkHealth.totalNodes}
      </Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  screen: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sliderContainer: {
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginVertical: 12,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  healthBar: {
    padding: 12,
    alignItems: 'center',
  },
  healthText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SmartHomeApp;
```

---

## Hook Usage Examples

### 1. useScanning Hook

```tsx
import { useScanning } from 'react-native-telink-ble';

function DeviceScanner() {
  const {
    isScanning,
    discoveredDevices,
    startScanning,
    stopScanning,
    getDevicesByRSSI,
    sortDevicesByRSSI,
  } = useScanning({
    autoStart: true,
    filters: {
      rssiThreshold: -70,
      deviceName: 'Telink',
    },
    autoStopAfter: 30000, // Stop after 30 seconds
    clearOnStart: true,
    maxDevices: 50,
  });

  // Get only strong signal devices
  const strongDevices = getDevicesByRSSI(-60);

  // Sort devices by signal strength
  const sortedDevices = sortDevicesByRSSI();

  return (
    <View>
      <Button
        title={isScanning ? 'Stop' : 'Start'}
        onPress={isScanning ? stopScanning : startScanning}
      />
      <Text>Found {discoveredDevices.length} devices</Text>
    </View>
  );
}
```

### 2. useGroups Hook

```tsx
import { useGroups } from 'react-native-telink-ble';

function GroupController() {
  const {
    groups,
    createGroup,
    addDeviceToGroup,
    turnOnGroup,
    setGroupColor,
  } = useGroups({ autoLoad: true });

  const setupLivingRoom = async () => {
    // Create group
    await createGroup(0xC001, 'Living Room');

    // Add devices
    await addDevicesToGroup([0x0001, 0x0002, 0x0003], 0xC001);

    // Control group
    await turnOnGroup(0xC001, 1000);
    await setGroupColor(0xC001, { hue: 120, saturation: 100, lightness: 50 });
  };

  return (
    <View>
      <Button title="Setup Living Room" onPress={setupLivingRoom} />
    </View>
  );
}
```

### 3. useDeviceControl Hook

```tsx
import { useDeviceControl } from 'react-native-telink-ble';

function LightController({ deviceAddress }: { deviceAddress: number }) {
  const {
    turnOn,
    turnOff,
    setLevel,
    setColor,
    isLoading,
  } = useDeviceControl({
    defaultTransitionTime: 1000,
    autoRetry: true,
    retryCount: 3,
  });

  const setWarmWhite = async () => {
    await setColor(deviceAddress, {
      hue: 30,
      saturation: 20,
      lightness: 80,
    }, 2000);
  };

  return (
    <View>
      <Button
        title="Turn On"
        onPress={() => turnOn(deviceAddress)}
        disabled={isLoading}
      />
      <Button title="Warm White" onPress={setWarmWhite} />
    </View>
  );
}
```

### 4. useProvisioning Hook

```tsx
import { useProvisioning } from 'react-native-telink-ble';

function DeviceProvisioner() {
  const {
    provisionDevice,
    fastProvisionDevices,
    isProvisioning,
    provisioningProgress,
  } = useProvisioning({
    autoRetry: true,
    retryCount: 3,
    autoConfigureAfterProvision: true,
  });

  const provisionMultipleDevices = async (devices: DiscoveredDevice[]) => {
    // Provision multiple devices at once
    const results = await fastProvisionDevices(devices, {
      startAddress: 0x0001,
      networkKeyIndex: 0,
      batchSize: 5,
    });

    console.log(`Provisioned ${results.length} devices`);
  };

  return (
    <View>
      {isProvisioning && (
        <Text>
          {provisioningProgress?.step} - {provisioningProgress?.progress}%
        </Text>
      )}
    </View>
  );
}
```

### 5. useFirmwareUpdate Hook

```tsx
import { useFirmwareUpdate } from 'react-native-telink-ble';

function FirmwareUpdater({ deviceAddress }: { deviceAddress: number }) {
  const {
    startUpdate,
    cancelUpdate,
    isUpdating,
    updateProgress,
  } = useFirmwareUpdate();

  const updateFirmware = async () => {
    const firmwareData = await loadFirmwareFile();

    await startUpdate(deviceAddress, firmwareData, {
      autoRetry: true,
      verifyBeforeApply: true,
      updatePolicy: 'verify-and-apply',
    });
  };

  return (
    <View>
      <Button title="Update Firmware" onPress={updateFirmware} />
      {isUpdating && (
        <View>
          <Text>Progress: {updateProgress?.percentage}%</Text>
          <Text>Stage: {updateProgress?.stage}</Text>
          <Text>Speed: {updateProgress?.speed} KB/s</Text>
        </View>
      )}
    </View>
  );
}
```

### 6. useNetworkHealth Hook

```tsx
import { useNetworkHealth } from 'react-native-telink-ble';

function NetworkMonitor() {
  const {
    healthReport,
    startMonitoring,
    stopMonitoring,
    getNodeHealth,
  } = useNetworkHealth({
    autoStart: true,
    interval: 30000,
    includeRSSI: true,
    includeLatency: true,
  });

  return (
    <View>
      {healthReport && (
        <View>
          <Text>Overall Health: {healthReport.overallHealth}</Text>
          <Text>Active: {healthReport.activeNodes}/{healthReport.totalNodes}</Text>
          <Text>Avg Latency: {healthReport.averageLatency}ms</Text>

          {healthReport.recommendations?.map((rec, idx) => (
            <Text key={idx}>• {rec}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
```

---

## Advanced Use Cases

### Scene Management

```tsx
import { useDeviceControl } from 'react-native-telink-ble';

function SceneController() {
  const { storeScene, recallScene } = useDeviceControl();

  const createEveningScene = async () => {
    // Set devices to desired states
    await turnOn([0x0001, 0x0002]);
    await setLevel([0x0001, 0x0002], 60);
    await setColor(0x0001, { hue: 30, saturation: 80, lightness: 60 });

    // Store as scene 1
    await storeScene(1, [
      { address: 0x0001 },
      { address: 0x0002 },
    ]);
  };

  const activateEveningScene = async () => {
    await recallScene(1);
  };

  return (
    <View>
      <Button title="Create Evening Scene" onPress={createEveningScene} />
      <Button title="Activate Evening" onPress={activateEveningScene} />
    </View>
  );
}
```

### Batch Operations

```tsx
import { useDeviceControl } from 'react-native-telink-ble';

function BatchController() {
  const { turnOn, setLevel } = useDeviceControl();

  const turnOnAllLights = async () => {
    // Control multiple devices at once
    const devices = [0x0001, 0x0002, 0x0003, 0x0004];
    await turnOn(devices, 1000);
  };

  const setRoomBrightness = async (level: number) => {
    const roomDevices = [0x0001, 0x0002, 0x0003];
    await setLevel(roomDevices, level, 2000);
  };

  return (
    <View>
      <Button title="All On" onPress={turnOnAllLights} />
      <Slider onSlidingComplete={setRoomBrightness} />
    </View>
  );
}
```

---

## Best Practices

### 1. Error Handling

```tsx
import { useDeviceControl, TelinkErrorCode } from 'react-native-telink-ble';

function RobustController() {
  const { turnOn, error, clearError } = useDeviceControl({
    autoRetry: true,
    retryCount: 3,
  });

  const handleTurnOn = async (address: number) => {
    try {
      await turnOn(address);
    } catch (err) {
      if (err.code === TelinkErrorCode.CONNECTION_TIMEOUT) {
        // Handle timeout specifically
        alert('Device not responding. Please check if it\'s powered on.');
      } else if (err.code === TelinkErrorCode.DEVICE_NOT_FOUND) {
        alert('Device not found. It may have been removed from the network.');
      } else {
        alert(`Error: ${err.message}`);
      }
    }
  };

  return <View>{/* UI */}</View>;
}
```

### 2. Performance Optimization

```tsx
// Use React.memo for device cards
const DeviceCard = React.memo(({ device, onControl }) => {
  return <View>{/* Device UI */}</View>;
}, (prevProps, nextProps) => {
  return prevProps.device.unicastAddress === nextProps.device.unicastAddress;
});

// Debounce slider changes
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

function LightControl({ address }) {
  const { setLevel } = useDeviceControl();

  const debouncedSetLevel = useMemo(
    () => debounce((level) => setLevel(address, level), 300),
    [address, setLevel]
  );

  return <Slider onValueChange={debouncedSetLevel} />;
}
```

### 3. Network State Management

```tsx
function AppWithNetworkPersistence() {
  const { saveNetwork, loadNetwork } = useTelinkMeshContext();

  // Save network state periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const networkData = await saveNetwork();
        await AsyncStorage.setItem('meshNetwork', networkData);
      } catch (error) {
        console.error('Failed to save network:', error);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [saveNetwork]);

  // Load network state on mount
  useEffect(() => {
    const loadSavedNetwork = async () => {
      try {
        const networkData = await AsyncStorage.getItem('meshNetwork');
        if (networkData) {
          await loadNetwork(networkData);
        }
      } catch (error) {
        console.error('Failed to load network:', error);
      }
    };

    loadSavedNetwork();
  }, [loadNetwork]);

  return <View>{/* App UI */}</View>;
}
```

---

## Performance Optimization

### 1. Minimize Re-renders

```tsx
// Use context selectors
function DeviceCount() {
  const { nodes } = useTelinkMeshContext();
  const count = useMemo(() => nodes.length, [nodes.length]);

  return <Text>{count} devices</Text>;
}
```

### 2. Optimize Event Listeners

```tsx
function DeviceMonitor({ deviceAddress }) {
  const { addEventListener } = useTelinkMeshContext();

  useEffect(() => {
    // Listen only for specific device events
    const unsubscribe = addEventListener('deviceStatusChanged', (event) => {
      if (event.nodeAddress === deviceAddress) {
        // Handle device-specific updates
      }
    });

    return unsubscribe;
  }, [deviceAddress, addEventListener]);

  return <View>{/* Monitor UI */}</View>;
}
```

### 3. Batch Network Operations

```tsx
function BulkDeviceController() {
  const { turnOn } = useDeviceControl();

  const handleBulkOperation = async () => {
    // Use group address for better performance
    await turnOn(0xC001); // Group address

    // Instead of individual commands:
    // await turnOn(0x0001);
    // await turnOn(0x0002);
    // await turnOn(0x0003);
  };

  return <Button onPress={handleBulkOperation} />;
}
```

---

## Troubleshooting

### Common Issues

1. **Devices not found during scanning**
   - Ensure Bluetooth is enabled
   - Check location permissions
   - Verify RSSI threshold isn't too high
   - Move closer to devices

2. **Provisioning fails**
   - Check network configuration
   - Ensure unique unicast addresses
   - Verify device is in provisioning mode
   - Try resetting the device

3. **Commands not working**
   - Verify device is provisioned
   - Check app key bindings
   - Ensure correct address
   - Check network connectivity

4. **Performance issues**
   - Use group commands for bulk operations
   - Implement debouncing for frequent operations
   - Optimize re-renders with React.memo
   - Reduce health monitoring frequency

---

## Conclusion

Phase 8 provides comprehensive examples and best practices for building production-ready applications with the React Native Telink BLE library. Use these examples as a foundation for your smart home, industrial IoT, or mesh networking applications.

For more information, see:
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Performance Guide](./PERFORMANCE.md)

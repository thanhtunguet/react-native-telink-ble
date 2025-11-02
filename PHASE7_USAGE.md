# Phase 7: React Context & Hooks – Usage Guide

This guide demonstrates how to use Phase 7's React Context and Hooks to build React Native applications with Telink BLE mesh networking.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [TelinkMeshProvider](#telinkmeshprovider)
3. [useTelinkMesh Hook](#usetelinkmesh-hook)
4. [useDeviceControl Hook](#usedevicecontrol-hook)
5. [useNetworkHealth Hook](#usenetworkhealth-hook)
6. [useProvisioning Hook](#useprovisioning-hook)
7. [useFirmwareUpdate Hook](#usefirmwareupdate-hook)
8. [useVendorCommands Hook](#usevendorcommands-hook)
9. [Complete Examples](#complete-examples)
10. [Best Practices](#best-practices)

---

## Getting Started

### Installation

```bash
npm install react-native-telink-ble
# or
yarn add react-native-telink-ble
```

### Basic Setup

Wrap your app with `TelinkMeshProvider`:

```tsx
import React from 'react';
import { TelinkMeshProvider } from 'react-native-telink-ble';

const meshConfig = {
  networkName: 'MyMeshNetwork',
  networkKey: 'a1b2c3d4e5f6...',
  appKey: 'f6e5d4c3b2a1...',
  ivIndex: 0,
  sequenceNumber: 0,
};

function App() {
  return (
    <TelinkMeshProvider
      autoInitialize={true}
      initialConfig={meshConfig}
      autoStartHealthMonitoring={true}
      healthMonitoringInterval={30000}
    >
      <YourApp />
    </TelinkMeshProvider>
  );
}

export default App;
```

---

## TelinkMeshProvider

The provider component manages global mesh network state.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Child components |
| `autoInitialize` | `boolean` | `false` | Auto-initialize network on mount |
| `initialConfig` | `MeshNetworkConfig` | - | Initial network configuration |
| `autoStartHealthMonitoring` | `boolean` | `false` | Auto-start health monitoring |
| `healthMonitoringInterval` | `number` | `30000` | Health monitoring interval (ms) |

### Examples

#### Manual Initialization

```tsx
function App() {
  return (
    <TelinkMeshProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </TelinkMeshProvider>
  );
}

function HomeScreen() {
  const { initializeNetwork } = useTelinkMesh();

  const handleSetup = async () => {
    await initializeNetwork({
      networkName: 'MyNetwork',
      networkKey: '...',
      appKey: '...',
      ivIndex: 0,
      sequenceNumber: 0,
    });
  };

  return (
    <Button title="Setup Network" onPress={handleSetup} />
  );
}
```

#### Auto-initialization with Loading State

```tsx
function App() {
  return (
    <TelinkMeshProvider
      autoInitialize
      initialConfig={meshConfig}
    >
      <AppContent />
    </TelinkMeshProvider>
  );
}

function AppContent() {
  const { isInitialized } = useTelinkMesh();

  if (!isInitialized) {
    return <LoadingScreen message="Initializing mesh network..." />;
  }

  return <MainApp />;
}
```

---

## useTelinkMesh Hook

Main hook for accessing mesh network state and operations.

### API

```typescript
const {
  // State
  isInitialized,
  isScanning,
  nodes,
  discoveredDevices,
  networkHealth,
  isHealthMonitoring,

  // Network operations
  initializeNetwork,
  clearNetwork,
  loadNetwork,
  saveNetwork,

  // Scanning
  startScanning,
  stopScanning,

  // Nodes
  refreshNodes,
  getNodeInfo,

  // Health
  startHealthMonitoring,
  stopHealthMonitoring,
  getHealthReport,

  // Events
  addEventListener,
} = useTelinkMesh();
```

### Examples

#### Device Scanner

```tsx
function DeviceScanner() {
  const {
    isScanning,
    discoveredDevices,
    startScanning,
    stopScanning,
  } = useTelinkMesh();

  return (
    <View>
      <Button
        title={isScanning ? 'Stop Scanning' : 'Start Scanning'}
        onPress={isScanning ? stopScanning : startScanning}
      />
      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => (
          <DeviceItem device={item} />
        )}
      />
    </View>
  );
}
```

#### Node List

```tsx
function NodeList() {
  const { nodes, refreshNodes } = useTelinkMesh();

  useEffect(() => {
    refreshNodes();
  }, []);

  return (
    <FlatList
      data={nodes}
      keyExtractor={(item) => item.unicastAddress.toString()}
      renderItem={({ item }) => (
        <View>
          <Text>Address: 0x{item.unicastAddress.toString(16)}</Text>
          <Text>Name: {item.name || 'Unknown'}</Text>
          <Text>Status: {item.isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={refreshNodes}
        />
      }
    />
  );
}
```

#### Network Persistence

```tsx
function NetworkManager() {
  const { saveNetwork, loadNetwork, clearNetwork } = useTelinkMesh();

  const handleSave = async () => {
    try {
      const networkData = await saveNetwork();
      await AsyncStorage.setItem('mesh_network', networkData);
      Alert.alert('Success', 'Network saved');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLoad = async () => {
    try {
      const networkData = await AsyncStorage.getItem('mesh_network');
      if (networkData) {
        await loadNetwork(networkData);
        Alert.alert('Success', 'Network loaded');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClear = async () => {
    Alert.alert(
      'Clear Network',
      'This will remove all devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearNetwork();
            await AsyncStorage.removeItem('mesh_network');
          },
        },
      ]
    );
  };

  return (
    <View>
      <Button title="Save Network" onPress={handleSave} />
      <Button title="Load Network" onPress={handleLoad} />
      <Button title="Clear Network" onPress={handleClear} />
    </View>
  );
}
```

---

## useDeviceControl Hook

Hook for controlling mesh devices.

### API

```typescript
const {
  // State
  isLoading,
  error,

  // Operations
  turnOn,
  turnOff,
  setLevel,
  setColor,
  recallScene,
  storeScene,

  // Utility
  clearError,
} = useDeviceControl(options);
```

### Examples

#### Simple Light Control

```tsx
function LightSwitch({ deviceAddress }: { deviceAddress: number }) {
  const { turnOn, turnOff, isLoading, error } = useDeviceControl();

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <Button
          title="Turn On"
          onPress={() => turnOn(deviceAddress, 1000)}
          disabled={isLoading}
        />
        <Button
          title="Turn Off"
          onPress={() => turnOff(deviceAddress, 1000)}
          disabled={isLoading}
        />
      </View>
      {isLoading && <ActivityIndicator />}
      {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
    </View>
  );
}
```

#### Brightness Control

```tsx
function BrightnessControl({ deviceAddress }: { deviceAddress: number }) {
  const { setLevel, isLoading } = useDeviceControl();
  const [brightness, setBrightness] = useState(50);

  const handleChange = (value: number) => {
    setBrightness(value);
    // Debounce the actual command
    setLevel(deviceAddress, value);
  };

  return (
    <View>
      <Text>Brightness: {brightness}%</Text>
      <Slider
        value={brightness}
        onValueChange={handleChange}
        minimumValue={0}
        maximumValue={100}
        step={1}
        disabled={isLoading}
      />
    </View>
  );
}
```

#### Color Picker

```tsx
function ColorPicker({ deviceAddress }: { deviceAddress: number }) {
  const { setColor, isLoading } = useDeviceControl();
  const [color, setColorState] = useState({ hue: 0, saturation: 100, lightness: 50 });

  const handleColorChange = async (newColor) => {
    setColorState(newColor);
    await setColor(deviceAddress, newColor, 500);
  };

  return (
    <View>
      <ColorWheel
        initialColor={color}
        onColorChange={handleColorChange}
        disabled={isLoading}
      />
      {isLoading && <ActivityIndicator />}
    </View>
  );
}
```

#### Group Control

```tsx
function RoomControl({ deviceAddresses }: { deviceAddresses: number[] }) {
  const { turnOn, turnOff, setLevel, isLoading } = useDeviceControl();

  return (
    <View>
      <Text>Living Room ({deviceAddresses.length} devices)</Text>
      <View style={{ flexDirection: 'row' }}>
        <Button
          title="All On"
          onPress={() => turnOn(deviceAddresses)}
          disabled={isLoading}
        />
        <Button
          title="All Off"
          onPress={() => turnOff(deviceAddresses)}
          disabled={isLoading}
        />
      </View>
      <Slider
        onValueChange={(value) => setLevel(deviceAddresses, value)}
        disabled={isLoading}
      />
    </View>
  );
}
```

#### Scene Management

```tsx
function SceneManager() {
  const { recallScene, storeScene, isLoading } = useDeviceControl();

  const handleRecallScene = async (sceneId: number) => {
    await recallScene(sceneId);
  };

  const handleStoreScene = async (sceneId: number) => {
    await storeScene(sceneId, [
      { address: 0x0001, state: { isOn: true, level: 75 } },
      { address: 0x0002, state: { isOn: true, level: 50 } },
    ]);
  };

  return (
    <View>
      <Button
        title="Recall Scene 1"
        onPress={() => handleRecallScene(1)}
        disabled={isLoading}
      />
      <Button
        title="Store Current as Scene 1"
        onPress={() => handleStoreScene(1)}
        disabled={isLoading}
      />
    </View>
  );
}
```

---

## useNetworkHealth Hook

Hook for monitoring network health.

### API

```typescript
const {
  // State
  isMonitoring,
  healthReport,
  isLoading,
  error,

  // Computed
  healthScore,
  criticalNodes,

  // Operations
  startMonitoring,
  stopMonitoring,
  refreshReport,
  getNodeHealth,
  measureLatency,
} = useNetworkHealth(options);
```

### Examples

#### Health Dashboard

```tsx
function HealthDashboard() {
  const {
    healthReport,
    healthScore,
    isMonitoring,
    criticalNodes,
    startMonitoring,
    stopMonitoring,
  } = useNetworkHealth({
    autoStart: true,
    interval: 30000,
  });

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 24 }}>Network Health: {healthScore}%</Text>
        <Button
          title={isMonitoring ? 'Stop' : 'Start'}
          onPress={isMonitoring ? stopMonitoring : startMonitoring}
        />
      </View>

      {healthReport && (
        <View>
          <Text>Total Nodes: {healthReport.totalNodes}</Text>
          <Text>Online: {healthReport.onlineNodes}</Text>
          <Text>Offline: {healthReport.offlineNodes}</Text>
          <Text>Avg RSSI: {healthReport.averageRSSI.toFixed(1)} dBm</Text>
          <Text>Avg Latency: {healthReport.averageLatency.toFixed(0)} ms</Text>
          <Text>Packet Loss: {(healthReport.packetLossRate * 100).toFixed(2)}%</Text>
        </View>
      )}

      {criticalNodes.length > 0 && (
        <View>
          <Text style={{ color: 'red' }}>
            Critical Nodes: {criticalNodes.map(n => `0x${n.toString(16)}`).join(', ')}
          </Text>
        </View>
      )}

      <ProgressBar
        progress={healthScore / 100}
        color={healthScore > 70 ? 'green' : healthScore > 40 ? 'orange' : 'red'}
      />
    </View>
  );
}
```

#### Node Health Details

```tsx
function NodeHealthDetails({ nodeAddress }: { nodeAddress: number }) {
  const { getNodeHealth, measureLatency } = useNetworkHealth();
  const [health, setHealth] = useState(null);
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    const loadHealth = async () => {
      const h = await getNodeHealth(nodeAddress);
      setHealth(h);

      const l = await measureLatency(nodeAddress);
      setLatency(l);
    };

    loadHealth();
  }, [nodeAddress]);

  if (!health) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>Node: 0x{nodeAddress.toString(16)}</Text>
      <Text>Status: {health.isOnline ? 'Online' : 'Offline'}</Text>
      <Text>RSSI: {health.rssi} dBm</Text>
      <Text>Latency: {latency} ms</Text>
      <Text>Failed Messages: {health.failedMessages}</Text>
      <Text>Successful Messages: {health.successfulMessages}</Text>
      <Text>Reliability: {(health.reliability * 100).toFixed(2)}%</Text>
    </View>
  );
}
```

---

## useProvisioning Hook

Hook for device provisioning.

### API

```typescript
const {
  // State
  isProvisioning,
  currentProgress,
  provisionedDevices,
  error,

  // Operations
  provisionDevice,
  provisionMultiple,
  cancelProvisioning,
  getNextAvailableAddress,

  // Utility
  clearError,
  resetProvisionedDevices,
} = useProvisioning(options);
```

### Examples

#### Device Provisioning UI

```tsx
function ProvisioningScreen() {
  const { discoveredDevices } = useTelinkMesh();
  const {
    provisionDevice,
    isProvisioning,
    currentProgress,
    provisionedDevices,
    error,
  } = useProvisioning({
    autoIncrementAddress: true,
    startAddress: 0x0001,
    onSuccess: (node) => {
      Alert.alert('Success', `Provisioned device at 0x${node.unicastAddress.toString(16)}`);
    },
  });

  return (
    <View>
      <Text style={{ fontSize: 20 }}>Discovered Devices</Text>
      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name || 'Unknown Device'}</Text>
            <Text>RSSI: {item.rssi} dBm</Text>
            <Button
              title="Provision"
              onPress={() => provisionDevice(item)}
              disabled={isProvisioning}
            />
          </View>
        )}
      />

      {currentProgress && (
        <View>
          <Text>{currentProgress.step}</Text>
          <ProgressBar progress={currentProgress.progress / 100} />
          <Text>{currentProgress.progress}%</Text>
        </View>
      )}

      <Text>Provisioned: {provisionedDevices.length} devices</Text>

      {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
    </View>
  );
}
```

#### Batch Provisioning

```tsx
function BatchProvisioning() {
  const { discoveredDevices } = useTelinkMesh();
  const {
    provisionMultiple,
    isProvisioning,
    currentProgress,
    provisionedDevices,
  } = useProvisioning();

  const handleBatchProvision = async () => {
    Alert.alert(
      'Batch Provision',
      `Provision all ${discoveredDevices.length} devices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Provision',
          onPress: async () => {
            try {
              await provisionMultiple(discoveredDevices);
              Alert.alert('Success', `Provisioned ${provisionedDevices.length} devices`);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Button
        title={`Provision All (${discoveredDevices.length})`}
        onPress={handleBatchProvision}
        disabled={isProvisioning || discoveredDevices.length === 0}
      />

      {isProvisioning && currentProgress && (
        <View>
          <Text>{currentProgress.step}</Text>
          <ProgressBar progress={currentProgress.progress / 100} />
        </View>
      )}
    </View>
  );
}
```

---

## useFirmwareUpdate Hook

Hook for OTA firmware updates.

### API

```typescript
const {
  // State
  isUpdating,
  currentProgress,
  error,

  // Operations
  startUpdate,
  cancelUpdate,
  verifyFirmware,
  getFirmwareVersion,
  updateMultiple,

  // Utility
  clearError,
  resetProgress,
} = useFirmwareUpdate(options);
```

### Examples

#### Firmware Update UI

```tsx
function FirmwareUpdateScreen({ nodeAddress }: { nodeAddress: number }) {
  const {
    startUpdate,
    isUpdating,
    currentProgress,
    getFirmwareVersion,
    verifyFirmware,
  } = useFirmwareUpdate({
    autoVerify: true,
    onProgress: (progress) => {
      console.log(`${progress.percentage}% - ${progress.stage}`);
    },
  });

  const [currentVersion, setCurrentVersion] = useState('');
  const [firmwareFile, setFirmwareFile] = useState(null);

  useEffect(() => {
    getFirmwareVersion(nodeAddress).then(setCurrentVersion);
  }, [nodeAddress]);

  const handleUpdate = async () => {
    if (!firmwareFile) return;

    try {
      await startUpdate({
        nodeAddress,
        firmwareData: firmwareFile.data,
        metadata: {
          version: '2.0.0',
          checksum: firmwareFile.checksum,
        },
      });

      Alert.alert('Success', 'Firmware updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Text>Current Version: {currentVersion}</Text>
      <Button title="Select Firmware File" onPress={selectFile} />

      {firmwareFile && (
        <Text>Selected: {firmwareFile.name} ({firmwareFile.version})</Text>
      )}

      {currentProgress && (
        <View>
          <Text>{currentProgress.stage}</Text>
          <ProgressBar progress={currentProgress.percentage / 100} />
          <Text>{currentProgress.percentage}%</Text>
          <Text>
            {currentProgress.bytesTransferred} / {currentProgress.totalBytes} bytes
          </Text>
          {currentProgress.estimatedTimeRemaining > 0 && (
            <Text>ETA: {Math.round(currentProgress.estimatedTimeRemaining / 1000)}s</Text>
          )}
        </View>
      )}

      <Button
        title="Update Firmware"
        onPress={handleUpdate}
        disabled={isUpdating || !firmwareFile}
      />
    </View>
  );
}
```

---

## useVendorCommands Hook

Hook for vendor-specific commands.

### API

```typescript
const {
  // State
  isSending,
  lastResponse,
  supportedModels,
  error,

  // Operations
  sendCommand,
  sendBroadcast,
  getSupportedModels,
  registerHandler,
  unregisterHandler,

  // Utility
  clearError,
  clearResponse,
} = useVendorCommands(options);
```

### Examples

#### Vendor Command Panel

```tsx
function VendorCommandPanel({ nodeAddress }: { nodeAddress: number }) {
  const {
    sendCommand,
    lastResponse,
    isSending,
    getSupportedModels,
    supportedModels,
  } = useVendorCommands({
    companyId: 0x0211, // Telink
    autoRegisterHandler: true,
    onMessageReceived: (msg) => {
      console.log('Received vendor message:', msg);
    },
  });

  useEffect(() => {
    getSupportedModels(nodeAddress);
  }, [nodeAddress]);

  const handleSendCommand = async (opcode: number, params: string) => {
    try {
      const response = await sendCommand(nodeAddress, {
        opcode,
        companyId: 0x0211,
        parameters: params,
        acknowledged: true,
      });

      if (response) {
        Alert.alert('Response', `Data: ${response.data}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Text>Supported Models: {supportedModels.length}</Text>
      {supportedModels.map((model, index) => (
        <Text key={index}>
          Company: 0x{model.companyId.toString(16)}, Model: 0x{model.modelId.toString(16)}
        </Text>
      ))}

      <Button
        title="Send Custom Command 0xC0"
        onPress={() => handleSendCommand(0xC0, '01020304')}
        disabled={isSending}
      />

      {lastResponse && (
        <View>
          <Text>Last Response:</Text>
          <Text>Source: 0x{lastResponse.source.toString(16)}</Text>
          <Text>Opcode: 0x{lastResponse.opcode.toString(16)}</Text>
          <Text>Data: {lastResponse.data}</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Complete Examples

### Full App Example

```tsx
import React from 'react';
import {
  TelinkMeshProvider,
  useTelinkMesh,
  useDeviceControl,
  useNetworkHealth,
  useProvisioning,
} from 'react-native-telink-ble';

// App wrapper
function App() {
  return (
    <TelinkMeshProvider
      autoInitialize
      initialConfig={meshConfig}
      autoStartHealthMonitoring
    >
      <MainApp />
    </TelinkMeshProvider>
  );
}

// Main app content
function MainApp() {
  const { isInitialized } = useTelinkMesh();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Devices" component={DevicesScreen} />
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="Provision" component={ProvisionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Dashboard screen
function DashboardScreen() {
  const { nodes, networkHealth } = useTelinkMesh();
  const { healthScore } = useNetworkHealth();

  return (
    <ScrollView>
      <View>
        <Text style={{ fontSize: 24 }}>Network Dashboard</Text>
        <Text>Total Nodes: {nodes.length}</Text>
        <Text>Online: {nodes.filter(n => n.isOnline).length}</Text>
        <Text>Health Score: {healthScore}%</Text>
      </View>

      <ProgressBar
        progress={healthScore / 100}
        color={healthScore > 70 ? 'green' : 'orange'}
      />

      {networkHealth && (
        <View>
          <Text>Avg RSSI: {networkHealth.averageRSSI} dBm</Text>
          <Text>Avg Latency: {networkHealth.averageLatency} ms</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Devices screen
function DevicesScreen() {
  const { nodes } = useTelinkMesh();
  const navigation = useNavigation();

  return (
    <FlatList
      data={nodes}
      renderItem={({ item }) => (
        <DeviceCard
          node={item}
          onPress={() => navigation.navigate('DeviceDetail', { node: item })}
        />
      )}
    />
  );
}

// Device card component
function DeviceCard({ node, onPress }) {
  const { turnOn, turnOff, isLoading } = useDeviceControl();

  return (
    <TouchableOpacity onPress={onPress}>
      <View>
        <Text>{node.name || 'Unknown Device'}</Text>
        <Text>Address: 0x{node.unicastAddress.toString(16)}</Text>
        <Text>{node.isOnline ? 'Online' : 'Offline'}</Text>

        <View style={{ flexDirection: 'row' }}>
          <Button
            title="On"
            onPress={(e) => {
              e.stopPropagation();
              turnOn(node.unicastAddress);
            }}
            disabled={isLoading}
          />
          <Button
            title="Off"
            onPress={(e) => {
              e.stopPropagation();
              turnOff(node.unicastAddress);
            }}
            disabled={isLoading}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

---

## Best Practices

### 1. Use Provider at App Root

```tsx
// ✓ Good: Provider wraps entire app
function App() {
  return (
    <TelinkMeshProvider {...config}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </TelinkMeshProvider>
  );
}

// ✗ Bad: Provider inside navigation
function AppNavigator() {
  return (
    <NavigationContainer>
      <TelinkMeshProvider>  {/* Don't do this */}
        <Stack.Navigator />
      </TelinkMeshProvider>
    </NavigationContainer>
  );
}
```

### 2. Handle Errors Gracefully

```tsx
function MyComponent() {
  const { turnOn, error, clearError } = useDeviceControl();

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error]);
}
```

### 3. Clean Up on Unmount

Hooks automatically clean up, but for manual listeners:

```tsx
function MyComponent() {
  const { addEventListener } = useTelinkMesh();

  useEffect(() => {
    const removeListener = addEventListener('deviceFound', (device) => {
      console.log('Found:', device);
    });

    return removeListener; // Clean up
  }, []);
}
```

### 4. Optimize Re-renders

```tsx
// ✓ Good: Only subscribe to needed state
function DeviceCount() {
  const { nodes } = useTelinkMesh();
  return <Text>{nodes.length}</Text>;
}

// ✗ Bad: Subscribing to entire context
function DeviceCount() {
  const context = useTelinkMesh();
  return <Text>{context.nodes.length}</Text>;
  // Re-renders on ANY context change
}
```

### 5. Use Memoization for Expensive Computations

```tsx
function NetworkStats() {
  const { nodes } = useTelinkMesh();

  const stats = useMemo(() => {
    return {
      total: nodes.length,
      online: nodes.filter(n => n.isOnline).length,
      offline: nodes.filter(n => !n.isOnline).length,
    };
  }, [nodes]);

  return <StatsView stats={stats} />;
}
```

---

For more information, see:
- [PHASE7_COMPLETION.md](./PHASE7_COMPLETION.md) - Implementation details
- [PHASE4_USAGE.md](./PHASE4_USAGE.md) - Advanced features
- [README.md](./README.md) - General library documentation

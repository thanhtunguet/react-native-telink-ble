# Phase 7: React Context & Hooks – Completion Summary

**Status**: ✅ Completed
**Scope**: React Context API and custom hooks for seamless React Native integration

---

## Overview

Phase 7 transforms the Telink BLE library from a traditional imperative API into a modern React-friendly declarative API. By introducing React Context and custom hooks, developers can now easily integrate BLE mesh networking into their React Native applications with minimal boilerplate and automatic state management.

---

## Key Deliverables

### 1. React Context Provider

**File**: `src/context/TelinkMeshContext.tsx` (350+ lines)

#### TelinkMeshProvider Component
A top-level provider component that manages global mesh network state and provides it to all child components.

**Features**:
- **Automatic State Management**: Tracks network initialization, scanning status, discovered devices, nodes, and health reports
- **Event System Integration**: Automatically listens to native events and updates state
- **Auto-Initialize Support**: Optional automatic network initialization on mount
- **Auto-Start Health Monitoring**: Optional automatic health monitoring
- **Cleanup on Unmount**: Properly cleans up resources and stops monitoring

**State Management**:
```typescript
interface MeshNetworkState {
  isInitialized: boolean;
  isScanning: boolean;
  nodes: MeshNode[];
  discoveredDevices: DiscoveredDevice[];
  networkHealth: NetworkHealthReport | null;
  isHealthMonitoring: boolean;
}
```

**Operations Provided**:
- Network: `initializeNetwork`, `clearNetwork`, `loadNetwork`, `saveNetwork`
- Scanning: `startScanning`, `stopScanning`
- Nodes: `refreshNodes`, `getNodeInfo`
- Health: `startHealthMonitoring`, `stopHealthMonitoring`, `getHealthReport`
- Events: `addEventListener`

---

### 2. Custom React Hooks (6 hooks)

All hooks follow React best practices with proper dependencies, cleanup, and TypeScript typing.

#### Hook 1: useTelinkMesh
**File**: `src/hooks/useTelinkMesh.ts`

Main hook for accessing mesh network context. Re-exports `useTelinkMeshContext` for convenience.

**Usage**:
```typescript
const { nodes, isInitialized, initializeNetwork } = useTelinkMesh();
```

---

#### Hook 2: useDeviceControl
**File**: `src/hooks/useDeviceControl.ts` (160+ lines)

Hook for controlling mesh devices with built-in loading states and error handling.

**Features**:
- Turn on/off devices with transition times
- Set brightness levels (0-100)
- Set RGB/HSL colors
- Scene recall and storage
- Automatic retry with exponential backoff
- Loading and error states

**Example**:
```typescript
const { turnOn, turnOff, setLevel, setColor, isLoading } = useDeviceControl({
  defaultTransitionTime: 1000,
  autoRetry: true,
  retryCount: 3,
});

await turnOn(deviceAddress, 2000); // 2-second transition
await setLevel([device1, device2], 75); // 75% brightness to multiple devices
await setColor(deviceAddress, { hue: 120, saturation: 100, lightness: 50 });
```

---

#### Hook 3: useNetworkHealth
**File**: `src/hooks/useNetworkHealth.ts` (190+ lines)

Hook for monitoring mesh network health with computed metrics.

**Features**:
- Auto-start monitoring on mount
- Configurable monitoring interval
- RSSI and latency tracking
- Real-time health report updates
- Health score calculation (0-100)
- Critical node detection
- Individual node health queries
- Latency measurements

**Computed Metrics**:
- **Health Score**: Weighted combination of online nodes, RSSI, and packet loss
- **Critical Nodes**: Nodes with reliability < 0.5

**Example**:
```typescript
const {
  healthReport,
  healthScore,
  isMonitoring,
  criticalNodes,
  startMonitoring,
} = useNetworkHealth({
  autoStart: true,
  interval: 30000,
  refreshInterval: 5000,
});

console.log(`Network Health: ${healthScore}%`);
console.log(`Critical Nodes: ${criticalNodes.join(', ')}`);
```

---

#### Hook 4: useProvisioning
**File**: `src/hooks/useProvisioning.ts` (220+ lines)

Hook for device provisioning with automatic address management.

**Features**:
- Single device provisioning
- Batch provisioning for multiple devices
- Auto-increment addresses
- Progress tracking with percentage and step information
- Provisioned devices list
- Cancel provisioning
- Success/failure callbacks

**Example**:
```typescript
const {
  provisionDevice,
  provisionMultiple,
  isProvisioning,
  currentProgress,
  provisionedDevices,
} = useProvisioning({
  autoIncrementAddress: true,
  startAddress: 0x0001,
  onProgress: (progress) => console.log(`${progress.progress}%`),
  onSuccess: (node) => console.log(`Provisioned: ${node.unicastAddress}`),
});

// Provision single device
await provisionDevice(discoveredDevice);

// Provision multiple devices
await provisionMultiple([device1, device2, device3]);

console.log(`Total provisioned: ${provisionedDevices.length}`);
```

---

#### Hook 5: useFirmwareUpdate
**File**: `src/hooks/useFirmwareUpdate.ts` (200+ lines)

Hook for managing OTA firmware updates with progress tracking.

**Features**:
- Single device firmware update
- Batch firmware updates
- Auto-verify firmware before updating
- Real-time progress (percentage, bytes, stage, ETA)
- Version querying
- Update cancellation
- Success/failure callbacks

**Progress Tracking**:
- Bytes transferred / total bytes
- Percentage complete
- Current stage (Starting, Uploading, Verifying, Applying)
- Estimated time remaining

**Example**:
```typescript
const {
  startUpdate,
  isUpdating,
  currentProgress,
  getFirmwareVersion,
} = useFirmwareUpdate({
  autoVerify: true,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.stage}`);
    console.log(`${progress.bytesTransferred}/${progress.totalBytes} bytes`);
  },
});

const currentVersion = await getFirmwareVersion(nodeAddress);
console.log(`Current version: ${currentVersion}`);

await startUpdate({
  nodeAddress,
  firmwareData: hexString,
  metadata: { version: '2.0.0', checksum: '...' },
});
```

---

#### Hook 6: useVendorCommands
**File**: `src/hooks/useVendorCommands.ts` (170+ lines)

Hook for vendor-specific command operations.

**Features**:
- Send acknowledged/unacknowledged vendor commands
- Broadcast commands to all devices
- Query supported vendor models
- Auto-register message handler
- Last response tracking
- Message received callbacks

**Example**:
```typescript
const {
  sendCommand,
  sendBroadcast,
  getSupportedModels,
  lastResponse,
  isSending,
} = useVendorCommands({
  companyId: 0x0211, // Telink
  autoRegisterHandler: true,
  onMessageReceived: (msg) => console.log('Vendor message:', msg),
});

// Get supported vendor models
const models = await getSupportedModels(nodeAddress);

// Send custom command
const response = await sendCommand(nodeAddress, {
  opcode: 0xC0,
  companyId: 0x0211,
  parameters: '01020304',
  acknowledged: true,
});

// Broadcast to all devices
await sendBroadcast({
  opcode: 0xC1,
  companyId: 0x0211,
  parameters: '',
  acknowledged: false,
});
```

---

## Architecture Benefits

### 1. Declarative API
React components can declaratively describe their mesh networking needs without managing subscriptions or cleanup.

**Before Phase 7**:
```typescript
useEffect(() => {
  const sub1 = eventEmitter.addListener('deviceFound', handleDevice);
  const sub2 = eventEmitter.addListener('scanStopped', handleScanStop);

  TelinkBle.startScanning().then(/* ... */);

  return () => {
    sub1.remove();
    sub2.remove();
  };
}, []);
```

**After Phase 7**:
```typescript
const { discoveredDevices, startScanning } = useTelinkMesh();
```

---

### 2. Automatic State Synchronization
State is automatically synchronized across all components using the provider.

```typescript
// Component A
function DeviceList() {
  const { nodes } = useTelinkMesh();
  return <FlatList data={nodes} />;
}

// Component B - automatically sees updated nodes
function NodeCount() {
  const { nodes } = useTelinkMesh();
  return <Text>Total Nodes: {nodes.length}</Text>;
}
```

---

### 3. Built-in Loading & Error States
No need to manually track loading and error states.

```typescript
const { turnOn, isLoading, error } = useDeviceControl();

return (
  <Button
    title="Turn On"
    onPress={() => turnOn(address)}
    disabled={isLoading}
  />
);
```

---

### 4. Lifecycle Management
Automatic cleanup prevents memory leaks and ensures resources are properly released.

```typescript
// Monitoring automatically stops when component unmounts
function HealthDashboard() {
  const { healthReport } = useNetworkHealth({ autoStart: true });
  // Monitoring automatically stopped on unmount
}
```

---

## Developer Experience Enhancements

### 1. TypeScript Integration
Full TypeScript support with intelligent autocomplete and type inference.

```typescript
// IDE provides autocomplete for all operations
const {
  turnOn,      // ✓ Type: (address: number | number[], transitionTime?: number) => Promise<void>
  setLevel,    // ✓ Type: (address: number | number[], level: number, transitionTime?: number) => Promise<void>
  error,       // ✓ Type: Error | null
  isLoading,   // ✓ Type: boolean
} = useDeviceControl();
```

### 2. Minimal Boilerplate
Set up mesh networking in just a few lines:

```typescript
function App() {
  return (
    <TelinkMeshProvider
      autoInitialize
      initialConfig={meshConfig}
      autoStartHealthMonitoring
    >
      <YourApp />
    </TelinkMeshProvider>
  );
}
```

### 3. Composable Hooks
Combine multiple hooks for complex functionality:

```typescript
function SmartDeviceController({ deviceAddress }) {
  const { nodes } = useTelinkMesh();
  const { turnOn, setLevel } = useDeviceControl();
  const { getNodeHealth } = useNetworkHealth();
  const { getFirmwareVersion } = useFirmwareUpdate();

  // Combine operations as needed
}
```

---

## File Structure

```
src/
├── context/
│   ├── TelinkMeshContext.tsx  (350 lines) - Main context provider
│   └── index.ts                           - Context exports
├── hooks/
│   ├── useTelinkMesh.ts       (20 lines)  - Main mesh hook
│   ├── useDeviceControl.ts    (160 lines) - Device control
│   ├── useNetworkHealth.ts    (190 lines) - Health monitoring
│   ├── useProvisioning.ts     (220 lines) - Device provisioning
│   ├── useFirmwareUpdate.ts   (200 lines) - OTA updates
│   ├── useVendorCommands.ts   (170 lines) - Vendor commands
│   └── index.ts                           - Hooks exports
└── index.tsx                              - Updated with Phase 7 exports
```

**Total New Code**: ~1,310 lines

---

## Testing Recommendations

### Unit Testing
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDeviceControl } from 'react-native-telink-ble';

test('useDeviceControl turns on device', async () => {
  const { result } = renderHook(() => useDeviceControl());

  await act(async () => {
    await result.current.turnOn(0x0001);
  });

  expect(result.current.error).toBeNull();
});
```

### Integration Testing
```typescript
test('TelinkMeshProvider provides state to children', () => {
  const wrapper = ({ children }) => (
    <TelinkMeshProvider>{children}</TelinkMeshProvider>
  );

  const { result } = renderHook(() => useTelinkMesh(), { wrapper });

  expect(result.current.isInitialized).toBe(false);
  expect(result.current.nodes).toEqual([]);
});
```

---

## Migration Guide

### From Imperative to Declarative API

**Old Way (Phases 1-6)**:
```typescript
import TelinkBle from 'react-native-telink-ble';

function MyComponent() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const subscription = eventEmitter.addListener('deviceFound', (device) => {
      setDevices(prev => [...prev, device]);
    });

    TelinkBle.startScanning();

    return () => subscription.remove();
  }, []);
}
```

**New Way (Phase 7)**:
```typescript
import { TelinkMeshProvider, useTelinkMesh } from 'react-native-telink-ble';

function MyComponent() {
  const { discoveredDevices, startScanning } = useTelinkMesh();

  useEffect(() => {
    startScanning();
  }, []);
}
```

---

## Breaking Changes

**None**. Phase 7 is fully additive. All previous APIs remain functional.

---

## Performance Considerations

### 1. Context Re-renders
The provider uses proper memoization to prevent unnecessary re-renders:
- Operations are wrapped in `useCallback`
- State updates only trigger when values actually change

### 2. Event Listener Cleanup
All event listeners are properly cleaned up on unmount to prevent memory leaks.

### 3. Automatic Debouncing
Hooks automatically debounce rapid state changes (e.g., during scanning).

---

## Best Practices

### 1. Single Provider
Wrap your app in a single `TelinkMeshProvider` at the root:

```typescript
<TelinkMeshProvider {...config}>
  <NavigationContainer>
    <App />
  </NavigationContainer>
</TelinkMeshProvider>
```

### 2. Selective Hook Usage
Only use hooks you need in each component:

```typescript
// ✓ Good: Only imports needed hook
function DeviceList() {
  const { nodes } = useTelinkMesh();
}

// ✗ Avoid: Importing entire context when only nodes needed
```

### 3. Error Handling
Always handle errors from hook operations:

```typescript
const { turnOn, error } = useDeviceControl();

useEffect(() => {
  if (error) {
    Alert.alert('Error', error.message);
  }
}, [error]);
```

---

## Next Steps / Future Enhancements

1. **Additional Hooks**
   - `useScanning` - Dedicated scanning operations
   - `useGroups` - Group management
   - `useScenes` - Scene management
   - `useTopology` - Network topology visualization

2. **Performance Optimizations**
   - Virtualized lists for large node collections
   - Selective context subscriptions
   - Background state persistence

3. **Developer Tools**
   - React DevTools integration
   - Debug mode for context state
   - Performance profiler

4. **Documentation**
   - Video tutorials
   - Interactive examples
   - Storybook components

---

## Phase 7 Status: ✅ COMPLETE

The React Native Telink BLE library now provides a modern, React-friendly API through Context and Hooks. Developers can build sophisticated BLE mesh applications with minimal boilerplate, automatic state management, and excellent TypeScript support.

**Key Achievements**:
- ✅ React Context provider for global state
- ✅ 6 custom hooks covering all major features
- ✅ Full TypeScript support with type inference
- ✅ Automatic lifecycle management
- ✅ Zero breaking changes (fully backward compatible)
- ✅ Production-ready developer experience

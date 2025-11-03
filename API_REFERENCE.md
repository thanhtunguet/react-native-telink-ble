# React Native Telink BLE - API Reference

Complete API reference for the React Native Telink BLE library.

---

## Table of Contents

1. [React Context](#react-context)
2. [React Hooks](#react-hooks)
3. [Core Classes](#core-classes)
4. [Type Definitions](#type-definitions)
5. [Error Handling](#error-handling)
6. [Event System](#event-system)

---

## React Context

### TelinkMeshProvider

Global state provider for the Telink BLE mesh network.

#### Props

```typescript
interface TelinkMeshProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  initialConfig?: MeshNetworkConfig;
  autoStartHealthMonitoring?: boolean;
  healthMonitoringInterval?: number;
}
```

#### Example

```tsx
<TelinkMeshProvider
  autoInitialize={true}
  initialConfig={{
    networkName: 'My Network',
    networkKey: '7dd7364cd842ad18c17c2b820c84c3d6',
    appKey: '63964771734fbd76e3b40519d1d94a48',
    ivIndex: 0,
    sequenceNumber: 0,
  }}
  autoStartHealthMonitoring={true}
  healthMonitoringInterval={30000}
>
  <App />
</TelinkMeshProvider>
```

### useTelinkMeshContext

Access the mesh network context.

#### Returns

```typescript
interface TelinkMeshContextValue {
  // State
  isInitialized: boolean;
  isScanning: boolean;
  nodes: MeshNode[];
  discoveredDevices: DiscoveredDevice[];
  networkHealth: NetworkHealthReport | null;
  isHealthMonitoring: boolean;

  // Network operations
  initializeNetwork: (config: MeshNetworkConfig) => Promise<void>;
  clearNetwork: () => Promise<void>;
  loadNetwork: (networkData: string) => Promise<void>;
  saveNetwork: () => Promise<string>;

  // Scanning operations
  startScanning: (filters?: ScanFilters) => Promise<void>;
  stopScanning: () => Promise<void>;

  // Node operations
  refreshNodes: () => Promise<void>;
  getNodeInfo: (address: number) => Promise<MeshNode | null>;

  // Health monitoring
  startHealthMonitoring: (config?: any) => Promise<void>;
  stopHealthMonitoring: () => Promise<void>;
  getHealthReport: () => Promise<NetworkHealthReport | null>;

  // Event listeners
  addEventListener: (
    eventType: MeshEventType | string,
    listener: (event: any) => void
  ) => () => void;
}
```

#### Example

```tsx
function MyComponent() {
  const { nodes, isInitialized, startScanning } = useTelinkMeshContext();

  return (
    <View>
      <Text>Devices: {nodes.length}</Text>
      <Button title="Scan" onPress={() => startScanning()} />
    </View>
  );
}
```

---

## React Hooks

### useScanning

Hook for BLE device scanning and discovery.

#### Parameters

```typescript
interface UseScanningOptions {
  autoStart?: boolean;
  filters?: ScanFilters;
  autoStopAfter?: number;
  clearOnStart?: boolean;
  maxDevices?: number;
  deviceTimeout?: number;
}
```

#### Returns

```typescript
interface UseScanningReturn {
  // State
  isScanning: boolean;
  discoveredDevices: DiscoveredDevice[];
  isLoading: boolean;
  error: Error | null;

  // Operations
  startScanning: (filters?: ScanFilters) => Promise<void>;
  stopScanning: () => Promise<void>;
  clearDevices: () => void;
  refreshScan: () => Promise<void>;

  // Device operations
  getDeviceByAddress: (address: string) => DiscoveredDevice | undefined;
  getDevicesByName: (name: string) => DiscoveredDevice[];
  getDevicesByRSSI: (minRSSI: number) => DiscoveredDevice[];
  sortDevicesByRSSI: () => DiscoveredDevice[];

  // Utility
  clearError: () => void;
}
```

#### Example

```tsx
const {
  isScanning,
  discoveredDevices,
  startScanning,
  stopScanning,
} = useScanning({
  autoStart: true,
  filters: { rssiThreshold: -70 },
  autoStopAfter: 30000,
});
```

### useDeviceControl

Hook for controlling mesh devices.

#### Parameters

```typescript
interface UseDeviceControlOptions {
  defaultTransitionTime?: number;
  autoRetry?: boolean;
  retryCount?: number;
}
```

#### Returns

```typescript
interface UseDeviceControlReturn {
  // State
  isLoading: boolean;
  error: Error | null;

  // Operations
  turnOn: (address: number | number[], transitionTime?: number) => Promise<void>;
  turnOff: (address: number | number[], transitionTime?: number) => Promise<void>;
  setLevel: (
    address: number | number[],
    level: number,
    transitionTime?: number
  ) => Promise<void>;
  setColor: (
    address: number | number[],
    color: ColorHSL,
    transitionTime?: number
  ) => Promise<void>;
  recallScene: (sceneId: number, groupAddress?: number) => Promise<void>;
  storeScene: (sceneId: number, devices: SceneDevice[]) => Promise<void>;

  // Utility
  clearError: () => void;
}
```

#### Example

```tsx
const { turnOn, setLevel, isLoading } = useDeviceControl({
  defaultTransitionTime: 1000,
  autoRetry: true,
});

await turnOn(0x0001); // Turn on device at address 0x0001
await setLevel(0x0001, 75, 2000); // Set to 75% brightness over 2 seconds
```

### useGroups

Hook for managing mesh groups.

#### Parameters

```typescript
interface UseGroupsOptions {
  autoLoad?: boolean;
  autoSync?: boolean;
  syncInterval?: number;
}
```

#### Returns

```typescript
interface UseGroupsReturn {
  // State
  groups: MeshGroup[];
  isLoading: boolean;
  error: Error | null;

  // Group CRUD operations
  createGroup: (groupAddress: number, name: string) => Promise<void>;
  deleteGroup: (groupAddress: number) => Promise<void>;
  getGroup: (groupAddress: number) => MeshGroup | undefined;
  getAllGroups: () => MeshGroup[];
  refreshGroups: () => Promise<void>;

  // Device-Group membership operations
  addDeviceToGroup: (nodeAddress: number, groupAddress: number) => Promise<void>;
  removeDeviceFromGroup: (
    nodeAddress: number,
    groupAddress: number
  ) => Promise<void>;
  addDevicesToGroup: (
    nodeAddresses: number[],
    groupAddress: number
  ) => Promise<void>;
  removeDevicesFromGroup: (
    nodeAddresses: number[],
    groupAddress: number
  ) => Promise<void>;
  getDeviceGroups: (nodeAddress: number) => MeshGroup[];
  getGroupDevices: (groupAddress: number) => number[];

  // Group control operations
  turnOnGroup: (groupAddress: number, transitionTime?: number) => Promise<void>;
  turnOffGroup: (groupAddress: number, transitionTime?: number) => Promise<void>;
  setGroupLevel: (
    groupAddress: number,
    level: number,
    transitionTime?: number
  ) => Promise<void>;
  setGroupColor: (
    groupAddress: number,
    color: ColorHSL,
    transitionTime?: number
  ) => Promise<void>;

  // Utility
  clearError: () => void;
  clearGroups: () => void;
}
```

#### Example

```tsx
const {
  groups,
  createGroup,
  addDeviceToGroup,
  turnOnGroup,
} = useGroups({ autoLoad: true });

await createGroup(0xC001, 'Living Room');
await addDeviceToGroup(0x0001, 0xC001);
await turnOnGroup(0xC001, 1000);
```

### useProvisioning

Hook for device provisioning workflows.

#### Parameters

```typescript
interface UseProvisioningOptions {
  autoRetry?: boolean;
  retryCount?: number;
  autoConfigureAfterProvision?: boolean;
}
```

#### Returns

```typescript
interface UseProvisioningReturn {
  // State
  isProvisioning: boolean;
  provisioningProgress: ProvisioningProgress | null;
  error: Error | null;

  // Operations
  provisionDevice: (
    device: DiscoveredDevice,
    config: ProvisionConfig
  ) => Promise<ProvisionResult>;
  fastProvisionDevices: (
    devices: DiscoveredDevice[],
    config: FastProvisionConfig
  ) => Promise<ProvisionResult[]>;
  cancelProvisioning: () => Promise<void>;

  // Utility
  clearError: () => void;
}
```

#### Example

```tsx
const { provisionDevice, isProvisioning, provisioningProgress } =
  useProvisioning({
    autoRetry: true,
    retryCount: 3,
  });

const result = await provisionDevice(device, {
  unicastAddress: 0x0001,
  networkKeyIndex: 0,
  flags: 0,
  ivIndex: 0,
});
```

### useFirmwareUpdate

Hook for OTA firmware updates.

#### Parameters

```typescript
interface UseFirmwareUpdateOptions {
  autoRetry?: boolean;
  retryCount?: number;
  verifyBeforeApply?: boolean;
}
```

#### Returns

```typescript
interface UseFirmwareUpdateReturn {
  // State
  isUpdating: boolean;
  updateProgress: FirmwareUpdateProgress | null;
  error: Error | null;

  // Operations
  startUpdate: (
    nodeAddress: number,
    firmwareData: Uint8Array,
    config?: FirmwareUpdateConfig
  ) => Promise<void>;
  cancelUpdate: () => Promise<void>;
  getFirmwareVersion: (nodeAddress: number) => Promise<FirmwareInfo>;

  // Utility
  clearError: () => void;
}
```

#### Example

```tsx
const { startUpdate, isUpdating, updateProgress } = useFirmwareUpdate();

await startUpdate(0x0001, firmwareData, {
  verifyBeforeApply: true,
  updatePolicy: 'verify-and-apply',
});
```

### useNetworkHealth

Hook for network health monitoring.

#### Parameters

```typescript
interface UseNetworkHealthOptions {
  autoStart?: boolean;
  interval?: number;
  includeRSSI?: boolean;
  includeLatency?: boolean;
}
```

#### Returns

```typescript
interface UseNetworkHealthReturn {
  // State
  isMonitoring: boolean;
  healthReport: NetworkHealthReport | null;
  error: Error | null;

  // Operations
  startMonitoring: (config?: NetworkHealthConfig) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  getNodeHealth: (nodeAddress: number) => Promise<NodeHealthStatus>;
  getNetworkTopology: () => Promise<NetworkTopology>;

  // Utility
  clearError: () => void;
}
```

#### Example

```tsx
const { healthReport, startMonitoring, stopMonitoring } = useNetworkHealth({
  autoStart: true,
  interval: 30000,
  includeRSSI: true,
});
```

### useVendorCommands

Hook for vendor-specific commands.

#### Parameters

```typescript
interface UseVendorCommandsOptions {
  companyId?: number;
  cacheResponses?: boolean;
}
```

#### Returns

```typescript
interface UseVendorCommandsReturn {
  // State
  isExecuting: boolean;
  lastResponse: VendorCommandResponse | null;
  error: Error | null;

  // Operations
  sendCommand: (
    nodeAddress: number,
    command: VendorCommand
  ) => Promise<VendorCommandResponse>;
  broadcastCommand: (
    command: VendorCommand
  ) => Promise<VendorCommandResponse[]>;
  getVendorModels: (nodeAddress: number) => Promise<VendorModelInfo[]>;

  // Utility
  clearError: () => void;
  clearCache: () => void;
}
```

#### Example

```tsx
const { sendCommand, isExecuting } = useVendorCommands({
  companyId: 0x0211,
});

const response = await sendCommand(0x0001, {
  opcode: 0xE0,
  parameters: new Uint8Array([0x01, 0x02]),
});
```

### useTelinkMesh

Core hook for mesh network operations.

#### Returns

```typescript
// Same as useTelinkMeshContext
```

#### Example

```tsx
const { initializeNetwork, nodes } = useTelinkMesh();

await initializeNetwork({
  networkName: 'My Network',
  networkKey: '...',
  appKey: '...',
  ivIndex: 0,
  sequenceNumber: 0,
});
```

---

## Core Classes

### TelinkBle (Singleton)

Main interface to the native Telink BLE module.

#### Methods

##### Network Management

```typescript
initializeMeshNetwork(config: MeshNetworkConfig): Promise<void>
loadMeshNetwork(networkData: string): Promise<void>
saveMeshNetwork(): Promise<string>
clearMeshNetwork(): Promise<void>
```

##### Scanning

```typescript
startScanning(filters?: ScanFilters): Promise<void>
stopScanning(): Promise<void>
getDiscoveredDevices(): Promise<DiscoveredDevice[]>
```

##### Provisioning

```typescript
startProvisioning(
  device: DiscoveredDevice,
  config: ProvisionConfig
): Promise<ProvisionResult>
cancelProvisioning(): Promise<void>
startFastProvisioning(
  devices: DiscoveredDevice[],
  config: FastProvisionConfig
): Promise<ProvisionResult[]>
```

##### Device Control

```typescript
sendGenericOnOff(
  address: number,
  isOn: boolean,
  transitionTime?: number
): Promise<void>

sendGenericLevel(
  address: number,
  level: number,
  transitionTime?: number
): Promise<void>

sendColorHSL(
  address: number,
  hue: number,
  saturation: number,
  lightness: number,
  transitionTime?: number
): Promise<void>
```

##### Group Management

```typescript
createGroup(groupAddress: number, name: string): Promise<void>
addDeviceToGroup(nodeAddress: number, groupAddress: number): Promise<void>
removeDeviceFromGroup(nodeAddress: number, groupAddress: number): Promise<void>
sendGroupCommand(
  groupAddress: number,
  isOn: boolean,
  transitionTime?: number
): Promise<void>
```

##### Node Management

```typescript
getAllNodes(): Promise<MeshNode[]>
getNodeInfo(address: number): Promise<MeshNode>
removeNode(address: number): Promise<void>
resetNode(address: number): Promise<void>
```

##### Event Handling

```typescript
addEventListener(
  eventType: MeshEventType,
  listener: (data: any) => void
): string

removeEventListener(subscriptionId: string): void
removeAllListeners(eventType?: MeshEventType): void
```

### DeviceController

High-level device control operations.

```typescript
class DeviceController {
  async setDeviceState(
    target: number | number[],
    isOn: boolean,
    options?: ControlOptions
  ): Promise<void>

  async setDeviceLevel(
    target: number | number[],
    level: number,
    options?: ControlOptions
  ): Promise<void>

  async setDeviceColor(
    target: number | number[],
    color: ColorHSL,
    options?: ControlOptions
  ): Promise<void>

  async recallScene(sceneId: number, groupAddress?: number): Promise<void>
  async storeScene(sceneId: number, devices: SceneDevice[]): Promise<void>
}
```

### GroupManager

Group management operations.

```typescript
class GroupManager {
  async createGroup(groupAddress: number, name: string): Promise<void>
  async deleteGroup(groupAddress: number): Promise<void>
  async addDeviceToGroup(nodeAddress: number, groupAddress: number): Promise<void>
  async removeDeviceFromGroup(nodeAddress: number, groupAddress: number): Promise<void>
  async getGroupDevices(groupAddress: number): Promise<number[]>
  async sendGroupCommand(groupAddress: number, command: MeshCommand): Promise<void>
}
```

### ProvisioningWorkflow

Provisioning workflow management.

```typescript
class ProvisioningWorkflow {
  async provisionDevice(device: DiscoveredDevice): Promise<MeshNode>
  async fastProvisionDevices(devices: DiscoveredDevice[]): Promise<MeshNode[]>
  async remoteProvisionDevice(
    targetDevice: DiscoveredDevice,
    proxyNode: MeshNode
  ): Promise<MeshNode>
}
```

### FirmwareUpdateManager

OTA firmware update management.

```typescript
class FirmwareUpdateManager {
  async startUpdate(
    nodeAddress: number,
    firmwareData: Uint8Array,
    config?: FirmwareUpdateConfig
  ): Promise<void>

  async cancelUpdate(): Promise<void>
  async getFirmwareVersion(nodeAddress: number): Promise<FirmwareInfo>
  async verifyFirmware(firmwareData: Uint8Array): Promise<boolean>
}
```

### NetworkHealthMonitor

Network health monitoring.

```typescript
class NetworkHealthMonitor {
  async startMonitoring(config?: NetworkHealthConfig): Promise<void>
  async stopMonitoring(): Promise<void>
  async getHealthReport(): Promise<NetworkHealthReport>
  async getNodeHealth(nodeAddress: number): Promise<NodeHealthStatus>
  async getNetworkTopology(): Promise<NetworkTopology>
}
```

### VendorCommandManager

Vendor-specific command management.

```typescript
class VendorCommandManager {
  async sendCommand(
    nodeAddress: number,
    command: VendorCommand
  ): Promise<VendorCommandResponse>

  async broadcastCommand(
    command: VendorCommand
  ): Promise<VendorCommandResponse[]>

  async getVendorModels(nodeAddress: number): Promise<VendorModelInfo[]>
  registerMessageHandler(
    companyId: number,
    handler: (message: any) => void
  ): void
}
```

---

## Type Definitions

### Core Types

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
    manufacturerData?: string;
  };
  scanRecord?: string;
  lastSeen?: Date;
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

interface MeshGroup {
  address: number;
  name: string;
  devices: number[];
}

interface ColorHSL {
  hue: number; // 0-360
  saturation: number; // 0-100
  lightness: number; // 0-100
}

interface ProvisionConfig {
  unicastAddress: number;
  networkKeyIndex: number;
  flags: number;
  ivIndex: number;
  attentionDuration?: number;
}

interface ProvisionResult {
  success: boolean;
  nodeAddress: number;
  deviceKey: string;
  uuid: string;
  compositionData?: CompositionData;
  error?: string;
}
```

### Event Types

```typescript
enum MeshEventType {
  // Scanning
  DEVICE_FOUND = 'deviceFound',
  SCAN_STARTED = 'scanStarted',
  SCAN_STOPPED = 'scanStopped',

  // Provisioning
  PROVISIONING_STARTED = 'provisioningStarted',
  PROVISIONING_PROGRESS = 'provisioningProgress',
  PROVISIONING_COMPLETED = 'provisioningCompleted',
  PROVISIONING_FAILED = 'provisioningFailed',

  // Device Status
  DEVICE_ONLINE = 'deviceOnline',
  DEVICE_OFFLINE = 'deviceOffline',
  DEVICE_STATUS_CHANGED = 'deviceStatusChanged',

  // Network
  NETWORK_CONNECTED = 'networkConnected',
  NETWORK_DISCONNECTED = 'networkDisconnected',
  MESSAGE_RECEIVED = 'messageReceived',

  // Errors
  CONNECTION_ERROR = 'connectionError',
  MESH_ERROR = 'meshError',
}
```

---

## Error Handling

### TelinkError

```typescript
class TelinkError extends Error {
  code: TelinkErrorCode;
  details?: any;

  constructor(code: TelinkErrorCode, message: string, details?: any);
}
```

### Error Codes

```typescript
enum TelinkErrorCode {
  // Bluetooth/Connection
  BLUETOOTH_DISABLED = 'BLUETOOTH_DISABLED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',

  // Provisioning
  PROVISIONING_FAILED = 'PROVISIONING_FAILED',
  INVALID_PROVISION_DATA = 'INVALID_PROVISION_DATA',
  DEVICE_ALREADY_PROVISIONED = 'DEVICE_ALREADY_PROVISIONED',

  // Network
  NETWORK_KEY_INVALID = 'NETWORK_KEY_INVALID',
  APP_KEY_INVALID = 'APP_KEY_INVALID',
  NETWORK_NOT_INITIALIZED = 'NETWORK_NOT_INITIALIZED',

  // Commands
  COMMAND_TIMEOUT = 'COMMAND_TIMEOUT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  UNSUPPORTED_OPCODE = 'UNSUPPORTED_OPCODE',

  // Permissions
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  BLUETOOTH_PERMISSION_DENIED = 'BLUETOOTH_PERMISSION_DENIED',
}
```

### Error Recovery

```typescript
class ErrorRecoveryManager {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number
  ): Promise<T>

  async recoverConnection(): Promise<void>
  async recoverNetworkState(): Promise<void>
}
```

---

## Event System

### Event Listeners

```typescript
// Add listener
const unsubscribe = addEventListener('deviceFound', (device) => {
  console.log('Device found:', device);
});

// Remove listener
unsubscribe();

// Remove all listeners for an event
removeAllListeners('deviceFound');
```

### Event Data

```typescript
// Device Found
interface DeviceFoundEvent {
  device: DiscoveredDevice;
}

// Provisioning Progress
interface ProvisioningProgressEvent {
  step: string;
  progress: number; // 0-100
  nodeAddress?: number;
  deviceUuid: string;
}

// Device Status Changed
interface DeviceStatusChangedEvent {
  nodeAddress: number;
  isOnline: boolean;
  rssi?: number;
  batteryLevel?: number;
  lastSeen: Date;
}
```

---

## Platform-Specific Notes

### iOS

- Requires iOS 12.0 or later
- Bluetooth permissions must be declared in Info.plist
- Background modes required for background scanning

### Android

- Requires Android 6.0 (API 23) or later
- Location permissions required for BLE scanning
- Bluetooth permissions required

---

## See Also

- [Usage Examples](./PHASE8_EXAMPLES.md)
- [Production Guide](./PHASE9_PRODUCTION.md)
- [Implementation Plan](./PLAN.md)

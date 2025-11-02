// Core type definitions for Telink BLE Mesh

export interface MeshNetworkConfig {
  networkName: string;
  networkKey: string;
  appKey: string;
  ivIndex: number;
  sequenceNumber: number;
}

export interface ScanFilters {
  duration?: number; // Scan duration in milliseconds
  rssiThreshold?: number; // Minimum RSSI value
  deviceName?: string; // Filter by device name
  serviceUuids?: string[]; // Filter by service UUIDs
}

export interface DiscoveredDevice {
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
}

export interface ProvisionConfig {
  unicastAddress: number;
  networkKeyIndex: number;
  flags: number;
  ivIndex: number;
  attentionDuration?: number;
}

export interface ProvisionResult {
  success: boolean;
  nodeAddress: number;
  deviceKey: string;
  uuid: string;
  compositionData?: CompositionData;
  error?: string;
}

export interface CompositionData {
  companyId: number;
  productId: number;
  versionId: number;
  features: number;
  elements: ElementData[];
}

export interface ElementData {
  elementAddress: number;
  location: number;
  numSigModels: number;
  numVendorModels: number;
  sigModels: number[];
  vendorModels: VendorModel[];
}

export interface VendorModel {
  modelId: number;
  companyId: number;
}

export interface MeshNode {
  unicastAddress: number;
  deviceKey: string;
  uuid: string;
  name?: string;
  compositionData?: CompositionData;
  heartbeatPublication?: HeartbeatConfig;
  networkKeys: number[];
  appKeys: number[];
  isOnline: boolean;
  lastSeen?: Date;
}

export interface HeartbeatConfig {
  destination: number;
  countLog: number;
  periodLog: number;
  ttl: number;
  features: number;
  netKeyIndex: number;
}

export interface MeshCommand {
  opcode: number;
  parameters: number[]; // Using number array instead of Uint8Array for better React Native compatibility
  acknowledged: boolean;
  transitionTime?: number;
}

export interface ControlOptions {
  transitionTime?: number;
  delay?: number;
  acknowledged?: boolean;
  retries?: number;
  timeout?: number;
  priority?: number;
}

export interface ColorHSL {
  hue: number; // 0-360
  saturation: number; // 0-100
  lightness: number; // 0-100
}

export interface ColorRGB {
  red: number; // 0-255
  green: number; // 0-255
  blue: number; // 0-255
}

export interface MeshGroup {
  address: number;
  name: string;
  devices: number[]; // Array of node addresses
}

export interface SceneDevice {
  address: number;
  level?: number;
  color?: ColorHSL;
  onOff?: boolean;
}

export interface BatchCommand {
  type: 'onoff' | 'level' | 'color' | 'vendor';
  target: number;
  value: any;
  options?: ControlOptions;
}

export interface BatchResult {
  target: number;
  success: boolean;
  error?: string;
}

// Event types
export enum MeshEventType {
  // Device discovery
  DEVICE_FOUND = 'deviceFound',
  SCAN_STARTED = 'scanStarted',
  SCAN_STOPPED = 'scanStopped',

  // Provisioning events
  PROVISIONING_STARTED = 'provisioningStarted',
  PROVISIONING_PROGRESS = 'provisioningProgress',
  PROVISIONING_COMPLETED = 'provisioningCompleted',
  PROVISIONING_FAILED = 'provisioningFailed',

  // Device status
  DEVICE_ONLINE = 'deviceOnline',
  DEVICE_OFFLINE = 'deviceOffline',
  DEVICE_STATUS_CHANGED = 'deviceStatusChanged',

  // Network events
  NETWORK_CONNECTED = 'networkConnected',
  NETWORK_DISCONNECTED = 'networkDisconnected',
  MESSAGE_RECEIVED = 'messageReceived',
  MESSAGE_SENT = 'messageSent',

  // Error events
  CONNECTION_ERROR = 'connectionError',
  MESH_ERROR = 'meshError',

  // Debug events
  DEBUG = 'debug',
}

// Event data interfaces
export interface ProvisioningProgress {
  step: string;
  progress: number; // 0-100
  nodeAddress?: number;
  deviceUuid: string;
  message?: string;
}

export interface DeviceStatus {
  nodeAddress: number;
  isOnline: boolean;
  rssi?: number;
  batteryLevel?: number;
  lastSeen: Date;
  elements?: ElementData[];
}

export interface MeshMessage {
  source: number;
  destination: number;
  opcode: number;
  data: number[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface NetworkEvent {
  type: 'connected' | 'disconnected' | 'error';
  message?: string;
  details?: any;
}

// Error handling
export enum TelinkErrorCode {
  // Bluetooth/Connection errors
  BLUETOOTH_DISABLED = 'BLUETOOTH_DISABLED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',

  // Provisioning errors
  PROVISIONING_FAILED = 'PROVISIONING_FAILED',
  INVALID_PROVISION_DATA = 'INVALID_PROVISION_DATA',
  DEVICE_ALREADY_PROVISIONED = 'DEVICE_ALREADY_PROVISIONED',

  // Network errors
  NETWORK_KEY_INVALID = 'NETWORK_KEY_INVALID',
  APP_KEY_INVALID = 'APP_KEY_INVALID',
  NETWORK_NOT_INITIALIZED = 'NETWORK_NOT_INITIALIZED',

  // Command errors
  COMMAND_TIMEOUT = 'COMMAND_TIMEOUT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  UNSUPPORTED_OPCODE = 'UNSUPPORTED_OPCODE',

  // Permission errors
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  BLUETOOTH_PERMISSION_DENIED = 'BLUETOOTH_PERMISSION_DENIED',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
}

export interface TelinkErrorDetails {
  code: TelinkErrorCode;
  message: string;
  nativeError?: any;
  timestamp: Date;
  context?: Record<string, unknown>;
  retryable?: boolean;
}

// Phase 4: Remote Provisioning types
export interface RemoteProvisionConfig extends ProvisionConfig {
  proxyNodeAddress: number; // Address of the proxy node to use
  timeout?: number; // Timeout in milliseconds
}

export interface RemoteProvisionResult extends ProvisionResult {
  proxyNodeAddress: number;
  provisioningTime: number; // Time taken in milliseconds
}

// Phase 4: Firmware update types
export interface FirmwareUpdateConfig {
  nodeAddress: number;
  firmwareData: string; // Base64 encoded firmware data or file path
  firmwareInfo: FirmwareInfo;
  metadata?: {
    updatePolicy?: 'verify-and-apply' | 'verify-only' | 'force-apply';
    chunkSize?: number; // Bytes per chunk
    transferMode?: 'reliable' | 'fast';
  };
}

export interface FirmwareInfo {
  version: string;
  companyId: number;
  firmwareId: number;
  size: number;
  checksum: string;
  releaseDate?: string;
  minimumRequiredVersion?: string;
}

export interface FirmwareUpdateProgress {
  nodeAddress: number;
  percentage: number;
  stage: FirmwareUpdateStage;
  bytesTransferred: number;
  totalBytes: number;
  estimatedTimeRemaining?: number; // Seconds
  transferRate?: number; // Bytes per second
  error?: string;
}

export enum FirmwareUpdateStage {
  PREPARING = 'preparing',
  VERIFYING = 'verifying',
  TRANSFERRING = 'transferring',
  APPLYING = 'applying',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface FirmwareUpdateResult {
  success: boolean;
  nodeAddress: number;
  previousVersion: string;
  newVersion: string;
  duration: number; // Milliseconds
  error?: string;
}

// Phase 4: Network health monitoring types
export interface NetworkHealthConfig {
  checkInterval?: number; // Milliseconds
  includeRssi?: boolean;
  includeHops?: boolean;
  includeLatency?: boolean;
  nodeAddresses?: number[]; // Specific nodes to monitor, or all if empty
}

export interface NetworkHealthReport {
  timestamp: Date;
  totalNodes: number;
  activeNodes: number;
  averageRssi: number;
  averageLatency: number; // Milliseconds
  networkReliability: number; // 0-100 percentage
  nodes: NodeHealthStatus[];
  topology?: NetworkTopology;
}

export interface NodeHealthStatus {
  nodeAddress: number;
  isOnline: boolean;
  rssi: number;
  latency: number; // Milliseconds
  hopCount: number;
  lastSeen: Date;
  batteryLevel?: number;
  packetLossRate: number; // 0-100 percentage
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  connections: TopologyConnection[];
}

export interface TopologyNode {
  address: number;
  type: 'provisioner' | 'relay' | 'low-power' | 'friend';
  isRelay: boolean;
  isProxy: boolean;
  isFriend: boolean;
  isLowPower: boolean;
}

export interface TopologyConnection {
  fromAddress: number;
  toAddress: number;
  rssi: number;
  quality: number; // 0-100 percentage
}

// Phase 4: Vendor-specific command types
export interface VendorCommand {
  companyId: number;
  opcode: number;
  parameters: number[]; // Command-specific parameters
  acknowledged?: boolean;
  timeout?: number;
}

export interface VendorCommandResponse {
  companyId: number;
  opcode: number;
  sourceAddress: number;
  data: number[];
  timestamp: Date;
}

export interface VendorModelInfo {
  companyId: number;
  modelId: number;
  supportedOpcodes: number[];
  description?: string;
}

// Phase 4: Additional event types for Phase 4 features
export enum Phase4EventType {
  // Remote provisioning events
  REMOTE_PROVISIONING_STARTED = 'remoteProvisioningStarted',
  REMOTE_PROVISIONING_PROGRESS = 'remoteProvisioningProgress',
  REMOTE_PROVISIONING_COMPLETED = 'remoteProvisioningCompleted',
  REMOTE_PROVISIONING_FAILED = 'remoteProvisioningFailed',

  // Firmware update events
  FIRMWARE_UPDATE_STARTED = 'firmwareUpdateStarted',
  FIRMWARE_UPDATE_PROGRESS = 'firmwareUpdateProgress',
  FIRMWARE_UPDATE_COMPLETED = 'firmwareUpdateCompleted',
  FIRMWARE_UPDATE_FAILED = 'firmwareUpdateFailed',
  FIRMWARE_VERIFICATION_COMPLETED = 'firmwareVerificationCompleted',

  // Network health events
  NETWORK_HEALTH_UPDATED = 'networkHealthUpdated',
  NODE_HEALTH_CHANGED = 'nodeHealthChanged',
  NETWORK_TOPOLOGY_CHANGED = 'networkTopologyChanged',

  // Vendor command events
  VENDOR_MESSAGE_RECEIVED = 'vendorMessageReceived',
  VENDOR_COMMAND_RESPONSE = 'vendorCommandResponse',
}

// Extend main MeshEventType with Phase 4 events
export const AllMeshEventTypes = {
  ...MeshEventType,
  ...Phase4EventType,
};

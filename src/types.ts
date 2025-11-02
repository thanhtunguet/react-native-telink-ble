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

export interface NetworkHealthReport {
  totalNodes: number;
  activeNodes: number;
  networkLatency: number;
  signalStrength: number[];
  lastUpdated: Date;
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
}

// Firmware update types
export interface UpdateProgress {
  nodeAddress: number;
  percentage: number;
  stage: string;
  bytesTransferred: number;
  totalBytes: number;
}

export interface FirmwareInfo {
  version: string;
  companyId: number;
  firmwareId: number;
  size: number;
  checksum: string;
}

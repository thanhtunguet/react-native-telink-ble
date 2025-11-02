import { TurboModuleRegistry, type TurboModule } from 'react-native';
import type {
  MeshNetworkConfig,
  ScanFilters,
  DiscoveredDevice,
  ProvisionConfig,
  ProvisionResult,
  MeshNode,
  RemoteProvisionConfig,
  RemoteProvisionResult,
  FirmwareUpdateConfig,
  FirmwareInfo,
  NetworkHealthConfig,
  NetworkHealthReport,
  NodeHealthStatus,
  NetworkTopology,
  VendorCommand,
  VendorCommandResponse,
  VendorModelInfo,
} from './types';

export interface Spec extends TurboModule {
  // Legacy method for compatibility
  multiply(a: number, b: number): number;

  // Network Management
  initializeMeshNetwork(config: MeshNetworkConfig): Promise<void>;
  loadMeshNetwork(networkData: string): Promise<void>;
  saveMeshNetwork(): Promise<string>;
  clearMeshNetwork(): Promise<void>;

  // Device Scanning
  startScanning(filters?: ScanFilters): Promise<void>;
  stopScanning(): Promise<void>;
  getDiscoveredDevices(): Promise<DiscoveredDevice[]>;

  // Device Provisioning
  startProvisioning(
    device: DiscoveredDevice,
    config: ProvisionConfig
  ): Promise<ProvisionResult>;
  cancelProvisioning(): Promise<void>;
  startFastProvisioning(
    devices: DiscoveredDevice[],
    startAddress: number
  ): Promise<ProvisionResult[]>;

  // Device Control
  sendGenericOnOff(
    address: number,
    isOn: boolean,
    transitionTime?: number
  ): Promise<void>;
  sendGenericLevel(
    address: number,
    level: number,
    transitionTime?: number
  ): Promise<void>;
  sendColorHSL(
    address: number,
    hue: number,
    saturation: number,
    lightness: number,
    transitionTime?: number
  ): Promise<void>;

  // Group Management
  createGroup(groupAddress: number, name: string): Promise<void>;
  addDeviceToGroup(nodeAddress: number, groupAddress: number): Promise<void>;
  removeDeviceFromGroup(
    nodeAddress: number,
    groupAddress: number
  ): Promise<void>;
  sendGroupCommand(
    groupAddress: number,
    isOn: boolean,
    transitionTime?: number
  ): Promise<void>;

  // Scene Control
  sendSceneStore(address: number, sceneId: number): Promise<void>;
  sendSceneRecall(address: number, sceneId: number): Promise<void>;
  sendSceneDelete(address: number, sceneId: number): Promise<void>;
  sendSceneRegisterGet(address: number): Promise<number[]>;

  // Network Information
  getAllNodes(): Promise<MeshNode[]>;
  getNodeInfo(nodeAddress: number): Promise<MeshNode | null>;

  // Utility
  checkBluetoothPermission(): Promise<boolean>;
  requestBluetoothPermission(): Promise<boolean>;
  isBluetoothEnabled(): Promise<boolean>;

  // Phase 4: Remote Provisioning
  startRemoteProvisioning(
    device: DiscoveredDevice,
    config: RemoteProvisionConfig
  ): Promise<RemoteProvisionResult>;
  cancelRemoteProvisioning(): Promise<void>;

  // Phase 4: Firmware Update (OTA)
  startFirmwareUpdate(config: FirmwareUpdateConfig): Promise<void>;
  cancelFirmwareUpdate(nodeAddress: number): Promise<void>;
  getFirmwareVersion(nodeAddress: number): Promise<string>;
  verifyFirmware(
    nodeAddress: number,
    firmwareInfo: FirmwareInfo
  ): Promise<boolean>;

  // Phase 4: Network Health Monitoring
  startNetworkHealthMonitoring(config: NetworkHealthConfig): Promise<void>;
  stopNetworkHealthMonitoring(): Promise<void>;
  getNetworkHealthReport(): Promise<NetworkHealthReport>;
  getNodeHealthStatus(nodeAddress: number): Promise<NodeHealthStatus>;
  getNetworkTopology(): Promise<NetworkTopology>;
  measureNodeLatency(nodeAddress: number): Promise<number>;

  // Phase 4: Vendor-Specific Commands
  sendVendorCommand(
    target: number,
    command: VendorCommand
  ): Promise<VendorCommandResponse | null>;
  getVendorModels(nodeAddress: number): Promise<VendorModelInfo[]>;
  registerVendorMessageHandler(companyId: number): Promise<void>;
  unregisterVendorMessageHandler(companyId: number): Promise<void>;

  // Add event listener support (these will be handled by EventEmitter in the main module)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TelinkBle');

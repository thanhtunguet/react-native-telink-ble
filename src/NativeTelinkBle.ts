import { TurboModuleRegistry, type TurboModule } from 'react-native';
import type {
  MeshNetworkConfig,
  ScanFilters,
  DiscoveredDevice,
  ProvisionConfig,
  ProvisionResult,
  MeshNode,
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

  // Network Information
  getAllNodes(): Promise<MeshNode[]>;
  getNodeInfo(nodeAddress: number): Promise<MeshNode | null>;

  // Utility
  checkBluetoothPermission(): Promise<boolean>;
  requestBluetoothPermission(): Promise<boolean>;
  isBluetoothEnabled(): Promise<boolean>;

  // Add event listener support (these will be handled by EventEmitter in the main module)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TelinkBle');

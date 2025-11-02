import { NativeEventEmitter, NativeModules } from 'react-native';
import TelinkBleNative from './NativeTelinkBle';
import type {
  MeshNetworkConfig,
  ScanFilters,
  DiscoveredDevice,
  ProvisionConfig,
  ProvisionResult,
  MeshNode,
  MeshEventType,
  TelinkErrorDetails,
} from './types';
import { TelinkErrorCode } from './types';

// Export all types
export * from './types';

// Export provisioning workflow helper
export { ProvisioningWorkflow } from './ProvisioningWorkflow';

// Event emitter for native events
const eventEmitter = new NativeEventEmitter(NativeModules.TelinkBle);

// Main TelinkBle class
class TelinkBle {
  private static instance: TelinkBle;
  private subscriptions: Map<string, any> = new Map();

  public static getInstance(): TelinkBle {
    if (!TelinkBle.instance) {
      TelinkBle.instance = new TelinkBle();
    }
    return TelinkBle.instance;
  }

  // Legacy method for compatibility
  multiply(a: number, b: number): number {
    return TelinkBleNative.multiply(a, b);
  }

  // Network Management
  async initializeMeshNetwork(config: MeshNetworkConfig): Promise<void> {
    try {
      await TelinkBleNative.initializeMeshNetwork(config);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async loadMeshNetwork(networkData: string): Promise<void> {
    try {
      await TelinkBleNative.loadMeshNetwork(networkData);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async saveMeshNetwork(): Promise<string> {
    try {
      return await TelinkBleNative.saveMeshNetwork();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async clearMeshNetwork(): Promise<void> {
    try {
      await TelinkBleNative.clearMeshNetwork();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Device Scanning
  async startScanning(filters?: ScanFilters): Promise<void> {
    try {
      await TelinkBleNative.startScanning(filters);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async stopScanning(): Promise<void> {
    try {
      await TelinkBleNative.stopScanning();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    try {
      return await TelinkBleNative.getDiscoveredDevices();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Device Provisioning
  async startProvisioning(
    device: DiscoveredDevice,
    config: ProvisionConfig
  ): Promise<ProvisionResult> {
    try {
      return await TelinkBleNative.startProvisioning(device, config);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async cancelProvisioning(): Promise<void> {
    try {
      await TelinkBleNative.cancelProvisioning();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async startFastProvisioning(
    devices: DiscoveredDevice[],
    startAddress: number
  ): Promise<ProvisionResult[]> {
    try {
      return await TelinkBleNative.startFastProvisioning(devices, startAddress);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Device Control
  async sendGenericOnOff(
    address: number,
    isOn: boolean,
    transitionTime?: number
  ): Promise<void> {
    try {
      await TelinkBleNative.sendGenericOnOff(address, isOn, transitionTime);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async sendGenericLevel(
    address: number,
    level: number,
    transitionTime?: number
  ): Promise<void> {
    try {
      if (level < 0 || level > 100) {
        throw new Error('Level must be between 0 and 100');
      }
      await TelinkBleNative.sendGenericLevel(address, level, transitionTime);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async sendColorHSL(
    address: number,
    hue: number,
    saturation: number,
    lightness: number,
    transitionTime?: number
  ): Promise<void> {
    try {
      if (hue < 0 || hue > 360) {
        throw new Error('Hue must be between 0 and 360');
      }
      if (saturation < 0 || saturation > 100) {
        throw new Error('Saturation must be between 0 and 100');
      }
      if (lightness < 0 || lightness > 100) {
        throw new Error('Lightness must be between 0 and 100');
      }
      await TelinkBleNative.sendColorHSL(
        address,
        hue,
        saturation,
        lightness,
        transitionTime
      );
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Group Management
  async createGroup(groupAddress: number, name: string): Promise<void> {
    try {
      await TelinkBleNative.createGroup(groupAddress, name);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async addDeviceToGroup(
    nodeAddress: number,
    groupAddress: number
  ): Promise<void> {
    try {
      await TelinkBleNative.addDeviceToGroup(nodeAddress, groupAddress);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async removeDeviceFromGroup(
    nodeAddress: number,
    groupAddress: number
  ): Promise<void> {
    try {
      await TelinkBleNative.removeDeviceFromGroup(nodeAddress, groupAddress);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Network Information
  async getAllNodes(): Promise<MeshNode[]> {
    try {
      return await TelinkBleNative.getAllNodes();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async getNodeInfo(nodeAddress: number): Promise<MeshNode | null> {
    try {
      return await TelinkBleNative.getNodeInfo(nodeAddress);
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Utility
  async checkBluetoothPermission(): Promise<boolean> {
    try {
      return await TelinkBleNative.checkBluetoothPermission();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async requestBluetoothPermission(): Promise<boolean> {
    try {
      return await TelinkBleNative.requestBluetoothPermission();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      return await TelinkBleNative.isBluetoothEnabled();
    } catch (error) {
      throw this.handleNativeError(error);
    }
  }

  // Event handling
  addEventListener(
    eventType: MeshEventType,
    listener: (data: any) => void
  ): string {
    const subscription = eventEmitter.addListener(eventType, listener);
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;
    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  removeEventListener(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.remove();
      this.subscriptions.delete(subscriptionId);
    }
  }

  removeAllListeners(eventType?: MeshEventType): void {
    if (eventType) {
      eventEmitter.removeAllListeners(eventType);
      // Also clean up our subscription tracking
      for (const [id] of this.subscriptions.entries()) {
        if (id.startsWith(eventType)) {
          this.subscriptions.delete(id);
        }
      }
    } else {
      eventEmitter.removeAllListeners();
      this.subscriptions.clear();
    }
  }

  // Error handling helper
  private handleNativeError(error: any): Error {
    if (error && typeof error === 'object') {
      const errorDetails: TelinkErrorDetails = {
        code: this.mapErrorCode(error.code || 'UNKNOWN_ERROR'),
        message: error.message || 'An unknown error occurred',
        nativeError: error,
        timestamp: new Date(),
      };

      const customError = new Error(errorDetails.message);
      (customError as any).details = errorDetails;
      return customError;
    }

    return new Error(error?.toString() || 'An unknown error occurred');
  }

  private mapErrorCode(nativeCode: string): TelinkErrorCode {
    const codeMap: { [key: string]: TelinkErrorCode } = {
      BLUETOOTH_DISABLED: TelinkErrorCode.BLUETOOTH_DISABLED,
      DEVICE_NOT_FOUND: TelinkErrorCode.DEVICE_NOT_FOUND,
      CONNECTION_FAILED: TelinkErrorCode.CONNECTION_FAILED,
      CONNECTION_TIMEOUT: TelinkErrorCode.CONNECTION_TIMEOUT,
      PROVISIONING_ERROR: TelinkErrorCode.PROVISIONING_FAILED,
      NETWORK_INIT_ERROR: TelinkErrorCode.NETWORK_NOT_INITIALIZED,
      PERMISSION_DENIED: TelinkErrorCode.BLUETOOTH_PERMISSION_DENIED,
      COMMAND_ERROR: TelinkErrorCode.COMMAND_TIMEOUT,
      GROUP_ERROR: TelinkErrorCode.INVALID_ADDRESS,
      SCAN_ERROR: TelinkErrorCode.BLUETOOTH_DISABLED,
    };

    return codeMap[nativeCode] || TelinkErrorCode.UNKNOWN_ERROR;
  }
}

// Export singleton instance
const telinkBle = TelinkBle.getInstance();
export default telinkBle;

// Also export the class for advanced usage
export { TelinkBle };

import telinkBle from './index';
import type {
  DiscoveredDevice,
  ProvisionConfig,
  ProvisionResult,
  MeshNode,
} from './types';
import { MeshEventType } from './types';

/**
 * High-level provisioning workflow helper class
 * Provides convenient methods for common provisioning scenarios
 */
export class ProvisioningWorkflow {
  private nextAddress: number = 1;
  private networkKeyIndex: number = 0;
  private ivIndex: number = 0;

  constructor(config?: {
    startAddress?: number;
    networkKeyIndex?: number;
    ivIndex?: number;
  }) {
    if (config?.startAddress) this.nextAddress = config.startAddress;
    if (config?.networkKeyIndex !== undefined)
      this.networkKeyIndex = config.networkKeyIndex;
    if (config?.ivIndex !== undefined) this.ivIndex = config.ivIndex;
  }

  /**
   * Set the next available address for provisioning
   */
  setNextAddress(address: number): void {
    this.nextAddress = address;
  }

  /**
   * Get the next available address
   */
  getNextAvailableAddress(): number {
    return this.nextAddress;
  }

  /**
   * Standard provisioning process for a single device
   */
  async provisionDevice(
    device: DiscoveredDevice,
    options?: Partial<ProvisionConfig>
  ): Promise<MeshNode> {
    // Create provisioning config with defaults
    const config: ProvisionConfig = {
      unicastAddress: this.nextAddress,
      networkKeyIndex: this.networkKeyIndex,
      flags: 0,
      ivIndex: this.ivIndex,
      attentionDuration: 0,
      ...options,
    };

    try {
      // Start provisioning
      const result = await telinkBle.startProvisioning(device, config);

      if (!result.success) {
        throw new Error(result.error || 'Provisioning failed');
      }

      // Increment address for next device
      this.nextAddress++;

      // Create mesh node from result
      return this.createMeshNode(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fast provisioning for multiple devices
   * Provisions devices sequentially with automatic address allocation
   */
  async fastProvisionDevices(devices: DiscoveredDevice[]): Promise<MeshNode[]> {
    if (devices.length === 0) {
      return [];
    }

    try {
      const results = await telinkBle.startFastProvisioning(
        devices,
        this.nextAddress
      );

      // Update next address
      this.nextAddress += devices.length;

      // Convert successful results to mesh nodes
      const meshNodes: MeshNode[] = [];
      for (const result of results) {
        if (result.success) {
          meshNodes.push(this.createMeshNode(result));
        }
      }

      return meshNodes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Provision device with automatic retry on failure
   */
  async provisionDeviceWithRetry(
    device: DiscoveredDevice,
    maxRetries: number = 3,
    retryDelay: number = 2000
  ): Promise<MeshNode> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.provisionDevice(device);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Provisioning attempt ${attempt + 1}/${maxRetries} failed:`,
          error
        );

        // Don't delay after last attempt
        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Provisioning failed after all retries');
  }

  /**
   * Provision devices in batches to avoid overwhelming the network
   */
  async provisionDevicesInBatches(
    devices: DiscoveredDevice[],
    batchSize: number = 5,
    batchDelay: number = 3000
  ): Promise<MeshNode[]> {
    const allNodes: MeshNode[] = [];

    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      console.log(
        `Provisioning batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(devices.length / batchSize)}`
      );

      const batchNodes = await this.fastProvisionDevices(batch);
      allNodes.push(...batchNodes);

      // Delay between batches (except after last batch)
      if (i + batchSize < devices.length) {
        await this.delay(batchDelay);
      }
    }

    return allNodes;
  }

  /**
   * Provision device and configure default settings
   */
  async provisionAndConfigure(
    device: DiscoveredDevice,
    groupAddress?: number
  ): Promise<MeshNode> {
    // Provision the device
    const node = await this.provisionDevice(device);

    try {
      // Add to group if specified
      if (groupAddress) {
        await telinkBle.addDeviceToGroup(node.unicastAddress, groupAddress);
      }

      // You can add more default configuration here
      // e.g., binding app keys, setting publication, etc.

      return node;
    } catch (error) {
      console.warn('Post-provisioning configuration failed:', error);
      // Return the node even if configuration failed
      return node;
    }
  }

  /**
   * Listen to provisioning events
   */
  onProvisioningProgress(
    callback: (event: {
      step: string;
      progress: number;
      deviceUuid: string;
      nodeAddress?: number;
      message?: string;
    }) => void
  ): string {
    return telinkBle.addEventListener(
      MeshEventType.PROVISIONING_PROGRESS,
      callback
    );
  }

  onProvisioningCompleted(
    callback: (event: { deviceUuid: string; nodeAddress: number }) => void
  ): string {
    return telinkBle.addEventListener(
      MeshEventType.PROVISIONING_COMPLETED,
      callback
    );
  }

  onProvisioningFailed(
    callback: (event: { deviceUuid: string; error: string }) => void
  ): string {
    return telinkBle.addEventListener(
      MeshEventType.PROVISIONING_FAILED,
      callback
    );
  }

  /**
   * Remove event listener
   */
  removeEventListener(subscriptionId: string): void {
    telinkBle.removeEventListener(subscriptionId);
  }

  /**
   * Helper to create MeshNode from ProvisionResult
   */
  private createMeshNode(result: ProvisionResult): MeshNode {
    return {
      unicastAddress: result.nodeAddress,
      deviceKey: result.deviceKey,
      uuid: result.uuid,
      networkKeys: [this.networkKeyIndex],
      appKeys: [],
      isOnline: false,
      compositionData: result.compositionData,
    };
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default ProvisioningWorkflow;

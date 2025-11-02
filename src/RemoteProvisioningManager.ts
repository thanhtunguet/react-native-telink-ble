import telinkBle from './index';
import type {
  DiscoveredDevice,
  RemoteProvisionConfig,
  RemoteProvisionResult,
  MeshNode,
} from './types';
import { Phase4EventType } from './types';

/**
 * High-level remote provisioning helper class
 * Handles provisioning devices through existing mesh nodes (proxy nodes)
 */
export class RemoteProvisioningManager {
  private nextAddress: number = 1;
  private networkKeyIndex: number = 0;
  private ivIndex: number = 0;
  private defaultProxyNodeAddress?: number;

  constructor(config?: {
    startAddress?: number;
    networkKeyIndex?: number;
    ivIndex?: number;
    defaultProxyNodeAddress?: number;
  }) {
    if (config?.startAddress) this.nextAddress = config.startAddress;
    if (config?.networkKeyIndex !== undefined)
      this.networkKeyIndex = config.networkKeyIndex;
    if (config?.ivIndex !== undefined) this.ivIndex = config.ivIndex;
    if (config?.defaultProxyNodeAddress !== undefined)
      this.defaultProxyNodeAddress = config.defaultProxyNodeAddress;
  }

  /**
   * Set default proxy node for remote provisioning
   */
  setDefaultProxyNode(nodeAddress: number): void {
    this.defaultProxyNodeAddress = nodeAddress;
  }

  /**
   * Get the default proxy node address
   */
  getDefaultProxyNode(): number | undefined {
    return this.defaultProxyNodeAddress;
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
   * Remote provision a single device through an existing mesh node
   */
  async remoteProvisionDevice(
    device: DiscoveredDevice,
    proxyNodeAddress?: number,
    options?: Partial<RemoteProvisionConfig>
  ): Promise<MeshNode> {
    const proxy = proxyNodeAddress ?? this.defaultProxyNodeAddress;
    if (!proxy) {
      throw new Error(
        'Proxy node address is required for remote provisioning. Set it via constructor or setDefaultProxyNode()'
      );
    }

    // Create remote provisioning config
    const config: RemoteProvisionConfig = {
      unicastAddress: this.nextAddress,
      networkKeyIndex: this.networkKeyIndex,
      flags: 0,
      ivIndex: this.ivIndex,
      proxyNodeAddress: proxy,
      attentionDuration: 0,
      timeout: 30000, // 30 seconds default
      ...options,
    };

    try {
      // Start remote provisioning
      const result = await telinkBle.startRemoteProvisioning(device, config);

      if (!result.success) {
        throw new Error(result.error || 'Remote provisioning failed');
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
   * Remote provision device with automatic retry on failure
   */
  async remoteProvisionDeviceWithRetry(
    device: DiscoveredDevice,
    proxyNodeAddress?: number,
    maxRetries: number = 3,
    retryDelay: number = 3000
  ): Promise<MeshNode> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.remoteProvisionDevice(device, proxyNodeAddress);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Remote provisioning attempt ${attempt + 1}/${maxRetries} failed:`,
          error
        );

        // Don't delay after last attempt
        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw (
      lastError || new Error('Remote provisioning failed after all retries')
    );
  }

  /**
   * Remote provision multiple devices in batches
   */
  async remoteProvisionDevicesInBatches(
    devices: DiscoveredDevice[],
    proxyNodeAddress?: number,
    batchSize: number = 3,
    batchDelay: number = 5000
  ): Promise<MeshNode[]> {
    const allNodes: MeshNode[] = [];
    const proxy = proxyNodeAddress ?? this.defaultProxyNodeAddress;

    if (!proxy) {
      throw new Error('Proxy node address is required for remote provisioning');
    }

    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      console.log(
        `Remote provisioning batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(devices.length / batchSize)}`
      );

      // Provision devices in batch sequentially (remote provisioning is slower)
      for (const device of batch) {
        try {
          const node = await this.remoteProvisionDevice(device, proxy);
          allNodes.push(node);
        } catch (error) {
          console.error(`Failed to provision device ${device.address}:`, error);
          // Continue with next device
        }
      }

      // Delay between batches (except after last batch)
      if (i + batchSize < devices.length) {
        await this.delay(batchDelay);
      }
    }

    return allNodes;
  }

  /**
   * Remote provision device and configure default settings
   */
  async remoteProvisionAndConfigure(
    device: DiscoveredDevice,
    proxyNodeAddress?: number,
    groupAddress?: number
  ): Promise<MeshNode> {
    // Provision the device
    const node = await this.remoteProvisionDevice(device, proxyNodeAddress);

    try {
      // Add to group if specified
      if (groupAddress) {
        await telinkBle.addDeviceToGroup(node.unicastAddress, groupAddress);
      }

      return node;
    } catch (error) {
      console.warn('Post-provisioning configuration failed:', error);
      // Return the node even if configuration failed
      return node;
    }
  }

  /**
   * Cancel ongoing remote provisioning
   */
  async cancel(): Promise<void> {
    await telinkBle.cancelRemoteProvisioning();
  }

  /**
   * Listen to remote provisioning progress events
   */
  onRemoteProvisioningProgress(
    callback: (event: {
      step: string;
      progress: number;
      deviceUuid: string;
      proxyNodeAddress: number;
      message?: string;
    }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.REMOTE_PROVISIONING_PROGRESS as any,
      callback
    );
  }

  /**
   * Listen to remote provisioning completion events
   */
  onRemoteProvisioningCompleted(
    callback: (event: {
      deviceUuid: string;
      nodeAddress: number;
      proxyNodeAddress: number;
      provisioningTime: number;
    }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.REMOTE_PROVISIONING_COMPLETED as any,
      callback
    );
  }

  /**
   * Listen to remote provisioning failure events
   */
  onRemoteProvisioningFailed(
    callback: (event: {
      deviceUuid: string;
      proxyNodeAddress: number;
      error: string;
    }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.REMOTE_PROVISIONING_FAILED as any,
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
   * Helper to create MeshNode from RemoteProvisionResult
   */
  private createMeshNode(result: RemoteProvisionResult): MeshNode {
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

export default RemoteProvisioningManager;

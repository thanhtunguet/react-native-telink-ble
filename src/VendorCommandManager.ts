import telinkBle from './index';
import type {
  VendorCommand,
  VendorCommandResponse,
  VendorModelInfo,
} from './types';
import { Phase4EventType } from './types';

/**
 * High-level vendor command manager class
 * Handles vendor-specific commands and custom device functionality
 */
export class VendorCommandManager {
  private registeredCompanies: Set<number> = new Set();
  private vendorModelsCache: Map<number, VendorModelInfo[]> = new Map();
  private pendingCommands: Map<
    string,
    {
      resolve: (response: VendorCommandResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  /**
   * Send a vendor-specific command to a device
   */
  async sendCommand(
    target: number,
    companyId: number,
    opcode: number,
    parameters: number[],
    options?: {
      acknowledged?: boolean;
      timeout?: number;
    }
  ): Promise<VendorCommandResponse | null> {
    const command: VendorCommand = {
      companyId,
      opcode,
      parameters,
      acknowledged: options?.acknowledged ?? true,
      timeout: options?.timeout ?? 5000,
    };

    try {
      const response = await telinkBle.sendVendorCommand(target, command);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a vendor command and wait for response with promise
   */
  async sendCommandWithResponse(
    target: number,
    companyId: number,
    opcode: number,
    parameters: number[],
    timeout: number = 5000
  ): Promise<VendorCommandResponse> {
    const commandId = `${target}_${companyId}_${opcode}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error('Vendor command timeout'));
      }, timeout);

      // Store promise handlers
      this.pendingCommands.set(commandId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Send command
      this.sendCommand(target, companyId, opcode, parameters, {
        acknowledged: true,
        timeout,
      })
        .then((response) => {
          const pending = this.pendingCommands.get(commandId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingCommands.delete(commandId);
            if (response) {
              resolve(response);
            } else {
              reject(new Error('No response received'));
            }
          }
        })
        .catch((error) => {
          const pending = this.pendingCommands.get(commandId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingCommands.delete(commandId);
            reject(error);
          }
        });
    });
  }

  /**
   * Send broadcast vendor command to multiple devices
   */
  async broadcastCommand(
    targets: number[],
    companyId: number,
    opcode: number,
    parameters: number[],
    delayBetween: number = 100
  ): Promise<Map<number, VendorCommandResponse | null>> {
    const results = new Map<number, VendorCommandResponse | null>();

    for (const target of targets) {
      try {
        const response = await this.sendCommand(
          target,
          companyId,
          opcode,
          parameters
        );
        results.set(target, response);

        // Delay between commands
        if (target !== targets[targets.length - 1] && delayBetween > 0) {
          await this.delay(delayBetween);
        }
      } catch (error) {
        console.error(`Failed to send command to node ${target}:`, error);
        results.set(target, null);
      }
    }

    return results;
  }

  /**
   * Get supported vendor models for a device
   */
  async getDeviceVendorModels(
    nodeAddress: number,
    useCache: boolean = true
  ): Promise<VendorModelInfo[]> {
    // Check cache first
    if (useCache && this.vendorModelsCache.has(nodeAddress)) {
      return this.vendorModelsCache.get(nodeAddress)!;
    }

    try {
      const models = await telinkBle.getVendorModels(nodeAddress);
      this.vendorModelsCache.set(nodeAddress, models);
      return models;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a device supports a specific vendor model
   */
  async supportsVendorModel(
    nodeAddress: number,
    companyId: number,
    modelId: number
  ): Promise<boolean> {
    try {
      const models = await this.getDeviceVendorModels(nodeAddress);
      return models.some(
        (model) => model.companyId === companyId && model.modelId === modelId
      );
    } catch (error) {
      console.error('Failed to check vendor model support:', error);
      return false;
    }
  }

  /**
   * Register to receive vendor messages from a specific company
   */
  async registerCompany(companyId: number): Promise<void> {
    if (this.registeredCompanies.has(companyId)) {
      console.warn(`Company ${companyId} is already registered`);
      return;
    }

    try {
      await telinkBle.registerVendorMessageHandler(companyId);
      this.registeredCompanies.add(companyId);
      console.log(`Registered vendor message handler for company ${companyId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unregister vendor message handler for a company
   */
  async unregisterCompany(companyId: number): Promise<void> {
    if (!this.registeredCompanies.has(companyId)) {
      console.warn(`Company ${companyId} is not registered`);
      return;
    }

    try {
      await telinkBle.unregisterVendorMessageHandler(companyId);
      this.registeredCompanies.delete(companyId);
      console.log(
        `Unregistered vendor message handler for company ${companyId}`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get list of registered companies
   */
  getRegisteredCompanies(): number[] {
    return Array.from(this.registeredCompanies);
  }

  /**
   * Clear vendor models cache
   */
  clearCache(): void {
    this.vendorModelsCache.clear();
  }

  /**
   * Clear cache for a specific node
   */
  clearNodeCache(nodeAddress: number): void {
    this.vendorModelsCache.delete(nodeAddress);
  }

  /**
   * Listen to vendor message received events
   */
  onVendorMessage(
    callback: (message: {
      sourceAddress: number;
      companyId: number;
      opcode: number;
      data: number[];
      timestamp: Date;
    }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.VENDOR_MESSAGE_RECEIVED as any,
      callback
    );
  }

  /**
   * Listen to vendor command response events
   */
  onVendorResponse(
    callback: (response: VendorCommandResponse) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.VENDOR_COMMAND_RESPONSE as any,
      callback
    );
  }

  /**
   * Listen to vendor messages from a specific company
   */
  onCompanyMessage(
    companyId: number,
    callback: (message: {
      sourceAddress: number;
      opcode: number;
      data: number[];
    }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.VENDOR_MESSAGE_RECEIVED as any,
      (message: {
        sourceAddress: number;
        companyId: number;
        opcode: number;
        data: number[];
      }) => {
        if (message.companyId === companyId) {
          callback({
            sourceAddress: message.sourceAddress,
            opcode: message.opcode,
            data: message.data,
          });
        }
      }
    );
  }

  /**
   * Remove event listener
   */
  removeEventListener(subscriptionId: string): void {
    telinkBle.removeEventListener(subscriptionId);
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Unregister all companies
    const companies = Array.from(this.registeredCompanies);
    for (const companyId of companies) {
      try {
        await this.unregisterCompany(companyId);
      } catch (error) {
        console.error(`Failed to unregister company ${companyId}:`, error);
      }
    }

    // Clear all caches
    this.clearCache();

    // Cancel all pending commands
    for (const [_commandId, pending] of this.pendingCommands.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Manager cleanup - command cancelled'));
    }
    this.pendingCommands.clear();
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Pre-defined vendor command helpers for common operations
 */
export class VendorCommandHelpers {
  private manager: VendorCommandManager;

  constructor(manager?: VendorCommandManager) {
    this.manager = manager || new VendorCommandManager();
  }

  /**
   * Send a custom device reset command
   */
  async resetDevice(
    nodeAddress: number,
    companyId: number
  ): Promise<VendorCommandResponse | null> {
    return this.manager.sendCommand(nodeAddress, companyId, 0x00, [0x01]);
  }

  /**
   * Request device status from vendor model
   */
  async getDeviceStatus(
    nodeAddress: number,
    companyId: number
  ): Promise<VendorCommandResponse | null> {
    return this.manager.sendCommand(nodeAddress, companyId, 0x01, []);
  }

  /**
   * Send custom configuration to vendor model
   */
  async setConfiguration(
    nodeAddress: number,
    companyId: number,
    configData: number[]
  ): Promise<VendorCommandResponse | null> {
    return this.manager.sendCommand(nodeAddress, companyId, 0x02, configData);
  }
}

export default VendorCommandManager;

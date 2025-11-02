import telinkBle from './index';
import type {
  FirmwareUpdateConfig,
  FirmwareInfo,
  FirmwareUpdateProgress,
  FirmwareUpdateResult,
} from './types';
import { Phase4EventType } from './types';

/**
 * High-level firmware update (OTA) manager class
 * Handles firmware updates for mesh devices with progress tracking
 */
export class FirmwareUpdateManager {
  private activeUpdates: Map<number, FirmwareUpdateProgress> = new Map();

  /**
   * Update firmware on a single device
   */
  async updateFirmware(
    nodeAddress: number,
    firmwareData: string,
    firmwareInfo: FirmwareInfo,
    options?: {
      updatePolicy?: 'verify-and-apply' | 'verify-only' | 'force-apply';
      chunkSize?: number;
      transferMode?: 'reliable' | 'fast';
    }
  ): Promise<FirmwareUpdateResult> {
    const config: FirmwareUpdateConfig = {
      nodeAddress,
      firmwareData,
      firmwareInfo,
      metadata: {
        updatePolicy: options?.updatePolicy || 'verify-and-apply',
        chunkSize: options?.chunkSize || 256,
        transferMode: options?.transferMode || 'reliable',
      },
    };

    try {
      // Check current firmware version
      const currentVersion = await this.getCurrentFirmwareVersion(nodeAddress);
      console.log(
        `Current firmware version on node ${nodeAddress}: ${currentVersion}`
      );

      // Verify firmware before starting update (if not force-apply)
      if (config.metadata?.updatePolicy !== 'force-apply') {
        const isValid = await telinkBle.verifyFirmware(
          nodeAddress,
          firmwareInfo
        );
        if (!isValid) {
          throw new Error('Firmware verification failed');
        }
      }

      // Start firmware update
      await telinkBle.startFirmwareUpdate(config);

      // Wait for completion (polling approach - in real implementation, use events)
      return await this.waitForUpdateCompletion(
        nodeAddress,
        currentVersion,
        firmwareInfo.version
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update firmware with automatic retry on failure
   */
  async updateFirmwareWithRetry(
    nodeAddress: number,
    firmwareData: string,
    firmwareInfo: FirmwareInfo,
    maxRetries: number = 2,
    retryDelay: number = 5000
  ): Promise<FirmwareUpdateResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.updateFirmware(
          nodeAddress,
          firmwareData,
          firmwareInfo
        );
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Firmware update attempt ${attempt + 1}/${maxRetries} failed:`,
          error
        );

        // Cancel failed update
        await this.cancelUpdate(nodeAddress);

        // Don't delay after last attempt
        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay);
        }
      }
    }

    throw lastError || new Error('Firmware update failed after all retries');
  }

  /**
   * Update firmware on multiple devices sequentially
   */
  async updateMultipleDevices(
    updates: Array<{
      nodeAddress: number;
      firmwareData: string;
      firmwareInfo: FirmwareInfo;
    }>,
    delayBetween: number = 3000
  ): Promise<FirmwareUpdateResult[]> {
    const results: FirmwareUpdateResult[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateFirmware(
          update.nodeAddress,
          update.firmwareData,
          update.firmwareInfo
        );
        results.push(result);

        // Delay between updates
        if (update !== updates[updates.length - 1]) {
          await this.delay(delayBetween);
        }
      } catch (error) {
        console.error(
          `Failed to update firmware on node ${update.nodeAddress}:`,
          error
        );
        results.push({
          success: false,
          nodeAddress: update.nodeAddress,
          previousVersion: 'unknown',
          newVersion: update.firmwareInfo.version,
          duration: 0,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Verify firmware without applying it
   */
  async verifyFirmwareOnly(
    nodeAddress: number,
    firmwareInfo: FirmwareInfo
  ): Promise<boolean> {
    try {
      return await telinkBle.verifyFirmware(nodeAddress, firmwareInfo);
    } catch (error) {
      console.error('Firmware verification failed:', error);
      return false;
    }
  }

  /**
   * Get current firmware version of a device
   */
  async getCurrentFirmwareVersion(nodeAddress: number): Promise<string> {
    try {
      return await telinkBle.getFirmwareVersion(nodeAddress);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a device needs firmware update
   */
  async needsUpdate(
    nodeAddress: number,
    targetVersion: string
  ): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentFirmwareVersion(nodeAddress);
      return this.compareVersions(currentVersion, targetVersion) < 0;
    } catch (error) {
      console.error('Failed to check if update is needed:', error);
      return false;
    }
  }

  /**
   * Cancel ongoing firmware update
   */
  async cancelUpdate(nodeAddress: number): Promise<void> {
    try {
      await telinkBle.cancelFirmwareUpdate(nodeAddress);
      this.activeUpdates.delete(nodeAddress);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current update progress for a device
   */
  getUpdateProgress(nodeAddress: number): FirmwareUpdateProgress | undefined {
    return this.activeUpdates.get(nodeAddress);
  }

  /**
   * Get all active updates
   */
  getActiveUpdates(): Map<number, FirmwareUpdateProgress> {
    return new Map(this.activeUpdates);
  }

  /**
   * Listen to firmware update progress events
   */
  onUpdateProgress(
    callback: (progress: FirmwareUpdateProgress) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.FIRMWARE_UPDATE_PROGRESS as any,
      (data: FirmwareUpdateProgress) => {
        // Update internal tracking
        this.activeUpdates.set(data.nodeAddress, data);
        callback(data);
      }
    );
  }

  /**
   * Listen to firmware update completion events
   */
  onUpdateCompleted(callback: (result: FirmwareUpdateResult) => void): string {
    return telinkBle.addEventListener(
      Phase4EventType.FIRMWARE_UPDATE_COMPLETED as any,
      (data: FirmwareUpdateResult) => {
        // Clean up tracking
        this.activeUpdates.delete(data.nodeAddress);
        callback(data);
      }
    );
  }

  /**
   * Listen to firmware update failure events
   */
  onUpdateFailed(
    callback: (event: { nodeAddress: number; error: string }) => void
  ): string {
    return telinkBle.addEventListener(
      Phase4EventType.FIRMWARE_UPDATE_FAILED as any,
      (data: { nodeAddress: number; error: string }) => {
        // Clean up tracking
        this.activeUpdates.delete(data.nodeAddress);
        callback(data);
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
   * Helper to wait for update completion (used internally)
   */
  private async waitForUpdateCompletion(
    nodeAddress: number,
    _previousVersion: string,
    _newVersion: string
  ): Promise<FirmwareUpdateResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Firmware update timeout'));
      }, 300000); // 5 minutes timeout

      const completedSub = this.onUpdateCompleted((result) => {
        if (result.nodeAddress === nodeAddress) {
          cleanup();
          resolve(result);
        }
      });

      const failedSub = this.onUpdateFailed((event) => {
        if (event.nodeAddress === nodeAddress) {
          cleanup();
          reject(new Error(event.error));
        }
      });

      const cleanup = () => {
        clearTimeout(timeout);
        this.removeEventListener(completedSub);
        this.removeEventListener(failedSub);
      };
    });
  }

  /**
   * Compare version strings (simple implementation)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map((n) => parseInt(n, 10));
    const v2Parts = version2.split('.').map((n) => parseInt(n, 10));

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default FirmwareUpdateManager;

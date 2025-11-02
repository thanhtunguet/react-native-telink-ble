import { useState, useEffect, useCallback } from 'react';
import { useTelinkMeshContext } from '../context/TelinkMeshContext';
import { FirmwareUpdateManager } from '../FirmwareUpdateManager';
import { FirmwareUpdateStage } from '../types';
import type { FirmwareUpdateProgress, FirmwareInfo } from '../types';

export interface UseFirmwareUpdateOptions {
  /**
   * Callback for update progress
   */
  onProgress?: (progress: FirmwareUpdateProgress) => void;

  /**
   * Callback for update success
   */
  onSuccess?: (nodeAddress: number) => void;

  /**
   * Callback for update failure
   */
  onFailure?: (nodeAddress: number, error: Error) => void;

  /**
   * Auto-verify firmware before updating
   */
  autoVerify?: boolean;
}

export interface FirmwareUpdateConfig {
  nodeAddress: number;
  firmwareData: string;
  firmwareInfo: FirmwareInfo;
  metadata?: {
    updatePolicy?: 'verify-and-apply' | 'verify-only' | 'force-apply';
    chunkSize?: number;
    transferMode?: 'reliable' | 'fast';
  };
}

export interface UseFirmwareUpdateReturn {
  // State
  isUpdating: boolean;
  currentProgress: FirmwareUpdateProgress | null;
  error: Error | null;

  // Operations
  startUpdate: (config: FirmwareUpdateConfig) => Promise<void>;
  cancelUpdate: (nodeAddress: number) => Promise<void>;
  verifyFirmware: (
    nodeAddress: number,
    firmwareInfo: FirmwareInfo
  ) => Promise<boolean>;
  getFirmwareVersion: (nodeAddress: number) => Promise<string>;
  updateMultiple: (configs: FirmwareUpdateConfig[]) => Promise<void>;

  // Utility
  clearError: () => void;
  resetProgress: () => void;
}

/**
 * useFirmwareUpdate - Hook for managing firmware updates (OTA)
 *
 * @example
 * ```tsx
 * function FirmwareUpdateScreen({ nodeAddress }: { nodeAddress: number }) {
 *   const {
 *     isUpdating,
 *     currentProgress,
 *     startUpdate,
 *     getFirmwareVersion,
 *   } = useFirmwareUpdate({
 *     autoVerify: true,
 *     onProgress: (progress) => console.log(`${progress.percentage}%`),
 *     onSuccess: () => console.log('Update completed'),
 *   });
 *
 *   const [currentVersion, setCurrentVersion] = useState('');
 *
 *   useEffect(() => {
 *     getFirmwareVersion(nodeAddress).then(setCurrentVersion);
 *   }, [nodeAddress]);
 *
 *   const handleUpdate = async (firmwareData: string) => {
 *     await startUpdate({
 *       nodeAddress,
 *       firmwareData,
 *       metadata: { version: '2.0.0' },
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Current Version: {currentVersion}</Text>
 *       {currentProgress && (
 *         <View>
 *           <ProgressBar progress={currentProgress.percentage / 100} />
 *           <Text>{currentProgress.stage}</Text>
 *           <Text>
 *             {currentProgress.bytesTransferred}/{currentProgress.totalBytes} bytes
 *           </Text>
 *         </View>
 *       )}
 *       <Button
 *         title="Update Firmware"
 *         onPress={() => handleUpdate(firmwareHex)}
 *         disabled={isUpdating}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useFirmwareUpdate(
  options: UseFirmwareUpdateOptions = {}
): UseFirmwareUpdateReturn {
  const { onProgress, onSuccess, onFailure, autoVerify = true } = options;

  const context = useTelinkMeshContext();
  const [manager] = useState(() => new FirmwareUpdateManager());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentProgress, setCurrentProgress] =
    useState<FirmwareUpdateProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const startUpdate = useCallback(
    async (config: FirmwareUpdateConfig) => {
      setIsUpdating(true);
      setError(null);
      setCurrentProgress({
        nodeAddress: config.nodeAddress,
        percentage: 0,
        bytesTransferred: 0,
        totalBytes: 0,
        stage: FirmwareUpdateStage.PREPARING,
        estimatedTimeRemaining: 0,
      });

      try {
        // Auto-verify if enabled
        if (autoVerify) {
          const isValid = await manager.verifyFirmwareOnly(
            config.nodeAddress,
            config.firmwareInfo
          );

          if (!isValid) {
            throw new Error('Firmware verification failed');
          }
        }

        await manager.updateFirmware(
          config.nodeAddress,
          config.firmwareData,
          config.firmwareInfo,
          config.metadata
        );

        onSuccess?.(config.nodeAddress);
      } catch (err) {
        const updateError = err as Error;
        setError(updateError);
        onFailure?.(config.nodeAddress, updateError);
        throw updateError;
      } finally {
        setIsUpdating(false);
      }
    },
    [manager, autoVerify, onSuccess, onFailure]
  );

  const cancelUpdate = useCallback(
    async (nodeAddress: number) => {
      try {
        await manager.cancelUpdate(nodeAddress);
        setIsUpdating(false);
        setCurrentProgress(null);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [manager]
  );

  const verifyFirmware = useCallback(
    async (
      nodeAddress: number,
      firmwareInfo: FirmwareInfo
    ): Promise<boolean> => {
      try {
        const isValid = await manager.verifyFirmwareOnly(
          nodeAddress,
          firmwareInfo
        );
        return isValid;
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [manager]
  );

  const getFirmwareVersion = useCallback(
    async (nodeAddress: number): Promise<string> => {
      try {
        const version = await manager.getCurrentFirmwareVersion(nodeAddress);
        return version;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [manager]
  );

  const updateMultiple = useCallback(
    async (configs: FirmwareUpdateConfig[]) => {
      setIsUpdating(true);
      setError(null);

      try {
        for (let i = 0; i < configs.length; i++) {
          const config = configs[i]!;

          setCurrentProgress({
            nodeAddress: config.nodeAddress,
            percentage: 0,
            bytesTransferred: 0,
            totalBytes: 0,
            stage: FirmwareUpdateStage.PREPARING,
            estimatedTimeRemaining: 0,
          });

          try {
            await manager.updateFirmware(
              config.nodeAddress,
              config.firmwareData,
              config.firmwareInfo,
              config.metadata
            );
            onSuccess?.(config.nodeAddress);
          } catch (err) {
            console.error(`Failed to update node ${config.nodeAddress}:`, err);
            onFailure?.(config.nodeAddress, err as Error);
            // Continue with next device
          }
        }
      } catch (err) {
        const batchError = err as Error;
        setError(batchError);
        throw batchError;
      } finally {
        setIsUpdating(false);
      }
    },
    [manager, onSuccess, onFailure]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setCurrentProgress(null);
  }, []);

  // Listen to firmware update progress events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'firmwareUpdateProgress',
      (event: FirmwareUpdateProgress) => {
        setCurrentProgress(event);
        onProgress?.(event);
      }
    );

    return removeListener;
  }, [context, onProgress]);

  // Listen to firmware update completed events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'firmwareUpdateCompleted',
      (event: { nodeAddress: number }) => {
        setIsUpdating(false);
        setCurrentProgress({
          nodeAddress: event.nodeAddress,
          percentage: 100,
          bytesTransferred: 0,
          totalBytes: 0,
          stage: FirmwareUpdateStage.COMPLETED,
          estimatedTimeRemaining: 0,
        });
      }
    );

    return removeListener;
  }, [context]);

  // Listen to firmware update failed events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'firmwareUpdateFailed',
      (event: { nodeAddress: number; error: string }) => {
        setIsUpdating(false);
        const failureError = new Error(event.error);
        setError(failureError);
        onFailure?.(event.nodeAddress, failureError);
      }
    );

    return removeListener;
  }, [context, onFailure]);

  return {
    isUpdating,
    currentProgress,
    error,
    startUpdate,
    cancelUpdate,
    verifyFirmware,
    getFirmwareVersion,
    updateMultiple,
    clearError,
    resetProgress,
  };
}

export default useFirmwareUpdate;

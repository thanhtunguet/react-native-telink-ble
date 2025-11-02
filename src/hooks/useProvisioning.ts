import { useState, useEffect, useCallback } from 'react';
import { useTelinkMeshContext } from '../context/TelinkMeshContext';
import { ProvisioningWorkflow } from '../ProvisioningWorkflow';
import TelinkBle from '../index';
import type {
  DiscoveredDevice,
  MeshNode,
  ProvisioningProgress,
} from '../types';

export interface UseProvisioningOptions {
  /**
   * Auto-increment address for sequential provisioning
   */
  autoIncrementAddress?: boolean;

  /**
   * Starting address for auto-increment
   */
  startAddress?: number;

  /**
   * Callback for provisioning progress
   */
  onProgress?: (progress: ProvisioningProgress) => void;

  /**
   * Callback for provisioning success
   */
  onSuccess?: (node: MeshNode) => void;

  /**
   * Callback for provisioning failure
   */
  onFailure?: (error: Error) => void;
}

export interface UseProvisioningReturn {
  // State
  isProvisioning: boolean;
  currentProgress: ProvisioningProgress | null;
  provisionedDevices: MeshNode[];
  error: Error | null;

  // Operations
  provisionDevice: (
    device: DiscoveredDevice,
    address?: number
  ) => Promise<MeshNode>;
  provisionMultiple: (
    devices: DiscoveredDevice[],
    startAddress?: number
  ) => Promise<MeshNode[]>;
  cancelProvisioning: () => Promise<void>;

  // Utility
  getNextAvailableAddress: () => Promise<number>;
  clearError: () => void;
  resetProvisionedDevices: () => void;
}

/**
 * useProvisioning - Hook for device provisioning operations
 *
 * @example
 * ```tsx
 * function ProvisioningScreen() {
 *   const { discoveredDevices } = useTelinkMesh();
 *   const {
 *     isProvisioning,
 *     currentProgress,
 *     provisionDevice,
 *     provisionedDevices,
 *   } = useProvisioning({
 *     autoIncrementAddress: true,
 *     startAddress: 0x0001,
 *     onProgress: (progress) => console.log(progress),
 *     onSuccess: (node) => console.log('Provisioned:', node),
 *   });
 *
 *   return (
 *     <View>
 *       {discoveredDevices.map((device) => (
 *         <Button
 *           key={device.address}
 *           title={`Provision ${device.name}`}
 *           onPress={() => provisionDevice(device)}
 *           disabled={isProvisioning}
 *         />
 *       ))}
 *       {currentProgress && (
 *         <View>
 *           <Text>{currentProgress.step}</Text>
 *           <ProgressBar progress={currentProgress.progress / 100} />
 *         </View>
 *       )}
 *       <Text>Provisioned: {provisionedDevices.length}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useProvisioning(
  options: UseProvisioningOptions = {}
): UseProvisioningReturn {
  const {
    autoIncrementAddress = true,
    startAddress = 0x0001,
    onProgress,
    onSuccess,
    onFailure,
  } = options;

  const context = useTelinkMeshContext();
  const [workflow] = useState(() => new ProvisioningWorkflow());
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [currentProgress, setCurrentProgress] =
    useState<ProvisioningProgress | null>(null);
  const [provisionedDevices, setProvisionedDevices] = useState<MeshNode[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [nextAddress, setNextAddress] = useState(startAddress);

  const getNextAvailableAddress = useCallback(async (): Promise<number> => {
    if (autoIncrementAddress) {
      return nextAddress;
    }

    // Get all nodes and find next available address
    const allNodes = await context.refreshNodes().then(() => context.nodes);
    const usedAddresses = new Set(allNodes.map((node) => node.unicastAddress));

    let address = startAddress;
    while (usedAddresses.has(address)) {
      address++;
    }

    return address;
  }, [autoIncrementAddress, nextAddress, context, startAddress]);

  const provisionDevice = useCallback(
    async (device: DiscoveredDevice, address?: number): Promise<MeshNode> => {
      setIsProvisioning(true);
      setError(null);
      setCurrentProgress({
        step: 'Starting provisioning',
        progress: 0,
        deviceUuid: device.advertisementData.deviceUuid || device.address,
      });

      try {
        const targetAddress = address ?? (await getNextAvailableAddress());

        const node = await workflow.provisionDevice(device, {
          unicastAddress: targetAddress,
        });

        if (autoIncrementAddress) {
          setNextAddress(targetAddress + 1);
        }

        setProvisionedDevices((prev) => [...prev, node]);
        setCurrentProgress({
          step: 'Provisioning completed',
          progress: 100,
          deviceUuid: device.advertisementData.deviceUuid || device.address,
          nodeAddress: node.unicastAddress,
        });

        onSuccess?.(node);

        // Refresh nodes in context
        await context.refreshNodes();

        return node;
      } catch (err) {
        const provisionError = err as Error;
        setError(provisionError);
        setCurrentProgress(null);
        onFailure?.(provisionError);
        throw provisionError;
      } finally {
        setIsProvisioning(false);
      }
    },
    [
      workflow,
      autoIncrementAddress,
      getNextAvailableAddress,
      onSuccess,
      onFailure,
      context,
    ]
  );

  const provisionMultiple = useCallback(
    async (
      devices: DiscoveredDevice[],
      startAddr?: number
    ): Promise<MeshNode[]> => {
      setIsProvisioning(true);
      setError(null);

      const results: MeshNode[] = [];
      const start = startAddr ?? (await getNextAvailableAddress());

      try {
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i]!;
          const address = start + i;

          setCurrentProgress({
            step: `Provisioning device ${i + 1}/${devices.length}`,
            progress: (i / devices.length) * 100,
            deviceUuid: device.advertisementData.deviceUuid || device.address,
            nodeAddress: address,
          });

          try {
            const node = await workflow.provisionDevice(device, {
              unicastAddress: address,
            });
            results.push(node);
            setProvisionedDevices((prev) => [...prev, node]);
            onSuccess?.(node);
          } catch (err) {
            console.error(`Failed to provision device ${device.name}:`, err);
            // Continue with next device
          }
        }

        if (autoIncrementAddress) {
          setNextAddress(start + devices.length);
        }

        setCurrentProgress({
          step: 'Batch provisioning completed',
          progress: 100,
          deviceUuid: '',
        });

        // Refresh nodes in context
        await context.refreshNodes();

        return results;
      } catch (err) {
        const batchError = err as Error;
        setError(batchError);
        onFailure?.(batchError);
        throw batchError;
      } finally {
        setIsProvisioning(false);
      }
    },
    [
      workflow,
      autoIncrementAddress,
      getNextAvailableAddress,
      onSuccess,
      onFailure,
      context,
    ]
  );

  const cancelProvisioning = useCallback(async () => {
    try {
      await TelinkBle.cancelProvisioning();
      setIsProvisioning(false);
      setCurrentProgress(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProvisionedDevices = useCallback(() => {
    setProvisionedDevices([]);
  }, []);

  // Listen to provisioning progress events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'provisioningProgress',
      (event: ProvisioningProgress) => {
        setCurrentProgress(event);
        onProgress?.(event);
      }
    );

    return removeListener;
  }, [context, onProgress]);

  // Listen to provisioning completed events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'provisioningCompleted',
      () => {
        setIsProvisioning(false);
      }
    );

    return removeListener;
  }, [context]);

  // Listen to provisioning failed events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'provisioningFailed',
      (event: { error: string }) => {
        setIsProvisioning(false);
        setError(new Error(event.error));
        onFailure?.(new Error(event.error));
      }
    );

    return removeListener;
  }, [context, onFailure]);

  return {
    isProvisioning,
    currentProgress,
    provisionedDevices,
    error,
    provisionDevice,
    provisionMultiple,
    cancelProvisioning,
    getNextAvailableAddress,
    clearError,
    resetProvisionedDevices,
  };
}

export default useProvisioning;

import { useState, useCallback, useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import TelinkBle from '../index';
import type { ScanFilters, DiscoveredDevice } from '../types';

export interface UseScanningOptions {
  /**
   * Auto-start scanning on mount
   */
  autoStart?: boolean;

  /**
   * Scan filters to apply
   */
  filters?: ScanFilters;

  /**
   * Auto-stop scanning after duration (milliseconds)
   */
  autoStopAfter?: number;

  /**
   * Clear discovered devices on start
   */
  clearOnStart?: boolean;

  /**
   * Maximum number of devices to keep in list
   */
  maxDevices?: number;

  /**
   * Remove devices not seen after timeout (milliseconds)
   */
  deviceTimeout?: number;
}

export interface UseScanningReturn {
  // State
  isScanning: boolean;
  discoveredDevices: DiscoveredDevice[];
  isLoading: boolean;
  error: Error | null;

  // Operations
  startScanning: (filters?: ScanFilters) => Promise<void>;
  stopScanning: () => Promise<void>;
  clearDevices: () => void;
  refreshScan: () => Promise<void>;

  // Device operations
  getDeviceByAddress: (address: string) => DiscoveredDevice | undefined;
  getDevicesByName: (name: string) => DiscoveredDevice[];
  getDevicesByRSSI: (minRSSI: number) => DiscoveredDevice[];
  sortDevicesByRSSI: () => DiscoveredDevice[];

  // Utility
  clearError: () => void;
}

/**
 * useScanning - Hook for BLE device scanning and discovery
 *
 * @example
 * ```tsx
 * function DeviceScanner() {
 *   const {
 *     isScanning,
 *     discoveredDevices,
 *     startScanning,
 *     stopScanning,
 *     sortDevicesByRSSI
 *   } = useScanning({
 *     autoStart: true,
 *     filters: { rssiThreshold: -70 },
 *     autoStopAfter: 10000,
 *   });
 *
 *   return (
 *     <View>
 *       <Button
 *         title={isScanning ? 'Stop Scan' : 'Start Scan'}
 *         onPress={isScanning ? stopScanning : startScanning}
 *       />
 *       <FlatList
 *         data={sortDevicesByRSSI()}
 *         keyExtractor={(item) => item.address}
 *         renderItem={({ item }) => (
 *           <Text>{item.name || 'Unknown'} - {item.rssi} dBm</Text>
 *         )}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useScanning(
  options: UseScanningOptions = {}
): UseScanningReturn {
  const {
    autoStart = false,
    filters,
    autoStopAfter,
    clearOnStart = true,
    maxDevices = 100,
    deviceTimeout,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deviceTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);

  // Initialize event emitter
  useEffect(() => {
    eventEmitterRef.current = new NativeEventEmitter(NativeModules.TelinkBle);
    return () => {
      eventEmitterRef.current = null;
    };
  }, []);

  // Device timeout cleanup
  useEffect(() => {
    if (deviceTimeout && isScanning) {
      deviceTimeoutTimerRef.current = setInterval(() => {
        const now = Date.now();
        setDiscoveredDevices((prev) =>
          prev.filter(
            (device) =>
              !device.lastSeen ||
              now - device.lastSeen.getTime() < deviceTimeout
          )
        );
      }, deviceTimeout / 2);
    }

    return () => {
      if (deviceTimeoutTimerRef.current) {
        clearInterval(deviceTimeoutTimerRef.current);
        deviceTimeoutTimerRef.current = null;
      }
    };
  }, [deviceTimeout, isScanning]);

  // Clear devices
  const clearDevices = useCallback(() => {
    setDiscoveredDevices([]);
  }, []);

  // Start scanning
  const startScanning = useCallback(
    async (scanFilters?: ScanFilters) => {
      setIsLoading(true);
      setError(null);

      try {
        if (clearOnStart) {
          clearDevices();
        }

        const appliedFilters = scanFilters || filters;
        await TelinkBle.startScanning(appliedFilters);
        setIsScanning(true);

        // Auto-stop after duration
        if (autoStopAfter) {
          if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
          }
          autoStopTimerRef.current = setTimeout(async () => {
            try {
              await TelinkBle.stopScanning();
              setIsScanning(false);
            } catch (err) {
              console.error('Auto-stop scanning failed:', err);
            }
          }, autoStopAfter);
        }
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Failed to start scanning');
        setError(errorObj);
        setIsScanning(false);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [filters, autoStopAfter, clearOnStart, clearDevices]
  );

  // Stop scanning
  const stopScanning = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await TelinkBle.stopScanning();
      setIsScanning(false);

      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error('Failed to stop scanning');
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh scan (stop and start)
  const refreshScan = useCallback(async () => {
    if (isScanning) {
      await stopScanning();
    }
    await startScanning();
  }, [isScanning, startScanning, stopScanning]);

  // Get device by address
  const getDeviceByAddress = useCallback(
    (address: string): DiscoveredDevice | undefined => {
      return discoveredDevices.find((device) => device.address === address);
    },
    [discoveredDevices]
  );

  // Get devices by name
  const getDevicesByName = useCallback(
    (name: string): DiscoveredDevice[] => {
      return discoveredDevices.filter(
        (device) =>
          device.name && device.name.toLowerCase().includes(name.toLowerCase())
      );
    },
    [discoveredDevices]
  );

  // Get devices by RSSI threshold
  const getDevicesByRSSI = useCallback(
    (minRSSI: number): DiscoveredDevice[] => {
      return discoveredDevices.filter((device) => device.rssi >= minRSSI);
    },
    [discoveredDevices]
  );

  // Sort devices by RSSI (strongest first)
  const sortDevicesByRSSI = useCallback((): DiscoveredDevice[] => {
    return [...discoveredDevices].sort((a, b) => b.rssi - a.rssi);
  }, [discoveredDevices]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!eventEmitterRef.current) return;

    const eventEmitter = eventEmitterRef.current;

    const subscriptions = [
      eventEmitter.addListener('deviceFound', (device: any) => {
        const discoveredDevice = device as DiscoveredDevice;
        setDiscoveredDevices((prev) => {
          const exists = prev.some(
            (d) => d.address === discoveredDevice.address
          );
          const updatedDevice = {
            ...discoveredDevice,
            lastSeen: new Date(),
          };

          if (exists) {
            // Update existing device
            return prev.map((d) =>
              d.address === discoveredDevice.address ? updatedDevice : d
            );
          } else {
            // Add new device, respecting maxDevices limit
            const newList = [...prev, updatedDevice];
            if (newList.length > maxDevices) {
              // Remove oldest device
              return newList.slice(1);
            }
            return newList;
          }
        });
      }),

      eventEmitter.addListener('scanStarted', () => {
        setIsScanning(true);
      }),

      eventEmitter.addListener('scanStopped', () => {
        setIsScanning(false);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [maxDevices]);

  // Auto-start scanning
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startScanning().catch((err) => {
        console.error('Auto-start scanning failed:', err);
      });
    }
  }, [autoStart, startScanning]); // Only auto-start once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        TelinkBle.stopScanning().catch((err) => {
          console.error('Failed to stop scanning on unmount:', err);
        });
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (deviceTimeoutTimerRef.current) {
        clearInterval(deviceTimeoutTimerRef.current);
      }
    };
  }, [isScanning]);

  return {
    isScanning,
    discoveredDevices,
    isLoading,
    error,
    startScanning,
    stopScanning,
    clearDevices,
    refreshScan,
    getDeviceByAddress,
    getDevicesByName,
    getDevicesByRSSI,
    sortDevicesByRSSI,
    clearError,
  };
}

export default useScanning;

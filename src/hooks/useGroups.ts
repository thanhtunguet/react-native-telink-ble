import { useState, useCallback, useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import TelinkBle from '../index';
import type { MeshGroup, ColorHSL } from '../types';

export interface UseGroupsOptions {
  /**
   * Auto-load groups on mount
   */
  autoLoad?: boolean;

  /**
   * Sync groups with native module
   */
  autoSync?: boolean;

  /**
   * Sync interval in milliseconds
   */
  syncInterval?: number;
}

export interface UseGroupsReturn {
  // State
  groups: MeshGroup[];
  isLoading: boolean;
  error: Error | null;

  // Group CRUD operations
  createGroup: (groupAddress: number, name: string) => Promise<void>;
  deleteGroup: (groupAddress: number) => Promise<void>;
  getGroup: (groupAddress: number) => MeshGroup | undefined;
  getAllGroups: () => MeshGroup[];
  refreshGroups: () => Promise<void>;

  // Device-Group membership operations
  addDeviceToGroup: (
    nodeAddress: number,
    groupAddress: number
  ) => Promise<void>;
  removeDeviceFromGroup: (
    nodeAddress: number,
    groupAddress: number
  ) => Promise<void>;
  addDevicesToGroup: (
    nodeAddresses: number[],
    groupAddress: number
  ) => Promise<void>;
  removeDevicesFromGroup: (
    nodeAddresses: number[],
    groupAddress: number
  ) => Promise<void>;
  getDeviceGroups: (nodeAddress: number) => MeshGroup[];
  getGroupDevices: (groupAddress: number) => number[];

  // Group control operations
  turnOnGroup: (groupAddress: number, transitionTime?: number) => Promise<void>;
  turnOffGroup: (
    groupAddress: number,
    transitionTime?: number
  ) => Promise<void>;
  setGroupLevel: (
    groupAddress: number,
    level: number,
    transitionTime?: number
  ) => Promise<void>;
  setGroupColor: (
    groupAddress: number,
    color: ColorHSL,
    transitionTime?: number
  ) => Promise<void>;

  // Utility
  clearError: () => void;
  clearGroups: () => void;
}

/**
 * useGroups - Hook for managing mesh groups
 *
 * @example
 * ```tsx
 * function GroupManager() {
 *   const {
 *     groups,
 *     createGroup,
 *     addDeviceToGroup,
 *     turnOnGroup,
 *     turnOffGroup,
 *     isLoading
 *   } = useGroups({ autoLoad: true });
 *
 *   const handleCreateGroup = async () => {
 *     await createGroup(0xC001, 'Living Room');
 *     await addDeviceToGroup(0x0001, 0xC001);
 *     await addDeviceToGroup(0x0002, 0xC001);
 *   };
 *
 *   return (
 *     <View>
 *       <Button title="Create Living Room Group" onPress={handleCreateGroup} />
 *       {groups.map((group) => (
 *         <View key={group.address}>
 *           <Text>{group.name} ({group.devices.length} devices)</Text>
 *           <Button
 *             title="Turn On"
 *             onPress={() => turnOnGroup(group.address)}
 *             disabled={isLoading}
 *           />
 *           <Button
 *             title="Turn Off"
 *             onPress={() => turnOffGroup(group.address)}
 *             disabled={isLoading}
 *           />
 *         </View>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useGroups(options: UseGroupsOptions = {}): UseGroupsReturn {
  const { autoLoad = false, autoSync = false, syncInterval = 30000 } = options;

  const [groups, setGroups] = useState<MeshGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize event emitter
  useEffect(() => {
    eventEmitterRef.current = new NativeEventEmitter(NativeModules.TelinkBle);
    return () => {
      eventEmitterRef.current = null;
    };
  }, []);

  // Execute with error handling
  const executeWithErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();
        return result;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Operation failed');
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Refresh groups from native module or local state
  const refreshGroups = useCallback(async () => {
    await executeWithErrorHandling(async () => {
      // In a real implementation, this would fetch from native module
      // For now, we'll use local state management
      // const nativeGroups = await TelinkBle.getAllGroups();
      // setGroups(nativeGroups);
    });
  }, [executeWithErrorHandling]);

  // Create group
  const createGroup = useCallback(
    async (groupAddress: number, name: string) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.createGroup(groupAddress, name);

        // Add to local state
        setGroups((prev) => {
          const exists = prev.some((g) => g.address === groupAddress);
          if (exists) {
            return prev.map((g) =>
              g.address === groupAddress ? { ...g, name } : g
            );
          }
          return [...prev, { address: groupAddress, name, devices: [] }];
        });
      });
    },
    [executeWithErrorHandling]
  );

  // Delete group
  const deleteGroup = useCallback(
    async (groupAddress: number) => {
      await executeWithErrorHandling(async () => {
        // Note: Native implementation might need a deleteGroup method
        // For now, we'll remove from local state
        setGroups((prev) => prev.filter((g) => g.address !== groupAddress));
      });
    },
    [executeWithErrorHandling]
  );

  // Get group by address
  const getGroup = useCallback(
    (groupAddress: number): MeshGroup | undefined => {
      return groups.find((g) => g.address === groupAddress);
    },
    [groups]
  );

  // Get all groups
  const getAllGroups = useCallback((): MeshGroup[] => {
    return groups;
  }, [groups]);

  // Add device to group
  const addDeviceToGroup = useCallback(
    async (nodeAddress: number, groupAddress: number) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.addDeviceToGroup(nodeAddress, groupAddress);

        // Update local state
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === groupAddress) {
              const devices = g.devices || [];
              if (!devices.includes(nodeAddress)) {
                return { ...g, devices: [...devices, nodeAddress] };
              }
            }
            return g;
          })
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Remove device from group
  const removeDeviceFromGroup = useCallback(
    async (nodeAddress: number, groupAddress: number) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.removeDeviceFromGroup(nodeAddress, groupAddress);

        // Update local state
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === groupAddress) {
              const devices = g.devices || [];
              return {
                ...g,
                devices: devices.filter((addr) => addr !== nodeAddress),
              };
            }
            return g;
          })
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Add multiple devices to group
  const addDevicesToGroup = useCallback(
    async (nodeAddresses: number[], groupAddress: number) => {
      await executeWithErrorHandling(async () => {
        await Promise.all(
          nodeAddresses.map((addr) =>
            TelinkBle.addDeviceToGroup(addr, groupAddress)
          )
        );

        // Update local state
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === groupAddress) {
              const devices = g.devices || [];
              const newDevices = nodeAddresses.filter(
                (addr) => !devices.includes(addr)
              );
              return { ...g, devices: [...devices, ...newDevices] };
            }
            return g;
          })
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Remove multiple devices from group
  const removeDevicesFromGroup = useCallback(
    async (nodeAddresses: number[], groupAddress: number) => {
      await executeWithErrorHandling(async () => {
        await Promise.all(
          nodeAddresses.map((addr) =>
            TelinkBle.removeDeviceFromGroup(addr, groupAddress)
          )
        );

        // Update local state
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === groupAddress) {
              const devices = g.devices || [];
              return {
                ...g,
                devices: devices.filter(
                  (addr) => !nodeAddresses.includes(addr)
                ),
              };
            }
            return g;
          })
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Get all groups a device belongs to
  const getDeviceGroups = useCallback(
    (nodeAddress: number): MeshGroup[] => {
      return groups.filter((g) => g.devices && g.devices.includes(nodeAddress));
    },
    [groups]
  );

  // Get all devices in a group
  const getGroupDevices = useCallback(
    (groupAddress: number): number[] => {
      const group = groups.find((g) => g.address === groupAddress);
      return group?.devices || [];
    },
    [groups]
  );

  // Turn on group
  const turnOnGroup = useCallback(
    async (groupAddress: number, transitionTime?: number) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.sendGroupCommand(groupAddress, true, transitionTime);
      });
    },
    [executeWithErrorHandling]
  );

  // Turn off group
  const turnOffGroup = useCallback(
    async (groupAddress: number, transitionTime?: number) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.sendGroupCommand(groupAddress, false, transitionTime);
      });
    },
    [executeWithErrorHandling]
  );

  // Set group level
  const setGroupLevel = useCallback(
    async (groupAddress: number, level: number, transitionTime?: number) => {
      await executeWithErrorHandling(async () => {
        // Note: This might need a specific native method
        // For now, we can use sendGenericLevel with group address
        await TelinkBle.sendGenericLevel(
          groupAddress,
          level,
          transitionTime || 0
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Set group color
  const setGroupColor = useCallback(
    async (groupAddress: number, color: ColorHSL, transitionTime?: number) => {
      await executeWithErrorHandling(async () => {
        await TelinkBle.sendColorHSL(
          groupAddress,
          color.hue,
          color.saturation,
          color.lightness,
          transitionTime || 0
        );
      });
    },
    [executeWithErrorHandling]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear groups
  const clearGroups = useCallback(() => {
    setGroups([]);
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!eventEmitterRef.current) return;

    const eventEmitter = eventEmitterRef.current;

    const subscriptions = [
      eventEmitter.addListener('groupCreated', (event: any) => {
        setGroups((prev) => {
          const exists = prev.some((g) => g.address === event.address);
          if (!exists) {
            return [
              ...prev,
              {
                address: event.address,
                name: event.name,
                devices: [],
              },
            ];
          }
          return prev;
        });
      }),

      eventEmitter.addListener('deviceAddedToGroup', (event: any) => {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === event.groupAddress) {
              const devices = g.devices || [];
              if (!devices.includes(event.nodeAddress)) {
                return { ...g, devices: [...devices, event.nodeAddress] };
              }
            }
            return g;
          })
        );
      }),

      eventEmitter.addListener('deviceRemovedFromGroup', (event: any) => {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.address === event.groupAddress) {
              const devices = g.devices || [];
              return {
                ...g,
                devices: devices.filter((addr) => addr !== event.nodeAddress),
              };
            }
            return g;
          })
        );
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  // Auto-load groups on mount
  useEffect(() => {
    if (autoLoad) {
      refreshGroups().catch((err) => {
        console.error('Auto-load groups failed:', err);
      });
    }
  }, [autoLoad, refreshGroups]);

  // Auto-sync groups
  useEffect(() => {
    if (autoSync && syncInterval) {
      syncTimerRef.current = setInterval(() => {
        refreshGroups().catch((err) => {
          console.error('Auto-sync groups failed:', err);
        });
      }, syncInterval);
    }

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [autoSync, syncInterval, refreshGroups]);

  return {
    groups,
    isLoading,
    error,
    createGroup,
    deleteGroup,
    getGroup,
    getAllGroups,
    refreshGroups,
    addDeviceToGroup,
    removeDeviceFromGroup,
    addDevicesToGroup,
    removeDevicesFromGroup,
    getDeviceGroups,
    getGroupDevices,
    turnOnGroup,
    turnOffGroup,
    setGroupLevel,
    setGroupColor,
    clearError,
    clearGroups,
  };
}

export default useGroups;

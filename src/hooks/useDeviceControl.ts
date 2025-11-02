import { useState, useCallback } from 'react';
import { DeviceController } from '../DeviceController';
import type { ColorHSL, SceneDevice } from '../types';

export interface UseDeviceControlOptions {
  /**
   * Default transition time in milliseconds
   */
  defaultTransitionTime?: number;

  /**
   * Automatic retry on failure
   */
  autoRetry?: boolean;

  /**
   * Number of retries
   */
  retryCount?: number;
}

export interface UseDeviceControlReturn {
  // State
  isLoading: boolean;
  error: Error | null;

  // Operations
  turnOn: (
    address: number | number[],
    transitionTime?: number
  ) => Promise<void>;
  turnOff: (
    address: number | number[],
    transitionTime?: number
  ) => Promise<void>;
  setLevel: (
    address: number | number[],
    level: number,
    transitionTime?: number
  ) => Promise<void>;
  setColor: (
    address: number | number[],
    color: ColorHSL,
    transitionTime?: number
  ) => Promise<void>;
  recallScene: (sceneId: number, groupAddress?: number) => Promise<void>;
  storeScene: (sceneId: number, devices: SceneDevice[]) => Promise<void>;

  // Utility
  clearError: () => void;
}

/**
 * useDeviceControl - Hook for controlling mesh devices
 *
 * @example
 * ```tsx
 * function LightControl({ deviceAddress }: { deviceAddress: number }) {
 *   const { turnOn, turnOff, setLevel, setColor, isLoading } = useDeviceControl();
 *
 *   return (
 *     <View>
 *       <Button
 *         title="Turn On"
 *         onPress={() => turnOn(deviceAddress, 1000)}
 *         disabled={isLoading}
 *       />
 *       <Button
 *         title="Turn Off"
 *         onPress={() => turnOff(deviceAddress, 1000)}
 *         disabled={isLoading}
 *       />
 *       <Slider
 *         onValueChange={(value) => setLevel(deviceAddress, value)}
 *         disabled={isLoading}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useDeviceControl(
  options: UseDeviceControlOptions = {}
): UseDeviceControlReturn {
  const {
    defaultTransitionTime = 0,
    autoRetry = false,
    retryCount = 3,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [controller] = useState(() => new DeviceController());

  const executeWithErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | void> => {
      setIsLoading(true);
      setError(null);

      try {
        let lastError: Error | null = null;
        const attempts = autoRetry ? retryCount : 1;

        for (let i = 0; i < attempts; i++) {
          try {
            const result = await operation();
            return result;
          } catch (err) {
            lastError = err as Error;
            if (i < attempts - 1) {
              // Wait before retry (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, i) * 1000)
              );
            }
          }
        }

        throw lastError;
      } catch (err) {
        const errorObj = err as Error;
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [autoRetry, retryCount]
  );

  const turnOn = useCallback(
    async (address: number | number[], transitionTime?: number) => {
      await executeWithErrorHandling(() =>
        controller.setDeviceState(address, true, {
          transitionTime: transitionTime ?? defaultTransitionTime,
        })
      );
    },
    [controller, defaultTransitionTime, executeWithErrorHandling]
  );

  const turnOff = useCallback(
    async (address: number | number[], transitionTime?: number) => {
      await executeWithErrorHandling(() =>
        controller.setDeviceState(address, false, {
          transitionTime: transitionTime ?? defaultTransitionTime,
        })
      );
    },
    [controller, defaultTransitionTime, executeWithErrorHandling]
  );

  const setLevel = useCallback(
    async (
      address: number | number[],
      level: number,
      transitionTime?: number
    ) => {
      await executeWithErrorHandling(() =>
        controller.setDeviceLevel(address, level, {
          transitionTime: transitionTime ?? defaultTransitionTime,
        })
      );
    },
    [controller, defaultTransitionTime, executeWithErrorHandling]
  );

  const setColor = useCallback(
    async (
      address: number | number[],
      color: ColorHSL,
      transitionTime?: number
    ) => {
      await executeWithErrorHandling(() =>
        controller.setDeviceColor(address, color, {
          transitionTime: transitionTime ?? defaultTransitionTime,
        })
      );
    },
    [controller, defaultTransitionTime, executeWithErrorHandling]
  );

  const recallScene = useCallback(
    async (sceneId: number, groupAddress?: number) => {
      if (groupAddress === undefined) {
        throw new Error('Group address is required for recalling scene');
      }
      await executeWithErrorHandling(() =>
        controller.recallScene(sceneId, groupAddress)
      );
    },
    [controller, executeWithErrorHandling]
  );

  const storeScene = useCallback(
    async (sceneId: number, devices: SceneDevice[]) => {
      await executeWithErrorHandling(() =>
        controller.createScene(sceneId, devices)
      );
    },
    [controller, executeWithErrorHandling]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    turnOn,
    turnOff,
    setLevel,
    setColor,
    recallScene,
    storeScene,
    clearError,
  };
}

export default useDeviceControl;

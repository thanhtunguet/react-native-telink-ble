import { useState, useEffect, useCallback } from 'react';
import { useTelinkMeshContext } from '../context/TelinkMeshContext';
import { VendorCommandManager } from '../VendorCommandManager';
import type {
  VendorCommand,
  VendorCommandResponse,
  VendorModelInfo,
} from '../types';

export interface UseVendorCommandsOptions {
  /**
   * Company ID to register handler for
   */
  companyId?: number;

  /**
   * Auto-register message handler on mount
   */
  autoRegisterHandler?: boolean;

  /**
   * Callback for vendor messages
   */
  onMessageReceived?: (message: VendorCommandResponse) => void;
}

export interface UseVendorCommandsReturn {
  // State
  isSending: boolean;
  lastResponse: VendorCommandResponse | null;
  supportedModels: VendorModelInfo[];
  error: Error | null;

  // Operations
  sendCommand: (
    target: number,
    command: VendorCommand
  ) => Promise<VendorCommandResponse | null>;
  sendBroadcast: (command: VendorCommand) => Promise<void>;
  getSupportedModels: (nodeAddress: number) => Promise<VendorModelInfo[]>;
  registerHandler: (companyId: number) => Promise<void>;
  unregisterHandler: (companyId: number) => Promise<void>;

  // Utility
  clearError: () => void;
  clearResponse: () => void;
}

/**
 * useVendorCommands - Hook for vendor-specific command operations
 *
 * @example
 * ```tsx
 * function VendorControlPanel({ nodeAddress }: { nodeAddress: number }) {
 *   const {
 *     sendCommand,
 *     lastResponse,
 *     isSending,
 *     getSupportedModels,
 *     supportedModels,
 *   } = useVendorCommands({
 *     companyId: 0x0211, // Telink company ID
 *     autoRegisterHandler: true,
 *     onMessageReceived: (msg) => console.log('Vendor message:', msg),
 *   });
 *
 *   useEffect(() => {
 *     getSupportedModels(nodeAddress);
 *   }, [nodeAddress]);
 *
 *   const handleCustomCommand = async () => {
 *     const response = await sendCommand(nodeAddress, {
 *       opcode: 0xC0,
 *       companyId: 0x0211,
 *       parameters: '01020304',
 *       acknowledged: true,
 *     });
 *
 *     if (response) {
 *       console.log('Response:', response.data);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Supported Models: {supportedModels.length}</Text>
 *       <Button
 *         title="Send Custom Command"
 *         onPress={handleCustomCommand}
 *         disabled={isSending}
 *       />
 *       {lastResponse && (
 *         <Text>Last Response: {lastResponse.data}</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useVendorCommands(
  options: UseVendorCommandsOptions = {}
): UseVendorCommandsReturn {
  const { companyId, autoRegisterHandler = false, onMessageReceived } = options;

  const context = useTelinkMeshContext();
  const [manager] = useState(() => new VendorCommandManager());
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<VendorCommandResponse | null>(null);
  const [supportedModels, setSupportedModels] = useState<VendorModelInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const sendCommand = useCallback(
    async (
      target: number,
      command: VendorCommand
    ): Promise<VendorCommandResponse | null> => {
      setIsSending(true);
      setError(null);

      try {
        const response = await manager.sendCommand(
          target,
          command.companyId,
          command.opcode,
          command.parameters,
          {
            acknowledged: command.acknowledged,
            timeout: command.timeout,
          }
        );
        setLastResponse(response);
        return response;
      } catch (err) {
        const commandError = err as Error;
        setError(commandError);
        throw commandError;
      } finally {
        setIsSending(false);
      }
    },
    [manager]
  );

  const sendBroadcast = useCallback(
    async (command: VendorCommand) => {
      setIsSending(true);
      setError(null);

      try {
        // Get all node addresses from context
        const targets = context.nodes.map((node) => node.unicastAddress);

        if (targets.length === 0) {
          throw new Error('No nodes available for broadcast');
        }

        await manager.broadcastCommand(
          targets,
          command.companyId,
          command.opcode,
          command.parameters
        );
      } catch (err) {
        const broadcastError = err as Error;
        setError(broadcastError);
        throw broadcastError;
      } finally {
        setIsSending(false);
      }
    },
    [manager, context.nodes]
  );

  const getSupportedModels = useCallback(
    async (nodeAddress: number): Promise<VendorModelInfo[]> => {
      try {
        const models = await manager.getDeviceVendorModels(nodeAddress);
        setSupportedModels(models);
        return models;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [manager]
  );

  const registerHandler = useCallback(
    async (vendorCompanyId: number) => {
      try {
        await manager.registerCompany(vendorCompanyId);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [manager]
  );

  const unregisterHandler = useCallback(
    async (vendorCompanyId: number) => {
      try {
        await manager.unregisterCompany(vendorCompanyId);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [manager]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResponse = useCallback(() => {
    setLastResponse(null);
  }, []);

  // Auto-register handler
  useEffect(() => {
    if (autoRegisterHandler && companyId !== undefined) {
      registerHandler(companyId).catch((err) => {
        console.error('Failed to auto-register vendor message handler:', err);
      });

      return () => {
        unregisterHandler(companyId).catch((err) => {
          console.error('Failed to unregister vendor message handler:', err);
        });
      };
    }
    return undefined;
  }, [autoRegisterHandler, companyId, registerHandler, unregisterHandler]);

  // Listen to vendor message events
  useEffect(() => {
    const removeListener = context.addEventListener(
      'vendorMessageReceived',
      (event: VendorCommandResponse) => {
        if (!companyId || event.companyId === companyId) {
          setLastResponse(event);
          onMessageReceived?.(event);
        }
      }
    );

    return removeListener;
  }, [context, companyId, onMessageReceived]);

  return {
    isSending,
    lastResponse,
    supportedModels,
    error,
    sendCommand,
    sendBroadcast,
    getSupportedModels,
    registerHandler,
    unregisterHandler,
    clearError,
    clearResponse,
  };
}

export default useVendorCommands;

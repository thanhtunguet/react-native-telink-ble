import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import TelinkBle from '../index';
import type {
  MeshNetworkConfig,
  MeshNode,
  DiscoveredDevice,
  NetworkHealthReport,
  MeshEventType,
} from '../types';

/**
 * Mesh network state interface
 */
export interface MeshNetworkState {
  isInitialized: boolean;
  isScanning: boolean;
  nodes: MeshNode[];
  discoveredDevices: DiscoveredDevice[];
  networkHealth: NetworkHealthReport | null;
  isHealthMonitoring: boolean;
}

/**
 * Context value interface
 */
export interface TelinkMeshContextValue extends MeshNetworkState {
  // Network operations
  initializeNetwork: (config: MeshNetworkConfig) => Promise<void>;
  clearNetwork: () => Promise<void>;
  loadNetwork: (networkData: string) => Promise<void>;
  saveNetwork: () => Promise<string>;

  // Scanning operations
  startScanning: (filters?: any) => Promise<void>;
  stopScanning: () => Promise<void>;

  // Node operations
  refreshNodes: () => Promise<void>;
  getNodeInfo: (address: number) => Promise<MeshNode | null>;

  // Health monitoring
  startHealthMonitoring: (config?: any) => Promise<void>;
  stopHealthMonitoring: () => Promise<void>;
  getHealthReport: () => Promise<NetworkHealthReport | null>;

  // Event listeners
  addEventListener: (
    eventType: MeshEventType | string,
    listener: (event: any) => void
  ) => () => void;
}

/**
 * Provider props interface
 */
export interface TelinkMeshProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  initialConfig?: MeshNetworkConfig;
  autoStartHealthMonitoring?: boolean;
  healthMonitoringInterval?: number;
}

// Create context with undefined default
const TelinkMeshContext = createContext<TelinkMeshContextValue | undefined>(
  undefined
);

/**
 * TelinkMeshProvider - Provides mesh network state and operations to the app
 *
 * @example
 * ```tsx
 * <TelinkMeshProvider
 *   autoInitialize={true}
 *   initialConfig={config}
 *   autoStartHealthMonitoring={true}
 * >
 *   <App />
 * </TelinkMeshProvider>
 * ```
 */
export function TelinkMeshProvider({
  children,
  autoInitialize = false,
  initialConfig,
  autoStartHealthMonitoring = false,
  healthMonitoringInterval = 30000,
}: TelinkMeshProviderProps) {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [networkHealth, setNetworkHealth] =
    useState<NetworkHealthReport | null>(null);
  const [isHealthMonitoring, setIsHealthMonitoring] = useState(false);

  // Event emitter
  const [eventEmitter] = useState(
    () => new NativeEventEmitter(NativeModules.TelinkBle)
  );

  // Network operations
  const initializeNetwork = useCallback(async (config: MeshNetworkConfig) => {
    try {
      await TelinkBle.initializeMeshNetwork(config);
      setIsInitialized(true);

      // Refresh nodes after initialization
      const allNodes = await TelinkBle.getAllNodes();
      setNodes(allNodes);
    } catch (error) {
      console.error('Failed to initialize network:', error);
      throw error;
    }
  }, []);

  const clearNetwork = useCallback(async () => {
    try {
      await TelinkBle.clearMeshNetwork();
      setIsInitialized(false);
      setNodes([]);
      setDiscoveredDevices([]);
      setNetworkHealth(null);
    } catch (error) {
      console.error('Failed to clear network:', error);
      throw error;
    }
  }, []);

  const loadNetwork = useCallback(async (networkData: string) => {
    try {
      await TelinkBle.loadMeshNetwork(networkData);
      setIsInitialized(true);

      // Refresh nodes after loading
      const allNodes = await TelinkBle.getAllNodes();
      setNodes(allNodes);
    } catch (error) {
      console.error('Failed to load network:', error);
      throw error;
    }
  }, []);

  const saveNetwork = useCallback(async () => {
    try {
      const networkData = await TelinkBle.saveMeshNetwork();
      return networkData;
    } catch (error) {
      console.error('Failed to save network:', error);
      throw error;
    }
  }, []);

  // Scanning operations
  const startScanning = useCallback(async (filters?: any) => {
    try {
      await TelinkBle.startScanning(filters);
      setIsScanning(true);
      setDiscoveredDevices([]);
    } catch (error) {
      console.error('Failed to start scanning:', error);
      throw error;
    }
  }, []);

  const stopScanning = useCallback(async () => {
    try {
      await TelinkBle.stopScanning();
      setIsScanning(false);
    } catch (error) {
      console.error('Failed to stop scanning:', error);
      throw error;
    }
  }, []);

  // Node operations
  const refreshNodes = useCallback(async () => {
    try {
      const allNodes = await TelinkBle.getAllNodes();
      setNodes(allNodes);
    } catch (error) {
      console.error('Failed to refresh nodes:', error);
      throw error;
    }
  }, []);

  const getNodeInfo = useCallback(async (address: number) => {
    try {
      const node = await TelinkBle.getNodeInfo(address);
      return node;
    } catch (error) {
      console.error('Failed to get node info:', error);
      throw error;
    }
  }, []);

  // Health monitoring
  const startHealthMonitoring = useCallback(
    async (config?: any) => {
      try {
        await TelinkBle.startNetworkHealthMonitoring({
          interval: healthMonitoringInterval,
          includeRSSI: true,
          includeLatency: true,
          ...config,
        });
        setIsHealthMonitoring(true);
      } catch (error) {
        console.error('Failed to start health monitoring:', error);
        throw error;
      }
    },
    [healthMonitoringInterval]
  );

  const stopHealthMonitoring = useCallback(async () => {
    try {
      await TelinkBle.stopNetworkHealthMonitoring();
      setIsHealthMonitoring(false);
    } catch (error) {
      console.error('Failed to stop health monitoring:', error);
      throw error;
    }
  }, []);

  const getHealthReport = useCallback(async () => {
    try {
      const report = await TelinkBle.getNetworkHealthReport();
      setNetworkHealth(report);
      return report;
    } catch (error) {
      console.error('Failed to get health report:', error);
      throw error;
    }
  }, []);

  // Event listener management
  const addEventListener = useCallback(
    (eventType: MeshEventType | string, listener: (event: any) => void) => {
      const subscription = eventEmitter.addListener(eventType, listener);
      return () => subscription.remove();
    },
    [eventEmitter]
  );

  // Setup event listeners
  useEffect(() => {
    const subscriptions = [
      // Scanning events
      eventEmitter.addListener('deviceFound', (device: any) => {
        setDiscoveredDevices((prev) => {
          const exists = prev.some((d) => d.address === device.address);
          if (exists) {
            return prev;
          }
          return [...prev, device];
        });
      }),

      eventEmitter.addListener('scanStarted', () => {
        setIsScanning(true);
      }),

      eventEmitter.addListener('scanStopped', () => {
        setIsScanning(false);
      }),

      // Provisioning events
      eventEmitter.addListener('provisioningCompleted', async () => {
        // Refresh nodes when a device is provisioned
        try {
          const allNodes = await TelinkBle.getAllNodes();
          setNodes(allNodes);
        } catch (error) {
          console.error('Failed to refresh nodes after provisioning:', error);
        }
      }),

      // Health monitoring events
      eventEmitter.addListener('networkHealthUpdate', (event: any) => {
        setNetworkHealth(event.data);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [eventEmitter]);

  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && initialConfig && !isInitialized) {
      initializeNetwork(initialConfig).catch((error) => {
        console.error('Auto-initialization failed:', error);
      });
    }
  }, [autoInitialize, initialConfig, isInitialized, initializeNetwork]);

  // Auto-start health monitoring
  useEffect(() => {
    if (autoStartHealthMonitoring && isInitialized && !isHealthMonitoring) {
      startHealthMonitoring().catch((error) => {
        console.error('Failed to auto-start health monitoring:', error);
      });
    }
  }, [
    autoStartHealthMonitoring,
    isInitialized,
    isHealthMonitoring,
    startHealthMonitoring,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isHealthMonitoring) {
        TelinkBle.stopNetworkHealthMonitoring().catch((error) => {
          console.error('Failed to stop health monitoring on unmount:', error);
        });
      }
    };
  }, [isHealthMonitoring]);

  const value: TelinkMeshContextValue = {
    // State
    isInitialized,
    isScanning,
    nodes,
    discoveredDevices,
    networkHealth,
    isHealthMonitoring,

    // Operations
    initializeNetwork,
    clearNetwork,
    loadNetwork,
    saveNetwork,
    startScanning,
    stopScanning,
    refreshNodes,
    getNodeInfo,
    startHealthMonitoring,
    stopHealthMonitoring,
    getHealthReport,
    addEventListener,
  };

  return (
    <TelinkMeshContext.Provider value={value}>
      {children}
    </TelinkMeshContext.Provider>
  );
}

/**
 * useTelinkMeshContext - Hook to access the Telink mesh context
 *
 * @throws {Error} If used outside of TelinkMeshProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { nodes, isInitialized, refreshNodes } = useTelinkMeshContext();
 *
 *   useEffect(() => {
 *     if (isInitialized) {
 *       refreshNodes();
 *     }
 *   }, [isInitialized, refreshNodes]);
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export function useTelinkMeshContext(): TelinkMeshContextValue {
  const context = useContext(TelinkMeshContext);

  if (context === undefined) {
    throw new Error(
      'useTelinkMeshContext must be used within a TelinkMeshProvider'
    );
  }

  return context;
}

export default TelinkMeshContext;

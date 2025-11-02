import { useState, useEffect, useCallback } from 'react';
import { useTelinkMeshContext } from '../context/TelinkMeshContext';
import TelinkBle from '../index';
import type { NetworkHealthReport, NodeHealthStatus } from '../types';

export interface UseNetworkHealthOptions {
  /**
   * Auto-start monitoring when component mounts
   */
  autoStart?: boolean;

  /**
   * Monitoring interval in milliseconds
   */
  interval?: number;

  /**
   * Include RSSI measurements
   */
  includeRSSI?: boolean;

  /**
   * Include latency measurements
   */
  includeLatency?: boolean;

  /**
   * Auto-refresh interval for health report (0 = disabled)
   */
  refreshInterval?: number;
}

export interface UseNetworkHealthReturn {
  // State
  isMonitoring: boolean;
  healthReport: NetworkHealthReport | null;
  isLoading: boolean;
  error: Error | null;

  // Operations
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refreshReport: () => Promise<void>;
  getNodeHealth: (nodeAddress: number) => Promise<NodeHealthStatus | null>;
  measureLatency: (nodeAddress: number) => Promise<number | null>;

  // Computed
  healthScore: number; // 0-100 based on network health metrics
  criticalNodes: number[]; // Nodes with reliability < 0.5
}

/**
 * useNetworkHealth - Hook for monitoring mesh network health
 *
 * @example
 * ```tsx
 * function NetworkHealthDashboard() {
 *   const {
 *     healthReport,
 *     healthScore,
 *     isMonitoring,
 *     startMonitoring,
 *     stopMonitoring,
 *     criticalNodes,
 *   } = useNetworkHealth({
 *     autoStart: true,
 *     interval: 30000,
 *   });
 *
 *   return (
 *     <View>
 *       <Text>Health Score: {healthScore}%</Text>
 *       {healthReport && (
 *         <>
 *           <Text>Online: {healthReport.onlineNodes}/{healthReport.totalNodes}</Text>
 *           <Text>Avg RSSI: {healthReport.averageRSSI} dBm</Text>
 *           <Text>Avg Latency: {healthReport.averageLatency} ms</Text>
 *         </>
 *       )}
 *       {criticalNodes.length > 0 && (
 *         <Text>Critical Nodes: {criticalNodes.join(', ')}</Text>
 *       )}
 *       <Button
 *         title={isMonitoring ? 'Stop' : 'Start'}
 *         onPress={isMonitoring ? stopMonitoring : startMonitoring}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useNetworkHealth(
  options: UseNetworkHealthOptions = {}
): UseNetworkHealthReturn {
  const {
    autoStart = false,
    interval = 30000,
    includeRSSI = true,
    includeLatency = true,
    refreshInterval = 0,
  } = options;

  const context = useTelinkMeshContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [criticalNodes, setCriticalNodes] = useState<number[]>([]);

  const startMonitoring = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await context.startHealthMonitoring({
        interval,
        includeRSSI,
        includeLatency,
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [context, interval, includeRSSI, includeLatency]);

  const stopMonitoring = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await context.stopHealthMonitoring();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const refreshReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await context.getHealthReport();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const getNodeHealth = useCallback(
    async (nodeAddress: number): Promise<NodeHealthStatus | null> => {
      try {
        const status = await TelinkBle.getNodeHealthStatus(nodeAddress);
        return status;
      } catch (err) {
        setError(err as Error);
        return null;
      }
    },
    []
  );

  const measureLatency = useCallback(
    async (nodeAddress: number): Promise<number | null> => {
      try {
        const latency = await TelinkBle.measureNodeLatency(nodeAddress);
        return latency;
      } catch (err) {
        setError(err as Error);
        return null;
      }
    },
    []
  );

  // Calculate health score (0-100)
  const healthScore = (() => {
    if (!context.networkHealth) {
      return 0;
    }

    const { activeNodes, totalNodes, averageRssi, networkReliability } =
      context.networkHealth;

    // Normalize metrics to 0-100
    const onlineScore = totalNodes > 0 ? (activeNodes / totalNodes) * 100 : 0;
    const rssiScore = Math.max(0, Math.min(100, (averageRssi + 100) * 2)); // -100 to 0 dBm -> 0 to 100
    const reliabilityScore = networkReliability;

    // Weighted average
    return Math.round(
      onlineScore * 0.5 + rssiScore * 0.25 + reliabilityScore * 0.25
    );
  })();

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && !context.isHealthMonitoring) {
      startMonitoring().catch((err) => {
        console.error('Failed to auto-start health monitoring:', err);
      });
    }
  }, [autoStart, context.isHealthMonitoring, startMonitoring]);

  // Auto-refresh health report
  useEffect(() => {
    if (refreshInterval > 0 && context.isHealthMonitoring) {
      const intervalId = setInterval(() => {
        refreshReport().catch((err) => {
          console.error('Failed to auto-refresh health report:', err);
        });
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [refreshInterval, context.isHealthMonitoring, refreshReport]);

  // Analyze health report for critical nodes
  useEffect(() => {
    if (context.networkHealth) {
      // This would require node-level health data
      // For now, just clear the critical nodes
      // In a real implementation, you'd check individual node health
      setCriticalNodes([]);
    }
  }, [context.networkHealth]);

  return {
    isMonitoring: context.isHealthMonitoring,
    healthReport: context.networkHealth,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    refreshReport,
    getNodeHealth,
    measureLatency,
    healthScore,
    criticalNodes,
  };
}

export default useNetworkHealth;

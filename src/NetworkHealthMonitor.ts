import telinkBle from './index';
import type {
  NetworkHealthConfig,
  NetworkHealthReport,
  NodeHealthStatus,
  NetworkTopology,
} from './types';
import { Phase4EventType } from './types';

/**
 * High-level network health monitoring class
 * Provides real-time monitoring of mesh network health and diagnostics
 */
export class NetworkHealthMonitor {
  private isMonitoring: boolean = false;
  private lastReport?: NetworkHealthReport;
  private monitoringConfig?: NetworkHealthConfig;

  /**
   * Start monitoring network health
   */
  async startMonitoring(config?: NetworkHealthConfig): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Network health monitoring is already active');
      return;
    }

    const defaultConfig: NetworkHealthConfig = {
      checkInterval: 30000, // 30 seconds
      includeRssi: true,
      includeHops: true,
      includeLatency: true,
      nodeAddresses: [], // Empty = monitor all nodes
    };

    this.monitoringConfig = { ...defaultConfig, ...config };

    try {
      await telinkBle.startNetworkHealthMonitoring(this.monitoringConfig);
      this.isMonitoring = true;
      console.log('Network health monitoring started');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stop monitoring network health
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      console.warn('Network health monitoring is not active');
      return;
    }

    try {
      await telinkBle.stopNetworkHealthMonitoring();
      this.isMonitoring = false;
      console.log('Network health monitoring stopped');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current network health report
   */
  async getHealthReport(): Promise<NetworkHealthReport> {
    try {
      const report = await telinkBle.getNetworkHealthReport();
      this.lastReport = report;
      return report;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get health status for a specific node
   */
  async getNodeHealth(nodeAddress: number): Promise<NodeHealthStatus> {
    try {
      return await telinkBle.getNodeHealthStatus(nodeAddress);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get network topology
   */
  async getTopology(): Promise<NetworkTopology> {
    try {
      return await telinkBle.getNetworkTopology();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Measure latency to a specific node
   */
  async measureLatency(nodeAddress: number): Promise<number> {
    try {
      return await telinkBle.measureNodeLatency(nodeAddress);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get last cached health report
   */
  getLastReport(): NetworkHealthReport | undefined {
    return this.lastReport;
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): NetworkHealthConfig | undefined {
    return this.monitoringConfig;
  }

  /**
   * Analyze network health and provide recommendations
   */
  async analyzeNetworkHealth(): Promise<{
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
    metrics: {
      reliability: number;
      coverage: number;
      performance: number;
    };
  }> {
    const report = await this.getHealthReport();

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze node availability
    const availabilityRate =
      report.totalNodes > 0 ? report.activeNodes / report.totalNodes : 0;

    if (availabilityRate < 0.5) {
      issues.push('More than 50% of nodes are offline');
      recommendations.push(
        'Check device batteries and physical placement of nodes'
      );
    } else if (availabilityRate < 0.8) {
      issues.push('Node availability is below 80%');
      recommendations.push(
        'Consider adding more relay nodes to improve coverage'
      );
    }

    // Analyze network latency
    if (report.averageLatency > 1000) {
      issues.push('High network latency detected (>1000ms)');
      recommendations.push('Reduce distance between nodes or add relay nodes');
    } else if (report.averageLatency > 500) {
      issues.push('Moderate network latency (>500ms)');
      recommendations.push('Optimize mesh topology for better routing');
    }

    // Analyze signal strength
    const avgRssi = report.averageRssi;
    if (avgRssi < -90) {
      issues.push('Weak signal strength detected (RSSI < -90 dBm)');
      recommendations.push(
        'Reposition nodes closer together or add relay nodes'
      );
    } else if (avgRssi < -80) {
      issues.push('Signal strength could be improved (RSSI < -80 dBm)');
      recommendations.push('Consider adjusting node placement');
    }

    // Analyze reliability
    if (report.networkReliability < 70) {
      issues.push('Low network reliability (<70%)');
      recommendations.push(
        'Check for interference and ensure stable power supply'
      );
    }

    // Calculate overall status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (
      report.networkReliability >= 90 &&
      availabilityRate >= 0.9 &&
      report.averageLatency <= 300
    ) {
      status = 'excellent';
    } else if (
      report.networkReliability >= 75 &&
      availabilityRate >= 0.75 &&
      report.averageLatency <= 500
    ) {
      status = 'good';
    } else if (
      report.networkReliability >= 60 &&
      availabilityRate >= 0.6 &&
      report.averageLatency <= 1000
    ) {
      status = 'fair';
    } else {
      status = 'poor';
    }

    return {
      status,
      issues,
      recommendations,
      metrics: {
        reliability: report.networkReliability,
        coverage: availabilityRate * 100,
        performance: Math.max(0, 100 - report.averageLatency / 10),
      },
    };
  }

  /**
   * Find problematic nodes that need attention
   */
  async findProblematicNodes(): Promise<{
    offline: NodeHealthStatus[];
    weakSignal: NodeHealthStatus[];
    highLatency: NodeHealthStatus[];
    packetLoss: NodeHealthStatus[];
  }> {
    const report = await this.getHealthReport();

    const offline: NodeHealthStatus[] = [];
    const weakSignal: NodeHealthStatus[] = [];
    const highLatency: NodeHealthStatus[] = [];
    const packetLoss: NodeHealthStatus[] = [];

    for (const node of report.nodes) {
      if (!node.isOnline) {
        offline.push(node);
      }

      if (node.rssi < -85) {
        weakSignal.push(node);
      }

      if (node.latency > 800) {
        highLatency.push(node);
      }

      if (node.packetLossRate > 20) {
        packetLoss.push(node);
      }
    }

    return {
      offline,
      weakSignal,
      highLatency,
      packetLoss,
    };
  }

  /**
   * Get nodes sorted by signal strength
   */
  async getNodesBySignalStrength(): Promise<NodeHealthStatus[]> {
    const report = await this.getHealthReport();
    return [...report.nodes].sort((a, b) => b.rssi - a.rssi);
  }

  /**
   * Get nodes sorted by latency
   */
  async getNodesByLatency(): Promise<NodeHealthStatus[]> {
    const report = await this.getHealthReport();
    return [...report.nodes].sort((a, b) => a.latency - b.latency);
  }

  /**
   * Generate a summary report
   */
  async generateSummaryReport(): Promise<{
    timestamp: Date;
    overallHealth: string;
    totalNodes: number;
    activeNodes: number;
    offlineNodes: number;
    averageRssi: number;
    averageLatency: number;
    reliability: number;
    criticalIssues: number;
    warnings: number;
  }> {
    const report = await this.getHealthReport();
    const analysis = await this.analyzeNetworkHealth();

    const criticalIssues = analysis.issues.filter(
      (issue) =>
        issue.includes('offline') ||
        issue.includes('Low network reliability') ||
        issue.includes('High network latency')
    ).length;

    const warnings = analysis.issues.length - criticalIssues;

    return {
      timestamp: report.timestamp,
      overallHealth: analysis.status,
      totalNodes: report.totalNodes,
      activeNodes: report.activeNodes,
      offlineNodes: report.totalNodes - report.activeNodes,
      averageRssi: report.averageRssi,
      averageLatency: report.averageLatency,
      reliability: report.networkReliability,
      criticalIssues,
      warnings,
    };
  }

  /**
   * Listen to network health update events
   */
  onHealthUpdated(callback: (report: NetworkHealthReport) => void): string {
    return telinkBle.addEventListener(
      Phase4EventType.NETWORK_HEALTH_UPDATED as any,
      (data: NetworkHealthReport) => {
        this.lastReport = data;
        callback(data);
      }
    );
  }

  /**
   * Listen to node health change events
   */
  onNodeHealthChanged(callback: (node: NodeHealthStatus) => void): string {
    return telinkBle.addEventListener(
      Phase4EventType.NODE_HEALTH_CHANGED as any,
      callback
    );
  }

  /**
   * Listen to topology change events
   */
  onTopologyChanged(callback: (topology: NetworkTopology) => void): string {
    return telinkBle.addEventListener(
      Phase4EventType.NETWORK_TOPOLOGY_CHANGED as any,
      callback
    );
  }

  /**
   * Remove event listener
   */
  removeEventListener(subscriptionId: string): void {
    telinkBle.removeEventListener(subscriptionId);
  }
}

export default NetworkHealthMonitor;

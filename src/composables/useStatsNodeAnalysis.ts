import { computed, ref } from 'vue';

export interface NodeStat {
  id: string;
  type: string;
  inRate: number;
  outRate: number;
  latency: number;
  capacity: number;
  utilization: number;
  errors: number;
}

export interface NodeAnalysisProps {
  config?: any;
  metrics?: any;
  nodeErrors?: Array<{ id: string; err_in: number; err_out: number }>;
  stats: { rps: number; inflight: number };
}

/**
 * Composable for handling node statistics analysis and calculations
 */
export function useStatsNodeAnalysis(props: () => NodeAnalysisProps) {
  // Sorting state
  const nodeSortKey = ref('id');
  const nodeSortAsc = ref(true);

  // Basic counts
  const nodeCount = computed(() => props().config?.nodes?.length || 0);
  const linkCount = computed(() => props().config?.links?.length || 0);

  /**
   * Calculate detailed statistics for each node
   */
  const nodeStats = computed((): NodeStat[] => {
    const nodes = props().config?.nodes || [];
    const metrics = props().metrics || {};
    
    return nodes.map((node: any): NodeStat => {
      const nodeMetrics = metrics[node.id] || {};
      
      // Calculate capacities with fallbacks
      const capacity_in = nodeMetrics.capacity_in || node.capacity_in || node.capacity || 100;
      const capacity_out = nodeMetrics.capacity_out || node.capacity_out || node.capacity || 100;
      const inRate = nodeMetrics.inRate || 0;
      const outRate = nodeMetrics.outRate || 0;
      
      // Calculate utilization
      const inUtilization = capacity_in > 0 ? inRate / capacity_in : 0;
      const outUtilization = capacity_out > 0 ? outRate / capacity_out : 0;
      const utilization = Math.max(inUtilization, outUtilization);
      
      return {
        id: node.id,
        type: node.kind || 'Service',
        inRate,
        outRate,
        latency: nodeMetrics.latency || node.base_ms || 0,
        capacity: Math.max(capacity_in, capacity_out),
        utilization: Math.min(1, utilization),
        errors: nodeMetrics.errors || 0
      };
    });
  });

  /**
   * Get nodes sorted by the current sort criteria
   */
  const sortedNodeStats = computed((): NodeStat[] => {
    const stats = [...nodeStats.value];
    stats.sort((a, b) => {
      const aVal = a[nodeSortKey.value as keyof NodeStat];
      const bVal = b[nodeSortKey.value as keyof NodeStat];
      const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return nodeSortAsc.value ? result : -result;
    });
    return stats;
  });

  /**
   * Calculate bottleneck nodes (high utilization)
   */
  const bottlenecks = computed(() => {
    return nodeStats.value
      .filter(node => node.utilization > 0.8)
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);
  });

  /**
   * Calculate top bottlenecks for overview display
   */
  const topBottlenecks = computed(() => {
    return nodeStats.value
      .filter(node => node.utilization > 0.7)
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 3);
  });

  /**
   * Calculate total system throughput
   */
  const totalThroughput = computed(() => {
    return nodeStats.value.reduce((sum, node) => sum + node.inRate, 0);
  });

  /**
   * Calculate average system latency
   */
  const avgLatency = computed(() => {
    const validLatencies = nodeStats.value
      .map(node => node.latency)
      .filter(latency => latency > 0);
    
    if (validLatencies.length === 0) return 0;
    return validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length;
  });

  /**
   * Calculate system-wide error rate
   */
  const errorRate = computed(() => {
    const totalErrors = nodeStats.value.reduce((sum, node) => sum + node.errors, 0);
    const totalRate = Math.max(totalThroughput.value, props().stats.rps);
    return totalRate > 0 ? (totalErrors / totalRate) * 100 : 0;
  });

  /**
   * Get nodes with errors for detailed display
   */
  const nodeErrors = computed(() => {
    const errors = props().nodeErrors || [];
    return errors.filter(error => error.err_in > 0 || error.err_out > 0);
  });

  /**
   * Handle node table sorting
   */
  function sortNodes(key: string) {
    if (nodeSortKey.value === key) {
      nodeSortAsc.value = !nodeSortAsc.value;
    } else {
      nodeSortKey.value = key;
      nodeSortAsc.value = true;
    }
  }

  /**
   * Get sort icon for column headers
   */
  function getSortIcon(key: string): string {
    if (nodeSortKey.value !== key) return '↕';
    return nodeSortAsc.value ? '↑' : '↓';
  }

  /**
   * Get CSS class for utilization bar based on utilization level
   */
  function getUtilizationClass(utilization: number): string {
    if (utilization > 0.9) return 'critical';
    if (utilization > 0.7) return 'warning';
    return 'normal';
  }

  return {
    // State
    nodeSortKey,
    nodeSortAsc,
    
    // Computed values
    nodeCount,
    linkCount,
    nodeStats,
    sortedNodeStats,
    bottlenecks,
    topBottlenecks,
    totalThroughput,
    avgLatency,
    errorRate,
    nodeErrors,
    
    // Methods
    sortNodes,
    getSortIcon,
    getUtilizationClass
  };
}

import { computed, ref } from 'vue';

export interface PathStat {
  id: string;
  from: string;
  to: string;
  hops: number;
  rate: number;
  latency: number;
  dropRate: number;
}

export interface CriticalPath {
  id: string;
  route: string;
  issues: string[];
}

export interface PathAnalysisProps {
  config?: any;
  aggregatedMetrics?: any;
}

/**
 * Composable for handling path statistics analysis and calculations
 */
export function useStatsPathAnalysis(props: () => PathAnalysisProps) {
  // Path filtering state
  const pathFilter = ref('all');

  /**
   * Calculate detailed statistics for all paths from sources to sinks
   */
  const pathStats = computed((): PathStat[] => {
    try {
      const paths: PathStat[] = [];
      
      if (props().aggregatedMetrics?.edgeFlows) {
        const nodes = props().config?.nodes || [];
        const sources = nodes.filter((n: any) => n.kind === 'Source' || n.kind === 'Ingress');
        const sinks = nodes.filter((n: any) => n.kind === 'Sink');
        
        sources.forEach((sourceNode: any) => {
          sinks.forEach((sinkNode: any) => {
            const pathId = `${sourceNode.id} → ${sinkNode.id}`;
            let totalRate = 0;
            let totalLatency = 0;
            let totalDropped = 0;
            let hopCount = 0;
            
            // Aggregate metrics from edge flows
            for (const [edgeKey, flows] of props().aggregatedMetrics.edgeFlows) {
              const [from, to] = edgeKey.split('->');
              
              let edgeRate = 0;
              let edgeLatency = 0;
              let edgeErrors = 0;
              
              flows.forEach((flow: any) => {
                edgeRate += flow.rate || 0;
                edgeLatency += flow.latency || 0;
                edgeErrors += flow.errorRate || 0;
              });
              
              // Include edges that are part of this path
              if (from === sourceNode.id || to === sinkNode.id) {
                totalRate = Math.max(totalRate, edgeRate);
                totalLatency += edgeLatency;
                totalDropped += edgeErrors;
                hopCount++;
              }
            }
            
            if (totalRate > 0 || hopCount > 0) {
              paths.push({
                id: pathId,
                from: sourceNode.id,
                to: sinkNode.id,
                hops: Math.max(2, hopCount),
                rate: totalRate,
                latency: hopCount > 0 ? totalLatency / hopCount : 0,
                dropRate: totalRate > 0 ? totalDropped / totalRate : 0
              });
            }
          });
        });
      }
      
      // Fallback: create zero-stats paths if no real data available
      if (paths.length === 0) {
        const nodes = props().config?.nodes || [];
        const sources = nodes.filter((n: any) => n.kind === 'Source' || n.kind === 'Ingress');
        const sinks = nodes.filter((n: any) => n.kind === 'Sink');
        
        sources.forEach((from: any) => {
          sinks.forEach((to: any) => {
            paths.push({
              id: `${from.id} → ${to.id}`,
              from: from.id,
              to: to.id,
              hops: 2,
              rate: 0,
              latency: 0,
              dropRate: 0
            });
          });
        });
      }
      
      return paths;
    } catch (error) {
      console.error('Error calculating path stats:', error);
      return [];
    }
  });

  /**
   * Get filtered paths based on current filter settings
   */
  const filteredPaths = computed((): PathStat[] => {
    let paths = pathStats.value;
    
    switch (pathFilter.value) {
      case 'critical':
        return paths.filter(p => p.latency > 100);
      case 'lossy':
        return paths.filter(p => p.dropRate > 0.01);
      case 'top':
        return [...paths].sort((a, b) => b.rate - a.rate).slice(0, 10);
      default:
        return paths;
    }
  });

  /**
   * Identify critical paths with high latency or drop rates
   */
  const criticalPaths = computed((): CriticalPath[] => {
    try {
      return pathStats.value
        .filter(path => path.latency > 100 || path.dropRate > 0.01)
        .map(path => ({
          id: path.id,
          route: `${path.from} → ${path.to}`,
          issues: [
            ...(path.latency > 100 ? ['High latency'] : []),
            ...(path.dropRate > 0.01 ? ['Packet loss'] : [])
          ]
        }))
        .slice(0, 5);
    } catch (error) {
      console.error('Error calculating critical paths:', error);
      return [];
    }
  });

  /**
   * Calculate average end-to-end latency across all paths
   */
  const avgEndToEndLatency = computed((): number => {
    const validPaths = pathStats.value.filter(path => path.latency > 0);
    if (validPaths.length === 0) return 0;
    
    return validPaths.reduce((sum, path) => sum + path.latency, 0) / validPaths.length;
  });

  /**
   * Calculate total path throughput
   */
  const totalPathThroughput = computed((): number => {
    return pathStats.value.reduce((sum, path) => sum + path.rate, 0);
  });

  /**
   * Get paths sorted by traffic rate (highest first)
   */
  const topTrafficPaths = computed((): PathStat[] => {
    return [...pathStats.value]
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  });

  /**
   * Calculate path statistics summary
   */
  const pathSummary = computed(() => {
    const paths = pathStats.value;
    const totalPaths = paths.length;
    const activePaths = paths.filter(p => p.rate > 0).length;
    const problematicPaths = criticalPaths.value.length;
    
    return {
      total: totalPaths,
      active: activePaths,
      problematic: problematicPaths,
      healthyPercentage: totalPaths > 0 ? ((totalPaths - problematicPaths) / totalPaths) * 100 : 100
    };
  });

  /**
   * Get path status classification
   */
  function getPathStatus(path: PathStat): 'critical' | 'degraded' | 'healthy' {
    if (path.dropRate > 0.05 || path.latency > 200) return 'critical';
    if (path.dropRate > 0.01 || path.latency > 100) return 'degraded';
    return 'healthy';
  }

  /**
   * Get CSS class for path status
   */
  function getPathStatusClass(path: PathStat): string {
    const status = getPathStatus(path);
    return status === 'critical' ? 'error' : status === 'degraded' ? 'warning' : 'success';
  }

  /**
   * Update path filter
   */
  function setPathFilter(filter: string) {
    pathFilter.value = filter;
  }

  /**
   * Get available filter options
   */
  const filterOptions = computed(() => [
    { value: 'all', label: 'All Paths' },
    { value: 'critical', label: 'Critical Paths (>100ms)' },
    { value: 'lossy', label: 'Lossy Paths (>1% drop)' },
    { value: 'top', label: 'Top 10 by Traffic' }
  ]);

  return {
    // State
    pathFilter,
    
    // Computed values
    pathStats,
    filteredPaths,
    criticalPaths,
    avgEndToEndLatency,
    totalPathThroughput,
    topTrafficPaths,
    pathSummary,
    filterOptions,
    
    // Methods
    getPathStatus,
    getPathStatusClass,
    setPathFilter
  };
}

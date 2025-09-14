import { computed } from 'vue';

export interface GroupStat {
  id: string;
  name: string;
  color?: string;
  nodeCount: number;
  ingressRate: number;
  egressRate: number;
  internalRate: number;
  avgInternalLatency: number;
  crossBoundaryLinks: number;
}

export interface LinkStat {
  id: string;
  ab: number;
  ba: number;
}

export interface AggregationProps {
  config?: any;
  linkStats?: LinkStat[];
  metrics?: any;
}

/**
 * Composable for handling metrics aggregation and group statistics
 */
export function useStatsAggregation(props: () => AggregationProps) {
  
  /**
   * Calculate basic counts
   */
  const groupCount = computed((): number => {
    return props().config?.groups?.length || 0;
  });

  /**
   * Calculate detailed group/boundary statistics
   */
  const groupStats = computed((): GroupStat[] => {
    const groups = props().config?.groups || [];
    const nodes = props().config?.nodes || [];
    const links = props().config?.links || [];
    const metrics = props().metrics || {};
    
    return groups.map((group: any): GroupStat => {
      const groupNodes = group.nodes || [];
      const nodeSet = new Set(groupNodes);
      
      let ingressRate = 0;
      let egressRate = 0;
      let internalRate = 0;
      let crossBoundaryLinks = 0;
      let totalInternalLatency = 0;
      let internalNodeCount = 0;
      
      // Analyze links for cross-boundary traffic
      links.forEach((link: any) => {
        const fromInGroup = nodeSet.has(link.from);
        const toInGroup = nodeSet.has(link.to);
        const linkStat = props().linkStats?.find(l => 
          l.id === `${link.from}->${link.to}` || 
          l.id === `${link.from}-${link.to}`
        );
        const rate = linkStat?.ab || 0;
        
        if (fromInGroup && toInGroup) {
          // Internal traffic within the group
          internalRate += rate;
        } else if (fromInGroup && !toInGroup) {
          // Egress traffic (leaving the group)
          egressRate += rate;
          crossBoundaryLinks++;
        } else if (!fromInGroup && toInGroup) {
          // Ingress traffic (entering the group)
          ingressRate += rate;
          crossBoundaryLinks++;
        }
      });
      
      // Calculate average internal latency for the group
      groupNodes.forEach((nodeId: string) => {
        const nodeMetric = metrics[nodeId];
        if (nodeMetric?.latency) {
          totalInternalLatency += nodeMetric.latency;
          internalNodeCount++;
        }
      });
      
      const avgInternalLatency = internalNodeCount > 0 ? 
        totalInternalLatency / internalNodeCount : 0;
      
      return {
        id: group.id,
        name: group.name,
        color: group.color,
        nodeCount: groupNodes.length,
        ingressRate,
        egressRate,
        internalRate,
        avgInternalLatency,
        crossBoundaryLinks
      };
    });
  });

  /**
   * Calculate total system throughput based on link statistics
   */
  const totalLinkThroughput = computed((): number => {
    return props().linkStats?.reduce((sum, link) => sum + link.ab + link.ba, 0) || 0;
  });

  /**
   * Get groups sorted by various metrics
   */
  const groupsByThroughput = computed((): GroupStat[] => {
    return [...groupStats.value]
      .sort((a, b) => (b.ingressRate + b.egressRate) - (a.ingressRate + a.egressRate));
  });

  const groupsByLatency = computed((): GroupStat[] => {
    return [...groupStats.value]
      .sort((a, b) => b.avgInternalLatency - a.avgInternalLatency);
  });

  /**
   * Calculate aggregated boundary metrics
   */
  const boundaryMetrics = computed(() => {
    const groups = groupStats.value;
    
    return {
      totalGroups: groups.length,
      totalBoundaryLinks: groups.reduce((sum, group) => sum + group.crossBoundaryLinks, 0),
      totalIngressRate: groups.reduce((sum, group) => sum + group.ingressRate, 0),
      totalEgressRate: groups.reduce((sum, group) => sum + group.egressRate, 0),
      totalInternalRate: groups.reduce((sum, group) => sum + group.internalRate, 0),
      avgGroupLatency: groups.length > 0 ? 
        groups.reduce((sum, group) => sum + group.avgInternalLatency, 0) / groups.length : 0,
      avgGroupSize: groups.length > 0 ?
        groups.reduce((sum, group) => sum + group.nodeCount, 0) / groups.length : 0
    };
  });

  /**
   * Identify groups with potential issues
   */
  const problematicGroups = computed(() => {
    return groupStats.value.filter(group => {
      // High latency groups
      const highLatency = group.avgInternalLatency > 100;
      
      // Groups with imbalanced traffic (high egress vs low ingress or vice versa)
      const totalTraffic = group.ingressRate + group.egressRate;
      const trafficImbalance = totalTraffic > 0 && 
        Math.abs(group.ingressRate - group.egressRate) / totalTraffic > 0.7;
      
      // Groups with excessive cross-boundary links
      const excessiveBoundaryLinks = group.crossBoundaryLinks > group.nodeCount * 2;
      
      return highLatency || trafficImbalance || excessiveBoundaryLinks;
    });
  });

  /**
   * Calculate group utilization metrics
   */
  const groupUtilization = computed(() => {
    return groupStats.value.map(group => ({
      id: group.id,
      name: group.name,
      ingressUtilization: group.ingressRate / Math.max(1, group.nodeCount * 10), // Assume base capacity
      egressUtilization: group.egressRate / Math.max(1, group.nodeCount * 10),
      internalUtilization: group.internalRate / Math.max(1, group.nodeCount * 5),
      overallUtilization: (group.ingressRate + group.egressRate + group.internalRate) / 
                         Math.max(1, group.nodeCount * 25)
    }));
  });

  /**
   * Get top performing groups by different metrics
   */
  const topPerformingGroups = computed(() => ({
    byThroughput: groupsByThroughput.value.slice(0, 3),
    byLatency: groupsByLatency.value.filter(g => g.avgInternalLatency > 0).slice(0, 3),
    bySize: [...groupStats.value].sort((a, b) => b.nodeCount - a.nodeCount).slice(0, 3)
  }));

  /**
   * Calculate traffic flow efficiency
   */
  const trafficFlowEfficiency = computed(() => {
    const totalTraffic = boundaryMetrics.value.totalIngressRate + 
                        boundaryMetrics.value.totalEgressRate + 
                        boundaryMetrics.value.totalInternalRate;
    
    const boundaryTraffic = boundaryMetrics.value.totalIngressRate + 
                           boundaryMetrics.value.totalEgressRate;
    
    const internalTraffic = boundaryMetrics.value.totalInternalRate;
    
    return {
      totalTraffic,
      boundaryTrafficRatio: totalTraffic > 0 ? boundaryTraffic / totalTraffic : 0,
      internalTrafficRatio: totalTraffic > 0 ? internalTraffic / totalTraffic : 0,
      efficiency: totalTraffic > 0 ? internalTraffic / totalTraffic : 0 // Higher internal ratio = more efficient
    };
  });

  /**
   * Generate boundary analysis recommendations
   */
  const boundaryRecommendations = computed((): string[] => {
    const recs: string[] = [];
    const metrics = boundaryMetrics.value;
    const efficiency = trafficFlowEfficiency.value;
    
    if (problematicGroups.value.length > 0) {
      recs.push(`${problematicGroups.value.length} groups have performance issues`);
    }
    
    if (efficiency.boundaryTrafficRatio > 0.8) {
      recs.push('High cross-boundary traffic - consider service co-location');
    }
    
    if (metrics.avgGroupLatency > 50) {
      recs.push('High average group latency - optimize internal processing');
    }
    
    if (metrics.totalBoundaryLinks > metrics.totalGroups * 3) {
      recs.push('Excessive boundary links - simplify group interconnections');
    }
    
    if (recs.length === 0) {
      recs.push('Group boundaries are well-optimized');
    }
    
    return recs;
  });

  return {
    // Computed values
    groupCount,
    groupStats,
    totalLinkThroughput,
    groupsByThroughput,
    groupsByLatency,
    boundaryMetrics,
    problematicGroups,
    groupUtilization,
    topPerformingGroups,
    trafficFlowEfficiency,
    boundaryRecommendations
  };
}

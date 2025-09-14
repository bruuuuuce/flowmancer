import { computed } from 'vue';

export interface Bottleneck {
  id: string;
  utilization: number;
  severity: 'critical' | 'high' | 'medium';
  affectedPaths: number;
}

export interface DropDetail {
  nodeId: string;
  processingErrors: number;
  incomingErrors: number;
  totalDrops: number;
}

export interface RecommendationAnalysisProps {
  nodeBottlenecks: any[];
  pathCriticalPaths: any[];
  topologyLoops: string[][];
  errorRate: number;
  dropDetails?: DropDetail[];
  stats: { rps: number; inflight: number };
  metrics?: any;
}

/**
 * Composable for handling performance recommendations and system analysis
 */
export function useStatsRecommendations(props: () => RecommendationAnalysisProps) {
  
  /**
   * Enhanced bottlenecks with additional severity metadata
   */
  const bottlenecks = computed((): Bottleneck[] => {
    try {
      return props().nodeBottlenecks
        .map(node => ({
          id: node.id,
          utilization: node.utilization,
          severity: (node.utilization > 0.95 ? 'critical' : 
                   node.utilization > 0.9 ? 'high' : 'medium') as 'critical' | 'high' | 'medium',
          affectedPaths: Math.floor(Math.random() * 10) + 1 // Placeholder - could be calculated from actual path data
        }));
    } catch (error) {
      console.error('Error calculating bottlenecks:', error);
      return [];
    }
  });

  /**
   * Generate performance recommendations based on current system state
   */
  const recommendations = computed((): string[] => {
    try {
      const recs: string[] = [];
      
      // Check for bottleneck nodes
      if (bottlenecks.value.length > 0) {
        recs.push(`Scale up capacity for nodes: ${bottlenecks.value.map(b => b.id).join(', ')}`);
      }
      
      // Check for high error rates
      if (props().errorRate > 1) {
        recs.push('High error rate detected - review node configurations and capacity limits');
      }
      
      // Check for circular dependencies
      if (props().topologyLoops.length > 0) {
        recs.push('Remove circular dependencies to prevent message loops');
      }
      
      // Check for critical paths
      if (props().pathCriticalPaths.length > 0) {
        recs.push(`${props().pathCriticalPaths.length} critical paths detected - investigate latency and drops`);
      }
      
      // Check for drop rate issues
      const totalDropRate = calculateTotalDropRate();
      const dropPercentage = calculateDropPercentage();
      if (dropPercentage > 5) {
        recs.push(`High drop rate (${dropPercentage.toFixed(1)}%) - check node capacity limits`);
      }
      
      // Default recommendation when system is healthy
      if (recs.length === 0) {
        recs.push('System is operating within normal parameters');
      }
      
      return recs;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return ['Unable to generate recommendations due to an error'];
    }
  });

  /**
   * Calculate total number of system issues
   */
  const issueCount = computed((): number => {
    return bottlenecks.value.length + 
           props().pathCriticalPaths.length + 
           props().topologyLoops.length +
           (props().errorRate > 1 ? 1 : 0);
  });

  /**
   * Calculate system health score (0-100)
   */
  const systemHealthScore = computed((): number => {
    let score = 100;
    
    // Penalize for bottlenecks
    bottlenecks.value.forEach(bottleneck => {
      if (bottleneck.severity === 'critical') score -= 15;
      else if (bottleneck.severity === 'high') score -= 10;
      else score -= 5;
    });
    
    // Penalize for critical paths
    score -= props().pathCriticalPaths.length * 8;
    
    // Penalize for topology loops
    score -= props().topologyLoops.length * 12;
    
    // Penalize for high error rate
    if (props().errorRate > 1) score -= 20;
    if (props().errorRate > 5) score -= 30;
    
    // Penalize for high drop rate
    const dropPercentage = calculateDropPercentage();
    if (dropPercentage > 5) score -= 15;
    if (dropPercentage > 10) score -= 25;
    
    return Math.max(0, score);
  });

  /**
   * Get health status based on score
   */
  const healthStatus = computed((): 'excellent' | 'good' | 'warning' | 'critical' => {
    const score = systemHealthScore.value;
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  });

  /**
   * Calculate total drop rate across all nodes
   */
  function calculateTotalDropRate(): number {
    if (!props().dropDetails) return 0;
    return props().dropDetails.reduce((sum, d) => sum + d.totalDrops, 0);
  }

  /**
   * Calculate drop percentage relative to total RPS
   */
  function calculateDropPercentage(): number {
    if (!props().stats.rps || props().stats.rps === 0) return 0;
    return (calculateTotalDropRate() / props().stats.rps) * 100;
  }

  /**
   * Get drop percentage for a specific node
   */
  function getDropPercentage(dropDetail: DropDetail): number {
    const nodeMetrics = props().metrics?.[dropDetail.nodeId];
    const incomingRate = nodeMetrics?.inRate || nodeMetrics?.processed || 0;
    
    if (incomingRate === 0) return 0;
    return (dropDetail.totalDrops / incomingRate) * 100;
  }

  /**
   * Get priority recommendations (top 3 most critical)
   */
  const priorityRecommendations = computed((): string[] => {
    return recommendations.value.slice(0, 3);
  });

  /**
   * Get detailed issue analysis
   */
  const issueAnalysis = computed(() => {
    return {
      criticalBottlenecks: bottlenecks.value.filter(b => b.severity === 'critical').length,
      highBottlenecks: bottlenecks.value.filter(b => b.severity === 'high').length,
      criticalPaths: props().pathCriticalPaths.length,
      circularDependencies: props().topologyLoops.length,
      errorRateIssue: props().errorRate > 1,
      dropRateIssue: calculateDropPercentage() > 5,
      totalIssues: issueCount.value
    };
  });

  /**
   * Get optimization suggestions based on current state
   */
  const optimizationSuggestions = computed((): string[] => {
    const suggestions: string[] = [];
    
    if (bottlenecks.value.length > 0) {
      suggestions.push('Consider implementing load balancing or horizontal scaling');
    }
    
    if (props().pathCriticalPaths.length > 0) {
      suggestions.push('Optimize critical path routing and reduce intermediate hops');
    }
    
    if (props().topologyLoops.length > 0) {
      suggestions.push('Redesign architecture to eliminate circular dependencies');
    }
    
    if (calculateDropPercentage() > 5) {
      suggestions.push('Increase buffer sizes or implement backpressure mechanisms');
    }
    
    return suggestions;
  });

  return {
    // Computed values
    bottlenecks,
    recommendations,
    priorityRecommendations,
    issueCount,
    systemHealthScore,
    healthStatus,
    issueAnalysis,
    optimizationSuggestions,
    
    // Methods
    calculateTotalDropRate,
    calculateDropPercentage,
    getDropPercentage
  };
}

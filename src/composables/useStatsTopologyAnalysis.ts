import { computed } from 'vue';
import { TopologyAnalyzer, type TopologyAnalysis } from '../utils/topologyAnalyzer';

export interface GraphProperties {
  type: string;
  isConnected: boolean;
  hasCycles: boolean;
  maxDepth: number;
  isolatedNodes: number;
}

export interface TopologyAnalysisProps {
  config?: any;
  nodeCount: number;
}

/**
 * Composable for handling topology analysis and graph properties
 */
export function useStatsTopologyAnalysis(props: () => TopologyAnalysisProps) {
  
  /**
   * Detect cycles in the graph using DFS
   */
  const loops = computed((): string[][] => {
    try {
      const nodes = props().config?.nodes || [];
      const links = props().config?.links || [];
      const loops: string[][] = [];
      
      // Build adjacency list
      const adj: Record<string, string[]> = {};
      nodes.forEach((node: any) => {
        adj[node.id] = [];
      });
      links.forEach((link: any) => {
        if (link.from && link.to && adj[link.from]) {
          adj[link.from].push(link.to);
        }
      });
      
      const visited = new Set<string>();
      const recStack = new Set<string>();
      
      function dfs(node: string, path: string[]): void {
        if (recStack.has(node)) {
          // Cycle detected - extract the loop
          const loopStart = path.indexOf(node);
          if (loopStart !== -1) {
            loops.push(path.slice(loopStart));
          }
          return;
        }
        
        if (visited.has(node)) return;
        
        visited.add(node);
        recStack.add(node);
        
        (adj[node] || []).forEach(neighbor => {
          dfs(neighbor, [...path, neighbor]);
        });
        
        recStack.delete(node);
      }
      
      // Check each node for cycles
      nodes.forEach((node: any) => {
        if (!visited.has(node.id)) {
          dfs(node.id, [node.id]);
        }
      });
      
      return loops.slice(0, 3); // Limit to first 3 loops found
    } catch (error) {
      console.error('Error detecting loops:', error);
      return [];
    }
  });

  /**
   * Perform comprehensive topology analysis
   */
  const topologyAnalysis = computed((): TopologyAnalysis | null => {
    const nodes = props().config?.nodes || [];
    const links = props().config?.links || [];
    
    if (nodes.length === 0) return null;
    
    try {
      const analyzer = new TopologyAnalyzer(nodes, links);
      return analyzer.analyze();
    } catch (error) {
      console.error('Failed to analyze topology:', error);
      return null;
    }
  });

  /**
   * Extract key graph properties from topology analysis
   */
  const graphProperties = computed((): GraphProperties => {
    const analysis = topologyAnalysis.value;
    
    if (!analysis) {
      return {
        type: 'Unknown',
        isConnected: false,
        hasCycles: false,
        maxDepth: 0,
        isolatedNodes: 0
      };
    }
    
    return {
      type: analysis.subtype ? `${analysis.type} (${analysis.subtype})` : analysis.type,
      isConnected: analysis.isConnected,
      hasCycles: analysis.hasCycles,
      maxDepth: analysis.maxDepth,
      isolatedNodes: analysis.isolatedNodes
    };
  });

  /**
   * Generate simplified connectivity matrix for visualization
   * Note: This is a simplified representation for UI display
   */
  const connectivityMatrix = computed((): boolean[][] => {
    // Limit matrix size for performance and display purposes
    const size = Math.min(props().nodeCount, 10);
    const matrix: boolean[][] = [];
    
    for (let i = 0; i < size; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < size; j++) {
        // Self-connection is always true, others are randomly determined for demo
        // In a real implementation, this would be based on actual graph connectivity
        row.push(i === j || Math.random() > 0.5);
      }
      matrix.push(row);
    }
    
    return matrix;
  });

  /**
   * Calculate topology metrics summary
   */
  const topologyMetrics = computed(() => {
    const analysis = topologyAnalysis.value;
    const properties = graphProperties.value;
    
    return {
      totalNodes: props().config?.nodes?.length || 0,
      totalEdges: props().config?.links?.length || 0,
      density: analysis?.density || 0,
      avgDegree: analysis?.avgDegree || 0,
      diameter: analysis?.diameter || 0,
      loopCount: loops.value.length,
      isConnected: properties.isConnected,
      hasCycles: properties.hasCycles
    };
  });

  /**
   * Get detailed topology analysis information
   */
  const topologyDetails = computed(() => {
    const analysis = topologyAnalysis.value;
    
    if (!analysis) return null;
    
    return {
      centralNodes: analysis.centralNodes || [],
      leafNodes: analysis.leafNodes || [],
      maxInDegree: analysis.maxInDegree || 0,
      maxOutDegree: analysis.maxOutDegree || 0,
      components: analysis.components || 0,
      stronglyConnectedComponents: analysis.stronglyConnectedComponents || 0
    };
  });

  /**
   * Check if the topology has potential issues
   */
  const topologyIssues = computed(() => {
    const issues: string[] = [];
    const properties = graphProperties.value;
    const metrics = topologyMetrics.value;
    
    if (properties.isolatedNodes > 0) {
      issues.push(`${properties.isolatedNodes} isolated nodes detected`);
    }
    
    if (loops.value.length > 0) {
      issues.push(`${loops.value.length} circular dependencies found`);
    }
    
    if (!properties.isConnected) {
      issues.push('Graph is not fully connected');
    }
    
    if (metrics.density > 0.8) {
      issues.push('Very high connection density may impact performance');
    } else if (metrics.density < 0.1) {
      issues.push('Very low connection density may indicate missing links');
    }
    
    return issues;
  });

  /**
   * Get topology health score (0-100)
   */
  const topologyHealthScore = computed((): number => {
    const properties = graphProperties.value;
    const metrics = topologyMetrics.value;
    let score = 100;
    
    // Penalize for issues
    if (properties.isolatedNodes > 0) score -= 20;
    if (loops.value.length > 0) score -= 15;
    if (!properties.isConnected) score -= 25;
    
    // Penalize extreme densities
    if (metrics.density > 0.9 || metrics.density < 0.05) score -= 10;
    
    return Math.max(0, score);
  });

  return {
    // Computed values
    loops,
    topologyAnalysis,
    graphProperties,
    connectivityMatrix,
    topologyMetrics,
    topologyDetails,
    topologyIssues,
    topologyHealthScore
  };
}

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import { MetricsAggregator, type NodeConfiguration, type GraphTopology, type AggregatedMetrics } from '../metrics';
import { debugMetricsDisplay } from '../metrics/debug-ui';

export interface MetricsData {
  stats: { rps: number; inflight: number };
  linkStats: Array<{ id: string; ab: number; ba: number }>;
  nodeErrors: Array<{ id: string; err_in: number; err_out: number }>;
  dropDetails: Array<{
    nodeId: string;
    processingErrors: number;
    incomingErrors: number;
    totalDrops: number;
  }>;
  realMetrics: Record<string, any>;
  lastAggregatedMetrics: AggregatedMetrics | null;
}

export interface EdgeMetric {
  events: Array<{ t: number; w: number }>;
  errors: Array<{ t: number; w: number }>;
  emaLatencyMs: number | null;
}

export function useMetricsManager(config: Ref<any>) {
  // Metrics aggregator
  let metricsAggregator: MetricsAggregator | null = null;
  const lastAggregatedMetrics = ref<AggregatedMetrics | null>(null);

  // Stats and metrics state
  const stats = ref({ rps: 0, inflight: 0 });
  const linkStats = ref<Array<{ id: string; ab: number; ba: number }>>([]);
  const nodeErrors = ref<Array<{ id: string; err_in: number; err_out: number }>>([]);
  const dropDetails = ref<Array<{
    nodeId: string;
    processingErrors: number;
    incomingErrors: number;
    totalDrops: number;
  }>>([]);

  // Edge metrics for real-time tracking
  const edgeMetrics = ref<Map<string, EdgeMetric>>(new Map());
  let rpsWindow: number[] = [];
  let spawnAcc = 0;

  // Real metrics computed property
  const realMetrics = computed(() => {
    if (!lastAggregatedMetrics.value) return {};
    
    const result: Record<string, any> = {};
    const nodes = (config.value as any).nodes || [];
    
    for (const [nodeId, nodeMetric] of lastAggregatedMetrics.value.nodeMetrics) {
      const nodeConfig = nodes.find((n: any) => n.id === nodeId);
      const capacity_in = nodeConfig?.capacity_in || nodeConfig?.capacity || 100;
      const capacity_out = nodeConfig?.capacity_out || nodeConfig?.capacity || 100;
      
      result[nodeId] = {
        inRate: nodeMetric.incomingRate || 0,
        outRate: nodeMetric.outgoingRate || 0,
        latency: nodeMetric.averageServiceTime || 0,
        errors: nodeMetric.errorRate || 0,
        processed: nodeMetric.processedRate || 0,
        dropped: (nodeMetric.err_in || 0) + (nodeMetric.err_out || 0),
        queueSize: nodeMetric.queueLength || 0,
        capacity_in,
        capacity_out
      };
    }
    
    return result;
  });

  // Path calculation
  function calculateAllPaths(): string[][] {
    const nodes = config.value.nodes || [];
    const links = config.value.links || [];
    if (nodes.length === 0) return [];

    const sourceNodes = nodes.filter(n => n.kind === 'Source' || n.kind === 'Ingress'); 
    const sinkSet = new Set((nodes.filter(n => n.kind === 'Sink')).map(n => n.id));
    if (sourceNodes.length === 0 || sinkSet.size === 0) return [];

    const adjacency = new Map<string, string[]>();
    nodes.forEach(node => adjacency.set(node.id, []));
    links.forEach(link => {
      const neighbors = adjacency.get(link.from);
      if (neighbors) neighbors.push(link.to);
    });

    const allPaths: string[][] = [];
    const MAX_PATHS = 5000; 

    function dfs(nodeId: string, path: string[], seen: Set<string>) {
      if (allPaths.length >= MAX_PATHS) return; 

      const neighbors = adjacency.get(nodeId) || [];

      if (sinkSet.has(nodeId) || neighbors.length === 0) {
        if (path.length > 1) allPaths.push([...path]);
        return;
      }

      for (const nb of neighbors) {
        if (seen.has(nb)) continue; 
        seen.add(nb);
        path.push(nb);
        dfs(nb, path, seen);
        path.pop();
        seen.delete(nb);
      }
    }

    for (const source of sourceNodes) {
      const seen = new Set<string>([source.id]);
      dfs(source.id, [source.id], seen);
    }

    return allPaths.length > 0 ? allPaths : (nodes.length >= 2 ? [[nodes[0].id, nodes[nodes.length - 1].id]] : []);
  }

  function getRandomPath(): string[] {
    const allPaths = calculateAllPaths();
    if (allPaths.length === 0) return [];
    const randomIndex = Math.floor(Math.random() * allPaths.length);
    return allPaths[randomIndex];
  }

  function getPathsForTrafficGeneration(): string[][] {
    const allPaths = calculateAllPaths();
    return allPaths;
  }

  // Edge metrics functions
  function edgeKey(from: string, to: string): string {
    return `${from}->${to}`;
  }

  function getOrInitEdgeMetric(from: string, to: string): EdgeMetric {
    const k = edgeKey(from, to);
    let m = edgeMetrics.value.get(k);
    if (!m) {
      m = { events: [], errors: [], emaLatencyMs: null };
      edgeMetrics.value.set(k, m);
    }
    return m;
  }

  function recordEdgeEvent(from: string, to: string, durationMs: number, isError: boolean, weight: number) {
    const m = getOrInitEdgeMetric(from, to);
    const now = performance.now();
    m.events.push({ t: now, w: weight });
    if (isError) m.errors.push({ t: now, w: weight });
    
    const alpha = 0.2;
    m.emaLatencyMs = m.emaLatencyMs == null ? durationMs : (alpha * durationMs + (1 - alpha) * (m.emaLatencyMs));
    
    m.events = m.events.filter(e => now - e.t < 1000);
    m.errors = m.errors.filter(e => now - e.t < 1000);
  }

  // Metrics system initialization
  function initializeMetricsSystem() {
    try {
      const nodes = (config.value as any).nodes || [];
      const links = (config.value as any).links || [];

      const nodeConfigs = new Map<string, NodeConfiguration>();
      const topology: GraphTopology = { edges: new Map() };
      
      nodes.forEach((n: any) => {
        topology.edges.set(n.id, []);
      });
      
      links.forEach((l: any) => {
        const fromEdges = topology.edges.get(l.from) || [];
        fromEdges.push(l.to);
        topology.edges.set(l.from, fromEdges);
      });
      
      nodes.forEach((n: any) => {
        const nodeConfig: NodeConfiguration = {
          id: n.id,
          kind: n.kind || 'Service',
          maxCapacity: n.capacity || n.rateRps || 100,
          capacity_in: n.capacity_in || n.capacity || n.rateRps || 100,
          capacity_out: n.capacity_out || n.capacity || n.rateRps || 100,
          concurrency: n.concurrency || 10,
          baseLatency: n.base_ms || 20,
          latencyJitter: n.jitter_ms || 5,
          baseErrorRate: typeof n.p_fail === 'number' ? n.p_fail : 0,
          errorUnderLoad: typeof n.p_fail === 'number' ? n.p_fail * 2 : 0,
          degradationThreshold: 0.7,
          overloadThreshold: 0.9,
          routing: n.routing || { policy: 'replicate_all' }
        };
        
        if (nodeConfig.kind === 'Source' || nodeConfig.kind === 'Ingress') {
          nodeConfig.maxCapacity = n.rateRps || config.value.rateRps || 10;
          nodeConfig.capacity_out = n.capacity_out || n.rateRps || config.value.rateRps || 10;
          nodeConfig.capacity_in = n.capacity_in || 0; 
        }
        
        nodeConfigs.set(n.id, nodeConfig);
      });
      
      metricsAggregator = new MetricsAggregator();
      metricsAggregator.updateTopology(topology, nodeConfigs);
      
      console.log('✓ Deterministic metrics system initialized');
      console.log('System summary:', metricsAggregator.getSystemSummary());
    } catch (error) {
      console.error('Failed to initialize metrics system:', error);
      metricsAggregator = null;
    }
  }

  // Recalculate statistics
  function recalculateStatistics(source: string = 'config update') {
    // Reset aggregator
    metricsAggregator = null;
    lastAggregatedMetrics.value = null;
    
    initializeMetricsSystem();
    
    // Reset tracking variables
    rpsWindow.length = 0;
    spawnAcc = 0;
    
    edgeMetrics.value.clear();
    
    try {
      updateLinkStatsFromMetrics();
    } catch (error) {
      console.error('Error updating link stats:', error);
    }
    
    console.log(`🔄 Statistics recalculated due to ${source}`);
  }

  // Update metrics from aggregator
  function updateLinkStatsFromMetrics() {
    if (!metricsAggregator) {
      initializeMetricsSystem();
    }
    
    if (metricsAggregator) {
      // Calculate metrics with delta time of 16ms (60fps)
      const metrics = metricsAggregator.calculateMetrics(16); 
      lastAggregatedMetrics.value = metrics;
      
      // Update link stats
      const newLinkStats: Array<{ id: string; ab: number; ba: number }> = [];
      for (const [edgeKey, flows] of metrics.edgeFlows) {
        const [from, to] = edgeKey.split('->');
        const totalRate = flows.reduce((sum, flow) => sum + flow.rate, 0);
        newLinkStats.push({ id: `${from}->${to}`, ab: totalRate, ba: 0 });
      }
      linkStats.value = newLinkStats;
      
      // Update node errors
      const newNodeErrors: Array<{ id: string; err_in: number; err_out: number }> = [];
      for (const [nodeId, nodeMetrics] of metrics.nodeMetrics) {
        newNodeErrors.push({
          id: nodeId,
          err_in: nodeMetrics.err_in || 0,
          err_out: nodeMetrics.err_out || 0
        });
      }
      nodeErrors.value = newNodeErrors;
      
      // Update drop details
      const newDropDetails: Array<{
        nodeId: string;
        processingErrors: number;
        incomingErrors: number;
        totalDrops: number;
      }> = [];
      for (const [nodeId, nodeMetrics] of metrics.nodeMetrics) {
        const processingErrors = (nodeMetrics.errorRate || 0) * (nodeMetrics.processedRate || 0);
        const incomingErrors = nodeMetrics.incomingErrors || 0;
        const totalDrops = processingErrors + incomingErrors + (nodeMetrics.err_in || 0);
        
        newDropDetails.push({
          nodeId,
          processingErrors,
          incomingErrors,
          totalDrops
        });
      }
      dropDetails.value = newDropDetails;
      
      // Update global stats
      stats.value = { rps: metrics.totalRPS, inflight: 0 };
    } else {
      // Reset everything if no aggregator
      linkStats.value = [];
      nodeErrors.value = [];
      dropDetails.value = [];
      stats.value = { rps: 0, inflight: 0 };
    }
  }

  // Debug function
  function debugMetricsDisplay() {
    if (metricsAggregator) {
      return debugMetricsDisplay();
    }
    return null;
  }

  // Get aggregator for debugging
  function getAggregator() {
    return metricsAggregator;
  }

  // Watch config changes to recalculate
  watch(() => config.value, () => {
    try {
      recalculateStatistics('deep config watch');
    } catch (error) {
      console.error('Error in config watch:', error);
    }
  }, { deep: true });

  // Initialize on creation
  initializeMetricsSystem();

  return {
    // State
    stats: computed(() => stats.value),
    linkStats: computed(() => linkStats.value),
    nodeErrors: computed(() => nodeErrors.value),
    dropDetails: computed(() => dropDetails.value),
    realMetrics,
    lastAggregatedMetrics: computed(() => lastAggregatedMetrics.value),
    edgeMetrics: computed(() => edgeMetrics.value),

    // Path functions
    calculateAllPaths,
    getRandomPath,
    getPathsForTrafficGeneration,

    // Edge metric functions
    edgeKey,
    getOrInitEdgeMetric,
    recordEdgeEvent,

    // Management functions
    initializeMetricsSystem,
    recalculateStatistics,
    updateLinkStatsFromMetrics,

    // Debug functions
    debugMetricsDisplay,
    getAggregator,

    // Computed metrics data
    metricsData: computed((): MetricsData => ({
      stats: stats.value,
      linkStats: linkStats.value,
      nodeErrors: nodeErrors.value,
      dropDetails: dropDetails.value,
      realMetrics: realMetrics.value,
      lastAggregatedMetrics: lastAggregatedMetrics.value
    }))
  };
}

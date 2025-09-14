<template>
  <!-- No template needed - this is a logic-only component -->
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
import { MetricsAggregator, type NodeConfiguration, type GraphTopology, type AggregatedMetrics } from '../../metrics';

const props = defineProps<{
  config: any;
}>();

const emit = defineEmits<{
  'stats-updated': [stats: { rps: number; inflight: number }];
  'link-stats-updated': [linkStats: { id: string; ab: number; ba: number }[]];
  'node-errors-updated': [nodeErrors: { id: string; err_in: number; err_out: number }[]];
  'drop-details-updated': [dropDetails: any[]];
  'aggregated-metrics-updated': [metrics: AggregatedMetrics | null];
}>();

// Metrics state
let metricsAggregator: MetricsAggregator | null = null;
const lastAggregatedMetrics = ref<AggregatedMetrics | null>(null);

// Initialize metrics system
function initializeMetricsSystem() {
  try {
    const nodes = props.config.nodes || [];
    const links = props.config.links || [];

    const nodeConfigs = new Map<string, NodeConfiguration>();
    const topology: GraphTopology = { edges: new Map() };
    
    // Initialize topology
    nodes.forEach((n: any) => {
      topology.edges.set(n.id, []);
    });
    
    links.forEach((l: any) => {
      const fromEdges = topology.edges.get(l.from) || [];
      fromEdges.push(l.to);
      topology.edges.set(l.from, fromEdges);
    });
    
    // Build node configurations
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
        nodeConfig.maxCapacity = n.rateRps || props.config.rateRps || 10;
        nodeConfig.capacity_out = n.capacity_out || n.rateRps || props.config.rateRps || 10;
        nodeConfig.capacity_in = n.capacity_in || 0;
      }
      
      nodeConfigs.set(n.id, nodeConfig);
    });
    
    metricsAggregator = new MetricsAggregator();
    metricsAggregator.updateTopology(topology, nodeConfigs);
    
    console.log('✓ Deterministic metrics system initialized');
    console.log('System summary:', metricsAggregator.getSystemSummary());
    
    return true;
  } catch (error) {
    console.error('Failed to initialize metrics system:', error);
    metricsAggregator = null;
    return false;
  }
}

// Recalculate statistics
function recalculateStatistics(source: string = 'config update') {
  // Reset state
  metricsAggregator = null;
  lastAggregatedMetrics.value = null;
  
  // Reinitialize
  const success = initializeMetricsSystem();
  
  if (success) {
    updateMetrics();
    console.log(`🔄 Statistics recalculated due to ${source}`);
  }
}

// Update all metrics
function updateMetrics() {
  if (!metricsAggregator) {
    initializeMetricsSystem();
    if (!metricsAggregator) return;
  }
  
  try {
    // Calculate metrics
    const metrics = metricsAggregator.calculateMetrics(16);
    lastAggregatedMetrics.value = metrics;
    
    // Update stats
    const stats = { 
      rps: metrics.totalRPS, 
      inflight: 0 // No visual dots to track
    };
    emit('stats-updated', stats);
    
    // Update link stats
    const newLinkStats: { id: string; ab: number; ba: number }[] = [];
    for (const [edgeKey, flows] of metrics.edgeFlows) {
      const [from, to] = edgeKey.split('->');
      const totalRate = flows.reduce((sum, flow) => sum + flow.rate, 0);
      newLinkStats.push({ id: `${from}->${to}`, ab: totalRate, ba: 0 });
    }
    emit('link-stats-updated', newLinkStats);
    
    // Update node errors
    const newNodeErrors: { id: string; err_in: number; err_out: number }[] = [];
    for (const [nodeId, nodeMetrics] of metrics.nodeMetrics) {
      newNodeErrors.push({
        id: nodeId,
        err_in: nodeMetrics.err_in || 0,
        err_out: nodeMetrics.err_out || 0
      });
    }
    emit('node-errors-updated', newNodeErrors);
    
    // Update drop details
    const newDropDetails: any[] = [];
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
    emit('drop-details-updated', newDropDetails);
    
    // Emit aggregated metrics
    emit('aggregated-metrics-updated', metrics);
    
  } catch (error) {
    console.error('Failed to update metrics:', error);
    
    // Emit empty state on error
    emit('stats-updated', { rps: 0, inflight: 0 });
    emit('link-stats-updated', []);
    emit('node-errors-updated', []);
    emit('drop-details-updated', []);
    emit('aggregated-metrics-updated', null);
  }
}

// Watch for config changes
watch(() => props.config, () => {
  recalculateStatistics('config change');
}, { deep: true });

// Initialize on mount
onMounted(() => {
  initializeMetricsSystem();
  updateMetrics();
});

// Expose methods for parent
defineExpose({
  updateMetrics,
  recalculateStatistics,
  getAggregator: () => metricsAggregator,
  getLastMetrics: () => lastAggregatedMetrics.value
});
</script>

import { ref, computed } from 'vue';

interface NodeMetrics {
  inRate: number;
  outRate: number;
  latency: number;
  errors: number;
  processed: number;
  dropped: number;
  queueSize: number;
  timestamp: number;
}

interface PathMetrics {
  id: string;
  from: string;
  to: string;
  nodes: string[];
  totalLatency: number;
  packetsSent: number;
  packetsReceived: number;
  packetsDropped: number;
  lastUpdated: number;
}

interface EdgeMetrics {
  from: string;
  to: string;
  throughput: number;
  latency: number;
  packetLoss: number;
  utilization: number;
}

const RATE_WINDOW = 1000;

const nodeMetrics = ref<Map<string, NodeMetrics>>(new Map());
const pathMetrics = ref<Map<string, PathMetrics>>(new Map());
const edgeMetrics = ref<Map<string, EdgeMetrics>>(new Map());

const metricsHistory = ref<{
  timestamp: number;
  globalThroughput: number;
  globalLatency: number;
  globalErrors: number;
}[]>([]);

const MAX_HISTORY_LENGTH = 100;

export function useMetrics() {
  
  function initNodeMetrics(nodeId: string) {
    if (!nodeMetrics.value.has(nodeId)) {
      nodeMetrics.value.set(nodeId, {
        inRate: 0,
        outRate: 0,
        latency: 0,
        errors: 0,
        processed: 0,
        dropped: 0,
        queueSize: 0,
        timestamp: Date.now()
      });
    }
  }
  
  function updateNodeMetrics(nodeId: string, updates: Partial<NodeMetrics>) {
    const current = nodeMetrics.value.get(nodeId) || {
      inRate: 0,
      outRate: 0,
      latency: 0,
      errors: 0,
      processed: 0,
      dropped: 0,
      queueSize: 0,
      timestamp: Date.now()
    };
    
    const now = Date.now();
    const timeDelta = now - current.timestamp;
    
    if (updates.processed !== undefined && timeDelta > 0) {
      const processDelta = updates.processed - current.processed;
      updates.outRate = (processDelta / timeDelta) * 1000; 
    }
    
    nodeMetrics.value.set(nodeId, {
      ...current,
      ...updates,
      timestamp: now
    });
  }
  
  function initPathMetrics(pathId: string, from: string, to: string, nodes: string[]) {
    if (!pathMetrics.value.has(pathId)) {
      pathMetrics.value.set(pathId, {
        id: pathId,
        from,
        to,
        nodes,
        totalLatency: 0,
        packetsSent: 0,
        packetsReceived: 0,
        packetsDropped: 0,
        lastUpdated: Date.now()
      });
    }
  }
  
  function updatePathMetrics(pathId: string, updates: Partial<PathMetrics>) {
    const current = pathMetrics.value.get(pathId);
    if (!current) return;
    
    pathMetrics.value.set(pathId, {
      ...current,
      ...updates,
      lastUpdated: Date.now()
    });
  }
  
  function updateEdgeMetrics(from: string, to: string, updates: Partial<EdgeMetrics>) {
    const key = `${from}-${to}`;
    const current = edgeMetrics.value.get(key) || {
      from,
      to,
      throughput: 0,
      latency: 0,
      packetLoss: 0,
      utilization: 0
    };
    
    edgeMetrics.value.set(key, {
      ...current,
      ...updates
    });
  }
  
  function recordPacketTransmission(pathId: string, nodeId: string, success: boolean, latency?: number) {
    
    const path = pathMetrics.value.get(pathId);
    if (path) {
      updatePathMetrics(pathId, {
        packetsSent: path.packetsSent + 1,
        packetsReceived: success ? path.packetsReceived + 1 : path.packetsReceived,
        packetsDropped: !success ? path.packetsDropped + 1 : path.packetsDropped,
        totalLatency: latency ? path.totalLatency + latency : path.totalLatency
      });
    }
    
    const node = nodeMetrics.value.get(nodeId);
    if (node) {
      updateNodeMetrics(nodeId, {
        processed: node.processed + 1,
        dropped: !success ? node.dropped + 1 : node.dropped,
        errors: !success ? node.errors + 1 : node.errors,
        latency: latency || node.latency
      });
    }
  }
  
  function updateGlobalMetrics() {
    const now = Date.now();
    
    let totalThroughput = 0;
    let totalLatency = 0;
    let totalErrors = 0;
    let nodeCount = 0;
    
    nodeMetrics.value.forEach(metrics => {
      totalThroughput += metrics.outRate;
      totalLatency += metrics.latency;
      totalErrors += metrics.errors;
      nodeCount++;
    });
    
    const avgLatency = nodeCount > 0 ? totalLatency / nodeCount : 0;
    
    metricsHistory.value.push({
      timestamp: now,
      globalThroughput: totalThroughput,
      globalLatency: avgLatency,
      globalErrors: totalErrors
    });
    
    if (metricsHistory.value.length > MAX_HISTORY_LENGTH) {
      metricsHistory.value = metricsHistory.value.slice(-MAX_HISTORY_LENGTH);
    }
  }
  
  function clearMetrics() {
    nodeMetrics.value.clear();
    pathMetrics.value.clear();
    edgeMetrics.value.clear();
    metricsHistory.value = [];
  }
  
  const allNodeMetrics = computed(() => {
    const result: Record<string, NodeMetrics> = {};
    nodeMetrics.value.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });
  
  const allPathMetrics = computed(() => {
    return Array.from(pathMetrics.value.values());
  });
  
  const allEdgeMetrics = computed(() => {
    return Array.from(edgeMetrics.value.values());
  });
  
  const globalStats = computed(() => {
    const latest = metricsHistory.value[metricsHistory.value.length - 1];
    if (!latest) {
      return {
        throughput: 0,
        latency: 0,
        errorRate: 0
      };
    }
    
    return {
      throughput: latest.globalThroughput,
      latency: latest.globalLatency,
      errorRate: latest.globalThroughput > 0 ? (latest.globalErrors / latest.globalThroughput) * 100 : 0
    };
  });
  
  const bottlenecks = computed(() => {
    const results: Array<{
      nodeId: string;
      utilization: number;
      queueSize: number;
    }> = [];
    
    nodeMetrics.value.forEach((metrics, nodeId) => {
      
      const utilization = metrics.outRate > 0 ? metrics.inRate / metrics.outRate : 0;
      if (utilization > 0.8 || metrics.queueSize > 10 || metrics.errors > 0) {
        results.push({
          nodeId,
          utilization,
          queueSize: metrics.queueSize
        });
      }
    });
    
    return results.sort((a, b) => b.utilization - a.utilization);
  });
  
  const criticalPaths = computed(() => {
    return allPathMetrics.value
      .filter(path => {
        const avgLatency = path.packetsReceived > 0 ? path.totalLatency / path.packetsReceived : 0;
        const lossRate = path.packetsSent > 0 ? path.packetsDropped / path.packetsSent : 0;
        return avgLatency > 100 || lossRate > 0.01;
      })
      .map(path => ({
        ...path,
        avgLatency: path.packetsReceived > 0 ? path.totalLatency / path.packetsReceived : 0,
        lossRate: path.packetsSent > 0 ? path.packetsDropped / path.packetsSent : 0
      }));
  });
  
  return {
    
    nodeMetrics: allNodeMetrics,
    pathMetrics: allPathMetrics,
    edgeMetrics: allEdgeMetrics,
    metricsHistory,
    
    globalStats,
    bottlenecks,
    criticalPaths,
    
    initNodeMetrics,
    updateNodeMetrics,
    initPathMetrics,
    updatePathMetrics,
    updateEdgeMetrics,
    recordPacketTransmission,
    updateGlobalMetrics,
    clearMetrics
  };
}

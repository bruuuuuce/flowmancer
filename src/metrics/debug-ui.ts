
import { MetricsAggregator } from './MetricsAggregator';
import type { NodeConfiguration, GraphTopology } from './MetricNode';

export function debugMetricsDisplay() {
  console.group('🔍 Debug Metrics Display');
  
  const nodeConfigs = new Map<string, NodeConfiguration>([
    ['A', {
      id: 'A',
      kind: 'Ingress',
      maxCapacity: 10,
      concurrency: 1,
      baseLatency: 5,
      latencyJitter: 0,
      baseErrorRate: 0,
      errorUnderLoad: 0,
      degradationThreshold: 0.7,
      overloadThreshold: 0.9,
      routing: { 
        policy: 'weighted',
        weights: { 'B': 0.7, 'D': 0.3 }
      }
    }],
    ['B', {
      id: 'B',
      kind: 'LoadBalancer',
      maxCapacity: 100,
      concurrency: 10,
      baseLatency: 5,
      latencyJitter: 0,
      baseErrorRate: 0.001,
      errorUnderLoad: 0.002,
      degradationThreshold: 0.7,
      overloadThreshold: 0.9,
      routing: { policy: 'round_robin' }
    }],
    ['D', {
      id: 'D',
      kind: 'Service',
      maxCapacity: 100,
      concurrency: 10,
      baseLatency: 15,
      latencyJitter: 0,
      baseErrorRate: 0.005,
      errorUnderLoad: 0.01,
      degradationThreshold: 0.7,
      overloadThreshold: 0.9,
      routing: { policy: 'replicate_all' }
    }]
  ]);

  const topology: GraphTopology = {
    edges: new Map([
      ['A', ['B', 'D']],
      ['B', []],
      ['D', []]
    ])
  };

  const aggregator = new MetricsAggregator();
  aggregator.updateTopology(topology, nodeConfigs);
  
  console.log('📊 Running 3 metric calculations to check stability...');
  
  for (let i = 0; i < 3; i++) {
    const metrics = aggregator.calculateMetrics(16);
    
    console.log(`\n===== Calculation ${i + 1} =====`);
    console.log('Node Metrics:');
    for (const [nodeId, nodeMetrics] of metrics.nodeMetrics) {
      console.log(`  ${nodeId}: in=${nodeMetrics.incomingRate.toFixed(1)} RPS, out=${nodeMetrics.processedRate.toFixed(1)} RPS`);
    }
    
    console.log('Edge Flows:');
    for (const [edgeKey, flows] of metrics.edgeFlows) {
      const totalRate = flows.reduce((sum, f) => sum + f.rate, 0);
      console.log(`  ${edgeKey}: ${totalRate.toFixed(1)} RPS`);
    }
  }
  
  console.log('\n✅ Expectations with weighted policy:');
  console.log('  - A should output 10 RPS total');
  console.log('  - A->B should be 7 RPS (70% of traffic)');
  console.log('  - A->D should be 3 RPS (30% of traffic)');
  console.log('  - B should receive 7 RPS');
  console.log('  - D should receive 3 RPS');
  console.log('  - All values should be stable across calculations');
  
  console.groupEnd();
  
  return aggregator;
}

if (typeof window !== 'undefined') {
  (window as any).debugMetricsDisplay = debugMetricsDisplay;
}

if (typeof window === 'undefined' && typeof process !== 'undefined') {
  debugMetricsDisplay();
}

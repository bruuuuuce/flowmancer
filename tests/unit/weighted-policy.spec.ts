// Test for weighted routing policy
import { describe, it, expect } from 'vitest';
import { MetricsAggregator, type NodeConfiguration, type GraphTopology } from '../../src/metrics';

describe('Weighted Routing Policy', () => {
  it('should distribute traffic according to weights for Ingress', () => {
    const nodeConfigs = new Map<string, NodeConfiguration>([
      ['A', {
        id: 'A',
        kind: 'Ingress',
        maxCapacity: 100,
        concurrency: 1,
        baseLatency: 5,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { 
          policy: 'weighted',
          weights: { 'B': 0.7, 'C': 0.3 }
        }
      }],
      ['B', {
        id: 'B',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['C', {
        id: 'C',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 15,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const topology: GraphTopology = {
      edges: new Map([
        ['A', ['B', 'C']],
        ['B', []],
        ['C', []]
      ])
    };

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodeConfigs);
    const metrics = aggregator.calculateMetrics(1000);

    const nodeA = metrics.nodeMetrics.get('A');
    const nodeB = metrics.nodeMetrics.get('B');
    const nodeC = metrics.nodeMetrics.get('C');
    
    expect(nodeA?.processedRate).toBe(100);
    
    // With weighted policy, A should distribute 70% to B and 30% to C
    expect(nodeB?.incomingRate).toBeCloseTo(70, 0);
    expect(nodeC?.incomingRate).toBeCloseTo(30, 0);
  });

  it('should handle weighted policy in Service nodes', () => {
    const nodeConfigs = new Map<string, NodeConfiguration>([
      ['A', {
        id: 'A',
        kind: 'Ingress',
        maxCapacity: 100,
        concurrency: 1,
        baseLatency: 5,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['B', {
        id: 'B',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { 
          policy: 'weighted',
          weights: { 'C': 0.8, 'D': 0.2 }
        }
      }],
      ['C', {
        id: 'C',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 15,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['D', {
        id: 'D',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 20,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const topology: GraphTopology = {
      edges: new Map([
        ['A', ['B']],
        ['B', ['C', 'D']],
        ['C', []],
        ['D', []]
      ])
    };

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodeConfigs);
    const metrics = aggregator.calculateMetrics(1000);

    const nodeB = metrics.nodeMetrics.get('B');
    const nodeC = metrics.nodeMetrics.get('C');
    const nodeD = metrics.nodeMetrics.get('D');
    
    expect(nodeB?.incomingRate).toBe(100);
    
    // Service B with weighted policy should distribute 80% to C and 20% to D
    expect(nodeC?.incomingRate).toBeCloseTo(80, 0);
    expect(nodeD?.incomingRate).toBeCloseTo(20, 0);
  });

  it('replicate_all should still replicate to all downstream', () => {
    const nodeConfigs = new Map<string, NodeConfiguration>([
      ['A', {
        id: 'A',
        kind: 'Ingress',
        maxCapacity: 100,
        capacity_out: 200, // Need 200 to replicate 100 to each of 2 targets
        concurrency: 1,
        baseLatency: 5,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['B', {
        id: 'B',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['C', {
        id: 'C',
        kind: 'Service',
        maxCapacity: 200,
        concurrency: 10,
        baseLatency: 15,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const topology: GraphTopology = {
      edges: new Map([
        ['A', ['B', 'C']],
        ['B', []],
        ['C', []]
      ])
    };

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodeConfigs);
    const metrics = aggregator.calculateMetrics(1000);

    const nodeA = metrics.nodeMetrics.get('A');
    const nodeB = metrics.nodeMetrics.get('B');
    const nodeC = metrics.nodeMetrics.get('C');
    
    expect(nodeA?.processedRate).toBe(100);
    
    // With replicate_all, both B and C should get 100
    expect(nodeB?.incomingRate).toBe(100);
    expect(nodeC?.incomingRate).toBe(100);
  });
});

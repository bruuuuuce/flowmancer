// Comprehensive unit tests for routing policies and metric calculations
import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsAggregator, type NodeConfiguration, type GraphTopology } from '../../src/metrics';

describe('Metrics System - Routing Policies', () => {
  let aggregator: MetricsAggregator;

  beforeEach(() => {
    aggregator = new MetricsAggregator();
  });

  describe('Replication Policy (replicate_all)', () => {
    it('should replicate 100% traffic to all downstream nodes for Ingress', () => {
      const nodeConfigs = new Map<string, NodeConfiguration>([
        ['A', {
          id: 'A',
          kind: 'Ingress',
          maxCapacity: 10,
          capacity_out: 20, // Need 20 to replicate 10 to each of 2 targets
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
          maxCapacity: 100,
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
          maxCapacity: 100,
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

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      // A generates 10 RPS and should replicate to both B and C
      const nodeA = metrics.nodeMetrics.get('A');
      const nodeB = metrics.nodeMetrics.get('B');
      const nodeC = metrics.nodeMetrics.get('C');
      
      expect(nodeA?.processedRate).toBe(10);
      expect(nodeB?.incomingRate).toBe(10); // Full replication
      expect(nodeC?.incomingRate).toBe(10); // Full replication
    });

    it('should replicate 100% traffic from Service nodes', () => {
      const nodeConfigs = new Map<string, NodeConfiguration>([
        ['A', {
          id: 'A',
          kind: 'Ingress',
          maxCapacity: 20,
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
          maxCapacity: 100,
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
          maxCapacity: 100,
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
          kind: 'Sink',
          maxCapacity: 1000,
          concurrency: 100,
          baseLatency: 0,
          latencyJitter: 0,
          baseErrorRate: 0,
          errorUnderLoad: 0,
          degradationThreshold: 1.0,
          overloadThreshold: 1.0,
          routing: { policy: 'replicate_all' }
        }]
      ]);

      const topology: GraphTopology = {
        edges: new Map([
          ['A', ['B']],
          ['B', ['C', 'D']],
          ['C', ['D']],
          ['D', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      const nodeB = metrics.nodeMetrics.get('B');
      const nodeC = metrics.nodeMetrics.get('C');
      const nodeD = metrics.nodeMetrics.get('D');
      
      expect(nodeB?.incomingRate).toBe(20);
      expect(nodeB?.processedRate).toBe(20);
      
      // B should replicate full traffic to both C and D
      expect(nodeC?.incomingRate).toBe(20);
      expect(nodeD?.incomingRate).toBeGreaterThanOrEqual(20); // Gets from both B and C
    });
  });

  describe('LoadBalancer round_robin Policy', () => {
    it('should distribute traffic evenly across downstream nodes', () => {
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
        ['LB', {
          id: 'LB',
          kind: 'LoadBalancer',
          maxCapacity: 200,
          concurrency: 20,
          baseLatency: 2,
          latencyJitter: 0,
          baseErrorRate: 0,
          errorUnderLoad: 0,
          degradationThreshold: 0.8,
          overloadThreshold: 0.95,
          routing: { policy: 'round_robin' }
        }],
        ['B', {
          id: 'B',
          kind: 'Service',
          maxCapacity: 100,
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
          maxCapacity: 100,
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
          ['A', ['LB']],
          ['LB', ['B', 'C']],
          ['B', []],
          ['C', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      const nodeLB = metrics.nodeMetrics.get('LB');
      const nodeB = metrics.nodeMetrics.get('B');
      const nodeC = metrics.nodeMetrics.get('C');
      
      expect(nodeLB?.incomingRate).toBe(100);
      expect(nodeLB?.processedRate).toBe(100);
      
      // LoadBalancer should distribute evenly
      expect(nodeB?.incomingRate).toBeCloseTo(50, 0);
      expect(nodeC?.incomingRate).toBeCloseTo(50, 0);
    });
  });

  describe('LoadBalancer weighted Policy', () => {
    it('should distribute traffic according to weights', () => {
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
        ['LB', {
          id: 'LB',
          kind: 'LoadBalancer',
          maxCapacity: 200,
          concurrency: 20,
          baseLatency: 2,
          latencyJitter: 0,
          baseErrorRate: 0,
          errorUnderLoad: 0,
          degradationThreshold: 0.8,
          overloadThreshold: 0.95,
          routing: { 
            policy: 'weighted',
            weights: { 'B': 0.7, 'C': 0.3 }
          }
        }],
        ['B', {
          id: 'B',
          kind: 'Service',
          maxCapacity: 100,
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
          maxCapacity: 100,
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
          ['A', ['LB']],
          ['LB', ['B', 'C']],
          ['B', []],
          ['C', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      const nodeB = metrics.nodeMetrics.get('B');
      const nodeC = metrics.nodeMetrics.get('C');
      
      // LoadBalancer should distribute according to weights
      expect(nodeB?.incomingRate).toBeCloseTo(70, 0); // 70% of 100
      expect(nodeC?.incomingRate).toBeCloseTo(30, 0); // 30% of 100
    });
  });

  describe('Complex Topology - Your exact configuration', () => {
    it('should handle A->B,D with B as LoadBalancer correctly', () => {
      const nodeConfigs = new Map<string, NodeConfiguration>([
        ['A', {
          id: 'A',
          kind: 'Ingress',
          maxCapacity: 10,
          capacity_out: 20, // Need to replicate to both B and D
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
        ['C', {
          id: 'C',
          kind: 'Service',
          maxCapacity: 50,
          concurrency: 10,
          baseLatency: 20,
          latencyJitter: 0,
          baseErrorRate: 0.01,
          errorUnderLoad: 0.02,
          degradationThreshold: 0.7,
          overloadThreshold: 0.9,
          routing: { policy: 'replicate_all' }
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
        }],
        ['E', {
          id: 'E',
          kind: 'Sink',
          maxCapacity: 1000,
          concurrency: 100,
          baseLatency: 0,
          latencyJitter: 0,
          baseErrorRate: 0,
          errorUnderLoad: 0,
          degradationThreshold: 1.0,
          overloadThreshold: 1.0,
          routing: { policy: 'replicate_all' }
        }]
      ]);

      const topology: GraphTopology = {
        edges: new Map([
          ['A', ['B', 'D']], // A replicates to both B and D
          ['B', ['C', 'D']], // B load balances between C and D
          ['C', ['E']],
          ['D', ['E']],
          ['E', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      const nodeA = metrics.nodeMetrics.get('A');
      const nodeB = metrics.nodeMetrics.get('B');
      const nodeC = metrics.nodeMetrics.get('C');
      const nodeD = metrics.nodeMetrics.get('D');
      const nodeE = metrics.nodeMetrics.get('E');

      // A should generate 10 RPS
      expect(nodeA?.processedRate).toBe(10);
      
      // A should replicate full traffic to both B and D
      expect(nodeB?.incomingRate).toBe(10); // Gets 10 from A
      
      // B (LoadBalancer) distributes its 10 RPS between C and D
      expect(nodeC?.incomingRate).toBeCloseTo(5, 0); // ~50% of B's traffic
      
      // D gets traffic from both A (10) and B (~5)
      expect(nodeD?.incomingRate).toBeCloseTo(15, 0);
      
      // E gets traffic from both C (~5) and D (~15)
      expect(nodeE?.incomingRate).toBeCloseTo(20, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single node graph', () => {
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
          routing: { policy: 'replicate_all' }
        }]
      ]);

      const topology: GraphTopology = {
        edges: new Map([['A', []]])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      expect(metrics.nodeMetrics.get('A')?.processedRate).toBe(10);
    });

    it('should handle disconnected nodes', () => {
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
          routing: { policy: 'replicate_all' }
        }],
        ['B', {
          id: 'B',
          kind: 'Service',
          maxCapacity: 100,
          concurrency: 10,
          baseLatency: 10,
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
          ['A', []],
          ['B', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      expect(metrics.nodeMetrics.get('A')?.processedRate).toBe(10);
      expect(metrics.nodeMetrics.get('B')?.incomingRate).toBe(0);
    });

    it('should handle overload conditions', () => {
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
          maxCapacity: 10, // Very low capacity
          concurrency: 1,
          baseLatency: 10,
          latencyJitter: 0,
          baseErrorRate: 0,
          errorUnderLoad: 0.1,
          degradationThreshold: 0.7,
          overloadThreshold: 0.9,
          routing: { policy: 'replicate_all' }
        }]
      ]);

      const topology: GraphTopology = {
        edges: new Map([
          ['A', ['B']],
          ['B', []]
        ])
      };

      aggregator.updateTopology(topology, nodeConfigs);
      const metrics = aggregator.calculateMetrics(1000);

      const nodeB = metrics.nodeMetrics.get('B');
      
      expect(nodeB?.incomingRate).toBe(100); // Receives full traffic
      expect(nodeB?.processedRate).toBe(10); // But can only process its capacity
      expect(nodeB?.isOverloaded).toBe(true);
      expect(nodeB?.err_in).toBe(90); // 100 - 10 = 90 dropped
    });
  });
});

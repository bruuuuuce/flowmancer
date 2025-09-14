import { describe, it, expect } from 'vitest';
import { MetricsAggregator, type NodeConfiguration, type GraphTopology } from '../src/metrics';

describe('Capacity Limits (capacity_in/capacity_out)', () => {
  it('should track err_in when input capacity is exceeded', () => {
    // Create a simple topology: Ingress -> Service
    const topology: GraphTopology = {
      edges: new Map([
        ['ingress1', ['service1']],
        ['service1', []]
      ])
    };

    const nodes = new Map<string, NodeConfiguration>([
      ['ingress1', {
        id: 'ingress1',
        kind: 'Ingress',
        maxCapacity: 100, // Legacy fallback
        capacity_out: 100, // Can generate 100 req/s
        baseLatency: 0,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['service1', {
        id: 'service1',
        kind: 'Service',
        maxCapacity: 50, // Legacy fallback
        capacity_in: 50, // Can only accept 50 req/s
        capacity_out: 100, // Can output 100 req/s if it had the input
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodes);
    
    const metrics = aggregator.calculateMetrics();
    const serviceMetrics = metrics.nodeMetrics.get('service1');
    
    expect(serviceMetrics).toBeDefined();
    expect(serviceMetrics!.incomingRate).toBe(100); // Ingress sends 100
    expect(serviceMetrics!.err_in).toBe(50); // 50 req/s dropped (100 - 50)
    expect(serviceMetrics!.processedRate).toBe(50); // Only processes what it can accept
  });

  it('should track err_out when output capacity is exceeded', () => {
    // Create topology: Ingress -> Service -> (Service2, Service3) with replicate_all
    const topology: GraphTopology = {
      edges: new Map([
        ['ingress1', ['service1']],
        ['service1', ['service2', 'service3']],
        ['service2', []],
        ['service3', []]
      ])
    };

    const nodes = new Map<string, NodeConfiguration>([
      ['ingress1', {
        id: 'ingress1',
        kind: 'Ingress',
        maxCapacity: 100,
        capacity_out: 100,
        baseLatency: 0,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['service1', {
        id: 'service1',
        kind: 'Service',
        maxCapacity: 100,
        capacity_in: 100,
        capacity_out: 80, // Can only output 80 req/s total
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' } // Wants to send 100 to each = 200 total
      }],
      ['service2', {
        id: 'service2',
        kind: 'Service',
        maxCapacity: 100,
        capacity_in: 100,
        capacity_out: 100,
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['service3', {
        id: 'service3',
        kind: 'Service',
        maxCapacity: 100,
        capacity_in: 100,
        capacity_out: 100,
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodes);
    
    const metrics = aggregator.calculateMetrics();
    const service1Metrics = metrics.nodeMetrics.get('service1');
    
    expect(service1Metrics).toBeDefined();
    expect(service1Metrics!.processedRate).toBe(100); // Processes all incoming from ingress
    
    // With replicate_all to 2 targets, wants to send 200 total but limited to 80
    expect(service1Metrics!.err_out).toBeGreaterThan(0); // Should have output errors
    expect(service1Metrics!.outgoingRate).toBeLessThanOrEqual(80); // Capped at capacity_out
  });

  it('should handle asymmetric capacities in database nodes', () => {
    // Database with limited input connections but high output bandwidth
    const topology: GraphTopology = {
      edges: new Map([
        ['ingress1', ['db1']],
        ['db1', []]
      ])
    };

    const nodes = new Map<string, NodeConfiguration>([
      ['ingress1', {
        id: 'ingress1',
        kind: 'Ingress',
        maxCapacity: 1000,
        capacity_out: 1000,
        baseLatency: 0,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['db1', {
        id: 'db1',
        kind: 'DB',
        maxCapacity: 100,
        capacity_in: 100, // Limited connections (100 req/s)
        capacity_out: 500, // Can return lots of data (500 req/s)
        baseLatency: 50,
        latencyJitter: 10,
        baseErrorRate: 0.001,
        errorUnderLoad: 0.01,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodes);
    
    const metrics = aggregator.calculateMetrics();
    const dbMetrics = metrics.nodeMetrics.get('db1');
    
    expect(dbMetrics).toBeDefined();
    expect(dbMetrics!.incomingRate).toBe(1000); // Ingress tries to send 1000
    expect(dbMetrics!.err_in).toBe(900); // 900 dropped (1000 - 100)
    expect(dbMetrics!.processedRate).toBe(100); // Only processes capacity_in
    expect(dbMetrics!.err_out).toBe(0); // No output errors as it has high capacity_out
  });

  it('should default to maxCapacity when capacity_in/out not specified', () => {
    // Test backward compatibility
    const topology: GraphTopology = {
      edges: new Map([
        ['ingress1', ['service1']],
        ['service1', []]
      ])
    };

    const nodes = new Map<string, NodeConfiguration>([
      ['ingress1', {
        id: 'ingress1',
        kind: 'Ingress',
        maxCapacity: 100,
        capacity_out: 100,
        baseLatency: 0,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }],
      ['service1', {
        id: 'service1',
        kind: 'Service',
        maxCapacity: 75, // Only legacy field set
        // capacity_in and capacity_out not specified
        baseLatency: 10,
        latencyJitter: 0,
        baseErrorRate: 0,
        errorUnderLoad: 0,
        degradationThreshold: 0.7,
        overloadThreshold: 0.9,
        routing: { policy: 'replicate_all' }
      }]
    ]);

    const aggregator = new MetricsAggregator();
    aggregator.updateTopology(topology, nodes);
    
    const metrics = aggregator.calculateMetrics();
    const serviceMetrics = metrics.nodeMetrics.get('service1');
    
    expect(serviceMetrics).toBeDefined();
    // Should use maxCapacity (75) as both capacity_in and capacity_out
    expect(serviceMetrics!.incomingRate).toBe(100); // Ingress sends 100
    expect(serviceMetrics!.err_in).toBe(25); // 100 - 75
    expect(serviceMetrics!.processedRate).toBe(75);
  });
});

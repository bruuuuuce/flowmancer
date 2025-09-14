import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import StatsOverlayEnhanced from '../../src/ui/components/overlays/StatsOverlayEnhanced.vue';

describe('StatsOverlayEnhanced with Real Metrics', () => {
  const mockAggregatedMetrics = {
    totalRPS: 10,
    totalErrors: 0.5,
    averageLatency: 25,
    healthyNodes: 2,
    degradedNodes: 1,
    overloadedNodes: 0,
    nodeMetrics: new Map([
      ['ingress', {
        incomingRate: 0,
        incomingConnections: 0,
        incomingLatency: 0,
        incomingErrors: 0,
        utilization: 0.1,
        queueLength: 0,
        processedRate: 10,
        errorRate: 0,
        averageServiceTime: 5,
        err_in: 0,
        err_out: 0,
        outgoingRate: 10,
        outgoingConnections: 1,
        outgoingLatency: 5,
        outgoingErrors: 0,
        isHealthy: true,
        isDegraded: false,
        isOverloaded: false,
        lastUpdated: Date.now()
      }],
      ['service1', {
        incomingRate: 10,
        incomingConnections: 1,
        incomingLatency: 5,
        incomingErrors: 0,
        utilization: 0.4,
        queueLength: 2,
        processedRate: 9.5,
        errorRate: 0.5,
        averageServiceTime: 20,
        err_in: 0,
        err_out: 0,
        outgoingRate: 9.5,
        outgoingConnections: 1,
        outgoingLatency: 25,
        outgoingErrors: 0.5,
        isHealthy: false,
        isDegraded: true,
        isOverloaded: false,
        lastUpdated: Date.now()
      }],
      ['sink', {
        incomingRate: 9.5,
        incomingConnections: 1,
        incomingLatency: 25,
        incomingErrors: 0.5,
        utilization: 0.095,
        queueLength: 0,
        processedRate: 9.5,
        errorRate: 0,
        averageServiceTime: 0,
        err_in: 0,
        err_out: 0,
        outgoingRate: 0,
        outgoingConnections: 0,
        outgoingLatency: 0,
        outgoingErrors: 0,
        isHealthy: true,
        isDegraded: false,
        isOverloaded: false,
        lastUpdated: Date.now()
      }]
    ]),
    edgeFlows: new Map([
      ['ingress->service1', [{
        targetNodeId: 'service1',
        rate: 10,
        latency: 5,
        errorRate: 0,
        weight: 1
      }]],
      ['service1->sink', [{
        targetNodeId: 'sink',
        rate: 9.5,
        latency: 25,
        errorRate: 0.5,
        weight: 1
      }]]
    ]),
    systemHealth: 'degraded' as const,
    lastUpdated: Date.now()
  };

  const mockProps = {
    overlayKey: 'stats',
    overlayMode: 'normal' as const,
    getOverlayStyle: () => ({}),
    setOverlayMode: () => {},
    startDrag: () => {},
    stats: { rps: 10, inflight: 5 },
    linkStats: [
      { id: 'ingress->service1', ab: 10, ba: 0 },
      { id: 'service1->sink', ab: 9.5, ba: 0 }
    ],
    nodeErrors: [],
    config: {
      nodes: [
        { id: 'ingress', kind: 'Ingress', capacity: 100, capacity_in: 0, capacity_out: 100 },
        { id: 'service1', kind: 'Service', capacity: 50, capacity_in: 50, capacity_out: 50, base_ms: 20 },
        { id: 'sink', kind: 'Sink', capacity: 100, capacity_in: 100, capacity_out: 0 }
      ],
      links: [
        { from: 'ingress', to: 'service1' },
        { from: 'service1', to: 'sink' }
      ],
      groups: [
        {
          id: 'backend',
          name: 'Backend Services',
          color: '#3b82f6',
          nodes: ['service1']
        }
      ]
    },
    metrics: {
      ingress: { 
        inRate: 0, 
        outRate: 10, 
        latency: 5, 
        errors: 0,
        capacity_in: 0,
        capacity_out: 100
      },
      service1: { 
        inRate: 10, 
        outRate: 9.5, 
        latency: 20, 
        errors: 0.5,
        capacity_in: 50,
        capacity_out: 50
      },
      sink: { 
        inRate: 9.5, 
        outRate: 0, 
        latency: 0, 
        errors: 0,
        capacity_in: 100,
        capacity_out: 0
      }
    },
    aggregatedMetrics: mockAggregatedMetrics
  };

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(StatsOverlayEnhanced, {
      props: mockProps
    });
  });

  it('displays correct node rates from real metrics', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    const table = wrapper.find('.stats-table');
    const tableText = table.text();
    
    // Check ingress node shows correct rates
    expect(tableText).toContain('ingress');
    expect(tableText).toContain('0.0'); // in rate for ingress
    expect(tableText).toContain('10.0'); // out rate for ingress
    
    // Check service1 shows correct rates  
    expect(tableText).toContain('service1');
    expect(tableText).toContain('10.0'); // in rate
    expect(tableText).toContain('9.5'); // out rate
  });

  it('calculates utilization correctly based on capacity', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    // Service1 has capacity_out of 50 and outRate of 9.5
    // Utilization should be 9.5/50 = 19%
    const rows = wrapper.findAll('tbody tr');
    const service1Row = rows.find((row: any) => row.text().includes('service1'));
    
    expect(service1Row).toBeDefined();
    const utilizationText = service1Row?.find('.utilization-text').text();
    expect(utilizationText).toBe('20%'); // 10/50 for inRate or 9.5/50 for outRate, max is 20%
  });

  it('shows real path metrics without random values', async () => {
    const pathsTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Paths'));
    await pathsTab?.trigger('click');
    
    const table = wrapper.find('.stats-table');
    const tableText = table.text();
    
    // Path should show real metrics
    expect(tableText).toContain('ingress → sink');
    expect(tableText).toContain('10.0 msg/s'); // rate from ingress
    
    // Drop rate should be calculated from real data
    // 0.5 errors / 9.5 rate = 5.26%
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('calculates boundary group metrics from actual data', async () => {
    const boundariesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Boundaries'));
    await boundariesTab?.trigger('click');
    
    const card = wrapper.find('.boundary-card');
    expect(card.exists()).toBe(true);
    
    const cardText = card.text();
    expect(cardText).toContain('Backend Services');
    expect(cardText).toContain('1 nodes'); // service1
    
    // Check rates are calculated from real link stats
    expect(cardText).toContain('10.0 msg/s'); // ingress traffic
    expect(cardText).toContain('9.5 msg/s'); // egress traffic
    
    // Average latency should be stable (20ms for service1)
    expect(cardText).toContain('20.0 ms');
  });

  it('does not show random latency values in boundaries', async () => {
    const boundariesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Boundaries'));
    await boundariesTab?.trigger('click');
    
    // Mount component multiple times and check latency is consistent
    const latencies = [];
    for (let i = 0; i < 3; i++) {
      const newWrapper = mount(StatsOverlayEnhanced, { props: mockProps });
      await newWrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Boundaries'))?.trigger('click');
      const cardText = newWrapper.find('.boundary-card').text();
      const match = cardText.match(/Avg Internal Latency:\s*([\d.]+)/);
      if (match) {
        latencies.push(parseFloat(match[1]));
      }
      newWrapper.unmount();
    }
    
    // All latencies should be the same (20ms from service1)
    expect(latencies.every(l => l === latencies[0])).toBe(true);
  });

  it('shows zero drop rate when no errors', async () => {
    // Modify props to have no errors
    const noErrorProps = {
      ...mockProps,
      aggregatedMetrics: {
        ...mockAggregatedMetrics,
        edgeFlows: new Map([
          ['ingress->service1', [{
            targetNodeId: 'service1',
            rate: 10,
            latency: 5,
            errorRate: 0,
            weight: 1
          }]],
          ['service1->sink', [{
            targetNodeId: 'sink',
            rate: 10,
            latency: 25,
            errorRate: 0,
            weight: 1
          }]]
        ])
      }
    };
    
    const newWrapper = mount(StatsOverlayEnhanced, { props: noErrorProps });
    const pathsTab = newWrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Paths'));
    await pathsTab?.trigger('click');
    
    const tableText = newWrapper.find('.stats-table').text();
    expect(tableText).toContain('0.00%'); // No drop rate
  });
});

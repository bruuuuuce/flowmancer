import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import StatsOverlayEnhanced from '../../src/ui/components/overlays/StatsOverlayEnhanced.vue';

describe('StatsOverlayEnhanced', () => {
  const mockProps = {
    overlayKey: 'stats',
    overlayMode: 'normal' as const,
    getOverlayStyle: () => ({}),
    setOverlayMode: () => {},
    startDrag: () => {},
    stats: { rps: 100, inflight: 50 },
    linkStats: [
      { id: 'node1-node2', ab: 10, ba: 5 },
      { id: 'node2-node3', ab: 20, ba: 15 }
    ],
    nodeErrors: [],
    config: {
      nodes: [
        { id: 'ingress', kind: 'Ingress', capacity: 100 },
        { id: 'service1', kind: 'Service', capacity: 50, base_ms: 20 },
        { id: 'sink', kind: 'Sink', capacity: 100 }
      ],
      links: [
        { from: 'ingress', to: 'service1' },
        { from: 'service1', to: 'sink' }
      ],
      groups: []
    },
    metrics: {
      ingress: { inRate: 20, outRate: 18, latency: 5, errors: 0 },
      service1: { inRate: 18, outRate: 16, latency: 20, errors: 2 },
      sink: { inRate: 16, outRate: 0, latency: 0, errors: 0 }
    }
  };

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(StatsOverlayEnhanced, {
      props: mockProps
    });
  });

  it('renders with tabbed interface', () => {
    expect(wrapper.find('.stats-tabs').exists()).toBe(true);
    expect(wrapper.findAll('.stats-tab').length).toBeGreaterThan(0);
  });

  it('displays global stats bar', () => {
    expect(wrapper.find('.stats-global-bar').exists()).toBe(true);
    expect(wrapper.text()).toContain('100'); // RPS
    expect(wrapper.text()).toContain('50'); // In Flight
  });

  it('shows overview tab by default', () => {
    const overviewTab = wrapper.find('.stats-tab.active');
    expect(overviewTab.text()).toContain('Overview');
    expect(wrapper.find('.tab-panel').text()).toContain('System Overview');
  });

  it('switches tabs when clicked', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    expect(wrapper.find('.tab-panel').text()).toContain('Node Statistics');
    expect(wrapper.find('.stats-table').exists()).toBe(true);
  });

  it('displays node statistics in nodes tab', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    const table = wrapper.find('.stats-table');
    expect(table.exists()).toBe(true);
    expect(table.text()).toContain('ingress');
    expect(table.text()).toContain('service1');
    expect(table.text()).toContain('sink');
  });

  it('shows utilization bars for nodes', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    const utilizationBars = wrapper.findAll('.utilization-bar');
    expect(utilizationBars.length).toBeGreaterThan(0);
  });

  it('displays path analysis tab', async () => {
    const pathsTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Paths'));
    await pathsTab?.trigger('click');
    
    expect(wrapper.find('.tab-panel').text()).toContain('Path Analysis');
    expect(wrapper.find('.path-filter').exists()).toBe(true);
  });

  it('shows boundaries tab with empty state when no groups', async () => {
    const boundariesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Boundaries'));
    await boundariesTab?.trigger('click');
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No boundary groups defined');
  });

  it('displays analysis tab with recommendations', async () => {
    const analysisTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Analysis'));
    await analysisTab?.trigger('click');
    
    expect(wrapper.find('.tab-panel').text()).toContain('System Analysis');
    expect(wrapper.find('.recommendations').exists()).toBe(true);
  });

  it('shows topology tab with graph properties', async () => {
    const topologyTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Topology'));
    await topologyTab?.trigger('click');
    
    expect(wrapper.find('.tab-panel').text()).toContain('Topology Analysis');
    expect(wrapper.find('.graph-properties').exists()).toBe(true);
  });

  it('filters paths in path analysis', async () => {
    const pathsTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Paths'));
    await pathsTab?.trigger('click');
    
    const filter = wrapper.find('.path-filter');
    await filter.setValue('critical');
    
    // The filtering logic should be applied
    expect(filter.element.value).toBe('critical');
  });

  it('sorts nodes table when header clicked', async () => {
    const nodesTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Nodes'));
    await nodesTab?.trigger('click');
    
    const typeHeader = wrapper.findAll('th').find((th: any) => th.text().includes('Type'));
    await typeHeader?.trigger('click');
    
    // Sort indicator should change
    expect(wrapper.find('.sort-icon').exists()).toBe(true);
  });

  it('displays tab badges with counts', () => {
    const tabs = wrapper.findAll('.stats-tab');
    const nodesTab = tabs.find((tab: any) => tab.text().includes('Nodes'));
    
    // Should show node count as badge
    expect(nodesTab?.find('.tab-badge').exists()).toBe(true);
    expect(nodesTab?.find('.tab-badge').text()).toBe('3'); // 3 nodes in config
  });

  it('emits close event when close button clicked', async () => {
    const closeBtn = wrapper.find('.overlay-btn[title="Close"]');
    await closeBtn.trigger('click');
    
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('applies proper CSS classes for overlay modes', async () => {
    expect(wrapper.find('.overlay').classes()).toContain('stats-overlay');
    
    // Test floating mode
    await wrapper.setProps({ overlayMode: 'floating' });
    expect(wrapper.find('.overlay').classes()).toContain('overlay-floating');
    
    // Test fullscreen mode
    await wrapper.setProps({ overlayMode: 'fullscreen' });
    expect(wrapper.find('.overlay').classes()).toContain('overlay-fullscreen');
  });

  it('calculates and displays bottlenecks', async () => {
    const analysisTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Analysis'));
    await analysisTab?.trigger('click');
    
    const bottlenecksSection = wrapper.find('.analysis-section');
    expect(bottlenecksSection.exists()).toBe(true);
    expect(bottlenecksSection.text()).toContain('Bottlenecks');
  });

  it('shows connectivity matrix in topology tab', async () => {
    const topologyTab = wrapper.findAll('.stats-tab').find((tab: any) => tab.text().includes('Topology'));
    await topologyTab?.trigger('click');
    
    expect(wrapper.find('.connectivity-matrix').exists()).toBe(true);
    expect(wrapper.find('.matrix-grid').exists()).toBe(true);
  });
});

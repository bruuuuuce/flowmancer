import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptInterpreter, type ScriptContext } from '../../src/scripting/ScriptInterpreter';

describe('Script Node Persistence', () => {
  let interpreter: ScriptInterpreter;
  let context: ScriptContext;
  let logs: string[] = [];
  let finalConfig: any = null;
  let liveUpdates: any[] = [];

  beforeEach(() => {
    logs = [];
    liveUpdates = [];
    finalConfig = null;
    
    context = {
      config: {
        nodes: [
          { id: 'A', kind: 'Ingress', rateRps: 10 },
          { id: 'B', kind: 'Service' },
        ],
        links: [
          { from: 'A', to: 'B' }
        ]
      },
      metrics: {
        totalRPS: 10,
        nodeMetrics: new Map(),
        edgeFlows: new Map()
      },
      log: (msg: string) => logs.push(msg),
      updateConfig: vi.fn((newConfig) => {
        finalConfig = newConfig;
      }),
      applyChanges: vi.fn(() => {
        // Track live updates during script execution
        liveUpdates.push(JSON.parse(JSON.stringify(context.config)));
      }),
      generatePuml: vi.fn(() => '@startuml\n@enduml'),
      variables: new Map(),
      snapshots: new Map()
    };
    
    interpreter = new ScriptInterpreter(context);
  });

  it('should persist nodes added during script execution', async () => {
    const script = `
      node add TestNode Service capacity_in=100 capacity_out=100
      link add A TestNode
    `;
    
    await interpreter.execute(script);
    
    // Verify node was added to context.config
    expect(context.config.nodes).toHaveLength(3);
    const addedNode = context.config.nodes.find((n: any) => n.id === 'TestNode');
    expect(addedNode).toBeDefined();
    expect(addedNode.kind).toBe('Service');
    expect(addedNode.capacity_in).toBe(100);
    expect(addedNode.capacity_out).toBe(100);
    
    // Verify link was added
    expect(context.config.links).toHaveLength(2);
    const addedLink = context.config.links.find((l: any) => l.from === 'A' && l.to === 'TestNode');
    expect(addedLink).toBeDefined();
    
    // Verify applyChanges was called during execution
    expect(context.applyChanges).toHaveBeenCalled();
    
    // Verify live updates captured the changes
    expect(liveUpdates.length).toBeGreaterThan(0);
    const lastLiveUpdate = liveUpdates[liveUpdates.length - 1];
    expect(lastLiveUpdate.nodes).toHaveLength(3);
    expect(lastLiveUpdate.links).toHaveLength(2);
    
    // Verify logs
    expect(logs).toContain('Added node TestNode (Service)');
    expect(logs).toContain('Added link A -> TestNode');
  });

  it('should handle multiple node operations in sequence', async () => {
    const script = `
      node add C Service
      node add D LoadBalancer
      link add B C
      link add C D
      node set C capacity_in=50
    `;
    
    await interpreter.execute(script);
    
    // Verify all nodes were added
    expect(context.config.nodes).toHaveLength(4);
    expect(context.config.nodes.find((n: any) => n.id === 'C')).toBeDefined();
    expect(context.config.nodes.find((n: any) => n.id === 'D')).toBeDefined();
    
    // Verify node property was updated
    const nodeC = context.config.nodes.find((n: any) => n.id === 'C');
    expect(nodeC.capacity_in).toBe(50);
    
    // Verify all links were added
    expect(context.config.links).toHaveLength(3);
    expect(context.config.links.find((l: any) => l.from === 'B' && l.to === 'C')).toBeDefined();
    expect(context.config.links.find((l: any) => l.from === 'C' && l.to === 'D')).toBeDefined();
    
    // Verify multiple applyChanges calls
    expect(context.applyChanges).toHaveBeenCalledTimes(5); // 2 nodes + 2 links + 1 set
  });

  it('should preserve config changes through loops', async () => {
    const script = `
      loop 3
        node add Node_$i Service
        if $i > 1
          link add Node_$(i-1) Node_$i
        end
      end
    `;
    
    await interpreter.execute(script);
    
    // Verify all nodes were added
    expect(context.config.nodes).toHaveLength(5); // Original 2 + 3 new
    expect(context.config.nodes.find((n: any) => n.id === 'Node_1')).toBeDefined();
    expect(context.config.nodes.find((n: any) => n.id === 'Node_2')).toBeDefined();
    expect(context.config.nodes.find((n: any) => n.id === 'Node_3')).toBeDefined();
    
    // Verify links were added correctly
    const link12 = context.config.links.find((l: any) => l.from === 'Node_1' && l.to === 'Node_2');
    const link23 = context.config.links.find((l: any) => l.from === 'Node_2' && l.to === 'Node_3');
    expect(link12).toBeDefined();
    expect(link23).toBeDefined();
  });

  it('should handle node removal and preserve remaining nodes', async () => {
    const script = `
      node add C Service
      link add B C
      node remove A
      node add D Sink
      link add C D
    `;
    
    await interpreter.execute(script);
    
    // Verify A was removed but other nodes remain
    expect(context.config.nodes).toHaveLength(3); // B, C, D
    expect(context.config.nodes.find((n: any) => n.id === 'A')).toBeUndefined();
    expect(context.config.nodes.find((n: any) => n.id === 'B')).toBeDefined();
    expect(context.config.nodes.find((n: any) => n.id === 'C')).toBeDefined();
    expect(context.config.nodes.find((n: any) => n.id === 'D')).toBeDefined();
    
    // Verify links were updated correctly (A->B link should be removed)
    expect(context.config.links.find((l: any) => l.from === 'A')).toBeUndefined();
    expect(context.config.links.find((l: any) => l.to === 'A')).toBeUndefined();
    expect(context.config.links.find((l: any) => l.from === 'B' && l.to === 'C')).toBeDefined();
    expect(context.config.links.find((l: any) => l.from === 'C' && l.to === 'D')).toBeDefined();
  });
});

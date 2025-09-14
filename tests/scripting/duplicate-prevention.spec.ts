import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptInterpreter, type ScriptContext } from '../../src/scripting/ScriptInterpreter';

describe('Script Duplicate Prevention', () => {
  let interpreter: ScriptInterpreter;
  let context: ScriptContext;
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    
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
      updateConfig: vi.fn(),
      applyChanges: vi.fn(),
      generatePuml: vi.fn(() => '@startuml\n@enduml'),
      variables: new Map(),
      snapshots: new Map()
    };
    
    interpreter = new ScriptInterpreter(context);
  });

  it('should skip creating duplicate nodes', async () => {
    const script = `
      node add A Service
      node add C LoadBalancer
      node add C Service
    `;
    
    await interpreter.execute(script);
    
    // Check that A was skipped
    expect(logs).toContain('Node A already exists, skipping creation');
    
    // Check that C was created only once
    expect(logs).toContain('Added node C (LoadBalancer)');
    expect(logs).toContain('Node C already exists, skipping creation');
    
    // Verify config has correct nodes
    expect(context.config.nodes).toHaveLength(3); // A, B, C
    const nodeC = context.config.nodes.find((n: any) => n.id === 'C');
    expect(nodeC).toBeDefined();
    expect(nodeC.kind).toBe('LoadBalancer'); // First creation wins
  });

  it('should skip creating duplicate links', async () => {
    const script = `
      link add A B
      node add C Service
      link add A C
      link add A C
    `;
    
    await interpreter.execute(script);
    
    // Check that A->B link was skipped
    expect(logs).toContain('Link A -> B already exists, skipping creation');
    
    // Check that A->C was created only once
    expect(logs).toContain('Added link A -> C');
    expect(logs).toContain('Link A -> C already exists, skipping creation');
    
    // Verify config has correct links
    expect(context.config.links).toHaveLength(2); // A->B, A->C
  });

  it('should throw error when trying to link non-existent nodes', async () => {
    const script = `
      link add A NonExistent
    `;
    
    await expect(interpreter.execute(script)).rejects.toThrow(
      "Cannot add link: node 'NonExistent' does not exist"
    );
  });

  it('should throw error for non-existent from node', async () => {
    const script = `
      link add NonExistent B
    `;
    
    await expect(interpreter.execute(script)).rejects.toThrow(
      "Cannot add link: node 'NonExistent' does not exist"
    );
  });

  it('should handle duplicate prevention in loops', async () => {
    const script = `
      loop 3
        node add LoopNode Service
        link add A LoopNode
      end
    `;
    
    await interpreter.execute(script);
    
    // First iteration creates, others skip
    expect(logs.filter(l => l === 'Added node LoopNode (Service)')).toHaveLength(1);
    expect(logs.filter(l => l === 'Node LoopNode already exists, skipping creation')).toHaveLength(2);
    
    expect(logs.filter(l => l === 'Added link A -> LoopNode')).toHaveLength(1);
    expect(logs.filter(l => l === 'Link A -> LoopNode already exists, skipping creation')).toHaveLength(2);
    
    // Verify final state
    expect(context.config.nodes).toHaveLength(3); // A, B, LoopNode
    expect(context.config.links).toHaveLength(2); // A->B, A->LoopNode
  });

  it('should allow creating links after nodes are created', async () => {
    const script = `
      node add C Service
      node add D Sink
      link add C D
      link add B C
    `;
    
    await interpreter.execute(script);
    
    // All operations should succeed
    expect(logs).toContain('Added node C (Service)');
    expect(logs).toContain('Added node D (Sink)');
    expect(logs).toContain('Added link C -> D');
    expect(logs).toContain('Added link B -> C');
    
    // Verify final state
    expect(context.config.nodes).toHaveLength(4); // A, B, C, D
    expect(context.config.links).toHaveLength(3); // A->B, C->D, B->C
  });

  it('should handle variable interpolation with duplicate prevention', async () => {
    const script = `
      set nodeName = B
      node add $nodeName Service
      loop 2
        node add Node_$i Service
        node add Node_$i LoadBalancer
      end
    `;
    
    await interpreter.execute(script);
    
    // B already exists
    expect(logs).toContain('Node B already exists, skipping creation');
    
    // Loop nodes created only once each
    expect(logs).toContain('Added node Node_1 (Service)');
    expect(logs).toContain('Node Node_1 already exists, skipping creation');
    expect(logs).toContain('Added node Node_2 (Service)');
    expect(logs).toContain('Node Node_2 already exists, skipping creation');
    
    // Verify final state
    const node1 = context.config.nodes.find((n: any) => n.id === 'Node_1');
    expect(node1.kind).toBe('Service'); // First creation wins
    const node2 = context.config.nodes.find((n: any) => n.id === 'Node_2');
    expect(node2.kind).toBe('Service'); // First creation wins
  });
});

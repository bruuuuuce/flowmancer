import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptInterpreter, type ScriptContext } from '../../src/scripting/ScriptInterpreter';

describe('Interactive Console Commands', () => {
  let interpreter: ScriptInterpreter;
  let context: ScriptContext;
  let logs: string[] = [];
  let configUpdates: any[] = [];

  beforeEach(() => {
    logs = [];
    configUpdates = [];
    
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
        configUpdates.push(newConfig);
      }),
      applyChanges: vi.fn(() => {
        // Simulate immediate config application
      }),
      generatePuml: vi.fn(() => '@startuml\n@enduml'),
      variables: new Map(),
      snapshots: new Map()
    };
    
    interpreter = new ScriptInterpreter(context);
  });

  describe('Node Commands', () => {
    it('should add a node interactively', async () => {
      await interpreter.execute('node add C Service capacity=100');
      
      expect(context.config.nodes).toHaveLength(3);
      const nodeC = context.config.nodes.find((n: any) => n.id === 'C');
      expect(nodeC).toBeDefined();
      expect(nodeC.kind).toBe('Service');
      expect(nodeC.capacity).toBe(100);
      expect(logs).toContain('Added node C (Service)');
    });

    it('should prevent duplicate nodes', async () => {
      await interpreter.execute('node add A LoadBalancer');
      
      expect(logs).toContain('Node A already exists, skipping creation');
      expect(context.config.nodes).toHaveLength(2);
    });

    it('should update node properties', async () => {
      await interpreter.execute('node set B capacity=200');
      
      const nodeB = context.config.nodes.find((n: any) => n.id === 'B');
      expect(nodeB.capacity).toBe(200);
      expect(logs).toContain('Updated node B');
    });

    it('should get node information', async () => {
      await interpreter.execute('node get A');
      
      const logEntry = logs.find(l => l.includes('A:'));
      expect(logEntry).toBeDefined();
      expect(logEntry).toContain('Ingress');
    });

    it('should remove a node', async () => {
      await interpreter.execute('node remove B');
      
      expect(context.config.nodes).toHaveLength(1);
      expect(context.config.nodes.find((n: any) => n.id === 'B')).toBeUndefined();
      expect(context.config.links).toHaveLength(0); // Link also removed
      expect(logs).toContain('Removed node B');
    });
  });

  describe('Link Commands', () => {
    it('should add a link between existing nodes', async () => {
      await interpreter.execute('node add C Service');
      await interpreter.execute('link add B C');
      
      expect(context.config.links).toHaveLength(2);
      const newLink = context.config.links.find((l: any) => l.from === 'B' && l.to === 'C');
      expect(newLink).toBeDefined();
      expect(logs).toContain('Added link B -> C');
    });

    it('should prevent duplicate links', async () => {
      await interpreter.execute('link add A B');
      
      expect(logs).toContain('Link A -> B already exists, skipping creation');
      expect(context.config.links).toHaveLength(1);
    });

    it('should error on non-existent nodes', async () => {
      await expect(interpreter.execute('link add A NonExistent')).rejects.toThrow(
        "Cannot add link: node 'NonExistent' does not exist"
      );
    });

    it('should remove a link', async () => {
      await interpreter.execute('link remove A B');
      
      expect(context.config.links).toHaveLength(0);
      expect(logs).toContain('Removed link A -> B');
    });
  });

  describe('Variable Commands', () => {
    it('should set and use variables in same command', async () => {
      // Variables persist within a single script execution
      await interpreter.execute(`
        set myVar = 42
        log "Value: $myVar"
      `);
      
      expect(logs).toContain('Set myVar = 42');
      expect(logs).toContain('Value: 42');
    });

    it('should use variables in node creation within same script', async () => {
      // Variables persist within a single script execution
      await interpreter.execute(`
        set nodeName = TestNode
        set nodeCapacity = 150
        node add $nodeName Service capacity=$nodeCapacity
      `);
      
      const testNode = context.config.nodes.find((n: any) => n.id === 'TestNode');
      expect(testNode).toBeDefined();
      expect(testNode.capacity).toBe(150);
    });
  });

  describe('Export and Snapshot Commands', () => {
    it('should export to PUML', async () => {
      await interpreter.execute('export puml');
      
      const pumlLog = logs.find(l => l.includes('Exported PUML'));
      expect(pumlLog).toBeDefined();
    });

    it('should create snapshots', async () => {
      await interpreter.execute('snapshot initial');
      
      expect(context.snapshots.has('initial')).toBe(true);
      expect(logs).toContain('Saved snapshot: initial');
    });

    it('should create timestamped snapshot without name', async () => {
      await interpreter.execute('snapshot');
      
      expect(context.snapshots.size).toBe(1);
      const snapshotLog = logs.find(l => l.includes('Saved snapshot: snapshot-'));
      expect(snapshotLog).toBeDefined();
    });
  });

  describe('Log Command', () => {
    it('should log messages', async () => {
      await interpreter.execute('log "Hello from console"');
      
      expect(logs).toContain('Hello from console');
    });

    it('should log with variable interpolation', async () => {
      // Variables must be set and used in same execution
      await interpreter.execute(`
        set user = "Alice"
        log "Hello, $user!"
      `);
      
      expect(logs).toContain('Hello, Alice!');
    });
  });

  describe('Command Chaining', () => {
    it('should execute multiple commands in sequence', async () => {
      // Simulate multiple console commands
      await interpreter.execute('node add API Service');
      await interpreter.execute('node add DB Database capacity=50');
      await interpreter.execute('link add API DB');
      await interpreter.execute('node set API capacity=200');
      
      expect(context.config.nodes).toHaveLength(4); // A, B, API, DB
      expect(context.config.links).toHaveLength(2); // A->B, API->DB
      
      const apiNode = context.config.nodes.find((n: any) => n.id === 'API');
      expect(apiNode.capacity).toBe(200);
    });

    it('should execute complex command sequences', async () => {
      // Execute as a single script to maintain variable state
      await interpreter.execute(`
        set counter = 1
        node add Node_$counter Service
        set counter = 2
        node add Node_$counter Service
        link add Node_1 Node_2
      `);
      
      expect(context.config.nodes).toHaveLength(4); // A, B, Node_1, Node_2
      const link = context.config.links.find((l: any) => l.from === 'Node_1' && l.to === 'Node_2');
      expect(link).toBeDefined();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptInterpreter, type ScriptContext } from '../../src/scripting/ScriptInterpreter';

describe('ScriptInterpreter', () => {
  let interpreter: ScriptInterpreter;
  let context: ScriptContext;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    context = {
      config: {
        nodes: [
          { id: 'api1', kind: 'Service', capacity_in: 50, capacity_out: 50 },
          { id: 'lb1', kind: 'LoadBalancer' },
        ],
        links: [
          { from: 'lb1', to: 'api1' }
        ]
      },
      metrics: {
        totalRPS: 100,
        totalErrors: 5,
        nodeMetrics: new Map([
          ['api1', { processedRate: 50, err_in: 10, err_out: 0 }]
        ])
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

  describe('Parsing', () => {
    it('should parse simple commands', () => {
      const commands = interpreter.parse(`
        log "hello"
        wait 100
        node add api2 Service
      `);
      
      expect(commands).toHaveLength(3);
      expect(commands[0].type).toBe('log');
      expect(commands[0].args).toEqual(['"hello"']);
      expect(commands[1].type).toBe('wait');
      expect(commands[1].args).toEqual(['100']);
      expect(commands[2].type).toBe('node');
      expect(commands[2].args).toEqual(['add', 'api2', 'Service']);
    });

    it('should skip comments and empty lines', () => {
      const commands = interpreter.parse(`
        # This is a comment
        log "test"
        
        # Another comment
        wait 100
      `);
      
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('log');
      expect(commands[1].type).toBe('wait');
    });

    it('should handle quoted strings with spaces', () => {
      const commands = interpreter.parse(`log "hello world"`);
      
      expect(commands[0].args).toEqual(['"hello world"']);
    });

    it('should parse property assignments', () => {
      const commands = interpreter.parse(`node set api1 capacity_in=100 capacity_out=200`);
      
      expect(commands[0].args).toEqual(['set', 'api1', 'capacity_in=100', 'capacity_out=200']);
    });
  });

  describe('Node Commands', () => {
    it('should add a node', async () => {
      await interpreter.execute(`node add api2 Service capacity_in=100`);
      
      // Check the final config state
      const addedNode = context.config.nodes.find((n: any) => n.id === 'api2');
      expect(addedNode).toBeDefined();
      expect(addedNode.kind).toBe('Service');
      expect(addedNode.capacity_in).toBe(100);
      expect(logs).toContain('Added node api2 (Service)');
    });

    it('should remove a node and its links', async () => {
      await interpreter.execute(`node remove api1`);
      
      // Check the final config state
      const removedNode = context.config.nodes.find((n: any) => n.id === 'api1');
      expect(removedNode).toBeUndefined();
      
      const removedLink = context.config.links.find((l: any) => l.from === 'lb1' && l.to === 'api1');
      expect(removedLink).toBeUndefined();
      
      expect(logs).toContain('Removed node api1');
    });

    it('should set node properties', async () => {
      await interpreter.execute(`node set api1 capacity_in=200`);
      
      // Check the final config state
      const api1 = context.config.nodes.find((n: any) => n.id === 'api1');
      expect(api1.capacity_in).toBe(200);
      expect(logs).toContain('Updated node api1');
    });

    it('should get node properties', async () => {
      await interpreter.execute(`node get api1 capacity_in`);
      
      expect(logs).toContain('api1.capacity_in = 50');
    });

    it('should handle nested properties', async () => {
      await interpreter.execute(`node set lb1 routing.policy=weighted routing.weights.api1=70`);
      
      // Check the final config state directly
      const lb1 = context.config.nodes.find((n: any) => n.id === 'lb1');
      expect(lb1.routing.policy).toBe('weighted');
      expect(lb1.routing.weights.api1).toBe(70);
      expect(context.applyChanges).toHaveBeenCalled();
    });
  });

  describe('Link Commands', () => {
    it('should add a link', async () => {
      // First create the target node
      await interpreter.execute(`
        node add api2 Service
        link add api1 api2
      `);
      
      // Check the final config state directly
      const addedLink = context.config.links.find((l: any) => l.from === 'api1' && l.to === 'api2');
      expect(addedLink).toBeDefined();
      expect(context.applyChanges).toHaveBeenCalled();
      expect(logs).toContain('Added link api1 -> api2');
    });

    it('should remove a link', async () => {
      await interpreter.execute(`link remove lb1 api1`);
      
      // Check the final config state directly
      const removedLink = context.config.links.find((l: any) => l.from === 'lb1' && l.to === 'api1');
      expect(removedLink).toBeUndefined();
      expect(context.applyChanges).toHaveBeenCalled();
      expect(logs).toContain('Removed link lb1 -> api1');
    });
  });

  describe('Flow Control', () => {
    it('should execute wait command', async () => {
      const start = Date.now();
      await interpreter.execute(`wait 100`);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(logs).toContain('Waiting 100ms...');
    });

    it('should execute loop', async () => {
      await interpreter.execute(`
        loop 3
          log "iteration $i"
        end
      `);
      
      expect(logs).toContain('iteration 1');
      expect(logs).toContain('iteration 2');
      expect(logs).toContain('iteration 3');
    });

    it('should execute if condition', async () => {
      await interpreter.execute(`
        if 5 > 3
          log "true branch"
        else
          log "false branch"
        end
      `);
      
      expect(logs).toContain('true branch');
      expect(logs).not.toContain('false branch');
    });

    it('should handle break in loop', async () => {
      await interpreter.execute(`
        loop 5
          log "iteration $i"
          if $i == 2
            break
          end
        end
      `);
      
      expect(logs).toContain('iteration 1');
      expect(logs).toContain('iteration 2');
      expect(logs).not.toContain('iteration 3');
    });
  });

  describe('Variables', () => {
    it('should set and use variables', async () => {
      await interpreter.execute(`
        set myVar = 42
        log "Value is $myVar"
      `);
      
      expect(logs).toContain('Set myVar = 42');
      expect(logs).toContain('Value is 42');
    });

    it('should access metrics variables', async () => {
      await interpreter.execute(`log "RPS: $metrics.totalRPS"`);
      
      expect(logs).toContain('RPS: 100');
    });

    it('should access node properties via variables', async () => {
      await interpreter.execute(`log "api1 capacity: $node.api1.capacity_in"`);
      
      expect(logs).toContain('api1 capacity: 50');
    });

    it('should handle random function', async () => {
      await interpreter.execute(`log "Random: $random(1,10)"`);
      
      const logEntry = logs.find(l => l.startsWith('Random:'));
      const value = parseInt(logEntry!.split(':')[1].trim());
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    });
  });

  describe('Export and Logging', () => {
    it('should log messages', async () => {
      await interpreter.execute(`log "Hello World"`);
      
      expect(logs).toContain('Hello World');
    });

    it('should export PUML', async () => {
      await interpreter.execute(`export puml test.puml`);
      
      expect(logs.some(l => l.includes('Exported PUML to test.puml'))).toBe(true);
    });

    it('should create snapshots', async () => {
      await interpreter.execute(`snapshot initial`);
      
      expect(context.snapshots.has('initial')).toBe(true);
      expect(logs).toContain('Saved snapshot: initial');
    });
  });

  describe('Error Handling', () => {
    it('should report syntax errors with line numbers', async () => {
      await expect(interpreter.execute(`
        log "test"
        invalid command
        log "after"
      `)).rejects.toThrow('Line 3: Unknown command: invalid');
    });

    it('should report missing node errors', async () => {
      await expect(interpreter.execute(`node set nonexistent capacity_in=100`))
        .rejects.toThrow('Node nonexistent not found');
    });

    it('should report missing arguments', async () => {
      await expect(interpreter.execute(`node add`))
        .rejects.toThrow('Node add requires an ID');
    });

    it('should handle loop without end', async () => {
      await expect(interpreter.execute(`
        loop 3
          log "test"
      `)).rejects.toThrow('Loop without matching end');
    });

    it('should handle end without loop', async () => {
      await expect(interpreter.execute(`
        log "test"
        end
      `)).rejects.toThrow('End without matching loop/if');
    });
  });

  describe('Script Execution Control', () => {
    it('should stop execution when requested', async () => {
      const promise = interpreter.execute(`
        log "start"
        wait 1000
        log "end"
      `);
      
      // Stop after a short delay
      setTimeout(() => interpreter.stop(), 50);
      
      await expect(promise).rejects.toThrow('Script aborted');
      expect(logs).toContain('start');
      expect(logs).not.toContain('end');
    });

    it('should report running state', async () => {
      expect(interpreter.isRunning()).toBe(false);
      
      const promise = interpreter.execute(`wait 100`);
      expect(interpreter.isRunning()).toBe(true);
      
      await promise;
      expect(interpreter.isRunning()).toBe(false);
    });

    it('should prevent concurrent execution', async () => {
      const promise1 = interpreter.execute(`wait 100`);
      const promise2 = interpreter.execute(`wait 100`);
      
      await expect(promise2).rejects.toThrow('Script already running');
      await promise1; // Should complete normally
    });
  });
});

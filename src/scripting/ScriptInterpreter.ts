
import type { Ref } from 'vue';

export interface ScriptContext {
  config: any; 
  metrics: any; 
  log: (message: string) => void; 
  updateConfig: (newConfig: any) => void; 
  applyChanges?: () => void; 
  generatePuml: () => string; 
  variables: Map<string, any>; 
  snapshots: Map<string, any>; 
}

export interface ScriptCommand {
  type: string;
  args: string[];
  line: number;
  raw: string;
}

export class ScriptInterpreter {
  private context: ScriptContext;
  private commands: ScriptCommand[] = [];
  private currentLine = 0;
  private running = false;
  private abortController: AbortController | null = null;
  private loopStack: Array<{ start: number; end: number; count: number; current: number }> = [];
  private ifStack: Array<{ skipToEnd: boolean }> = [];

  constructor(context: ScriptContext) {
    this.context = context;
  }

  parse(script: string): ScriptCommand[] {
    const lines = script.split('\n');
    const commands: ScriptCommand[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('#')) continue;
      
      const parts = this.tokenize(line);
      if (parts.length === 0) continue;
      
      commands.push({
        type: parts[0].toLowerCase(),
        args: parts.slice(1),
        line: i + 1,
        raw: line
      });
    }
    
    return commands;
  }

  private tokenize(line: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char; 
      } else if (inQuotes && char === quoteChar) {
        current += char; 
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  async execute(script: string): Promise<void> {
    if (this.running) {
      throw new Error('Script already running');
    }
    
    this.commands = this.parse(script);
    this.currentLine = 0;
    this.running = true;
    this.abortController = new AbortController();
    this.loopStack = [];
    this.ifStack = [];
    this.context.variables.clear();
    
    try {
      while (this.currentLine < this.commands.length && this.running) {
        const command = this.commands[this.currentLine];
        
        if (this.shouldSkipCommand(command)) {
          this.currentLine++;
          continue;
        }
        
        await this.executeCommand(command);
        this.currentLine++;
      }
    } catch (error: any) {
      const command = this.commands[this.currentLine];
      throw new Error(`Line ${command?.line || this.currentLine}: ${error.message}`);
    } finally {
      this.running = false;
      this.abortController = null;
    }
  }

  private shouldSkipCommand(command: ScriptCommand): boolean {
    if (this.ifStack.length === 0) return false;
    
    const topIf = this.ifStack[this.ifStack.length - 1];
    if (!topIf.skipToEnd) return false;
    
    return command.type !== 'end';
  }

  private async executeCommand(command: ScriptCommand): Promise<void> {
    switch (command.type) {
      case 'node':
        await this.executeNodeCommand(command);
        break;
        
      case 'graph':
        await this.executeGraphCommand(command);
        break;
        
      case 'group':
        await this.executeGroupCommand(command);
        break;
        
      case 'link':
        await this.executeLinkCommand(command);
        break;
        
      case 'wait':
        await this.executeWaitCommand(command);
        break;
        
      case 'loop':
        await this.executeLoopCommand(command);
        break;
        
      case 'end':
        await this.executeEndCommand(command);
        break;
        
      case 'if':
        await this.executeIfCommand(command);
        break;
        
      case 'else':
        await this.executeElseCommand(command);
        break;
        
      case 'break':
        await this.executeBreakCommand(command);
        break;
        
      case 'log':
        await this.executeLogCommand(command);
        break;
        
      case 'export':
        await this.executeExportCommand(command);
        break;
        
      case 'snapshot':
        await this.executeSnapshotCommand(command);
        break;
        
      case 'set':
        await this.executeSetCommand(command);
        break;
        
      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }

  private async executeNodeCommand(command: ScriptCommand): Promise<void> {
    const subCommand = command.args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'add': {
        const rawId = command.args[1];
        if (!rawId) throw new Error('Node add requires an ID');
        const id = this.interpolateVariables(rawId);
        const kind = command.args[2] || 'Service';
        
        if (!this.context.config.nodes) {
          this.context.config.nodes = [];
        }
        
        const existingNode = this.context.config.nodes.find((n: any) => n.id === id);
        if (existingNode) {
          this.context.log(`Node ${id} already exists, skipping creation`);
          break;
        }
        
        const properties = this.parseProperties(command.args.slice(3));
        const node = { id, kind, ...properties };
        
        this.context.config.nodes.push(node);
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Added node ${id} (${kind})`);
        break;
      }
      
      case 'remove': {
        const id = command.args[1];
        if (!id) throw new Error('Node remove requires an ID');
        
        this.context.config.nodes = (this.context.config.nodes || []).filter((n: any) => n.id !== id);
        this.context.config.links = (this.context.config.links || []).filter((l: any) => l.from !== id && l.to !== id);
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Removed node ${id}`);
        break;
      }
      
      case 'set': {
        const id = command.args[1];
        if (!id) throw new Error('Node set requires an ID');
        
        const properties = this.parseProperties(command.args.slice(2));
        const node = (this.context.config.nodes || []).find((n: any) => n.id === id);
        
        if (!node) throw new Error(`Node ${id} not found`);
        
        for (const [key, value] of Object.entries(properties)) {
          this.setNestedProperty(node, key, value);
        }
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Updated node ${id}`);
        break;
      }
      
      case 'get': {
        const id = command.args[1];
        if (!id) throw new Error('Node get requires an ID');
        
        const node = (this.context.config.nodes || []).find((n: any) => n.id === id);
        if (!node) throw new Error(`Node ${id} not found`);
        
        const property = command.args[2];
        if (property) {
          const value = this.getNestedProperty(node, property);
          this.context.log(`${id}.${property} = ${JSON.stringify(value)}`);
        } else {
          this.context.log(`${id}: ${JSON.stringify(node, null, 2)}`);
        }
        break;
      }
      
      case 'isolate': {
        const id = command.args[1];
        if (!id) throw new Error('Node isolate requires an ID');
        
        const direction = command.args[2]?.toLowerCase() || 'both';
        if (!['in', 'out', 'both'].includes(direction)) {
          throw new Error('Node isolate direction must be in, out, or both');
        }
        
        const node = (this.context.config.nodes || []).find((n: any) => n.id === id);
        if (!node) throw new Error(`Node ${id} not found`);
        
        const links = this.context.config.links || [];
        let removed = 0;
        
        if (direction === 'in' || direction === 'both') {
          
          const before = links.length;
          this.context.config.links = links.filter((l: any) => l.to !== id);
          removed += before - this.context.config.links.length;
        }
        
        if (direction === 'out' || direction === 'both') {
          
          const before = this.context.config.links.length;
          this.context.config.links = this.context.config.links.filter((l: any) => l.from !== id);
          removed += before - this.context.config.links.length;
        }
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Isolated node ${id} (${direction}): removed ${removed} links`);
        break;
      }
      
      default:
        throw new Error(`Unknown node subcommand: ${subCommand}`);
    }
  }

  private async executeGraphCommand(command: ScriptCommand): Promise<void> {
    const subCommand = command.args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'add': {
        
        const expression = command.args.slice(1).join(' ');
        await this.parseAndApplyGraphExpression(expression, 'add');
        break;
      }
      
      case 'remove': {
        const expression = command.args.slice(1).join(' ');
        await this.parseAndApplyGraphExpression(expression, 'remove');
        break;
      }
      
      default:
        throw new Error(`Unknown graph subcommand: ${subCommand}`);
    }
  }
  
  private async parseAndApplyGraphExpression(expression: string, operation: 'add' | 'remove'): Promise<void> {
    
    const expr = expression.trim();
    if (!expr) throw new Error('Graph expression cannot be empty');
    
    const parts = expr.split('->').map(p => p.trim());
    if (parts.length < 2) throw new Error('Graph expression must contain at least one ->');
    
    for (let i = 0; i < parts.length - 1; i++) {
      const sourcePart = parts[i];
      const targetPart = parts[i + 1];
      
      const sources = this.parseNodeList(sourcePart, operation === 'add');
      const targets = this.parseNodeList(targetPart, operation === 'add');
      
      for (const source of sources) {
        for (const target of targets) {
          if (operation === 'add') {
            await this.addNodeAndLink(source, target);
          } else {
            await this.removeLink(source.id, target.id);
          }
        }
      }
    }
  }
  
  private parseNodeList(part: string, createIfMissing: boolean): Array<{id: string, type?: string, properties?: any}> {
    const nodes: Array<{id: string, type?: string, properties?: any}> = [];
    
    if (part === '*') {
      if (!createIfMissing) {
        
        return (this.context.config.nodes || []).map((n: any) => ({id: n.id}));
      }
      throw new Error('Cannot use wildcard (*) when adding nodes');
    }
    
    if (part.startsWith('[') && part.endsWith(']')) {
      const listContent = part.slice(1, -1);
      const items = listContent.split(',').map(item => item.trim());
      for (const item of items) {
        nodes.push(this.parseNodeSpec(item));
      }
    } else {
      
      nodes.push(this.parseNodeSpec(part));
    }
    
    return nodes;
  }
  
  private parseNodeSpec(spec: string): {id: string, type?: string, properties?: any} {
    let id = spec;
    let type: string | undefined;
    let properties: any = {};
    
    const typeMatch = spec.match(/^([^:\[]+):([^\[]+)/);
    if (typeMatch) {
      id = typeMatch[1].trim();
      type = typeMatch[2].trim();
      spec = id; 
    }
    
    const propMatch = spec.match(/^([^\[]+)\[([^\]]+)\]/);
    if (propMatch) {
      id = propMatch[1].trim();
      const propsStr = propMatch[2];
      
      const propPairs = propsStr.split(',').map(p => p.trim());
      for (const pair of propPairs) {
        const [key, value] = pair.split('=').map(p => p.trim());
        if (key && value) {
          
          const numVal = parseFloat(value);
          properties[key] = isNaN(numVal) ? value : numVal;
        }
      }
    }
    
    id = id.replace(/[:\[].*/, '').trim();
    
    return { id, type, properties };
  }
  
  private async addNodeAndLink(source: {id: string, type?: string, properties?: any}, 
                                target: {id: string, type?: string, properties?: any}): Promise<void> {
    
    if (!this.context.config.nodes) {
      this.context.config.nodes = [];
    }
    
    let sourceNode = this.context.config.nodes.find((n: any) => n.id === source.id);
    if (!sourceNode) {
      sourceNode = {
        id: source.id,
        kind: source.type || 'Service',
        ...this.getDefaultNodeSettings(source.type || 'Service'),
        ...source.properties
      };
      this.context.config.nodes.push(sourceNode);
      this.context.log(`Created node ${source.id} (${sourceNode.kind})`);
    }
    
    let targetNode = this.context.config.nodes.find((n: any) => n.id === target.id);
    if (!targetNode) {
      targetNode = {
        id: target.id,
        kind: target.type || 'Service',
        ...this.getDefaultNodeSettings(target.type || 'Service'),
        ...target.properties
      };
      this.context.config.nodes.push(targetNode);
      this.context.log(`Created node ${target.id} (${targetNode.kind})`);
    }
    
    if (!this.context.config.links) {
      this.context.config.links = [];
    }
    
    const existingLink = this.context.config.links.find(
      (l: any) => l.from === source.id && l.to === target.id
    );
    
    if (!existingLink) {
      this.context.config.links.push({ from: source.id, to: target.id });
      this.context.log(`Added link ${source.id} -> ${target.id}`);
    }
    
    if (this.context.applyChanges) {
      this.context.applyChanges();
    }
  }
  
  private async removeLink(sourceId: string, targetId: string): Promise<void> {
    if (!this.context.config.links) return;
    
    const before = this.context.config.links.length;
    
    if (sourceId === '*') {
      
      this.context.config.links = this.context.config.links.filter(
        (l: any) => l.to !== targetId
      );
    } else if (targetId === '*') {
      
      this.context.config.links = this.context.config.links.filter(
        (l: any) => l.from !== sourceId
      );
    } else {
      
      this.context.config.links = this.context.config.links.filter(
        (l: any) => !(l.from === sourceId && l.to === targetId)
      );
    }
    
    const removed = before - this.context.config.links.length;
    if (removed > 0) {
      this.context.log(`Removed ${removed} link(s)`);
      
      if (this.context.applyChanges) {
        this.context.applyChanges();
      }
    }
  }
  
  private getDefaultNodeSettings(kind: string): any {
    const defaults: Record<string, any> = {
      'Source': { rateRps: 5, timeout_ms: 5000 },
      'Ingress': { rateRps: 5, timeout_ms: 5000 }, 
      'Service': { capacity: 100, base_ms: 20, jitter_ms: 10, p_fail: 0 },
      'Cache': { hitRatio: 0.8, capacity: 100 },
      'LoadBalancer': { capacity: 200, base_ms: 1, jitter_ms: 1 },
      'DB': { capacity: 50, base_ms: 50, jitter_ms: 20, p_fail: 0 },
      'ExternalAPI': { capacity: 10, base_ms: 100, jitter_ms: 50, p_fail: 0 },
      'Queue': { maxQueue: 10000 },
      'Sink': {}
    };
    return defaults[kind] || defaults['Service'];
  }
  
  private async executeGroupCommand(command: ScriptCommand): Promise<void> {
    const subCommand = command.args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'create':
      case 'add': {
        const id = command.args[1];
        if (!id) throw new Error('Group create requires an ID');
        
        const name = command.args[2] || id;
        const properties = this.parseProperties(command.args.slice(3));
        
        if (!this.context.config.groups) {
          this.context.config.groups = [];
        }
        
        const existingGroup = this.context.config.groups.find((g: any) => g.id === id);
        if (existingGroup) {
          this.context.log(`Group ${id} already exists`);
          break;
        }
        
        const group = {
          id,
          name,
          color: properties.color || '#3b82f6',
          nodes: properties.nodes || []
        };
        
        this.context.config.groups.push(group);
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Created group ${id} (${name})`);
        break;
      }
      
      case 'remove':
      case 'delete': {
        const id = command.args[1];
        if (!id) throw new Error('Group remove requires an ID');
        
        this.context.config.groups = (this.context.config.groups || []).filter(
          (g: any) => g.id !== id
        );
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Removed group ${id}`);
        break;
      }
      
      case 'add-node': {
        const groupId = command.args[1];
        const nodeId = command.args[2];
        if (!groupId || !nodeId) throw new Error('Group add-node requires group ID and node ID');
        
        const group = (this.context.config.groups || []).find((g: any) => g.id === groupId);
        if (!group) throw new Error(`Group ${groupId} not found`);
        
        const node = (this.context.config.nodes || []).find((n: any) => n.id === nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        
        if (!group.nodes) group.nodes = [];
        if (!group.nodes.includes(nodeId)) {
          group.nodes.push(nodeId);
          
          if (this.context.applyChanges) {
            this.context.applyChanges();
          }
          
          this.context.log(`Added node ${nodeId} to group ${groupId}`);
        } else {
          this.context.log(`Node ${nodeId} is already in group ${groupId}`);
        }
        break;
      }
      
      case 'remove-node': {
        const groupId = command.args[1];
        const nodeId = command.args[2];
        if (!groupId || !nodeId) throw new Error('Group remove-node requires group ID and node ID');
        
        const group = (this.context.config.groups || []).find((g: any) => g.id === groupId);
        if (!group) throw new Error(`Group ${groupId} not found`);
        
        if (group.nodes) {
          const index = group.nodes.indexOf(nodeId);
          if (index !== -1) {
            group.nodes.splice(index, 1);
            
            if (this.context.applyChanges) {
              this.context.applyChanges();
            }
            
            this.context.log(`Removed node ${nodeId} from group ${groupId}`);
          } else {
            this.context.log(`Node ${nodeId} is not in group ${groupId}`);
          }
        }
        break;
      }
      
      case 'list': {
        const groups = this.context.config.groups || [];
        if (groups.length === 0) {
          this.context.log('No groups defined');
        } else {
          this.context.log(`Groups (${groups.length}):`);
          groups.forEach((g: any) => {
            const nodeCount = g.nodes?.length || 0;
            this.context.log(`  ${g.id} ("${g.name}") - ${nodeCount} nodes`);
          });
        }
        break;
      }
      
      case 'isolate': {
        const groupId = command.args[1];
        if (!groupId) throw new Error('Group isolate requires a group ID');
        
        const scope = command.args[2]?.toLowerCase() || 'all';
        if (!['in', 'out', 'internal', 'external', 'all'].includes(scope)) {
          throw new Error('Group isolate scope must be in, out, internal, external, or all');
        }
        
        const group = (this.context.config.groups || []).find((g: any) => g.id === groupId);
        if (!group) throw new Error(`Group ${groupId} not found`);
        
        const groupNodes = new Set(group.nodes || []);
        if (groupNodes.size === 0) {
          this.context.log(`Group ${groupId} has no nodes`);
          break;
        }
        
        const links = this.context.config.links || [];
        let removed = 0;
        
        this.context.config.links = links.filter((link: any) => {
          const fromInGroup = groupNodes.has(link.from);
          const toInGroup = groupNodes.has(link.to);
          
          let shouldRemove = false;
          
          switch (scope) {
            case 'in':
              
              shouldRemove = !fromInGroup && toInGroup;
              break;
            case 'out':
              
              shouldRemove = fromInGroup && !toInGroup;
              break;
            case 'internal':
              
              shouldRemove = fromInGroup && toInGroup;
              break;
            case 'external':
              
              shouldRemove = (fromInGroup && !toInGroup) || (!fromInGroup && toInGroup);
              break;
            case 'all':
              
              shouldRemove = fromInGroup || toInGroup;
              break;
          }
          
          if (shouldRemove) removed++;
          return !shouldRemove;
        });
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Isolated group ${groupId} (${scope}): removed ${removed} links`);
        break;
      }
      
      default:
        throw new Error(`Unknown group subcommand: ${subCommand}`);
    }
  }

  private async executeLinkCommand(command: ScriptCommand): Promise<void> {
    const subCommand = command.args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'add': {
        const rawFrom = command.args[1];
        const rawTo = command.args[2];
        if (!rawFrom || !rawTo) throw new Error('Link add requires from and to nodes');
        const from = this.interpolateVariables(rawFrom);
        const to = this.interpolateVariables(rawTo);
        
        const fromNode = (this.context.config.nodes || []).find((n: any) => n.id === from);
        const toNode = (this.context.config.nodes || []).find((n: any) => n.id === to);
        
        if (!fromNode) {
          throw new Error(`Cannot add link: node '${from}' does not exist`);
        }
        if (!toNode) {
          throw new Error(`Cannot add link: node '${to}' does not exist`);
        }
        
        if (!this.context.config.links) {
          this.context.config.links = [];
        }
        
        const existingLink = this.context.config.links.find(
          (l: any) => l.from === from && l.to === to
        );
        
        if (existingLink) {
          this.context.log(`Link ${from} -> ${to} already exists, skipping creation`);
          break;
        }
        
        const link = { from, to };
        this.context.config.links.push(link);
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Added link ${from} -> ${to}`);
        break;
      }
      
      case 'remove': {
        const from = command.args[1];
        const to = command.args[2];
        if (!from || !to) throw new Error('Link remove requires from and to nodes');
        
        this.context.config.links = (this.context.config.links || []).filter(
          (l: any) => !(l.from === from && l.to === to)
        );
        
        if (this.context.applyChanges) {
          this.context.applyChanges();
        }
        
        this.context.log(`Removed link ${from} -> ${to}`);
        break;
      }
      
      default:
        throw new Error(`Unknown link subcommand: ${subCommand}`);
    }
  }

  private async executeWaitCommand(command: ScriptCommand): Promise<void> {
    const ms = this.evaluateExpression(command.args[0]);
    if (typeof ms !== 'number' || ms < 0) {
      throw new Error('Wait requires a positive number of milliseconds');
    }
    
    this.context.log(`Waiting ${ms}ms...`);
    await this.sleep(ms);
  }

  private async executeLoopCommand(command: ScriptCommand): Promise<void> {
    const count = this.evaluateExpression(command.args[0]);
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Loop requires a positive count');
    }
    
    const endIndex = this.findMatchingEnd(this.currentLine);
    if (endIndex === -1) {
      throw new Error('Loop without matching end');
    }
    
    this.loopStack.push({
      start: this.currentLine,
      end: endIndex,
      count: count,
      current: 0
    });
    this.context.variables.set('i', 1); 
  }

  private async executeEndCommand(command: ScriptCommand): Promise<void> {
    
    if (this.ifStack.length > 0) {
      this.ifStack.pop();
      return;
    }
    
    if (this.loopStack.length === 0) {
      throw new Error('End without matching loop/if');
    }
    
    const loop = this.loopStack[this.loopStack.length - 1];
    loop.current++;
    
    if (loop.current < loop.count) {
      
      this.context.variables.set('i', loop.current + 1); 
      this.currentLine = loop.start;
    } else {
      
      this.loopStack.pop();
      this.context.variables.delete('i');
    }
  }

  private async executeIfCommand(command: ScriptCommand): Promise<void> {
    const condition = command.args.join(' ');
    const result = this.evaluateCondition(condition);
    
    this.ifStack.push({
      skipToEnd: !result
    });
    
    if (!result) {
      
      const endIndex = this.findMatchingEnd(this.currentLine);
      if (endIndex === -1) {
        throw new Error('If without matching end');
      }
    }
  }

  private async executeElseCommand(command: ScriptCommand): Promise<void> {
    if (this.ifStack.length === 0) {
      throw new Error('Else without matching if');
    }
    
    const topIf = this.ifStack[this.ifStack.length - 1];
    topIf.skipToEnd = !topIf.skipToEnd; 
  }

  private async executeBreakCommand(command: ScriptCommand): Promise<void> {
    if (this.loopStack.length === 0) {
      throw new Error('Break outside of loop');
    }
    
    const loop = this.loopStack.pop()!;
    this.currentLine = loop.end; 
    this.context.variables.delete('i');
  }

  private async executeLogCommand(command: ScriptCommand): Promise<void> {
    const message = command.args.join(' ');
    const evaluated = this.evaluateExpression(message);
    this.context.log(String(evaluated));
  }

  private async executeExportCommand(command: ScriptCommand): Promise<void> {
    const type = command.args[0]?.toLowerCase();
    
    if (type === 'puml') {
      const filename = command.args[1] || 'export.puml';
      const puml = this.generateAnnotatedPuml();
      
      this.context.log(`Exported PUML to ${filename}:\n${puml}`);
    } else {
      throw new Error(`Unknown export type: ${type}`);
    }
  }

  private async executeSnapshotCommand(command: ScriptCommand): Promise<void> {
    const name = command.args[0] || `snapshot-${Date.now()}`;
    this.context.snapshots.set(name, JSON.parse(JSON.stringify(this.context.config)));
    this.context.log(`Saved snapshot: ${name}`);
  }

  private async executeSetCommand(command: ScriptCommand): Promise<void> {
    const varName = command.args[0];
    if (!varName) throw new Error('Set requires a variable name');
    
    const equals = command.args[1];
    if (equals !== '=') throw new Error('Set requires = after variable name');
    
    const valueExpr = command.args.slice(2).join(' ');
    const value = this.evaluateExpression(valueExpr);
    
    this.context.variables.set(varName, value);
    this.context.log(`Set ${varName} = ${value}`);
  }

  private parseProperties(args: string[]): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const arg of args) {
      const [key, ...valueParts] = arg.split('=');
      if (!key || valueParts.length === 0) continue;
      
      const value = valueParts.join('=');
      const evaluated = this.evaluateExpression(value);
      properties[key] = evaluated;
    }
    
    return properties;
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (!(part in current)) return undefined;
      current = current[part];
    }
    
    return current;
  }

  private findMatchingEnd(startIndex: number): number {
    let depth = 1;
    
    for (let i = startIndex + 1; i < this.commands.length; i++) {
      const cmd = this.commands[i];
      if (cmd.type === 'loop' || cmd.type === 'if') {
        depth++;
      } else if (cmd.type === 'end') {
        depth--;
        if (depth === 0) return i;
      }
    }
    
    return -1;
  }

  private evaluateExpression(expr: string): any {
    if (!expr) return '';
    
    if ((expr.startsWith('"') && expr.endsWith('"')) || 
        (expr.startsWith("'") && expr.endsWith("'"))) {
      const inner = expr.slice(1, -1);
      
      return this.interpolateVariables(inner);
    }
    
    const num = parseFloat(expr);
    if (!isNaN(num) && !isNaN(Number(expr))) return num;
    
    if (expr.startsWith('$')) {
      return this.resolveVariable(expr.slice(1));
    }
    
    let evaluated = expr;
    evaluated = this.interpolateVariables(evaluated);
    
    try {
      
      const result = new Function('return ' + evaluated)();
      return result;
    } catch {
      return evaluated;
    }
  }

  private evaluateCondition(condition: string): boolean {
    const interpolated = this.interpolateVariables(condition);
    
    try {
      
      const result = new Function('return ' + interpolated)();
      return !!result;
    } catch (error) {
      throw new Error(`Invalid condition: ${condition}`);
    }
  }

  private interpolateVariables(str: string): string {
    
    let result = str.replace(/\$\(([^)]+)\)/g, (match, expr) => {
      try {
        
        const vars: Record<string, any> = {};
        this.context.variables.forEach((value, key) => {
          vars[key] = value;
        });
        
        const varNames = Object.keys(vars);
        const varValues = varNames.map(k => vars[k]);
        
        const func = new Function(...varNames, 'return ' + expr);
        const evaluated = func(...varValues);
        return String(evaluated);
      } catch {
        return match; 
      }
    });
    
    result = result.replace(/\$([a-zA-Z_][\w.]*(?:\([^)]*\))?)/g, (match, varName) => {
      const value = this.resolveVariable(varName);
      return String(value !== undefined ? value : match);
    });
    
    return result;
  }

  private resolveVariable(path: string): any {
    
    if (this.context.variables.has(path)) {
      return this.context.variables.get(path);
    }
    
    if (path === 'time') return Date.now();
    if (path === 'i') return this.context.variables.get('i') || 0;
    
    if (path.startsWith('random(')) {
      const match = path.match(/random\((\d+),(\d+)\)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    }
    
    if (path.startsWith('metrics.')) {
      const metricPath = path.slice(8);
      return this.getNestedProperty(this.context.metrics, metricPath);
    }
    
    if (path.startsWith('node.')) {
      const parts = path.slice(5).split('.');
      const nodeId = parts[0];
      const node = (this.context.config.nodes || []).find((n: any) => n.id === nodeId);
      if (node && parts.length > 1) {
        return this.getNestedProperty(node, parts.slice(1).join('.'));
      }
      return node;
    }
    
    return undefined;
  }

  private generateAnnotatedPuml(): string {
    let puml = '@startuml\n';
    
    puml += `title Traffic Simulation - ${new Date().toISOString()}\n\n`;
    
    const nodes = this.context.config.nodes || [];
    for (const node of nodes) {
      const nodeMetrics = this.context.metrics?.nodeMetrics?.get(node.id);
      puml += `component ${node.id} <<${node.kind}>>\n`;
      
      if (nodeMetrics) {
        puml += `note right of ${node.id}\n`;
        puml += `  RPS: ${nodeMetrics.processedRate?.toFixed(1) || 0}\n`;
        puml += `  Util: ${(nodeMetrics.utilization * 100).toFixed(0)}%\n`;
        if (nodeMetrics.err_in > 0) {
          puml += `  err_in: ${nodeMetrics.err_in.toFixed(1)}/s\n`;
        }
        if (nodeMetrics.err_out > 0) {
          puml += `  err_out: ${nodeMetrics.err_out.toFixed(1)}/s\n`;
        }
        puml += `end note\n`;
      }
    }
    
    puml += '\n';
    
    const links = this.context.config.links || [];
    for (const link of links) {
      const edgeKey = `${link.from}->${link.to}`;
      const flows = this.context.metrics?.edgeFlows?.get(edgeKey);
      
      if (flows && flows.length > 0) {
        const totalRate = flows.reduce((sum: number, f: any) => sum + f.rate, 0);
        puml += `${link.from} --> ${link.to} : ${totalRate.toFixed(1)} rps\n`;
      } else {
        puml += `${link.from} --> ${link.to}\n`;
      }
    }
    
    puml += '@enduml';
    return puml;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Script aborted'));
        });
      }
    });
  }

  stop(): void {
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

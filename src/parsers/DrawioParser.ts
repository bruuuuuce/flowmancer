
export interface DrawioNode {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: string;
}

export interface DrawioConnection {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface DrawioGraph {
  nodes: DrawioNode[];
  connections: DrawioConnection[];
}

export class DrawioParser {
  
  static parseXML(xmlContent: string): DrawioGraph {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }

    const nodes: DrawioNode[] = [];
    const connections: DrawioConnection[] = [];
    
    const cells = doc.querySelectorAll('mxCell');
    
    for (const cell of cells) {
      const id = cell.getAttribute('id');
      const value = cell.getAttribute('value') || '';
      const style = cell.getAttribute('style') || '';
      const source = cell.getAttribute('source');
      const target = cell.getAttribute('target');
      
      if (!id) continue;
      
      if (source && target) {
        
        connections.push({
          id,
          source,
          target,
          label: this.decodeValue(value)
        });
      } else if (style && !source && !target) {
        
        const geometry = cell.querySelector('mxGeometry');
        if (geometry) {
          const x = parseFloat(geometry.getAttribute('x') || '0');
          const y = parseFloat(geometry.getAttribute('y') || '0');
          const width = parseFloat(geometry.getAttribute('width') || '100');
          const height = parseFloat(geometry.getAttribute('height') || '50');
          
          nodes.push({
            id,
            label: this.decodeValue(value),
            shape: this.extractShape(style),
            x,
            y,
            width,
            height,
            style
          });
        }
      }
    }
    
    return { nodes, connections };
  }
  
  private static decodeValue(value: string): string {
    if (!value) return '';
    
    const div = document.createElement('div');
    div.innerHTML = value;
    let decoded = div.textContent || div.innerText || '';
    
    decoded = decoded.replace(/<[^>]*>/g, ''); 
    decoded = decoded.replace(/\u00A0/g, ' '); 
    decoded = decoded.replace(/&nbsp;/g, ' '); 
    decoded = decoded.trim();
    
    return decoded;
  }
  
  private static extractShape(style: string): string {
    
    const shapePatterns = [
      { pattern: /ellipse/i, shape: 'ellipse' },
      { pattern: /rectangle/i, shape: 'rectangle' },
      { pattern: /rhombus/i, shape: 'diamond' },
      { pattern: /triangle/i, shape: 'triangle' },
      { pattern: /hexagon/i, shape: 'hexagon' },
      { pattern: /cylinder/i, shape: 'cylinder' },
      { pattern: /cloud/i, shape: 'cloud' },
      { pattern: /actor/i, shape: 'actor' },
      { pattern: /process/i, shape: 'process' }
    ];
    
    for (const { pattern, shape } of shapePatterns) {
      if (pattern.test(style)) {
        return shape;
      }
    }
    
    return 'rectangle';
  }
  
  static convertToSimulationConfig(drawioGraph: DrawioGraph): any {
    const nodes = drawioGraph.nodes.map(node => {
      const nodeType = this.inferNodeType(node.label, node.shape);
      const baseConfig = {
        id: node.id,
        kind: nodeType,
        
        ...this.getDefaultNodeProperties(nodeType)
      };
      
      return baseConfig;
    });
    
    const links = drawioGraph.connections
      .filter(conn => {
        
        const sourceExists = drawioGraph.nodes.some(n => n.id === conn.source);
        const targetExists = drawioGraph.nodes.some(n => n.id === conn.target);
        return sourceExists && targetExists;
      })
      .map(conn => ({
        from: conn.source,
        to: conn.target,
        label: conn.label
      }));
    
    return {
      rateRps: 5, 
      latency: { base: 20, jitter: 10 },
      nodes,
      links
    };
  }
  
  private static inferNodeType(label: string, shape: string): string {
    const text = label.toLowerCase();
    
    if (text.includes('source') || text.includes('ingress') || text.includes('gateway') || text.includes('entry') || text.includes('start')) {
      return 'Ingress';
    }
    if (text.includes('load') && text.includes('balancer') || text.includes('lb') || text.includes('proxy')) {
      return 'LoadBalancer';
    }
    if (text.includes('cache') || text.includes('redis') || text.includes('memcached')) {
      return 'Cache';
    }
    if (text.includes('database') || text.includes('db') || text.includes('sql') || text.includes('mongo')) {
      return 'DB';
    }
    if (text.includes('queue') || text.includes('kafka') || text.includes('rabbit') || text.includes('sqs')) {
      return 'Queue';
    }
    if (text.includes('sink') || text.includes('output') || text.includes('end') || text.includes('drain')) {
      return 'Sink';
    }
    if (text.includes('api') || text.includes('external') || text.includes('third')) {
      return 'ExternalAPI';
    }
    
    switch (shape) {
      case 'ellipse':
        return 'Ingress'; 
      case 'diamond':
        return 'LoadBalancer'; 
      case 'cylinder':
        return 'DB'; 
      case 'cloud':
        return 'ExternalAPI'; 
      case 'hexagon':
        return 'Queue'; 
      default:
        return 'Service'; 
    }
  }
  
  private static getDefaultNodeProperties(nodeType: string): any {
    const defaults: Record<string, any> = {
      'Ingress': { 
        rateRps: 10, 
        timeout_ms: 5000,
        routing: { policy: 'weighted' }
      },
      'Service': { 
        capacity: 100, 
        base_ms: 20, 
        jitter_ms: 10, 
        p_fail: 0,
        routing: { policy: 'replicate_all' }
      },
      'LoadBalancer': { 
        capacity: 200, 
        base_ms: 1, 
        jitter_ms: 1, 
        p_fail: 0,
        routing: { policy: 'round_robin' }
      },
      'Cache': { 
        hitRatio: 0.8, 
        base_ms: 5, 
        jitter_ms: 2,
        routing: { policy: 'replicate_all' }
      },
      'DB': { 
        capacity: 50, 
        base_ms: 50, 
        jitter_ms: 20, 
        p_fail: 0 
      },
      'ExternalAPI': { 
        capacity: 10, 
        base_ms: 100, 
        jitter_ms: 50, 
        p_fail: 0 
      },
      'Queue': { 
        maxQueue: 10000, 
        base_ms: 2, 
        jitter_ms: 1 
      },
      'Sink': {}
    };
    
    return defaults[nodeType] || defaults['Service'];
  }
  
  static validateGraph(graph: DrawioGraph): string[] {
    const errors: string[] = [];
    
    const connectedNodes = new Set<string>();
    graph.connections.forEach(conn => {
      connectedNodes.add(conn.source);
      connectedNodes.add(conn.target);
    });
    
    const isolatedNodes = graph.nodes.filter(node => !connectedNodes.has(node.id));
    if (isolatedNodes.length > 0) {
      errors.push(`Isolated nodes detected: ${isolatedNodes.map(n => n.label || n.id).join(', ')}`);
    }
    
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    const invalidConnections = graph.connections.filter(conn => 
      !nodeIds.has(conn.source) || !nodeIds.has(conn.target)
    );
    if (invalidConnections.length > 0) {
      errors.push(`Invalid connections detected: ${invalidConnections.length} connections reference missing nodes`);
    }
    
    const hasSource = graph.nodes.some(node => {
      const type = this.inferNodeType(node.label, node.shape);
      return type === 'Ingress';
    });
    if (!hasSource) {
      errors.push('No ingress node detected. Consider labeling a node with "source", "ingress", "gateway", or "entry"');
    }
    
    const hasSink = graph.nodes.some(node => 
      this.inferNodeType(node.label, node.shape) === 'Sink'
    );
    if (!hasSink) {
      errors.push('No sink node detected. Consider labeling a node with "sink", "output", or "end"');
    }
    
    return errors;
  }
}

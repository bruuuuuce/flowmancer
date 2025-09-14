
export interface DrawioNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: string;
  parentId?: string;
}

export interface DrawioEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: string;
}

export interface DrawioParseResult {
  nodes: DrawioNode[];
  edges: DrawioEdge[];
  errors: string[];
}

export interface SimulationConfig {
  nodes: Array<{
    id: string;
    kind: string;
    capacity?: number;
    capacity_in?: number;
    capacity_out?: number;
    base_ms?: number;
    jitter_ms?: number;
    p_fail?: number;
    rateRps?: number;
    timeout_ms?: number;
    routing?: {
      policy: string;
      weights?: Record<string, number>;
    };
  }>;
  links: Array<{
    from: string;
    to: string;
  }>;
}

export function parseDrawioXml(xmlString: string): DrawioParseResult {
  const errors: string[] = [];
  const nodes: DrawioNode[] = [];
  const edges: DrawioEdge[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      errors.push(`XML parsing error: ${parserError.textContent}`);
      return { nodes, edges, errors };
    }

    const cells = doc.querySelectorAll('mxCell');
    
    cells.forEach(cell => {
      const id = cell.getAttribute('id');
      if (!id || id === '0' || id === '1') return; 
      
      const style = cell.getAttribute('style') || '';
      const value = cell.getAttribute('value') || '';
      
      const source = cell.getAttribute('source');
      const target = cell.getAttribute('target');
      
      if (source && target) {
        
        edges.push({
          id,
          source,
          target,
          label: value,
          style
        });
      } else if (!cell.hasAttribute('edge')) {
        
        const geometry = cell.querySelector('mxGeometry');
        if (geometry) {
          const x = parseFloat(geometry.getAttribute('x') || '0');
          const y = parseFloat(geometry.getAttribute('y') || '0');
          const width = parseFloat(geometry.getAttribute('width') || '100');
          const height = parseFloat(geometry.getAttribute('height') || '60');
          const parentId = cell.getAttribute('parent');
          
          if (width > 0 && height > 0 && parentId !== '0') {
            nodes.push({
              id,
              label: value || id,
              x,
              y,
              width,
              height,
              style,
              parentId
            });
          }
        }
      }
    });

    const graphModel = doc.querySelector('mxGraphModel');
    if (graphModel && nodes.length === 0 && edges.length === 0) {
      
      const root = graphModel.querySelector('root');
      if (root) {
        const rootCells = root.querySelectorAll('mxCell');
        rootCells.forEach(cell => {
          const id = cell.getAttribute('id');
          if (!id || id === '0' || id === '1') return;
          
          const value = cell.getAttribute('value') || '';
          const style = cell.getAttribute('style') || '';
          const source = cell.getAttribute('source');
          const target = cell.getAttribute('target');
          
          if (source && target) {
            edges.push({
              id,
              source,
              target,
              label: value,
              style
            });
          } else {
            const geometry = cell.querySelector('mxGeometry');
            if (geometry && !cell.hasAttribute('edge')) {
              const x = parseFloat(geometry.getAttribute('x') || '0');
              const y = parseFloat(geometry.getAttribute('y') || '0');
              const width = parseFloat(geometry.getAttribute('width') || '100');
              const height = parseFloat(geometry.getAttribute('height') || '60');
              
              if (width > 0 && height > 0) {
                nodes.push({
                  id,
                  label: value || id,
                  x,
                  y,
                  width,
                  height,
                  style
                });
              }
            }
          }
        });
      }
    }

  } catch (error) {
    errors.push(`Failed to parse draw.io XML: ${error}`);
  }

  return { nodes, edges, errors };
}

export function inferNodeKind(node: DrawioNode): string {
  const label = node.label.toLowerCase();
  const style = (node.style || '').toLowerCase();
  
  if (label.includes('ingress') || label.includes('entry') || label.includes('input')) {
    return 'Ingress';
  }
  if (label.includes('load') && label.includes('balanc')) {
    return 'LoadBalancer';
  }
  if (label.includes('cache')) {
    return 'Cache';
  }
  if (label.includes('database') || label.includes('db')) {
    return 'DB';
  }
  if (label.includes('sink') || label.includes('exit') || label.includes('output')) {
    return 'Sink';
  }
  
  if (style.includes('fillcolor=#')) {
    const colorMatch = style.match(/fillcolor=#([0-9a-f]{6})/i);
    if (colorMatch) {
      const color = colorMatch[1].toLowerCase();
      
      if (color.startsWith('4a') || color.startsWith('22') || color.includes('c55e')) {
        return 'Ingress';
      }
      
      if (color.startsWith('f8') || color.startsWith('ef') || color.includes('4444')) {
        return 'Sink';
      }
      
      if (color.startsWith('a7') || color.includes('8bfa')) {
        return 'Cache';
      }
      
      if (color.startsWith('fb') || color.includes('923c')) {
        return 'DB';
      }
    }
  }
  
  if (style.includes('shape=cylinder') || style.includes('shape=datastore')) {
    return 'DB';
  }
  if (style.includes('shape=cloud')) {
    return 'LoadBalancer';
  }
  
  return 'Service';
}

export function convertToSimulationConfig(parseResult: DrawioParseResult): SimulationConfig {
  const config: SimulationConfig = {
    nodes: [],
    links: []
  };
  
  const nodeMap = new Map<string, DrawioNode>();
  parseResult.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  parseResult.nodes.forEach(node => {
    const kind = inferNodeKind(node);
    const simNode: any = {
      id: node.label || node.id,
      kind
    };
    
    switch (kind) {
      case 'Ingress':
        simNode.rateRps = 10;
        simNode.timeout_ms = 5000;
        simNode.routing = { policy: 'weighted', weights: {} };
        break;
      case 'LoadBalancer':
        simNode.capacity = 100;
        simNode.capacity_in = 100;
        simNode.capacity_out = 100;
        simNode.base_ms = 5;
        simNode.jitter_ms = 2;
        simNode.p_fail = 0.001;
        simNode.routing = { policy: 'round_robin' };
        break;
      case 'Service':
        simNode.capacity = 50;
        simNode.capacity_in = 50;
        simNode.capacity_out = 50;
        simNode.base_ms = 20;
        simNode.jitter_ms = 10;
        simNode.p_fail = 0.01;
        simNode.routing = { policy: 'replicate_all' };
        break;
      case 'Cache':
        simNode.capacity = 75;
        simNode.capacity_in = 75;
        simNode.capacity_out = 75;
        simNode.base_ms = 2;
        simNode.jitter_ms = 1;
        simNode.p_fail = 0.001;
        simNode.routing = { policy: 'replicate_all' };
        break;
      case 'DB':
        simNode.capacity = 30;
        simNode.capacity_in = 30;
        simNode.capacity_out = 30;
        simNode.base_ms = 50;
        simNode.jitter_ms = 20;
        simNode.p_fail = 0.02;
        simNode.routing = { policy: 'replicate_all' };
        break;
      case 'Sink':
        
        break;
    }
    
    config.nodes.push(simNode);
  });
  
  const labelToIdMap = new Map<string, string>();
  parseResult.nodes.forEach(node => {
    labelToIdMap.set(node.id, node.label || node.id);
  });
  
  parseResult.edges.forEach(edge => {
    const fromLabel = labelToIdMap.get(edge.source);
    const toLabel = labelToIdMap.get(edge.target);
    
    if (fromLabel && toLabel) {
      config.links.push({
        from: fromLabel,
        to: toLabel
      });
      
      const fromNode = config.nodes.find(n => n.id === fromLabel);
      if (fromNode && fromNode.routing?.policy === 'weighted') {
        if (!fromNode.routing.weights) {
          fromNode.routing.weights = {};
        }
        
        const outgoingEdges = parseResult.edges.filter(e => 
          labelToIdMap.get(e.source) === fromLabel
        );
        const weight = 1 / outgoingEdges.length;
        fromNode.routing.weights[toLabel] = weight;
      }
    }
  });
  
  return config;
}

export function validateDrawioFile(xmlString: string): string[] {
  const errors: string[] = [];
  
  try {
    const result = parseDrawioXml(xmlString);
    
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
    
    if (result.nodes.length === 0) {
      errors.push('No nodes found in the draw.io file');
    }
    
    if (result.edges.length === 0 && result.nodes.length > 1) {
      errors.push('No connections found between nodes');
    }
    
    const connectedNodes = new Set<string>();
    result.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    const disconnected = result.nodes.filter(node => 
      !connectedNodes.has(node.id) && result.nodes.length > 1
    );
    
    if (disconnected.length > 0) {
      errors.push(`Found ${disconnected.length} disconnected node(s): ${
        disconnected.map(n => n.label || n.id).join(', ')
      }`);
    }
    
  } catch (error) {
    errors.push(`Validation failed: ${error}`);
  }
  
  return errors;
}

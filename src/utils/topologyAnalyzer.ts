
export interface GraphNode {
  id: string;
  kind?: string;
}

export interface GraphLink {
  from: string;
  to: string;
}

export interface TopologyAnalysis {
  type: string;
  subtype?: string;
  isConnected: boolean;
  isStronglyConnected: boolean;
  hasCycles: boolean;
  isDAG: boolean;
  maxDepth: number;
  isolatedNodes: number;
  componentCount: number;
  avgDegree: number;
  maxInDegree: number;
  maxOutDegree: number;
  diameter: number;
  density: number;
  centralNodes: string[];
  leafNodes: string[];
  details: string;
}

export class TopologyAnalyzer {
  private nodes: GraphNode[];
  private links: GraphLink[];
  private adjacencyList: Map<string, Set<string>>;
  private reverseAdjacencyList: Map<string, Set<string>>;
  private nodeSet: Set<string>;

  constructor(nodes: GraphNode[], links: GraphLink[]) {
    this.nodes = nodes;
    this.links = links;
    this.nodeSet = new Set(nodes.map(n => n.id));
    this.buildAdjacencyLists();
  }

  private buildAdjacencyLists() {
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    
    this.nodes.forEach(node => {
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacencyList.set(node.id, new Set());
    });
    
    this.links.forEach(link => {
      if (this.nodeSet.has(link.from) && this.nodeSet.has(link.to)) {
        this.adjacencyList.get(link.from)?.add(link.to);
        this.reverseAdjacencyList.get(link.to)?.add(link.from);
      }
    });
  }

  analyze(): TopologyAnalysis {
    const hasCycles = this.detectCycles();
    const isDAG = !hasCycles;
    const components = this.findComponents();
    const isConnected = components.length === 1;
    const isStronglyConnected = this.checkStrongConnectivity();
    const maxDepth = this.calculateMaxDepth();
    const isolatedNodes = this.findIsolatedNodes();
    const degrees = this.calculateDegrees();
    const diameter = this.calculateDiameter();
    const density = this.calculateDensity();
    const centralNodes = this.findCentralNodes();
    const leafNodes = this.findLeafNodes();
    
    const { type, subtype, details } = this.classifyTopology({
      hasCycles,
      isDAG,
      isConnected,
      components,
      degrees,
      centralNodes,
      leafNodes
    });

    return {
      type,
      subtype,
      isConnected,
      isStronglyConnected,
      hasCycles,
      isDAG,
      maxDepth,
      isolatedNodes: isolatedNodes.length,
      componentCount: components.length,
      avgDegree: degrees.avg,
      maxInDegree: degrees.maxIn,
      maxOutDegree: degrees.maxOut,
      diameter,
      density,
      centralNodes,
      leafNodes,
      details
    };
  }

  private detectCycles(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      
      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      
      recStack.delete(node);
      return false;
    };
    
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) return true;
      }
    }
    
    return false;
  }

  private findComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    
    const dfs = (node: string, component: string[]) => {
      visited.add(node);
      component.push(node);
      
      const outNeighbors = this.adjacencyList.get(node) || new Set();
      const inNeighbors = this.reverseAdjacencyList.get(node) || new Set();
      const allNeighbors = new Set([...outNeighbors, ...inNeighbors]);
      
      for (const neighbor of allNeighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, component);
        }
      }
    };
    
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }
    
    return components;
  }

  private checkStrongConnectivity(): boolean {
    if (this.nodes.length === 0) return true;
    
    const startNode = this.nodes[0].id;
    const reachableFromStart = new Set<string>();
    this.dfsUtil(startNode, reachableFromStart, this.adjacencyList);
    
    if (reachableFromStart.size !== this.nodes.length) return false;
    
    const reachableToStart = new Set<string>();
    this.dfsUtil(startNode, reachableToStart, this.reverseAdjacencyList);
    
    return reachableToStart.size === this.nodes.length;
  }

  private dfsUtil(node: string, visited: Set<string>, adjList: Map<string, Set<string>>) {
    visited.add(node);
    const neighbors = adjList.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsUtil(neighbor, visited, adjList);
      }
    }
  }

  private calculateMaxDepth(): number {
    if (this.nodes.length === 0) return 0;
    
    const roots = this.nodes.filter(node => {
      const incoming = this.reverseAdjacencyList.get(node.id) || new Set();
      return incoming.size === 0;
    });
    
    if (roots.length === 0) {
      
      return Math.max(...this.nodes.map(node => this.bfsDepth(node.id)));
    }
    
    return Math.max(...roots.map(root => this.bfsDepth(root.id)));
  }

  private bfsDepth(start: string): number {
    const queue: [string, number][] = [[start, 0]];
    const visited = new Set<string>();
    let maxDepth = 0;
    
    while (queue.length > 0) {
      const [node, depth] = queue.shift()!;
      if (visited.has(node)) continue;
      
      visited.add(node);
      maxDepth = Math.max(maxDepth, depth);
      
      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([neighbor, depth + 1]);
        }
      }
    }
    
    return maxDepth;
  }

  private findIsolatedNodes(): string[] {
    return this.nodes
      .filter(node => {
        const outgoing = this.adjacencyList.get(node.id) || new Set();
        const incoming = this.reverseAdjacencyList.get(node.id) || new Set();
        return outgoing.size === 0 && incoming.size === 0;
      })
      .map(node => node.id);
  }

  private calculateDegrees() {
    let totalDegree = 0;
    let maxIn = 0;
    let maxOut = 0;
    
    this.nodes.forEach(node => {
      const inDegree = (this.reverseAdjacencyList.get(node.id) || new Set()).size;
      const outDegree = (this.adjacencyList.get(node.id) || new Set()).size;
      totalDegree += inDegree + outDegree;
      maxIn = Math.max(maxIn, inDegree);
      maxOut = Math.max(maxOut, outDegree);
    });
    
    return {
      avg: this.nodes.length > 0 ? totalDegree / this.nodes.length : 0,
      maxIn,
      maxOut
    };
  }

  private calculateDiameter(): number {
    if (this.nodes.length === 0) return 0;
    
    let diameter = 0;
    
    const dist: Map<string, Map<string, number>> = new Map();
    
    this.nodes.forEach(i => {
      dist.set(i.id, new Map());
      this.nodes.forEach(j => {
        if (i.id === j.id) {
          dist.get(i.id)!.set(j.id, 0);
        } else {
          dist.get(i.id)!.set(j.id, Infinity);
        }
      });
    });
    
    this.links.forEach(link => {
      if (dist.has(link.from) && dist.get(link.from)!.has(link.to)) {
        dist.get(link.from)!.set(link.to, 1);
      }
    });
    
    this.nodes.forEach(k => {
      this.nodes.forEach(i => {
        this.nodes.forEach(j => {
          const current = dist.get(i.id)!.get(j.id)!;
          const throughK = dist.get(i.id)!.get(k.id)! + dist.get(k.id)!.get(j.id)!;
          if (throughK < current) {
            dist.get(i.id)!.set(j.id, throughK);
          }
        });
      });
    });
    
    this.nodes.forEach(i => {
      this.nodes.forEach(j => {
        const d = dist.get(i.id)!.get(j.id)!;
        if (d !== Infinity && d > diameter) {
          diameter = d;
        }
      });
    });
    
    return diameter;
  }

  private calculateDensity(): number {
    const n = this.nodes.length;
    if (n <= 1) return 0;
    
    const maxPossibleEdges = n * (n - 1); 
    return this.links.length / maxPossibleEdges;
  }

  private findCentralNodes(): string[] {
    const degrees = new Map<string, number>();
    
    this.nodes.forEach(node => {
      const inDegree = (this.reverseAdjacencyList.get(node.id) || new Set()).size;
      const outDegree = (this.adjacencyList.get(node.id) || new Set()).size;
      degrees.set(node.id, inDegree + outDegree);
    });
    
    const sorted = Array.from(degrees.entries()).sort((a, b) => b[1] - a[1]);
    const threshold = Math.max(1, Math.floor(sorted.length * 0.2));
    
    return sorted.slice(0, threshold).map(([id]) => id);
  }

  private findLeafNodes(): string[] {
    return this.nodes
      .filter(node => {
        const outgoing = this.adjacencyList.get(node.id) || new Set();
        const incoming = this.reverseAdjacencyList.get(node.id) || new Set();
        
        return (incoming.size > 0 && outgoing.size === 0) || 
               (incoming.size === 0 && outgoing.size > 0 && node.kind !== 'Source' && node.kind !== 'Ingress');
      })
      .map(node => node.id);
  }

  private classifyTopology(analysis: any): { type: string; subtype?: string; details: string } {
    const { hasCycles, isDAG, isConnected, components, degrees, centralNodes, leafNodes } = analysis;
    const nodeCount = this.nodes.length;
    const edgeCount = this.links.length;
    
    const hasSource = this.nodes.some(n => n.kind === 'Source' || n.kind === 'Ingress'); 
    const hasSink = this.nodes.some(n => n.kind === 'Sink');
    const hasLoadBalancer = this.nodes.some(n => n.kind === 'LoadBalancer');
    
    if (nodeCount === 0) {
      return { type: 'Empty', details: 'No nodes in the graph' };
    }
    
    if (nodeCount === 1) {
      return { type: 'Singleton', details: 'Single node graph' };
    }
    
    if (!isConnected) {
      return { 
        type: 'Disconnected', 
        subtype: `${components.length} components`,
        details: `Graph has ${components.length} disconnected components`
      };
    }
    
    if (isDAG && edgeCount === nodeCount - 1) {
      const isPipeline = this.checkPipeline();
      if (isPipeline) {
        return { 
          type: 'Pipeline', 
          subtype: hasSource && hasSink ? 'Source-Sink' : 'Linear',
          details: 'Linear chain of nodes' 
        };
      }
    }
    
    if (centralNodes.length === 1 && degrees.maxIn + degrees.maxOut >= (nodeCount - 1) * 1.5) {
      return { 
        type: 'Star', 
        subtype: hasLoadBalancer ? 'Load Balanced' : 'Centralized',
        details: `Central node: ${centralNodes[0]}` 
      };
    }
    
    if (isDAG && edgeCount === nodeCount - 1) {
      return { 
        type: 'Tree', 
        subtype: hasSource ? 'Rooted' : 'Unrooted',
        details: 'Hierarchical tree structure' 
      };
    }
    
    if (hasCycles && degrees.avg === 2 && degrees.maxIn <= 2 && degrees.maxOut <= 2) {
      return { 
        type: 'Ring', 
        details: 'Circular topology' 
      };
    }
    
    const density = this.calculateDensity();
    if (density > 0.3) {
      return { 
        type: 'Mesh', 
        subtype: density > 0.6 ? 'Dense' : 'Sparse',
        details: `High connectivity (density: ${(density * 100).toFixed(1)}%)` 
      };
    }
    
    if (isDAG) {
      const layers = this.detectLayers();
      if (layers.length > 2) {
        return { 
          type: 'Layered', 
          subtype: `${layers.length} layers`,
          details: hasSource && hasSink ? 'Multi-tier architecture' : 'Layered DAG' 
        };
      }
    }
    
    if (hasSource && hasSink) {
      if (isDAG) {
        return { 
          type: 'Source-Sink DAG', 
          subtype: hasLoadBalancer ? 'With Load Balancing' : 'Direct Flow',
          details: 'Directed acyclic graph with defined sources and sinks' 
        };
      } else {
        return { 
          type: 'Source-Sink Graph', 
          subtype: 'With Cycles',
          details: 'Graph with sources, sinks, and feedback loops' 
        };
      }
    }
    
    if (hasCycles) {
      return { 
        type: 'Cyclic Graph', 
        details: 'General graph with cycles' 
      };
    }
    
    return { 
      type: 'DAG', 
      subtype: 'General',
      details: 'Directed acyclic graph' 
    };
  }

  private checkPipeline(): boolean {
    
    let starts = 0;
    let ends = 0;
    
    for (const node of this.nodes) {
      const inDegree = (this.reverseAdjacencyList.get(node.id) || new Set()).size;
      const outDegree = (this.adjacencyList.get(node.id) || new Set()).size;
      
      if (inDegree === 0) starts++;
      if (outDegree === 0) ends++;
      
      if (inDegree > 1 || outDegree > 1) return false;
    }
    
    return starts === 1 && ends === 1;
  }

  private detectLayers(): string[][] {
    if (this.nodes.length === 0) return [];
    
    const layers: string[][] = [];
    const assigned = new Set<string>();
    
    const firstLayer = this.nodes
      .filter(node => {
        const incoming = this.reverseAdjacencyList.get(node.id) || new Set();
        return incoming.size === 0;
      })
      .map(node => node.id);
    
    if (firstLayer.length === 0) return []; 
    
    layers.push(firstLayer);
    firstLayer.forEach(id => assigned.add(id));
    
    while (assigned.size < this.nodes.length) {
      const currentLayer: string[] = [];
      const lastLayer = layers[layers.length - 1];
      
      for (const node of this.nodes) {
        if (assigned.has(node.id)) continue;
        
        const incoming = this.reverseAdjacencyList.get(node.id) || new Set();
        const allPredecessorsAssigned = Array.from(incoming).every(pred => assigned.has(pred));
        
        if (allPredecessorsAssigned && incoming.size > 0) {
          currentLayer.push(node.id);
        }
      }
      
      if (currentLayer.length === 0) break; 
      
      layers.push(currentLayer);
      currentLayer.forEach(id => assigned.add(id));
    }
    
    return layers;
  }

  findAllPaths(from: string, to: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    
    const dfs = (current: string, path: string[]) => {
      if (current === to) {
        paths.push([...path]);
        return;
      }
      
      visited.add(current);
      const neighbors = this.adjacencyList.get(current) || new Set();
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          path.push(neighbor);
          dfs(neighbor, path);
          path.pop();
        }
      }
      
      visited.delete(current);
    };
    
    dfs(from, [from]);
    return paths;
  }

  findAllCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const dfs = (node: string, path: string[]) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);
      
      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }
      
      recStack.delete(node);
    };
    
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }
    
    return cycles;
  }
}

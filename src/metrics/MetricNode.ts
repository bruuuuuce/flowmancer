
export interface NodeMetrics {
  
  incomingRate: number;          
  incomingConnections: number;   
  incomingLatency: number;       
  incomingErrors: number;        
  
  utilization: number;           
  queueLength: number;          
  processedRate: number;        
  errorRate: number;            
  averageServiceTime: number;   
  
  err_in: number;               
  err_out: number;              
  
  outgoingRate: number;         
  outgoingConnections: number;  
  outgoingLatency: number;      
  outgoingErrors: number;       
  
  isHealthy: boolean;
  isDegraded: boolean;
  isOverloaded: boolean;
  
  lastUpdated: number;
}

export interface NodeConfiguration {
  id: string;
  kind: string;
  
  maxCapacity: number;           
  capacity_in?: number;          
  capacity_out?: number;         
  concurrency: number;          
  baseLatency: number;          
  latencyJitter: number;        
  
  baseErrorRate: number;        
  errorUnderLoad: number;       
  
  degradationThreshold: number; 
  overloadThreshold: number;    
  
  routing: {
    policy: string;
    weights?: Record<string, number>;
    stickySessionTtl?: number;
    [key: string]: any;
  };
}

export interface OutputFlow {
  targetNodeId: string;
  rate: number;                 
  latency: number;             
  errorRate: number;           
  weight: number;              
}

export type MetricChangeEvent = {
  nodeId: string;
  metrics: NodeMetrics;
  outputFlows: Map<string, OutputFlow>;
  timestamp: number;
};

export type MetricChangeListener = (event: MetricChangeEvent) => void;

export abstract class MetricNode {
  protected config: NodeConfiguration;
  protected metrics: NodeMetrics;
  protected downstreamNodes = new Map<string, MetricNode>();
  protected upstreamNodes = new Map<string, MetricNode>();
  protected listeners = new Set<MetricChangeListener>();
  protected internalState = new Map<string, any>(); 
  
  constructor(config: NodeConfiguration) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }
  
  abstract calculateOutputFlows(inputMetrics: NodeMetrics): Map<string, OutputFlow>;
  abstract updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics;
  
  updateMetrics(inputMetrics: Partial<NodeMetrics>, deltaTime: number = 1000): void {
    
    const newInputMetrics = { ...this.metrics, ...inputMetrics };
    
    const updatedMetrics = this.updateInternalMetrics(newInputMetrics, deltaTime);
    
    const outputFlows = this.calculateOutputFlows(updatedMetrics);

    const { flows: cappedFlows, err_out } = this.applyOutputCapacity(outputFlows);
    
    this.metrics = {
      ...updatedMetrics,
      err_out,
      outgoingRate: Array.from(cappedFlows.values()).reduce((sum, flow) => sum + flow.rate, 0),
      outgoingConnections: cappedFlows.size,
      outgoingLatency: this.calculateWeightedAverageLatency(cappedFlows),
      outgoingErrors: Array.from(cappedFlows.values()).reduce((sum, flow) => sum + flow.errorRate, 0),
      lastUpdated: Date.now()
    };
    
    this.propagateToDownstream(cappedFlows);
    
    this.notifyListeners();
  }
  
  private propagateToDownstream(outputFlows: Map<string, OutputFlow>): void {
    for (const [targetId, flow] of outputFlows) {
      const targetNode = this.downstreamNodes.get(targetId);
      if (targetNode) {
        
        targetNode.updateMetrics({
          incomingRate: flow.rate,
          incomingLatency: flow.latency,
          incomingErrors: flow.errorRate,
          incomingConnections: 1 
        });
      }
    }
  }
  
  addDownstreamNode(nodeId: string, node: MetricNode): void {
    this.downstreamNodes.set(nodeId, node);
    node.upstreamNodes.set(this.config.id, this);
  }
  
  removeDownstreamNode(nodeId: string): void {
    const node = this.downstreamNodes.get(nodeId);
    if (node) {
      node.upstreamNodes.delete(this.config.id);
      this.downstreamNodes.delete(nodeId);
    }
  }
  
  addListener(listener: MetricChangeListener): void {
    this.listeners.add(listener);
  }
  
  removeListener(listener: MetricChangeListener): void {
    this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    const event: MetricChangeEvent = {
      nodeId: this.config.id,
      metrics: { ...this.metrics },
      outputFlows: this.calculateOutputFlows(this.metrics),
      timestamp: Date.now()
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in metric listener for node ${this.config.id}:`, error);
      }
    });
  }
  
  private calculateWeightedAverageLatency(flows: Map<string, OutputFlow>): number {
    let totalWeightedLatency = 0;
    let totalWeight = 0;
    
    for (const flow of flows.values()) {
      totalWeightedLatency += flow.latency * flow.weight;
      totalWeight += flow.weight;
    }
    
    return totalWeight > 0 ? totalWeightedLatency / totalWeight : 0;
  }

  protected capacityIn(): number {
    return this.config.capacity_in ?? this.config.maxCapacity;
  }

  protected capacityOut(): number {
    return this.config.capacity_out ?? this.config.maxCapacity;
  }

  private applyOutputCapacity(flows: Map<string, OutputFlow>): { flows: Map<string, OutputFlow>, err_out: number } {
    const totalDesired = Array.from(flows.values()).reduce((s, f) => s + f.rate, 0);
    const cap = this.capacityOut();
    if (totalDesired <= cap) {
      return { flows, err_out: 0 };
    }
    
    const factor = cap > 0 ? (cap / totalDesired) : 0;
    const capped = new Map<string, OutputFlow>();
    for (const [k, f] of flows) {
      capped.set(k, {
        ...f,
        rate: f.rate * factor,
        errorRate: f.errorRate * factor
      });
    }
    
    // Calculate err_out as the difference between desired and actual output
    const err_out = Math.max(0, totalDesired - cap);
    return { flows: capped, err_out };
  }
  
  protected calculateUtilization(incomingRate: number, maxCapacity: number): number {
    return Math.min(incomingRate / Math.max(maxCapacity, 1), 1.0);
  }
  
  protected calculateNodeLatency(baseLatency: number, utilization: number, jitter: number): number {
    const loadMultiplier = 1 + (utilization * utilization * 2);
    
    const nodeHashSeed = this.config.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const deterministicJitter = Math.sin(nodeHashSeed) * jitter * 0.5;
    
    return baseLatency * loadMultiplier + deterministicJitter;
  }
  
  protected calculateErrorRate(baseErrorRate: number, utilization: number, errorUnderLoad: number): number {
    return baseErrorRate + (utilization > 0.8 ? errorUnderLoad * Math.pow(utilization - 0.8, 2) : 0);
  }
  
  private initializeMetrics(): NodeMetrics {
    return {
      incomingRate: 0,
      incomingConnections: 0,
      incomingLatency: 0,
      incomingErrors: 0,
      utilization: 0,
      queueLength: 0,
      processedRate: 0,
      errorRate: 0,
      averageServiceTime: this.config.baseLatency,
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
    };
  }
  
  getMetrics(): NodeMetrics {
    return { ...this.metrics };
  }
  
  getConfig(): NodeConfiguration {
    return { ...this.config };
  }
  
  getDownstreamNodes(): string[] {
    return Array.from(this.downstreamNodes.keys());
  }
  
  getUpstreamNodes(): string[] {
    return Array.from(this.upstreamNodes.keys());
  }
  
  updateConfig(newConfig: Partial<NodeConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.updateMetrics({}, 0);
  }
  
  setTopology(topology: GraphTopology): void {
    this.topology = topology;
  }
  
  getDownstreamNodeIds(): string[] {
    if (!this.topology) return [];
    return this.topology.edges.get(this.config.id) || [];
  }
  
  getCurrentMetrics(): NodeMetrics {
    return { ...this.metrics };
  }
  
  getConfiguration(): NodeConfiguration {
    return { ...this.config };
  }
  
  setInputMetrics(inputMetrics: NodeMetrics): void {
    this.inputMetrics = inputMetrics;
  }
  
  calculateMetrics(deltaTime: number): NodeMetrics {
    const inputMetrics = this.inputMetrics || this.initializeMetrics();
    const metrics = this.updateInternalMetrics(inputMetrics, deltaTime);
    
    const outputFlows = this.calculateOutputFlows(metrics);
    const { flows: cappedFlows, err_out } = this.applyOutputCapacity(outputFlows);
    const outgoingRate = Array.from(cappedFlows.values()).reduce((sum, flow) => sum + flow.rate, 0);
    const outgoingErrors = Array.from(cappedFlows.values()).reduce((sum, flow) => sum + flow.errorRate, 0);
    const outgoingLatency = this.calculateWeightedAverageLatency(cappedFlows);
    return { 
      ...metrics, 
      err_out, 
      outgoingRate,
      outgoingConnections: cappedFlows.size,
      outgoingLatency,
      outgoingErrors
    };
  }
  
  calculateCappedOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const outputFlows = this.calculateOutputFlows(metrics);
    const { flows } = this.applyOutputCapacity(outputFlows);
    return flows;
  }
  
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.inputMetrics = null;
    this.internalState.clear();
  }
  
  private topology?: GraphTopology;
  private inputMetrics: NodeMetrics | null = null;
}

export interface GraphTopology {
  edges: Map<string, string[]>;
}

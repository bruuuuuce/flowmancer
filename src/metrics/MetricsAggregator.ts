
import { MetricNode, NodeMetrics, OutputFlow, NodeConfiguration, GraphTopology } from './MetricNode';
import { createMetricNode } from './NodeTypes';

export interface AggregatedMetrics {
  
  totalRPS: number;
  totalErrors: number;
  averageLatency: number;
  healthyNodes: number;
  degradedNodes: number;
  overloadedNodes: number;
  
  nodeMetrics: Map<string, NodeMetrics>;
  
  edgeFlows: Map<string, OutputFlow[]>; 
  
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdated: number;
}

export class MetricsAggregator {
  private nodes = new Map<string, MetricNode>();
  private topology: GraphTopology = { edges: new Map() };
  private lastUpdateTime = 0;
  private aggregatedMetrics: AggregatedMetrics | null = null;
  
  private pendingUpdates = new Set<string>();
  private updateScheduled = false;
  
  constructor() {
    
  }
  
  updateTopology(newTopology: GraphTopology, nodeConfigs: Map<string, NodeConfiguration>): void {
    this.topology = newTopology;
    
    const newNodes = new Map<string, MetricNode>();
    
    for (const [nodeId, config] of nodeConfigs) {
      const existingNode = this.nodes.get(nodeId);
      
      if (existingNode && this.configsEqual(existingNode.getConfiguration(), config)) {
        
        existingNode.setTopology(newTopology);
        newNodes.set(nodeId, existingNode);
      } else {
        
        const newNode = createMetricNode(config);
        newNode.setTopology(newTopology);
        newNodes.set(nodeId, newNode);
      }
    }
    
    this.nodes = newNodes;
    this.scheduleUpdate();
  }
  
  calculateMetrics(deltaTime: number = 1000): AggregatedMetrics {
    const now = Date.now();
    const actualDeltaTime = this.lastUpdateTime > 0 ? now - this.lastUpdateTime : deltaTime;
    this.lastUpdateTime = now;
    
    this.resetNodeInputs();
    
    const maxIterations = 5; 
    let nodeMetrics = new Map<string, NodeMetrics>();
    let edgeFlows = new Map<string, OutputFlow[]>();
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      
      nodeMetrics.clear();
      for (const [nodeId, node] of this.nodes) {
        const updatedMetrics = node.calculateMetrics(actualDeltaTime);
        nodeMetrics.set(nodeId, updatedMetrics);
      }
      
      edgeFlows.clear();
      for (const [nodeId, node] of this.nodes) {
        const metrics = nodeMetrics.get(nodeId)!;
        const flows = node.calculateCappedOutputFlows(metrics);
        
        for (const [targetNodeId, flow] of flows) {
          const edgeKey = `${nodeId}->${targetNodeId}`;
          if (!edgeFlows.has(edgeKey)) {
            edgeFlows.set(edgeKey, []);
          }
          edgeFlows.get(edgeKey)!.push(flow);
        }
      }
      
      if (iteration < maxIterations - 1) {
        this.propagateFlows(edgeFlows);
      }
    }
    
    const aggregated = this.calculateGlobalMetrics(nodeMetrics, edgeFlows);
    this.aggregatedMetrics = aggregated;
    
    return aggregated;
  }
  
  private scheduleUpdate(): void {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    
    queueMicrotask(() => {
      this.updateScheduled = false;
      this.calculateMetrics();
    });
  }
  
  private propagateFlows(edgeFlows: Map<string, OutputFlow[]>): void {
    
    const inputsByNode = new Map<string, {
      totalRate: number;
      totalErrors: number;
      weightedLatency: number;
      connections: number;
    }>();
    
    for (const [edgeKey, flows] of edgeFlows) {
      for (const flow of flows) {
        const targetNodeId = flow.targetNodeId;
        
        if (!inputsByNode.has(targetNodeId)) {
          inputsByNode.set(targetNodeId, {
            totalRate: 0,
            totalErrors: 0,
            weightedLatency: 0,
            connections: 0
          });
        }
        
        const inputs = inputsByNode.get(targetNodeId)!;
        inputs.totalRate += flow.rate;
        inputs.totalErrors += flow.errorRate;
        inputs.weightedLatency += flow.latency * flow.rate; 
        inputs.connections += 1;
      }
    }
    
    for (const [nodeId, inputs] of inputsByNode) {
      const targetNode = this.nodes.get(nodeId);
      if (!targetNode) continue;
      
      const inputMetrics: NodeMetrics = {
        incomingRate: inputs.totalRate,
        incomingConnections: inputs.connections,
        incomingLatency: inputs.totalRate > 0 ? inputs.weightedLatency / inputs.totalRate : 0,
        incomingErrors: inputs.totalErrors,
        
        utilization: 0,
        queueLength: 0,
        processedRate: 0,
        errorRate: 0,
        averageServiceTime: 0,
        
        isHealthy: true,
        isDegraded: false,
        isOverloaded: false,
        lastUpdated: Date.now()
      };
      
      targetNode.setInputMetrics(inputMetrics);
    }
  }
  
  private calculateGlobalMetrics(nodeMetrics: Map<string, NodeMetrics>, edgeFlows: Map<string, OutputFlow[]>): AggregatedMetrics {
    let totalRPS = 0;
    let totalErrors = 0;
    let weightedLatency = 0;
    let healthyNodes = 0;
    let degradedNodes = 0;
    let overloadedNodes = 0;
    let totalProcessedRequests = 0;
    
    for (const [nodeId, metrics] of nodeMetrics) {
      totalRPS += metrics.processedRate;
      totalErrors += metrics.errorRate * metrics.processedRate; 
      
      if (metrics.processedRate > 0) {
        weightedLatency += metrics.averageServiceTime * metrics.processedRate;
        totalProcessedRequests += metrics.processedRate;
      }
      
      if (metrics.isHealthy) healthyNodes++;
      else if (metrics.isDegraded) degradedNodes++;
      else if (metrics.isOverloaded) overloadedNodes++;
    }
    
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const totalNodes = nodeMetrics.size;
    const unhealthyRatio = (degradedNodes + overloadedNodes) / totalNodes;
    
    if (overloadedNodes > totalNodes * 0.3) {
      systemHealth = 'critical';
    } else if (unhealthyRatio > 0.1) {
      systemHealth = 'degraded';
    }
    
    return {
      totalRPS,
      totalErrors,
      averageLatency: totalProcessedRequests > 0 ? weightedLatency / totalProcessedRequests : 0,
      healthyNodes,
      degradedNodes,
      overloadedNodes,
      
      nodeMetrics,
      edgeFlows,
      
      systemHealth,
      lastUpdated: Date.now()
    };
  }
  
  getCurrentMetrics(): AggregatedMetrics | null {
    return this.aggregatedMetrics;
  }
  
  getNodeMetrics(nodeId: string): NodeMetrics | null {
    return this.aggregatedMetrics?.nodeMetrics.get(nodeId) || null;
  }
  
  getEdgeFlows(fromNodeId: string, toNodeId: string): OutputFlow[] {
    const edgeKey = `${fromNodeId}->${toNodeId}`;
    return this.aggregatedMetrics?.edgeFlows.get(edgeKey) || [];
  }
  
  getNodesByHealth(healthState: 'healthy' | 'degraded' | 'overloaded'): string[] {
    if (!this.aggregatedMetrics) return [];
    
    const result: string[] = [];
    for (const [nodeId, metrics] of this.aggregatedMetrics.nodeMetrics) {
      const matchesState = 
        (healthState === 'healthy' && metrics.isHealthy) ||
        (healthState === 'degraded' && metrics.isDegraded) ||
        (healthState === 'overloaded' && metrics.isOverloaded);
      
      if (matchesState) {
        result.push(nodeId);
      }
    }
    
    return result;
  }
  
  private configsEqual(a: NodeConfiguration, b: NodeConfiguration): boolean {
    
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  getCalculationStats(): {
    lastUpdateTime: number;
    nodeCount: number;
    edgeCount: number;
    calculationTime?: number;
  } {
    const edgeCount = Array.from(this.topology.edges.values())
      .reduce((sum, edges) => sum + edges.length, 0);
    
    return {
      lastUpdateTime: this.lastUpdateTime,
      nodeCount: this.nodes.size,
      edgeCount,
      
    };
  }
  
  reset(): void {
    for (const node of this.nodes.values()) {
      node.reset();
    }
    
    this.aggregatedMetrics = null;
    this.lastUpdateTime = 0;
    this.pendingUpdates.clear();
  }
  
  private resetNodeInputs(): void {
    const emptyInput: NodeMetrics = {
      incomingRate: 0,
      incomingConnections: 0,
      incomingLatency: 0,
      incomingErrors: 0,
      utilization: 0,
      queueLength: 0,
      processedRate: 0,
      errorRate: 0,
      averageServiceTime: 0,
      outgoingRate: 0,
      outgoingConnections: 0,
      outgoingLatency: 0,
      outgoingErrors: 0,
      isHealthy: true,
      isDegraded: false,
      isOverloaded: false,
      lastUpdated: Date.now()
    };
    
    for (const [nodeId, node] of this.nodes) {
      node.setInputMetrics(emptyInput);
    }
  }
  
  getSystemSummary(): {
    totalNodes: number;
    healthyNodes: number;
    degradedNodes: number;
    overloadedNodes: number;
    totalRPS: number;
    averageLatency: number;
    systemHealth: string;
    topBottlenecks: Array<{ nodeId: string; utilization: number; queueLength: number }>;
  } {
    if (!this.aggregatedMetrics) {
      return {
        totalNodes: 0,
        healthyNodes: 0,
        degradedNodes: 0,
        overloadedNodes: 0,
        totalRPS: 0,
        averageLatency: 0,
        systemHealth: 'unknown',
        topBottlenecks: []
      };
    }
    
    const metrics = this.aggregatedMetrics;
    
    const bottlenecks: Array<{ nodeId: string; utilization: number; queueLength: number }> = [];
    for (const [nodeId, nodeMetrics] of metrics.nodeMetrics) {
      if (nodeMetrics.utilization > 0.5 || nodeMetrics.queueLength > 0) {
        bottlenecks.push({
          nodeId,
          utilization: nodeMetrics.utilization,
          queueLength: nodeMetrics.queueLength
        });
      }
    }
    
    bottlenecks.sort((a, b) => b.utilization - a.utilization);
    
    return {
      totalNodes: metrics.nodeMetrics.size,
      healthyNodes: metrics.healthyNodes,
      degradedNodes: metrics.degradedNodes,
      overloadedNodes: metrics.overloadedNodes,
      totalRPS: metrics.totalRPS,
      averageLatency: metrics.averageLatency,
      systemHealth: metrics.systemHealth,
      topBottlenecks: bottlenecks.slice(0, 5) 
    };
  }
}

export default MetricsAggregator;

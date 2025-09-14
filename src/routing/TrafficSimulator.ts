
import { BaseNodeRouter, createNodeRouter, NodeConfig, TrafficRequest, RoutingDecision } from './NodeRouter';

export interface SimulationConfig {
  nodes: NodeConfig[];
  links: { from: string; to: string; rateRps?: number }[];
  globalRateRps?: number;
}

export interface TrafficFlow {
  fromNodeId: string;
  toNodeId: string;
  ratePerSecond: number;
  timestamp: number;
}

export interface NodeState {
  incomingRate: number;
  outgoingRate: number;
  currentConnections: number;
  totalProcessed: number;
}

export class TrafficSimulator {
  private routers = new Map<string, BaseNodeRouter>();
  private adjacencyList = new Map<string, string[]>();
  private reverseAdjacencyList = new Map<string, string[]>(); 
  private nodeStates = new Map<string, NodeState>();
  private trafficFlows = new Map<string, TrafficFlow>();
  private requestCounter = 0;

  constructor(private config: SimulationConfig) {
    this.initializeGraph();
    this.initializeNodeStates();
  }

  private initializeGraph(): void {
    
    this.routers.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();

    for (const node of this.config.nodes) {
      this.adjacencyList.set(node.id, []);
      this.reverseAdjacencyList.set(node.id, []);
    }

    for (const link of this.config.links) {
      if (!this.adjacencyList.has(link.from)) {
        console.warn(`Link from unknown node: ${link.from}`);
        continue;
      }
      if (!this.adjacencyList.has(link.to)) {
        console.warn(`Link to unknown node: ${link.to}`);
        continue;
      }

      this.adjacencyList.get(link.from)!.push(link.to);
      this.reverseAdjacencyList.get(link.to)!.push(link.from);
    }

    for (const nodeConfig of this.config.nodes) {
      const router = createNodeRouter(nodeConfig);
      const outgoingConnections = this.adjacencyList.get(nodeConfig.id) || [];
      router.setOutgoingConnections(outgoingConnections);
      this.routers.set(nodeConfig.id, router);
    }
  }

  private initializeNodeStates(): void {
    this.nodeStates.clear();
    for (const node of this.config.nodes) {
      this.nodeStates.set(node.id, {
        incomingRate: 0,
        outgoingRate: 0,
        currentConnections: 0,
        totalProcessed: 0
      });
    }
  }

  simulateTrafficStep(deltaTimeMs: number): Map<string, TrafficFlow> {
    const currentFlows = new Map<string, TrafficFlow>();
    const timestamp = Date.now();

    for (const state of this.nodeStates.values()) {
      state.incomingRate = 0;
      state.outgoingRate = 0;
    }

    const ingressNodes = this.config.nodes.filter(n => n.kind === 'Ingress');
    for (const ingressNode of ingressNodes) {
      this.processIngressNode(ingressNode, deltaTimeMs, timestamp, currentFlows);
    }

    const processedNodes = new Set<string>();
    const queue = [...ingressNodes.map(n => n.id)];

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (processedNodes.has(currentNodeId)) continue;

      processedNodes.add(currentNodeId);
      const router = this.routers.get(currentNodeId);
      if (!router) continue;

      const incomingConnections = this.reverseAdjacencyList.get(currentNodeId) || [];
      let totalIncomingRate = 0;

      for (const sourceNodeId of incomingConnections) {
        const flowKey = `${sourceNodeId}->${currentNodeId}`;
        const flow = currentFlows.get(flowKey);
        if (flow) {
          totalIncomingRate += flow.ratePerSecond;
        }
      }

      const nodeState = this.nodeStates.get(currentNodeId)!;
      nodeState.incomingRate = totalIncomingRate;

      if (currentNodeId !== ingressNodes.find(n => n.id === currentNodeId)?.id && totalIncomingRate > 0) {
        this.processNode(currentNodeId, totalIncomingRate, timestamp, currentFlows);
        
        const outgoingConnections = this.adjacencyList.get(currentNodeId) || [];
        for (const targetNodeId of outgoingConnections) {
          if (!processedNodes.has(targetNodeId)) {
            queue.push(targetNodeId);
          }
        }
      }
    }

    this.trafficFlows = currentFlows;
    return currentFlows;
  }

  private processIngressNode(
    ingressNode: NodeConfig, 
    deltaTimeMs: number, 
    timestamp: number, 
    flows: Map<string, TrafficFlow>
  ): void {
    const router = this.routers.get(ingressNode.id);
    if (!router) return;

    const nodeRate = ingressNode.rateRps || this.config.globalRateRps || 0;
    
    const dummyRequest: TrafficRequest = {
      id: `req_${this.requestCounter++}`,
      sourceNodeId: ingressNode.id,
      timestamp,
      weight: 1.0
    };

    const decisions = router.routeTraffic(dummyRequest);
    
    for (const decision of decisions) {
      const flowKey = `${ingressNode.id}->${decision.targetNodeId}`;
      const flowRate = nodeRate * decision.weight;
      
      flows.set(flowKey, {
        fromNodeId: ingressNode.id,
        toNodeId: decision.targetNodeId,
        ratePerSecond: flowRate,
        timestamp
      });
    }

    const nodeState = this.nodeStates.get(ingressNode.id)!;
    nodeState.outgoingRate = nodeRate;
    nodeState.totalProcessed += nodeRate * (deltaTimeMs / 1000);
  }

  private processNode(
    nodeId: string,
    incomingRate: number,
    timestamp: number,
    flows: Map<string, TrafficFlow>
  ): void {
    const router = this.routers.get(nodeId);
    if (!router || incomingRate <= 0) return;

    const request: TrafficRequest = {
      id: `req_${this.requestCounter++}`,
      sourceNodeId: nodeId,
      timestamp,
      weight: 1.0
    };

    const decisions = router.routeTraffic(request);
    let totalOutgoingRate = 0;

    for (const decision of decisions) {
      const flowKey = `${nodeId}->${decision.targetNodeId}`;
      const flowRate = incomingRate * decision.weight;
      totalOutgoingRate += flowRate;
      
      flows.set(flowKey, {
        fromNodeId: nodeId,
        toNodeId: decision.targetNodeId,
        ratePerSecond: flowRate,
        timestamp
      });
    }

    const nodeState = this.nodeStates.get(nodeId)!;
    nodeState.outgoingRate = totalOutgoingRate;
    nodeState.totalProcessed += incomingRate;
  }

  getCurrentFlows(): Map<string, TrafficFlow> {
    return new Map(this.trafficFlows);
  }

  getNodeStates(): Map<string, NodeState> {
    return new Map(this.nodeStates);
  }

  getEdgeRate(fromNodeId: string, toNodeId: string): number {
    const flowKey = `${fromNodeId}->${toNodeId}`;
    const flow = this.trafficFlows.get(flowKey);
    return flow ? flow.ratePerSecond : 0;
  }

  getAllEdgeRates(): Array<{ id: string; ab: number; ba: number }> {
    const results: Array<{ id: string; ab: number; ba: number }> = [];
    
    const edges = new Set<string>();
    for (const link of this.config.links) {
      edges.add(`${link.from}->${link.to}`);
    }

    for (const edgeId of edges) {
      const flow = this.trafficFlows.get(edgeId);
      results.push({
        id: edgeId,
        ab: Math.round(flow ? flow.ratePerSecond : 0),
        ba: 0 
      });
    }

    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  updateConfig(newConfig: SimulationConfig): void {
    this.config = newConfig;
    this.initializeGraph();
    this.initializeNodeStates();
  }

  getRouterInfo(nodeId: string): any {
    const router = this.routers.get(nodeId);
    if (!router) return null;

    return {
      nodeId,
      outgoingConnections: router.getOutgoingConnections(),
      routerType: router.constructor.name
    };
  }

  getAllRouterInfo(): any[] {
    return Array.from(this.routers.keys()).map(nodeId => this.getRouterInfo(nodeId));
  }
}

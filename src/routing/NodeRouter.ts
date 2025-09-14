
export type NodeKind = 'Ingress' | 'Service' | 'LoadBalancer' | 'Cache' | 'DB' | 'ExternalAPI' | 'Queue' | 'Sink';
export type RoutingPolicy = 'round_robin' | 'weighted' | 'random' | 'sticky' | 'least_connections' | 'replicate_all';

export interface RoutingConfig {
  policy?: RoutingPolicy;
  weights?: Record<string, number>; 
  stickySessionTtl?: number; 
  maxConnections?: Record<string, number>; 
}

export interface NodeConfig {
  id: string;
  kind: NodeKind;
  routing?: RoutingConfig;
  
  capacity?: number;
  rateRps?: number;
  base_ms?: number;
  jitter_ms?: number;
  p_fail?: number;
  timeout_ms?: number;
  hitRatio?: number;
}

export interface TrafficRequest {
  id: string;
  sourceNodeId: string;
  timestamp: number;
  sessionId?: string;
  weight: number;
}

export interface RoutingDecision {
  targetNodeId: string;
  weight: number; 
}

export abstract class BaseNodeRouter {
  protected config: NodeConfig;
  protected outgoingConnections: string[] = [];
  protected state: Map<string, any> = new Map();

  constructor(config: NodeConfig) {
    this.config = config;
  }

  setOutgoingConnections(connections: string[]): void {
    this.outgoingConnections = connections;
  }

  getOutgoingConnections(): string[] {
    return [...this.outgoingConnections];
  }

  abstract routeTraffic(request: TrafficRequest): RoutingDecision[];

  protected getRoutingPolicy(): RoutingPolicy {
    return this.config.routing?.policy || this.getDefaultPolicy();
  }

  protected abstract getDefaultPolicy(): RoutingPolicy;

  protected getWeights(): Record<string, number> {
    const weights = this.config.routing?.weights || {};
    
    const defaultWeight = 1.0 / this.outgoingConnections.length;
    const result: Record<string, number> = {};
    for (const nodeId of this.outgoingConnections) {
      result[nodeId] = weights[nodeId] || defaultWeight;
    }
    return result;
  }

  protected normalizeWeights(weights: Record<string, number>): Record<string, number> {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum === 0) return weights;
    const normalized: Record<string, number> = {};
    for (const [nodeId, weight] of Object.entries(weights)) {
      normalized[nodeId] = weight / sum;
    }
    return normalized;
  }
}

export class IngressRouter extends BaseNodeRouter {
  getDefaultPolicy(): RoutingPolicy {
    return 'weighted';
  }

  routeTraffic(request: TrafficRequest): RoutingDecision[] {
    if (this.outgoingConnections.length === 0) return [];

    const policy = this.getRoutingPolicy();
    const weights = this.normalizeWeights(this.getWeights());

    switch (policy) {
      case 'weighted':
      case 'random':
        
        return Object.entries(weights).map(([nodeId, weight]) => ({
          targetNodeId: nodeId,
          weight: weight
        }));
      
      default:
        
        const equalWeight = 1.0 / this.outgoingConnections.length;
        return this.outgoingConnections.map(nodeId => ({
          targetNodeId: nodeId,
          weight: equalWeight
        }));
    }
  }
}

export class ServiceRouter extends BaseNodeRouter {
  getDefaultPolicy(): RoutingPolicy {
    return 'replicate_all';
  }

  routeTraffic(request: TrafficRequest): RoutingDecision[] {
    if (this.outgoingConnections.length === 0) return [];

    const policy = this.getRoutingPolicy();
    const weights = this.normalizeWeights(this.getWeights());

    switch (policy) {
      case 'replicate_all':
        
        return this.outgoingConnections.map(nodeId => ({
          targetNodeId: nodeId,
          weight: 1.0 
        }));

      case 'weighted':
        
        return Object.entries(weights).map(([nodeId, weight]) => ({
          targetNodeId: nodeId,
          weight: weight
        }));

      case 'round_robin':
        
        const currentIndex = (this.state.get('round_robin_index') || 0) % this.outgoingConnections.length;
        this.state.set('round_robin_index', currentIndex + 1);
        return [{
          targetNodeId: this.outgoingConnections[currentIndex],
          weight: 1.0
        }];

      default:
        return this.routeWithDefaultPolicy();
    }
  }

  private routeWithDefaultPolicy(): RoutingDecision[] {
    return this.outgoingConnections.map(nodeId => ({
      targetNodeId: nodeId,
      weight: 1.0
    }));
  }
}

export class LoadBalancerRouter extends BaseNodeRouter {
  getDefaultPolicy(): RoutingPolicy {
    return 'round_robin';
  }

  routeTraffic(request: TrafficRequest): RoutingDecision[] {
    if (this.outgoingConnections.length === 0) return [];

    const policy = this.getRoutingPolicy();
    const weights = this.normalizeWeights(this.getWeights());

    switch (policy) {
      case 'round_robin':
        const currentIndex = (this.state.get('round_robin_index') || 0) % this.outgoingConnections.length;
        this.state.set('round_robin_index', currentIndex + 1);
        return [{
          targetNodeId: this.outgoingConnections[currentIndex],
          weight: 1.0
        }];

      case 'weighted':
        
        const rand = Math.random();
        let cumulative = 0;
        for (const [nodeId, weight] of Object.entries(weights)) {
          cumulative += weight;
          if (rand <= cumulative) {
            return [{
              targetNodeId: nodeId,
              weight: 1.0
            }];
          }
        }
        
        return [{
          targetNodeId: this.outgoingConnections[0],
          weight: 1.0
        }];

      case 'sticky':
        
        if (request.sessionId) {
          const stickyTarget = this.state.get(`sticky_${request.sessionId}`);
          if (stickyTarget && this.outgoingConnections.includes(stickyTarget)) {
            return [{
              targetNodeId: stickyTarget,
              weight: 1.0
            }];
          } else {
            
            const targetIndex = Math.floor(Math.random() * this.outgoingConnections.length);
            const target = this.outgoingConnections[targetIndex];
            this.state.set(`sticky_${request.sessionId}`, target);
            
            const ttl = this.config.routing?.stickySessionTtl || 300000; 
            setTimeout(() => {
              this.state.delete(`sticky_${request.sessionId}`);
            }, ttl);
            return [{
              targetNodeId: target,
              weight: 1.0
            }];
          }
        }
        
        return this.routeTraffic({ ...request, sessionId: undefined });

      default:
        
        const equalWeight = 1.0 / this.outgoingConnections.length;
        return this.outgoingConnections.map(nodeId => ({
          targetNodeId: nodeId,
          weight: equalWeight
        }));
    }
  }
}

export class CacheRouter extends BaseNodeRouter {
  getDefaultPolicy(): RoutingPolicy {
    return 'replicate_all';
  }

  routeTraffic(request: TrafficRequest): RoutingDecision[] {
    if (this.outgoingConnections.length === 0) return [];

    const hitRatio = this.config.hitRatio || 0.8;
    const isHit = Math.random() < hitRatio;

    if (isHit) {
      
      return this.outgoingConnections.map(nodeId => ({
        targetNodeId: nodeId,
        weight: 0.1 
      }));
    } else {
      
      return this.outgoingConnections.map(nodeId => ({
        targetNodeId: nodeId,
        weight: 1.0
      }));
    }
  }
}

export class SinkRouter extends BaseNodeRouter {
  getDefaultPolicy(): RoutingPolicy {
    return 'replicate_all';
  }

  routeTraffic(request: TrafficRequest): RoutingDecision[] {
    
    return [];
  }
}

export function createNodeRouter(config: NodeConfig): BaseNodeRouter {
  switch (config.kind) {
    case 'Ingress':
      return new IngressRouter(config);
    case 'LoadBalancer':
      return new LoadBalancerRouter(config);
    case 'Service':
      return new ServiceRouter(config);
    case 'Cache':
      return new CacheRouter(config);
    case 'DB':
    case 'ExternalAPI':
    case 'Queue':
      return new ServiceRouter(config); 
    case 'Sink':
      return new SinkRouter(config);
    default:
      return new ServiceRouter(config); 
  }
}

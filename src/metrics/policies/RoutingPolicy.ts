
import type { NodeMetrics, OutputFlow } from '../MetricNode';

export interface RoutingPolicyConfig {
  policy: string;
  weights?: Record<string, number>;
  [key: string]: any;
}

export abstract class RoutingPolicy {
  protected config: RoutingPolicyConfig;
  
  constructor(config: RoutingPolicyConfig) {
    this.config = config;
  }
  
  abstract calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow>;
  
  abstract getName(): string;
}

export function createRoutingPolicy(config: RoutingPolicyConfig): RoutingPolicy {
  switch (config.policy) {
    case 'replicate_all':
      return new ReplicateAllPolicy(config);
    case 'weighted':
      return new WeightedPolicy(config);
    case 'round_robin':
      return new RoundRobinPolicy(config);
    case 'random':
      return new RandomPolicy(config);
    case 'least_connections':
      return new LeastConnectionsPolicy(config);
    case 'hash':
      return new HashPolicy(config);
    default:
      
      console.warn(`Unknown routing policy: ${config.policy}, defaulting to replicate_all`);
      return new ReplicateAllPolicy(config);
  }
}

export class ReplicateAllPolicy extends RoutingPolicy {
  getName(): string {
    return 'replicate_all';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    const flows = new Map<string, OutputFlow>();
    
    for (const nodeId of downstreamNodeIds) {
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: processedRate, 
        latency: latency,
        errorRate: errorRate,
        weight: 1.0
      });
    }
    
    return flows;
  }
}

export class WeightedPolicy extends RoutingPolicy {
  getName(): string {
    return 'weighted';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    const flows = new Map<string, OutputFlow>();
    const weights = this.config.weights || {};
    
    let totalWeight = 0;
    const normalizedWeights: Record<string, number> = {};
    
    for (const nodeId of downstreamNodeIds) {
      const weight = weights[nodeId] || (1.0 / downstreamNodeIds.length);
      normalizedWeights[nodeId] = weight;
      totalWeight += weight;
    }
    
    for (const nodeId of downstreamNodeIds) {
      const weight = normalizedWeights[nodeId] / totalWeight;
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: processedRate * weight, 
        latency: latency,
        errorRate: errorRate * weight,
        weight: weight
      });
    }
    
    return flows;
  }
}

export class RoundRobinPolicy extends RoutingPolicy {
  private currentIndex = 0;
  
  getName(): string {
    return 'round_robin';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    const flows = new Map<string, OutputFlow>();
    
    if (downstreamNodeIds.length === 0) return flows;
    
    const ratePerTarget = processedRate / downstreamNodeIds.length;
    const errorRatePerTarget = errorRate / downstreamNodeIds.length;
    
    for (const nodeId of downstreamNodeIds) {
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: ratePerTarget,
        latency: latency,
        errorRate: errorRatePerTarget,
        weight: 1.0 / downstreamNodeIds.length
      });
    }
    
    return flows;
  }
}

export class RandomPolicy extends RoutingPolicy {
  getName(): string {
    return 'random';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    const flows = new Map<string, OutputFlow>();
    
    const ratePerTarget = processedRate / downstreamNodeIds.length;
    const errorRatePerTarget = errorRate / downstreamNodeIds.length;
    
    for (const nodeId of downstreamNodeIds) {
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: ratePerTarget,
        latency: latency,
        errorRate: errorRatePerTarget,
        weight: 1.0 / downstreamNodeIds.length
      });
    }
    
    return flows;
  }
}

export class LeastConnectionsPolicy extends RoutingPolicy {
  getName(): string {
    return 'least_connections';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    
    const flows = new Map<string, OutputFlow>();
    
    const ratePerTarget = processedRate / downstreamNodeIds.length;
    const errorRatePerTarget = errorRate / downstreamNodeIds.length;
    
    for (const nodeId of downstreamNodeIds) {
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: ratePerTarget,
        latency: latency,
        errorRate: errorRatePerTarget,
        weight: 1.0 / downstreamNodeIds.length
      });
    }
    
    return flows;
  }
}

export class HashPolicy extends RoutingPolicy {
  getName(): string {
    return 'hash';
  }
  
  calculateFlows(
    metrics: NodeMetrics,
    downstreamNodeIds: string[],
    processedRate: number,
    latency: number,
    errorRate: number
  ): Map<string, OutputFlow> {
    
    const flows = new Map<string, OutputFlow>();
    
    const ratePerTarget = processedRate / downstreamNodeIds.length;
    const errorRatePerTarget = errorRate / downstreamNodeIds.length;
    
    for (const nodeId of downstreamNodeIds) {
      flows.set(nodeId, {
        targetNodeId: nodeId,
        rate: ratePerTarget,
        latency: latency,
        errorRate: errorRatePerTarget,
        weight: 1.0 / downstreamNodeIds.length
      });
    }
    
    return flows;
  }
}


import { MetricNode, NodeMetrics, OutputFlow, NodeConfiguration } from './MetricNode';
import { createRoutingPolicy, type RoutingPolicy } from './policies/RoutingPolicy';

export class SourceMetricNode extends MetricNode {
  private lastGenerationTime = 0;
  
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    const now = Date.now();
    const timeSinceLastGen = now - this.lastGenerationTime;
    
    const generationRate = this.config.maxCapacity;
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      incomingRate: generationRate, 
      incomingConnections: 1,
      incomingLatency: 0, 
      incomingErrors: 0,
      
      utilization: Math.min(generationRate / this.config.maxCapacity, 1.0),
      queueLength: 0, 
      processedRate: generationRate,
      errorRate: this.config.baseErrorRate,
      averageServiceTime: this.config.baseLatency,
      err_in: 0, 
      err_out: 0, 
      
      isHealthy: generationRate <= this.config.maxCapacity,
      isDegraded: false,
      isOverloaded: generationRate > this.config.maxCapacity,
      lastUpdated: now
    };
    
    this.lastGenerationTime = now;
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const downstreamNodeIds = this.getDownstreamNodeIds();
    if (downstreamNodeIds.length === 0) return new Map();

    const cumulativeLatency = metrics.incomingLatency + this.config.baseLatency;
    const errorOut = metrics.errorRate * metrics.processedRate;

    const policy = createRoutingPolicy(this.config.routing || { policy: 'replicate_all' });
    return policy.calculateFlows(
      metrics,
      downstreamNodeIds,
      metrics.processedRate,
      cumulativeLatency,
      errorOut
    );
  }
}

export class ServiceMetricNode extends MetricNode {
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    
    const capacityIn = this.capacityIn();
    const err_in = Math.max(0, inputMetrics.incomingRate - capacityIn);
    const effectiveIncoming = Math.min(inputMetrics.incomingRate, capacityIn);
    
    const utilization = this.calculateUtilization(effectiveIncoming, capacityIn);
    const nodeLatency = this.calculateNodeLatency(this.config.baseLatency, utilization, this.config.latencyJitter);
    const errorRate = this.calculateErrorRate(this.config.baseErrorRate, utilization, this.config.errorUnderLoad);
    
    const actualProcessedRate = effectiveIncoming; 
    const queueLength = Math.max(0, effectiveIncoming - actualProcessedRate);
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      utilization,
      queueLength,
      processedRate: actualProcessedRate,
      errorRate,
      averageServiceTime: nodeLatency,
      err_in,
      err_out: 0, 
      
      isHealthy: utilization < this.config.degradationThreshold,
      isDegraded: utilization >= this.config.degradationThreshold && utilization < this.config.overloadThreshold,
      isOverloaded: utilization >= this.config.overloadThreshold,
      lastUpdated: Date.now()
    };
    
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const downstreamNodeIds = this.getDownstreamNodeIds();
    if (downstreamNodeIds.length === 0) return new Map();

    const cumulativeLatency = metrics.incomingLatency + metrics.averageServiceTime;
    const outputErrorRate = metrics.incomingErrors + (metrics.processedRate * metrics.errorRate);

    const policy = createRoutingPolicy(this.config.routing || { policy: 'replicate_all' });
    return policy.calculateFlows(
      metrics,
      downstreamNodeIds,
      metrics.processedRate,
      cumulativeLatency,
      outputErrorRate
    );
  }
}

export class LoadBalancerMetricNode extends MetricNode {
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    
    const capacityIn = this.capacityIn();
    const err_in = Math.max(0, inputMetrics.incomingRate - capacityIn);
    const effectiveIncoming = Math.min(inputMetrics.incomingRate, capacityIn);
    
    const utilization = this.calculateUtilization(effectiveIncoming, capacityIn);
    const nodeLatency = this.config.baseLatency; 
    const errorRate = this.calculateErrorRate(this.config.baseErrorRate, utilization, this.config.errorUnderLoad);
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      utilization,
      queueLength: 0, 
      processedRate: effectiveIncoming,
      errorRate,
      averageServiceTime: nodeLatency,
      err_in,
      err_out: 0, 
      
      isHealthy: utilization < this.config.degradationThreshold,
      isDegraded: utilization >= this.config.degradationThreshold && utilization < this.config.overloadThreshold,
      isOverloaded: utilization >= this.config.overloadThreshold,
      lastUpdated: Date.now()
    };
    
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const downstreamNodeIds = this.getDownstreamNodeIds();
    if (downstreamNodeIds.length === 0) return new Map();

    const cumulativeLatency = metrics.incomingLatency + metrics.averageServiceTime;
    const outputErrorRate = metrics.incomingErrors + (metrics.processedRate * metrics.errorRate);

    const policy = createRoutingPolicy(this.config.routing || { policy: 'round_robin' });
    return policy.calculateFlows(
      metrics,
      downstreamNodeIds,
      metrics.processedRate,
      cumulativeLatency,
      outputErrorRate
    );
  }
}

export class CacheMetricNode extends MetricNode {
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    
    const capacityIn = this.capacityIn();
    const err_in = Math.max(0, inputMetrics.incomingRate - capacityIn);
    const effectiveIncoming = Math.min(inputMetrics.incomingRate, capacityIn);
    
    const utilization = this.calculateUtilization(effectiveIncoming, capacityIn);
    
    const hitRatio = (this.config as any).hitRatio || 0.8;
    const hitLatency = this.config.baseLatency * 0.1; 
    const missLatency = this.config.baseLatency * 2; 
    const averageLatency = (hitLatency * hitRatio) + (missLatency * (1 - hitRatio));
    
    const errorRate = this.calculateErrorRate(this.config.baseErrorRate, utilization, this.config.errorUnderLoad);
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      utilization,
      queueLength: Math.max(0, effectiveIncoming - capacityIn),
      processedRate: effectiveIncoming,
      errorRate,
      averageServiceTime: averageLatency,
      err_in,
      err_out: 0, 
      
      isHealthy: utilization < this.config.degradationThreshold,
      isDegraded: utilization >= this.config.degradationThreshold && utilization < this.config.overloadThreshold,
      isOverloaded: utilization >= this.config.overloadThreshold,
      lastUpdated: Date.now()
    };
    
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const downstreamNodeIds = this.getDownstreamNodeIds();
    if (downstreamNodeIds.length === 0) return new Map();

    const cumulativeLatency = metrics.incomingLatency + metrics.averageServiceTime;
    const outputErrorRate = metrics.incomingErrors + (metrics.processedRate * metrics.errorRate);

    const policy = createRoutingPolicy(this.config.routing || { policy: 'replicate_all' });
    return policy.calculateFlows(
      metrics,
      downstreamNodeIds,
      metrics.processedRate,
      cumulativeLatency,
      outputErrorRate
    );
  }
}

export class DatabaseMetricNode extends MetricNode {
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    
    const capacityIn = this.capacityIn();
    const err_in = Math.max(0, inputMetrics.incomingRate - capacityIn);
    const effectiveIncoming = Math.min(inputMetrics.incomingRate, capacityIn);
    
    const utilization = this.calculateUtilization(effectiveIncoming, capacityIn);
    
    const loadMultiplier = 1 + (utilization * utilization * 5); 
    
    const nodeHashSeed = this.config.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const deterministicJitter = Math.sin(nodeHashSeed * 1.5) * this.config.latencyJitter; 
    
    const nodeLatency = this.config.baseLatency * loadMultiplier + deterministicJitter;
    
    const errorRate = this.calculateErrorRate(this.config.baseErrorRate, utilization, this.config.errorUnderLoad);
    
    const actualProcessedRate = effectiveIncoming;
    const queueLength = Math.max(0, effectiveIncoming - actualProcessedRate);
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      utilization,
      queueLength,
      processedRate: actualProcessedRate,
      errorRate,
      averageServiceTime: nodeLatency,
      err_in,
      err_out: 0, 
      
      isHealthy: utilization < this.config.degradationThreshold,
      isDegraded: utilization >= this.config.degradationThreshold && utilization < this.config.overloadThreshold,
      isOverloaded: utilization >= this.config.overloadThreshold,
      lastUpdated: Date.now()
    };
    
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    const downstreamNodeIds = this.getDownstreamNodeIds();
    if (downstreamNodeIds.length === 0) return new Map();

    const cumulativeLatency = metrics.incomingLatency + metrics.averageServiceTime;
    const outputErrorRate = metrics.incomingErrors + (metrics.processedRate * metrics.errorRate);

    const policy = createRoutingPolicy(this.config.routing || { policy: 'replicate_all' });
    return policy.calculateFlows(
      metrics,
      downstreamNodeIds,
      metrics.processedRate,
      cumulativeLatency,
      outputErrorRate
    );
  }
}

export class SinkMetricNode extends MetricNode {
  updateInternalMetrics(inputMetrics: NodeMetrics, deltaTime: number): NodeMetrics {
    
    const metrics: NodeMetrics = {
      ...inputMetrics,
      utilization: 0, 
      queueLength: 0,
      processedRate: inputMetrics.incomingRate, 
      errorRate: 0, 
      averageServiceTime: 0, 
      err_in: 0, 
      err_out: 0, 
      
      isHealthy: true,
      isDegraded: false,
      isOverloaded: false,
      lastUpdated: Date.now()
    };
    
    return metrics;
  }
  
  calculateOutputFlows(metrics: NodeMetrics): Map<string, OutputFlow> {
    
    return new Map();
  }
}

export function createMetricNode(config: NodeConfiguration): MetricNode {
  switch (config.kind) {
    case 'Source':
    case 'Ingress': 
      return new SourceMetricNode(config);
    case 'Service':
      return new ServiceMetricNode(config);
    case 'LoadBalancer':
      return new LoadBalancerMetricNode(config);
    case 'Cache':
      return new CacheMetricNode(config);
    case 'DB':
    case 'Database':
      return new DatabaseMetricNode(config);
    case 'Sink':
      return new SinkMetricNode(config);
    default:
      
      return new ServiceMetricNode(config);
  }
}

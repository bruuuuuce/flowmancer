import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { useToast } from './useToast';

export interface ConfigState {
  cfgText: string;
  cfgErr: string | undefined;
  pumlText: string;
  pumlErr: string | undefined;
}

export function useConfigManager(config: Ref<any>, recalculateStatistics: (source: string) => void, logFunction?: (msg: string) => void) {
  const toast = useToast();
  
  // Configuration state
  const cfgText = ref(JSON.stringify(config.value, null, 2));
  const cfgErr = ref<string | undefined>(undefined);
  
  // PUML state
  const pumlText = ref(`@startuml
component A <<Source>>
component B <<LoadBalancer>>
component C <<Service>>
component D <<Service>>
component E <<Sink>>

A --> B
A --> D
B --> C
B --> D
C --> E
D --> E
@enduml`);
  const pumlErr = ref<string | undefined>(undefined);

  // Apply configuration
  function applyCfg() { 
    try { 
      const newConfig = JSON.parse(cfgText.value); 
      
      if (Array.isArray(newConfig.links) && typeof newConfig.rateRps === 'number') {
        newConfig.links = newConfig.links.map((l: any) => ({ 
          ...l, 
          rateRps: (typeof l.rateRps === 'number' ? l.rateRps : newConfig.rateRps) 
        }));
      }
      config.value = newConfig;
      cfgErr.value = undefined;
      
      recalculateStatistics('configuration apply');
      
      toast.showSuccess('Configuration applied successfully', 'Success');
    } catch (e: any) { 
      cfgErr.value = e.message;
      toast.showError(e.message, 'Configuration Error');
    } 
  }

  // Load baseline configuration
  async function loadBaseline() { 
    try {
      const response = await fetch('/baseline.json');
      const text = await response.text();
      cfgText.value = text;
    } catch (error) {
      console.error('Failed to load baseline:', error);
      toast.showError('Failed to load baseline configuration', 'Load Error');
    }
  }

  // Generate PUML from current configuration
  function generatePuml() {
    try {
      let puml = '@startuml\n';
      
      if (config.value.nodes) {
        for (const node of config.value.nodes) {
          const nodeType = node.kind || 'Service';
          puml += `component ${node.id} <<${nodeType}>>\n`;
        }
        puml += '\n';
      }
      
      if (config.value.links) {
        for (const link of config.value.links) {
          puml += `${link.from} --> ${link.to}\n`;
        }
      }
      
      puml += '@enduml';
      pumlText.value = puml;
      pumlErr.value = undefined;
    } catch (e: any) {
      pumlErr.value = e.message;
    }
  }

  // Apply PUML to configuration
  function applyPuml() {
    try {
      const content = pumlText.value.trim();
      if (!content.includes('@startuml') || !content.includes('@enduml')) {
        throw new Error('PUML must contain @startuml and @enduml tags');
      }

      const rawLines = content.split('\n');
      const lines = rawLines
        .map(line => line.trim())
        .filter(line => !!line)
        // Filter out comments and directives
        .filter(line => !line.startsWith('@') && !line.startsWith('!') && !line.startsWith("'") && line !== '}');

      const newNodes: any[] = [];
      const newLinks: any[] = [];
      const extractedNodes = new Set<string>();

      function inferNodeType(nodeId: string): string {
        const id = nodeId.toLowerCase();
        if (id.includes('source') || id.includes('ingress') || id.includes('gateway') || id.includes('entry')) return 'Source';
        if (id.includes('sink') || id.includes('drain') || id.includes('output')) return 'Sink';
        if (id.includes('cache') || id.includes('redis') || id.includes('memcached')) return 'Cache';
        if (id.includes('lb') || id.includes('loadbalancer') || id.includes('balancer')) return 'LoadBalancer';
        if (id.includes('db') || id.includes('database') || id.includes('sql') || id.includes('postgres') || id.includes('mysql')) return 'DB';
        if (id.includes('queue') || id.includes('kafka') || id.includes('rabbitmq') || id.includes('sqs')) return 'Queue';
        if (id.includes('api') || id.includes('external')) return 'ExternalAPI';
        return 'Service'; 
      }

      function addNode(nodeId: string, preferredKind?: string) {
        if (extractedNodes.has(nodeId)) return;
        extractedNodes.add(nodeId);
        const nodeKind = preferredKind || inferNodeType(nodeId);
        const existingNode = config.value.nodes?.find(n => n.id === nodeId);
        if (existingNode) {
          newNodes.push({ ...existingNode, kind: preferredKind || existingNode.kind || nodeKind });
        } else {
          const defaultSettings = getDefaultNodeSettings(nodeKind);
          newNodes.push({ id: nodeId, kind: nodeKind, ...defaultSettings });
        }
      }

      for (const line of lines) {
        // Skip certain PlantUML directives
        if (line.startsWith('title') || line.startsWith('legend') || line.startsWith('endlegend') || 
            line.startsWith('skinparam') || line.startsWith('SHOW_LEGEND') || 
            line.startsWith('System_Boundary(') || line.startsWith('Container_Boundary(')) {
          continue;
        }

        // Component declarations
        const componentMatch = line.match(/^component\s+([A-Za-z_][\w]*)(?:\s+<<([A-Za-z_][\w]*)>>)?/);
        if (componentMatch) {
          const nodeId = componentMatch[1];
          const nodeKind = componentMatch[2] || inferNodeType(nodeId);
          addNode(nodeId, nodeKind);
          continue;
        }

        // C4 PlantUML elements
        const c4Match = line.match(/^(Person|System|System_Ext|Container|ContainerDb|ContainerQueue|ContainerBlob)\s*\(\s*([A-Za-z_][\w]*)/);
        if (c4Match) {
          const type = c4Match[1];
          const nodeId = c4Match[2];
          let kind: string;
          switch (type) {
            case 'Person': kind = 'Source'; break;
            case 'System_Ext': kind = 'ExternalAPI'; break;
            case 'System': kind = 'Service'; break;
            case 'Container': kind = inferNodeType(nodeId); break;
            case 'ContainerDb': kind = 'DB'; break;
            case 'ContainerQueue': kind = 'Queue'; break;
            case 'ContainerBlob': kind = 'Sink'; break;
            default: kind = 'Service';
          }
          addNode(nodeId, kind);
          continue;
        }

        // C4 relationships
        const relMatch = line.match(/^Rel\s*\(\s*([A-Za-z_][\w]*)\s*,\s*([A-Za-z_][\w]*)/);
        if (relMatch) {
          const from = relMatch[1];
          const to = relMatch[2];
          newLinks.push({ from, to });
          addNode(from);
          addNode(to);
          continue;
        }

        // Standard connections
        const connectionMatch = line.match(/^([A-Za-z_][\w]*)\s*-->\s*([A-Za-z_][\w]*)/);
        if (connectionMatch) {
          const from = connectionMatch[1];
          const to = connectionMatch[2];
          newLinks.push({ from, to });
          addNode(from);
          addNode(to);
          continue;
        }
      }

      if (newNodes.length === 0 && newLinks.length === 0) {
        throw new Error('PUML: nessun node o link riconosciuto. Usa "component A", "A --> B" oppure C4-PlantUML (es. Container(x,...), Person(...), Rel(a,b,...)).');
      }

      let newLinksNorm = newLinks;
      const globalRate = (config.value as any).rateRps;
      if (Array.isArray(newLinksNorm) && typeof globalRate === 'number') {
        newLinksNorm = newLinksNorm.map((l: any) => ({ 
          ...l, 
          rateRps: (typeof l.rateRps === 'number' ? l.rateRps : globalRate) 
        }));
      }
      
      const newConfig = {
        ...config.value,
        nodes: newNodes,
        links: newLinksNorm
      };
      config.value = newConfig;
      cfgText.value = JSON.stringify(newConfig, null, 2);

      recalculateStatistics('PUML apply');

      if (logFunction) {
        logFunction(`[puml] Applied: ${newNodes.length} nodes, ${newLinks.length} links`);
      }
      
      pumlErr.value = undefined;
    } catch (e: any) {
      pumlErr.value = e.message;
    }
  }

  // Default node settings
  function getDefaultNodeSettings(kind: string) {
    const defaults: Record<string, any> = {
      'Source': { rateRps: 5, timeout_ms: 5000 },
      'Ingress': { rateRps: 5, timeout_ms: 5000 }, 
      'Service': { capacity: 100, base_ms: 20, jitter_ms: 10, p_fail: 0 },
      'Cache': { hitRatio: 0.8 },
      'LoadBalancer': { capacity: 200, base_ms: 1, jitter_ms: 1 },
      'DB': { capacity: 50, base_ms: 50, jitter_ms: 20, p_fail: 0 },
      'ExternalAPI': { capacity: 10, base_ms: 100, jitter_ms: 50, p_fail: 0 },
      'Queue': { maxQueue: 10000 },
      'Sink': {}
    };
    return defaults[kind] || defaults['Service'];
  }

  // Apply DrawIO configuration
  function applyDrawioConfig(drawioConfig: any) {
    try {
      config.value = drawioConfig;
      cfgText.value = JSON.stringify(drawioConfig, null, 2);
      recalculateStatistics('drawio apply');
      
      if (logFunction) {
        logFunction('[drawio] Applied configuration with ' + 
          (drawioConfig.nodes?.length || 0) + ' nodes and ' + 
          (drawioConfig.links?.length || 0) + ' links');
      }
      
      console.log('✓ Draw.io configuration applied successfully', drawioConfig);
    } catch (error: any) {
      if (logFunction) {
        logFunction(`[drawio] Error: ${error.message}`);
      }
      console.error('Failed to apply draw.io configuration:', error);
    }
  }

  return {
    // State
    cfgText,
    cfgErr: computed(() => cfgErr.value),
    pumlText,
    pumlErr: computed(() => pumlErr.value),
    
    // Configuration functions
    applyCfg,
    loadBaseline,
    
    // PUML functions
    generatePuml,
    applyPuml,
    
    // DrawIO functions
    applyDrawioConfig,
    
    // Utility functions
    getDefaultNodeSettings,
    
    // Config state
    configState: computed((): ConfigState => ({
      cfgText: cfgText.value,
      cfgErr: cfgErr.value,
      pumlText: pumlText.value,
      pumlErr: pumlErr.value
    }))
  };
}

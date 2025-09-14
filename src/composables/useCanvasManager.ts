import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';

export interface CanvasState {
  viewport: { scale: number; x: number; y: number };
  panDrag: { active: boolean; lastX: number; lastY: number };
}

export interface LayoutOptions {
  algorithm: string;
  direction: string;
  edgeRouting: string;
  spacingNodeNode: number;
  spacingEdgeEdge: number;
  spacingEdgeNode: number;
  layerNodeNodeBetweenLayers: number;
  thoroughness: number;
  nodePlacement: string;
  layeringStrategy: string;
  crossingMinimization: string;
  mergeEdges: boolean;
  groupPadding: number;
  hierarchyHandling: string;
}

export function useCanvasManager(
  canvasRef: Ref<HTMLCanvasElement | null>,
  config: Ref<any>,
  elkOptions: Ref<LayoutOptions>
) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  
  // Canvas state
  const viewport = ref({ scale: 1, x: 0, y: 0 });
  const panDrag = { active: false, lastX: 0, lastY: 0 };
  
  // ELK state
  let elk: any = null;
  let elkError = '';
  const layoutCache = ref({
    nodePositions: new Map<string, {x: number, y: number}>(),
    edgeRoutes: new Map<string, any>(),
    groupBounds: new Map<string, any>()
  });
  let lastLayoutHash = '';

  // Mouse and viewport handling
  function screenToWorld(sx: number, sy: number) {
    const { scale, x, y } = viewport.value;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }

  function onWheel(e: WheelEvent) {
    if (!canvasRef.value) return;
    
    const rect = canvasRef.value.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const factor = Math.exp(-e.deltaY * 0.001);
    const min = 0.2, max = 4;
    const newScale = Math.max(min, Math.min(max, viewport.value.scale * factor));
    
    viewport.value.x = sx - wx * newScale;
    viewport.value.y = sy - wy * newScale;
    viewport.value.scale = newScale;
  }

  function onMouseDown(e: MouseEvent) {
    panDrag.active = true;
    panDrag.lastX = e.clientX;
    panDrag.lastY = e.clientY;
  }

  function onMouseMove(e: MouseEvent) {
    if (panDrag.active) {
      const dx = e.clientX - panDrag.lastX;
      const dy = e.clientY - panDrag.lastY;
      viewport.value.x += dx;
      viewport.value.y += dy;
      panDrag.lastX = e.clientX;
      panDrag.lastY = e.clientY;
    }
  }

  function onMouseUp() {
    panDrag.active = false;
  }

  // ELK initialization
  async function initializeELK(): Promise<boolean> {
    try {
      const ELKNS = await import('elkjs/lib/elk.bundled.js');
      
      // Resolve constructor
      let ElkCtor: any = ELKNS;
      if (ElkCtor && typeof ElkCtor === 'object' && 'default' in ElkCtor) {
        ElkCtor = ElkCtor.default;
      }
      if (ElkCtor && typeof ElkCtor === 'object' && 'default' in ElkCtor) {
        ElkCtor = ElkCtor.default;
      }
      
      if (typeof ElkCtor === 'function') {
        elk = new ElkCtor();
        console.log('✓ ELK.js initialized successfully (non-worker mode)');
        return true;
      } else if (ElkCtor && typeof ElkCtor.ELK === 'function') {
        elk = new ElkCtor.ELK();
        console.log('✓ ELK.js initialized successfully');
        return true;
      } else if (typeof (window as any) !== 'undefined' && typeof (window as any).ELK === 'function') {
        elk = new (window as any).ELK();
        console.log('✓ ELK.js initialized successfully (global)');
        return true;
      } else {
        throw new TypeError('ELK constructor not found in module exports');
      }
    } catch (error) {
      elkError = `ELK.js initialization failed: ${error}`;
      console.error('✗ ELK.js initialization error:', error);
      console.warn('Application will continue with fallback layout');
      return false;
    }
  }

  // Layout calculation
  async function calculateLayout(nodes: any[], links: any[]): Promise<{
    nodePositions: Map<string, {x: number, y: number}>, 
    edgeRoutes: Map<string, any>,
    groupBounds: Map<string, any>
  }> {
    if (nodes.length === 0) {
      return { nodePositions: new Map(), edgeRoutes: new Map(), groupBounds: new Map() };
    }
    
    const graphHash = JSON.stringify({ 
      nodes: nodes.map(n => ({ id: n.id, kind: n.kind })), 
      links, 
      elk: elkOptions.value 
    });
    
    if (graphHash === lastLayoutHash && layoutCache.value.nodePositions.size > 0) {
      return layoutCache.value;
    }
    
    if (elk && !elkError) {
      try {
        const elkLayout = await calculateElkLayout(nodes, links);
        lastLayoutHash = graphHash;
        layoutCache.value = elkLayout;
        return elkLayout;
      } catch (error) {
        console.error('ELK layout calculation failed:', error);
        elkError = `ELK layout failed: ${error}`;
      }
    }
    
    // Fallback layout
    console.log('Using fallback layout system');
    const fallbackLayout = {
      nodePositions: calculateFallbackLayout(nodes, links),
      edgeRoutes: new Map(),
      groupBounds: new Map()
    };
    
    lastLayoutHash = graphHash;
    layoutCache.value = fallbackLayout;
    return fallbackLayout;
  }

  // ELK layout calculation
  async function calculateElkLayout(nodes: any[], links: any[]) {
    const groups = config.value.groups || [];
    const nodeToGroup = new Map<string, string>();
    
    // Map nodes to groups
    groups.forEach((group: any) => {
      if (group.nodes && Array.isArray(group.nodes)) {
        group.nodes.forEach((nodeId: string) => {
          nodeToGroup.set(nodeId, group.id);
        });
      }
    });
    
    // ELK layout options
    const layoutOptions: Record<string, string> = {
      'elk.algorithm': elkOptions.value.algorithm,
      'elk.direction': elkOptions.value.direction,
      'elk.edgeRouting': elkOptions.value.edgeRouting,
      'elk.spacing.nodeNode': String(elkOptions.value.spacingNodeNode),
      'elk.spacing.edgeEdge': String(elkOptions.value.spacingEdgeEdge),
      'elk.spacing.edgeNode': String(elkOptions.value.spacingEdgeNode),
      'elk.padding': '[left=80,top=80,right=80,bottom=80]'
    };
    
    // Additional layered options
    if (elkOptions.value.algorithm === 'layered') {
      Object.assign(layoutOptions, {
        'elk.layered.spacing.nodeNodeBetweenLayers': String(elkOptions.value.layerNodeNodeBetweenLayers),
        'elk.layered.spacing.edgeNodeBetweenLayers': '25',
        'elk.layered.thoroughness': String(elkOptions.value.thoroughness || 7),
        'elk.layered.nodePlacement.strategy': elkOptions.value.nodePlacement || 'BRANDES_KOEPF',
        'elk.layered.layering.strategy': elkOptions.value.layeringStrategy || 'LONGEST_PATH',
        'elk.layered.unnecessaryBendpoints': 'false',
        'elk.layered.mergeEdges': String(elkOptions.value.mergeEdges || false)
      });
      
      if (!groups.length || elkOptions.value.hierarchyHandling === 'SEPARATE_CHILDREN') {
        layoutOptions['elk.layered.crossingMinimization.strategy'] = 
          elkOptions.value.crossingMinimization || 'LAYER_SWEEP';
      }
    }
    
    // Build ELK graph
    const elkGraph = {
      id: "root",
      layoutOptions,
      children: [
        // Group children
        ...groups.map((group: any) => ({
          id: `group_${group.id}`,
          layoutOptions: {
            'elk.padding': `[left=${elkOptions.value.groupPadding || 20},top=${(elkOptions.value.groupPadding || 20) + 20},right=${elkOptions.value.groupPadding || 20},bottom=${elkOptions.value.groupPadding || 20}]`,
            'elk.nodeLabels.placement': '[H_CENTER, V_TOP, INSIDE]',
            'elk.algorithm': elkOptions.value.algorithm,
            'elk.direction': elkOptions.value.direction
          },
          labels: [{ text: group.name || group.id }],
          children: nodes
            .filter(node => nodeToGroup.get(node.id) === group.id)
            .map(node => ({
              id: node.id,
              width: 90,
              height: 56
            }))
        })).filter((g: any) => g.children && g.children.length > 0),
        
        // Ungrouped nodes
        ...nodes
          .filter(node => !nodeToGroup.has(node.id))
          .map(node => ({
            id: node.id,
            width: 90,
            height: 56
          }))
      ],
      edges: links.map(link => ({
        id: `${link.from}-${link.to}`,
        sources: [link.from],
        targets: [link.to]
      }))
    };
    
    const layoutedGraph = await elk.layout(elkGraph);
    
    // Extract results
    const nodePositions = new Map<string, {x: number, y: number}>();
    const edgeRoutes = new Map<string, any>();
    const groupBounds = new Map<string, any>();
    
    function extractNodesFromHierarchy(parent: any, parentX = 0, parentY = 0) {
      if (parent.children) {
        parent.children.forEach((child: any) => {
          const x = (child.x || 0) + parentX;
          const y = (child.y || 0) + parentY;
          
          if (child.id.startsWith('group_')) {
            const groupId = child.id.replace('group_', '');
            groupBounds.set(groupId, {
              x: x + parentX,
              y: y + parentY,
              width: child.width || 0,
              height: child.height || 0
            });
            
            extractNodesFromHierarchy(child, x, y);
          } else {
            nodePositions.set(child.id, { x, y });
          }
        });
      }
    }
    
    extractNodesFromHierarchy(layoutedGraph);
    
    // Scale to fit screen
    if (nodePositions.size > 0) {
      const positions = Array.from(nodePositions.values());
      const bounds = {
        minX: Math.min(...positions.map(p => p.x)),
        maxX: Math.max(...positions.map(p => p.x)),
        minY: Math.min(...positions.map(p => p.y)),
        maxY: Math.max(...positions.map(p => p.y))
      };
      
      const elkWidth = bounds.maxX - bounds.minX;
      const elkHeight = bounds.maxY - bounds.minY;
      const margin = 100;
      const availableWidth = W - 2 * margin;
      const availableHeight = H - 2 * margin;
      
      const scaleX = elkWidth > 0 ? availableWidth / elkWidth : 1;
      const scaleY = elkHeight > 0 ? availableHeight / elkHeight : 1;
      const scale = Math.min(scaleX, scaleY, 1);
      
      const offsetX = margin + (availableWidth - elkWidth * scale) / 2;
      const offsetY = margin + (availableHeight - elkHeight * scale) / 2;
      
      // Scale node positions
      const scaledNodePositions = new Map<string, {x: number, y: number}>();
      nodePositions.forEach((pos, id) => {
        const scaledX = (pos.x - bounds.minX) * scale + offsetX;
        const scaledY = (pos.y - bounds.minY) * scale + offsetY;
        scaledNodePositions.set(id, { x: scaledX, y: scaledY });
      });
      
      // Scale group bounds
      const scaledGroupBounds = new Map<string, any>();
      groupBounds.forEach((bound, id) => {
        scaledGroupBounds.set(id, {
          x: (bound.x - bounds.minX) * scale + offsetX,
          y: (bound.y - bounds.minY) * scale + offsetY,
          width: bound.width * scale,
          height: bound.height * scale
        });
      });
      
      nodePositions.clear();
      scaledNodePositions.forEach((pos, id) => nodePositions.set(id, pos));
      groupBounds.clear();
      scaledGroupBounds.forEach((bound, id) => groupBounds.set(id, bound));
      
      // Process edge routes
      if (layoutedGraph.edges) {
        layoutedGraph.edges.forEach(edge => {
          const sections = edge.sections || [];
          if (sections.length > 0) {
            const section = sections[0];
            const startPoint = {
              x: ((section.startPoint?.x || 0) - bounds.minX) * scale + offsetX,
              y: ((section.startPoint?.y || 0) - bounds.minY) * scale + offsetY
            };
            const endPoint = {
              x: ((section.endPoint?.x || 0) - bounds.minX) * scale + offsetX,
              y: ((section.endPoint?.y || 0) - bounds.minY) * scale + offsetY
            };
            const bendPoints = section.bendPoints?.map((bp: any) => ({
              x: ((bp.x || 0) - bounds.minX) * scale + offsetX,
              y: ((bp.y || 0) - bounds.minY) * scale + offsetY
            }));
            
            edgeRoutes.set(edge.id, { startPoint, endPoint, bendPoints });
          }
        });
      }
    }
    
    console.log('✓ ELK.js layout calculated successfully');
    console.log(`📊 ELK.js ACTIVE: Processed ${nodes.length} nodes, ${links.length} edges`);
    if (groupBounds.size > 0) {
      console.log(`📦 Groups: ${groupBounds.size} boundaries calculated`);
    }
    
    return { nodePositions, edgeRoutes, groupBounds };
  }

  // Fallback layout calculation
  function calculateFallbackLayout(nodes: any[], links: any[]): Map<string, {x: number, y: number}> {
    const nodePositions = new Map<string, {x: number, y: number}>();
    
    if (nodes.length === 0) return nodePositions;
    
    const incomingEdges = new Map<string, string[]>();
    const outgoingEdges = new Map<string, string[]>();
    
    // Build edge maps
    nodes.forEach(node => {
      incomingEdges.set(node.id, []);
      outgoingEdges.set(node.id, []);
    });
    
    links.forEach(link => {
      outgoingEdges.get(link.from)?.push(link.to);
      incomingEdges.get(link.to)?.push(link.from);
    });
    
    // Layer assignment
    const layers: string[][] = [];
    const nodeToLayer = new Map<string, number>();
    
    const sources = nodes.filter(node => 
      (incomingEdges.get(node.id)?.length || 0) === 0 || 
      node.kind === 'Source' || 
      node.kind === 'Ingress'
    );
    
    if (sources.length === 0) {
      sources.push(nodes[0]);
    }
    
    function assignLayer(nodeId: string, layer: number) {
      const currentLayer = nodeToLayer.get(nodeId);
      if (currentLayer === undefined || layer > currentLayer) {
        nodeToLayer.set(nodeId, layer);
        
        while (layers.length <= layer) {
          layers.push([]);
        }
        
        if (currentLayer !== undefined) {
          const prevLayer = layers[currentLayer];
          const index = prevLayer.indexOf(nodeId);
          if (index !== -1) prevLayer.splice(index, 1);
        }
        
        if (!layers[layer].includes(nodeId)) {
          layers[layer].push(nodeId);
        }
        
        const outgoing = outgoingEdges.get(nodeId) || [];
        outgoing.forEach(targetId => {
          assignLayer(targetId, layer + 1);
        });
      }
    }
    
    sources.forEach(node => assignLayer(node.id, 0));
    
    nodes.forEach(node => {
      if (!nodeToLayer.has(node.id)) {
        assignLayer(node.id, 0);
      }
    });
    
    // Position calculation
    const margin = 100;
    const layerWidth = layers.length > 1 ? (W - 2 * margin) / (layers.length - 1) : 0;
    const centerY = H / 2;
    
    layers.forEach((layer, layerIndex) => {
      const x = layers.length === 1 ? W / 2 : margin + (layerIndex * layerWidth);
      const nodeSpacing = layer.length > 1 ? Math.min(120, (H - 200) / (layer.length - 1)) : 0;
      const startY = layer.length === 1 ? centerY : centerY - ((layer.length - 1) * nodeSpacing) / 2;
      
      layer.forEach((nodeId, nodeIndex) => {
        const y = layer.length === 1 ? startY : startY + (nodeIndex * nodeSpacing);
        nodePositions.set(nodeId, { x, y });
      });
    });
    
    console.log(`✓ Fallback layout calculated: ${layers.length} layers, ${nodes.length} nodes`);
    return nodePositions;
  }

  // Rendering functions
  function drawNodes(ctx: CanvasRenderingContext2D, nodePositions: Map<string, {x: number, y: number}>) {
    const nodes = config.value.nodes || [];
    
    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;
      
      const { scale, x: vx, y: vy } = viewport.value;
      const screenX = pos.x * scale + vx;
      const screenY = pos.y * scale + vy;
      
      // Skip if outside viewport
      if (screenX < -100 || screenX > W + 100 || screenY < -100 || screenY > H + 100) continue;
      
      const nodeWidth = 90 * scale;
      const nodeHeight = 56 * scale;
      
      // Node background
      ctx.fillStyle = getNodeColor(node.kind);
      ctx.fillRect(screenX - nodeWidth/2, screenY - nodeHeight/2, nodeWidth, nodeHeight);
      
      // Node border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = Math.max(1, scale);
      ctx.strokeRect(screenX - nodeWidth/2, screenY - nodeHeight/2, nodeWidth, nodeHeight);
      
      // Node text
      if (scale > 0.5) {
        ctx.fillStyle = '#000';
        ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, screenX, screenY);
      }
    }
  }

  function drawLinks(ctx: CanvasRenderingContext2D, nodePositions: Map<string, {x: number, y: number}>) {
    const links = config.value.links || [];
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = Math.max(1, 2 * viewport.value.scale);
    
    for (const link of links) {
      const fromPos = nodePositions.get(link.from);
      const toPos = nodePositions.get(link.to);
      
      if (!fromPos || !toPos) continue;
      
      const { scale, x: vx, y: vy } = viewport.value;
      const fromX = fromPos.x * scale + vx;
      const fromY = fromPos.y * scale + vy;
      const toX = toPos.x * scale + vx;
      const toY = toPos.y * scale + vy;
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      
      // Arrow head
      if (viewport.value.scale > 0.3) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowSize = 8 * viewport.value.scale;
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle - Math.PI/6),
          toY - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle + Math.PI/6),
          toY - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.stroke();
      }
    }
  }

  function getNodeColor(kind: string): string {
    const colors: Record<string, string> = {
      'Source': '#10b981',
      'Ingress': '#10b981',
      'Service': '#3b82f6',
      'LoadBalancer': '#8b5cf6',
      'Cache': '#f59e0b',
      'DB': '#ef4444',
      'ExternalAPI': '#ec4899',
      'Queue': '#14b8a6',
      'Sink': '#6b7280'
    };
    return colors[kind] || '#94a3b8';
  }

  // Main render function
  function render() {
    if (!canvasRef.value) return;
    
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, W, H);
    
    // Calculate layout if needed
    const nodes = config.value.nodes || [];
    const links = config.value.links || [];
    
    if (layoutCache.value.nodePositions.size === 0 && nodes.length > 0) {
      calculateLayout(nodes, links).then(layout => {
        layoutCache.value = layout;
      });
      return;
    }
    
    // Draw elements
    drawLinks(ctx, layoutCache.value.nodePositions);
    drawNodes(ctx, layoutCache.value.nodePositions);
  }

  return {
    // State
    viewport: computed(() => viewport.value),
    layoutCache: computed(() => layoutCache.value),
    
    // Methods
    initializeELK,
    calculateLayout,
    render,
    
    // Event handlers
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    
    // Canvas state
    state: computed((): CanvasState => ({
      viewport: viewport.value,
      panDrag
    }))
  };
}

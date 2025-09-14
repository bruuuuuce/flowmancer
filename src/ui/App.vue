<template>
  <div style="position:relative; width:100%; height:100%;">
    <canvas ref="c" :width="W" :height="H"
            @wheel.prevent="onWheel"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"></canvas>

    <Toolbar 
      :running="running"
      @toggle-running="running = !running"
      @toggle-stats="toggleStats"
      @toggle-config="toggleConfig"
      @toggle-console="toggleConsole"
      @toggle-scripts="toggleScripts"
      @toggle-puml="togglePuml"
      @toggle-elk="toggleElk"
      @toggle-drawio="toggleDrawio"
      @toggle-about="toggleAbout"
    />

    <StatsOverlayEnhanced
      v-if="showStats"
      :overlayKey="'stats'"
      :overlayMode="overlayModes.stats"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      :stats="stats"
      :linkStats="linkStats"
      :nodeErrors="nodeErrors"
      :dropDetails="dropDetails"
      :config="config"
      :metrics="realMetrics"
      :aggregatedMetrics="lastAggregatedMetrics"
      @close="showStats = false"
    />

    <ConfigOverlay
      v-if="showConfig"
      :overlayKey="'config'"
      :overlayMode="overlayModes.config"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      v-model="cfgText"
      :cfgErr="cfgErr"
      @apply="applyCfg"
      @load-baseline="loadBaseline"
      @close="showConfig = false"
    />

    <ConsoleOverlay
      v-if="showConsole"
      :overlayKey="'console'"
      :overlayMode="overlayModes.console"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      v-model="cmd"
      :log="log"
      :execCmd="execCmd"
      :config="config"
      :groups="config.groups || []"
      @navigate-history="handleHistoryNavigation"
      @close="showConsole = false"
    />

    <ScriptsOverlay
      v-if="showScripts"
      :overlayKey="'scripts'"
      :overlayMode="overlayModes.scripts"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      v-model="script"
      :runScript="runScript"
      :stopScript="stopScript"
      :isRunning="scriptRunning"
      :error="scriptError"
      @close="showScripts = false"
    />

    <PumlOverlay
      v-if="showPuml"
      :overlayKey="'puml'"
      :overlayMode="overlayModes.puml"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      v-model="pumlText"
      :pumlErr="pumlErr"
      @apply="applyPuml"
      @generate="generatePuml"
      @close="showPuml = false"
    />

    <ElkOverlay
      v-if="showElk"
      :overlayKey="'elk'"
      :overlayMode="overlayModes.elk"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      v-model="elkOptions"
      @close="showElk = false"
    />

    <DrawioOverlay
      v-if="showDrawio"
      :overlayKey="'drawio'"
      :overlayMode="overlayModes.drawio"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
    @apply="applyDrawioConfig"
    @close="showDrawio = false"
  />

    <AboutOverlay
      v-if="showAbout"
      :overlayKey="'about'"
      :overlayMode="overlayModes.about"
      :getOverlayStyle="getOverlayStyle"
      :setOverlayMode="setOverlayMode"
      :startDrag="startDrag"
      @close="showAbout = false"
    />
  
  <!-- Toast Notifications -->
  <ToastNotifications ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
// Vue imports
import { ref, onMounted, watch, computed } from 'vue';

// Component imports
import Toolbar from './components/Toolbar.vue';
import StatsOverlayEnhanced from './components/overlays/StatsOverlayEnhanced.vue';
import ConfigOverlay from './components/overlays/ConfigOverlay.vue';
import ConsoleOverlay from './components/overlays/ConsoleOverlay.vue';
import ScriptsOverlay from './components/overlays/ScriptsOverlay.vue';
import PumlOverlay from './components/overlays/PumlOverlay.vue';
import ElkOverlay from './components/overlays/ElkOverlay.vue';
import DrawioOverlay from './components/overlays/DrawioOverlay.vue';
import AboutOverlay from './components/overlays/AboutOverlay.vue';
import ToastNotifications from './components/ToastNotifications.vue';

// Composable imports
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { useToast, setToastComponent } from '../composables/useToast';
import { useMetrics } from '../composables/useMetrics';
import { useCanvasManager } from '../composables/useCanvasManager';
import { useOverlayManager } from '../composables/useOverlayManager';
import { useMetricsManager } from '../composables/useMetricsManager';
import { useConsoleManager } from '../composables/useConsoleManager';
import { useConfigManager } from '../composables/useConfigManager';

const W = window.innerWidth, H = window.innerHeight;
const c = ref<HTMLCanvasElement|null>(null);
const running = ref(true);

const toastRef = ref();
const toast = useToast();

const metrics = useMetrics();

// Initialize overlay manager
const {
  showStats,
  showConfig,
  showConsole,
  showScripts,
  showPuml,
  showElk,
  showDrawio,
  showAbout,
  overlayModes,
  getOverlayStyle,
  setOverlayMode,
  startDrag,
  toggleStats,
  toggleConfig,
  toggleConsole,
  toggleScripts,
  togglePuml,
  toggleElk,
  toggleDrawio,
  toggleAbout
} = useOverlayManager();

const elkOptions = ref({
  
  algorithm: 'layered',
  direction: 'RIGHT',
  edgeRouting: 'ORTHOGONAL',
  
  spacingNodeNode: 60,
  spacingEdgeEdge: 25,
  spacingEdgeNode: 40,
  layerNodeNodeBetweenLayers: 120,
  
  thoroughness: 7,
  nodePlacement: 'BRANDES_KOEPF',
  layeringStrategy: 'LONGEST_PATH',
  mergeEdges: false,
  
  groupPadding: 20
});

let last = performance.now();

function getEffectiveSourceRate(): number {
  const nodes = config.value.nodes || [];
  const sourceNodes = nodes.filter((n:any) => n.kind === 'Source' || n.kind === 'Ingress'); 
  const sum = sourceNodes.reduce((acc:number, n:any) => acc + (typeof n.rateRps === 'number' ? n.rateRps : 0), 0);
  if (sum > 0) return sum;
  const global = (config.value as any).rateRps;
  return typeof global === 'number' ? global : 5;
}

function step(dt: number) {
  // Stats are automatically handled by useMetricsManager
}

async function draw(ctx:CanvasRenderingContext2D){
  ctx.clearRect(0,0,W,H);
  
  ctx.save();
  ctx.setTransform(viewport.value.scale, 0, 0, viewport.value.scale, viewport.value.x, viewport.value.y);
  
  ctx.strokeStyle='#1e2630'; for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();} for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  
  const nodes = config.value.nodes || [];
  const links = config.value.links || [];
  
  const { nodePositions, edgeRoutes, groupBounds } = await calculateLayout(nodes, links);
  
  const NODE_W = 90, NODE_H = 56, NODE_R = 10;
  
  const groups = (config.value as any).groups || [];
  if (groupBounds && groupBounds.size > 0) {
    groups.forEach((group: any) => {
      const bounds = groupBounds.get(group.id);
      if (bounds) {
        
        ctx.strokeStyle = group.color || '#475569';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]);
        
        ctx.fillStyle = group.color || '#64748b';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(group.name || group.id, bounds.x + 10, bounds.y + 20);
        
        ctx.fillStyle = group.color ? `${group.color}15` : 'rgba(71, 85, 105, 0.05)';
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    });
  }
  
  ctx.strokeStyle='#5af';
  ctx.lineWidth=2;
  links.forEach(link => {
    const edgeId = `${link.from}-${link.to}`;
    const edgeRoute = edgeRoutes.get(edgeId);
    
    if (edgeRoute && edgeRoute.bendPoints && edgeRoute.bendPoints.length > 0) {
      
      ctx.beginPath();
      ctx.moveTo(edgeRoute.startPoint.x, edgeRoute.startPoint.y);
      
      edgeRoute.bendPoints.forEach(bendPoint => {
        ctx.lineTo(bendPoint.x, bendPoint.y);
      });
      
      ctx.lineTo(edgeRoute.endPoint.x, edgeRoute.endPoint.y);
      ctx.stroke();
    } else {
      
      const fromPos = nodePositions.get(link.from);
      const toPos = nodePositions.get(link.to);
      if (fromPos && toPos) {
        line(ctx, fromPos.x + NODE_W/2, fromPos.y, toPos.x - NODE_W/2, toPos.y);
      }
    }
  });
  
  const agg = lastAggregatedMetrics.value;
  
  const incomingByNode = new Map<string, { rate: number; errors: number; latencyW: number }>();
  const outgoingByNode = new Map<string, { rate: number; errors: number; latencyW: number }>();
  if (agg && agg.edgeFlows) {
    for (const [edgeKey, flows] of agg.edgeFlows) {
      const [from, to] = edgeKey.split('->');
      const out = outgoingByNode.get(from) || { rate: 0, errors: 0, latencyW: 0 };
      const inn = incomingByNode.get(to) || { rate: 0, errors: 0, latencyW: 0 };
      for (const f of flows) {
        out.rate += f.rate;
        out.errors += f.errorRate;
        out.latencyW += f.latency * f.rate;
        inn.rate += f.rate;
        inn.errors += f.errorRate;
        inn.latencyW += f.latency * f.rate;
      }
      outgoingByNode.set(from, out);
      incomingByNode.set(to, inn);
    }
  }

  nodes.forEach(node => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      
      switch (node.kind) {
        case 'Source': ctx.fillStyle = '#4ade80'; break; 
        case 'Ingress': ctx.fillStyle = '#4ade80'; break; 
        case 'Service': ctx.fillStyle = '#60a5fa'; break; 
        case 'Sink': ctx.fillStyle = '#f87171'; break; 
        case 'Cache': ctx.fillStyle = '#a78bfa'; break; 
        case 'DB': ctx.fillStyle = '#fb923c'; break; 
        case 'LoadBalancer': ctx.fillStyle = '#34d399'; break; 
        default: ctx.fillStyle = '#9ca3af'; break; 
      }
      
      fillRoundRect(ctx, pos.x - NODE_W/2, pos.y - NODE_H/2, NODE_W, NODE_H, NODE_R);

      const inAgg = incomingByNode.get(node.id) || { rate: 0, errors: 0, latencyW: 0 };
      const outAgg = outgoingByNode.get(node.id) || { rate: 0, errors: 0, latencyW: 0 };
      const inEv = Math.round(inAgg.rate);
      const outEv = Math.round(outAgg.rate);
      const outEr = Math.round(outAgg.errors);
      const lat = outAgg.rate > 0 ? Math.round(outAgg.latencyW / outAgg.rate) : null;
      const nodeCfg = getNodeCfg(node.id) || node;
      const capacity = typeof (nodeCfg as any)?.capacity === 'number' ? (nodeCfg as any).capacity : 100;
      const inRatio = Math.max(0, Math.min(1, capacity>0 ? inEv / capacity : 0));
      const outRatio = Math.max(0, Math.min(1, capacity>0 ? outEv / capacity : 0));

      const barPad = 8; const barW = 6; const barH = NODE_H - barPad*2 + 2;
      
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(pos.x - NODE_W/2 + 2, pos.y - NODE_H/2 + barPad - 1, barW, barH);
      ctx.fillRect(pos.x + NODE_W/2 - 2 - barW, pos.y - NODE_H/2 + barPad - 1, barW, barH);
      
      const inFillH = Math.round(barH * inRatio);
      const outFillH = Math.round(barH * outRatio);
      const inColor = inRatio < 0.5 ? '#22c55e' : (inRatio < 0.8 ? '#f59e0b' : '#ef4444');
      const outColor = outRatio < 0.5 ? '#22c55e' : (outRatio < 0.8 ? '#f59e0b' : '#ef4444');
      ctx.fillStyle = inColor; 
      ctx.fillRect(pos.x - NODE_W/2 + 2, pos.y + NODE_H/2 - barPad - inFillH + 1, barW, inFillH);
      ctx.fillStyle = outColor;
      ctx.fillRect(pos.x + NODE_W/2 - 2 - barW, pos.y + NODE_H/2 - barPad - outFillH + 1, barW, outFillH);

      ctx.fillStyle = '#fff';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      const textX = pos.x; let ty = pos.y - NODE_H/2 + 14;
      ctx.fillText(`${node.id}`, textX, ty);
      ty += 14;
      ctx.fillText(`in:${inEv}/s  out:${outEv}/s`, textX, ty);
      ty += 14;
      const latTxt = lat!=null ? `${lat}ms` : '- ms';
      ctx.fillText(`err:${outEr}/s  lat:${latTxt}`, textX, ty);
    }
  });
  
  const polyMid = (pts: {x:number,y:number}[]) => {
    if (pts.length === 0) return {x:0,y:0};
    if (pts.length === 1) return pts[0];
    let len = 0; const segs:number[]=[];
    for (let i=0;i<pts.length-1;i++){ const dx=pts[i+1].x-pts[i].x, dy=pts[i+1].y-pts[i].y; const l=Math.hypot(dx,dy); segs.push(l); len+=l; }
    let mid = len/2, acc=0;
    for (let i=0;i<segs.length;i++){ if (acc+segs[i]>=mid){ const t=(mid-acc)/segs[i]; return { x: lerp(pts[i].x, pts[i+1].x, t), y: lerp(pts[i].y, pts[i+1].y, t) }; } acc+=segs[i]; }
    return pts[Math.floor(pts.length/2)];
  };
  ctx.font='11px system-ui';
  ctx.textAlign='center';
  links.forEach(link=>{
    const edgeId = `${link.from}-${link.to}`;
    const route = edgeRoutes.get(edgeId);
    let mid = {x:0,y:0};
    if (route){
      const pts = [route.startPoint, ...(route.bendPoints||[]), route.endPoint];
      mid = polyMid(pts);
    } else {
      const fromPos = nodePositions.get(link.from);
      const toPos = nodePositions.get(link.to);
      if (fromPos && toPos){ mid = { x: (fromPos.x+toPos.x)/2, y: (fromPos.y+toPos.y)/2 }; }
    }
    
    let ev = 0;
    let er = 0;
    let lat: number | null = null;
    if (agg && agg.edgeFlows) {
      const flows = agg.edgeFlows.get(`${link.from}->${link.to}`) || [];
      const totalRate = flows.reduce((s, f) => s + f.rate, 0);
      const totalErrors = flows.reduce((s, f) => s + f.errorRate, 0);
      const latencyWeighted = flows.reduce((s, f) => s + f.latency * f.rate, 0);
      ev = Math.round(totalRate);
      er = Math.round(totalErrors);
      lat = totalRate > 0 ? Math.round(latencyWeighted / totalRate) : null;
    }
    const label = `${ev}/s, ${er}/s, ${lat!=null?lat+'ms':'- ms'}`;
    
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.strokeText(label, mid.x, mid.y - 6);
    ctx.fillStyle='#fff'; ctx.fillText(label, mid.x, mid.y - 6);
  });
  
  ctx.restore();
  
  ctx.fillStyle='#8fe7b2'; 
  ctx.font='14px system-ui'; 
  ctx.textAlign = 'left';
  ctx.fillStyle='#fff';
}

let lastMetricsUpdate = 0;
const METRICS_UPDATE_INTERVAL = 250;

async function loop(){
  const now = performance.now(); 
  const dt = now - last; 
  last = now;
  
  if (running.value) {
    step(dt);
    
    // Only update metrics occasionally, not every frame
    if (now - lastMetricsUpdate > METRICS_UPDATE_INTERVAL) {
      updateLinkStatsFromMetrics();
      lastMetricsUpdate = now;
    }
  }
  
  const ctx = c.value!.getContext('2d')!;
  try {
    await draw(ctx);
  } catch (error) {
    console.error('Draw function error:', error);
    
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#1e2630';
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#f87171';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Rendering Error: Check Console', 40, 60);
  }
  requestAnimationFrame(loop);
}

function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function fillRoundRect(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
  ctx.fill();
}
function line(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function lerp(a:number,b:number,t:number){ return a + (b-a)*Math.max(0,Math.min(1,t)); }


const config = ref({ 
  rateRps: 5, 
  latency: { base: 20, jitter: 10 },
  groups: [ 
    {
      id: "ingress",
      name: "Ingress Layer",
      color: "#10b981",
      nodes: ["A"]
    },
    {
      id: "processing",
      name: "Processing Layer",
      color: "#3b82f6",
      nodes: ["B", "C", "D"]
    },
    {
      id: "sink",
      name: "Sink Layer",
      color: "#ef4444",
      nodes: ["E"]
    }
  ],
  nodes: [
    { 
      id: "A", 
      kind: "Source", 
      rateRps: 10, 
      timeout_ms: 5000,
      routing: {
        policy: "weighted",
        weights: { "B": 0.7, "D": 0.3 } 
      }
    },
    { 
      id: "B", 
      kind: "LoadBalancer", 
      capacity: 100, 
      base_ms: 5, 
      jitter_ms: 2, 
      p_fail: 0,
      routing: {
        policy: "round_robin" 
      }
    },
    { 
      id: "C", 
      kind: "Service", 
      capacity: 50, 
      base_ms: 20, 
      jitter_ms: 10, 
      p_fail: 0,
      routing: {
        policy: "replicate_all" 
      }
    },
    { 
      id: "D", 
      kind: "Service", 
      capacity: 100, 
      base_ms: 15, 
      jitter_ms: 8, 
      p_fail: 0,
      routing: {
        policy: "replicate_all" 
      }
    },
    { id: "E", kind: "Sink" }
  ],
  links: [
    { from: "A", to: "B" },  
    { from: "A", to: "D" },  
    { from: "B", to: "C" },  
    { from: "B", to: "D" },  
    { from: "C", to: "E" },  
    { from: "D", to: "E" }   
  ]
});

// Initialize metrics manager now that config is defined
const metricsManager = useMetricsManager(config);

// Extract metrics from the manager
const {
  stats,
  linkStats,
  nodeErrors,
  dropDetails,
  realMetrics,
  lastAggregatedMetrics,
  edgeMetrics,
  calculateAllPaths,
  getRandomPath,
  getPathsForTrafficGeneration,
  edgeKey,
  getOrInitEdgeMetric,
  recordEdgeEvent,
  initializeMetricsSystem,
  recalculateStatistics,
  updateLinkStatsFromMetrics
} = metricsManager;

// Initialize canvas manager
const canvasManager = useCanvasManager(c, config, elkOptions);

// Extract canvas manager functions
const {
  viewport,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  screenToWorld
} = canvasManager;

// Extract ELK and layout functionality from canvas manager
const {
  layoutCache,
  initializeELK,
  calculateLayout,
  drawCanvas
} = canvasManager;

// Watch elkOptions to reset layout cache
watch(elkOptions, () => { layoutCache.value = { nodePositions: new Map(), edgeRoutes: new Map(), groupBounds: new Map() }; }, { deep: true });

const nodeCfgMap = ref<Map<string, any>>(new Map());
function rebuildNodeCfgMap() {
  const m = new Map<string, any>();
  const arr = (config.value.nodes || []) as any[];
  for (const n of arr) m.set(n.id, n);
  nodeCfgMap.value = m;
}

rebuildNodeCfgMap();
watch(config, () => rebuildNodeCfgMap(), { deep: true });

function getNodeCfg(id: string){
  return nodeCfgMap.value.get(id);
}

// Initialize config manager
const configManager = useConfigManager(config, recalculateStatistics);

// Extract config manager state and functions
const {
  cfgText,
  cfgErr,
  pumlText,
  pumlErr,
  applyCfg,
  loadBaseline,
  generatePuml,
  applyPuml,
  applyDrawioConfig,
  getDefaultNodeSettings
} = configManager;

// Initialize console manager
const consoleManager = useConsoleManager(config, cfgText, lastAggregatedMetrics, recalculateStatistics, generatePuml, pumlText);

// Extract console manager functions and state
const {
  cmd,
  log,
  script,
  scriptRunning,
  scriptError,
  execCmd,
  handleHistoryNavigation,
  initConsoleContext,
  runScript,
  stopScript
} = consoleManager;

// Initialize keyboard shortcuts
useKeyboardShortcuts([
  { key: ' ', handler: () => running.value = !running.value, description: 'Play/Pause simulation' },
  { key: 's', handler: toggleStats, description: 'Toggle Stats overlay' },
  { key: 'c', handler: toggleConfig, description: 'Toggle Config overlay' },
  { key: 'o', handler: toggleConsole, description: 'Toggle Console overlay' },
  { key: 'r', handler: toggleScripts, description: 'Toggle Scripts overlay' },
  { key: 'p', handler: togglePuml, description: 'Toggle PUML overlay' },
  { key: 'e', handler: toggleElk, description: 'Toggle ELK overlay' },
  { key: 'd', handler: toggleDrawio, description: 'Toggle Draw.io overlay' },
  { key: 'i', ctrl: true, handler: toggleAbout, description: 'Toggle About overlay' },
  { key: 'Escape', handler: () => {
    showStats.value = false;
    showConfig.value = false;
    showConsole.value = false;
    showScripts.value = false;
    showPuml.value = false;
    showElk.value = false;
    showDrawio.value = false;
    showAbout.value = false;
  }, description: 'Close all overlays' },
  { key: '?', shift: true, handler: () => {
    showConsole.value = true;
    log.value.push('🎮 Keyboard Shortcuts:');
    log.value.push('  Space    - Play/Pause simulation');
    log.value.push('  S        - Toggle Stats overlay');
    log.value.push('  C        - Toggle Config overlay');
    log.value.push('  O        - Toggle Console overlay');
    log.value.push('  R        - Toggle Scripts overlay');
    log.value.push('  P        - Toggle PUML overlay');
    log.value.push('  E        - Toggle ELK settings overlay');
    log.value.push('  D        - Toggle Draw.io overlay');
    log.value.push('  Ctrl+I   - Toggle About overlay');
    log.value.push('  Escape   - Close all overlays');
    log.value.push('  Shift+?  - Show this help');
  }, description: 'Show keyboard shortcuts help' }
]);


function debounce<T extends (...args: any[]) => any>(fn: T, wait = 500) {
  let t: number | undefined;
  return (...args: any[]) => {
    if (t !== undefined) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

const autoApplyPuml = debounce(() => {
  const content = (pumlText.value || '').trim();
  if (!content.includes('@startuml') || !content.includes('@enduml')) {
    
    return;
  }
  try {
    applyPuml();
  } catch (e) {
    
  }
}, 600);

watch(pumlText, () => {
  autoApplyPuml();
});

watch(() => config.value, () => { try { recalculateStatistics('deep config watch'); } catch {} }, { deep: true });

onMounted(async ()=>{
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║     ▄████ ▌     ▄▄   ▄   ▄ ▄▄  ▄▄   ▄▄  ▄▄▄    ║
║     ▀▀█▀  ▌    █▀ ▀█ ▐▄ ▄▌ █▄█▄█ █▌  █ █▌       ║
║       █   ▌   ▐▌   ▐▌ ▀█▀  █ ▀ █ ▀█▄▄█ ▀█▄▄     ║
║     ▄▄█▄▄ ▀▄▄▄ ▀▄▄▄▀   █   ▀   ▀     ▀     ▀    ║
║                                                  ║
║           🧙‍♂️ Master the Flow 🌊                  ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
  console.log('🚀 Flowmancer initializing...');
  
  setToastComponent(toastRef);
  
  (window as any).debugMetrics = metricsManager.debugMetricsDisplay;
  (window as any).getAggregator = () => metricsManager.getAggregator();
  console.log('📢 Debug functions available: debugMetrics(), getAggregator()');
  
  // Initialize metrics update
  updateLinkStatsFromMetrics();
  
  log.value.push('🧙‍♂️ Flowmancer Console Ready!');
  log.value.push('Master your flows with powerful commands. Type "help" to begin.');
  log.value.push('Try: node add API Service capacity=100');
  
  toast.showInfo('Press Shift+? to see keyboard shortcuts', 'Welcome to Flowmancer');
  
  try {
    console.log('📦 Attempting to initialize ELK.js...');
    await initializeELK();
    console.log('🎬 Starting animation loop...');
    requestAnimationFrame(loop);
    console.log('✅ Application initialization completed');
  } catch (error) {
    console.error('❌ Application initialization error:', error);
    console.log('🔧 Starting with fallback configuration...');
    requestAnimationFrame(loop);
  }
});
</script>

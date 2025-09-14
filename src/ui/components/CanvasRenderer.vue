<template>
  <canvas 
    ref="canvasRef" 
    :width="W" 
    :height="H"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits, defineExpose } from 'vue';

const props = defineProps<{
  config: any;
  nodePositions: Map<string, {x: number, y: number}>;
  edgeRoutes: Map<string, {startPoint: {x: number, y: number}, endPoint: {x: number, y: number}, bendPoints?: {x: number, y: number}[]}>;
  groupBounds: Map<string, {x: number, y: number, width: number, height: number}>;
  aggregatedMetrics: any;
}>();

const emit = defineEmits<{
  'viewport-updated': [viewport: {scale: number, x: number, y: number}];
}>();

const W = window.innerWidth;
const H = window.innerHeight;
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Viewport state
const viewport = ref({ scale: 1, x: 0, y: 0 });
let panDrag = { active: false, lastX: 0, lastY: 0 };

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
  
  emit('viewport-updated', viewport.value);
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0 && e.button !== 1) return;
  panDrag.active = true;
  panDrag.lastX = e.clientX;
  panDrag.lastY = e.clientY;
}

function onMouseMove(e: MouseEvent) {
  if (!panDrag.active) return;
  const dx = e.clientX - panDrag.lastX;
  const dy = e.clientY - panDrag.lastY;
  viewport.value.x += dx;
  viewport.value.y += dy;
  panDrag.lastX = e.clientX;
  panDrag.lastY = e.clientY;
  
  emit('viewport-updated', viewport.value);
}

function onMouseUp() { 
  panDrag.active = false; 
}

function draw() {
  if (!canvasRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  try {
    ctx.clearRect(0, 0, W, H);
    
    ctx.save();
    ctx.setTransform(
      viewport.value.scale, 0, 0, viewport.value.scale, 
      viewport.value.x, viewport.value.y
    );
    
    // Draw grid
    drawGrid(ctx);
    
    // Draw groups
    drawGroups(ctx);
    
    // Draw links
    drawLinks(ctx);
    
    // Draw nodes
    drawNodes(ctx);
    
    // Draw link labels
    drawLinkLabels(ctx);
    
    ctx.restore();
    
  } catch (error) {
    console.error('Canvas draw error:', error);
    drawErrorState(ctx);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#1e2630';
  ctx.lineWidth = 1;
  
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
}

function drawGroups(ctx: CanvasRenderingContext2D) {
  const groups = props.config.groups || [];
  
  if (props.groupBounds && props.groupBounds.size > 0) {
    groups.forEach((group: any) => {
      const bounds = props.groupBounds.get(group.id);
      if (bounds) {
        ctx.strokeStyle = group.color || '#475569';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]);
        
        ctx.fillStyle = group.color || '#64748b';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(group.name || group.id, bounds.x + 12, bounds.y + 20);
      }
    });
  }
}

function drawLinks(ctx: CanvasRenderingContext2D) {
  const links = props.config.links || [];
  
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  
  links.forEach((link: any) => {
    const edgeId = `${link.from}-${link.to}`;
    const route = props.edgeRoutes.get(edgeId);
    
    if (route) {
      drawRouteWithBends(ctx, route);
    } else {
      drawDirectLink(ctx, link);
    }
  });
}

function drawRouteWithBends(ctx: CanvasRenderingContext2D, route: any) {
  const points = [route.startPoint, ...(route.bendPoints || []), route.endPoint];
  
  if (points.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.stroke();
}

function drawDirectLink(ctx: CanvasRenderingContext2D, link: any) {
  const fromPos = props.nodePositions.get(link.from);
  const toPos = props.nodePositions.get(link.to);
  
  if (fromPos && toPos) {
    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.lineTo(toPos.x, toPos.y);
    ctx.stroke();
  }
}

function drawNodes(ctx: CanvasRenderingContext2D) {
  const nodes = props.config.nodes || [];
  const NODE_W = 90, NODE_H = 56, NODE_R = 10;
  
  nodes.forEach((node: any) => {
    const pos = props.nodePositions.get(node.id);
    if (!pos) return;
    
    // Node background
    const color = getNodeColor(node.kind);
    ctx.fillStyle = color;
    fillRoundRect(ctx, pos.x - NODE_W/2, pos.y - NODE_H/2, NODE_W, NODE_H, NODE_R);
    
    // Get metrics for this node
    let inEv = 0, outEv = 0, outEr = 0, lat: number | null = null;
    
    if (props.aggregatedMetrics && props.aggregatedMetrics.nodeMetrics) {
      const nodeMetric = props.aggregatedMetrics.nodeMetrics.get(node.id);
      if (nodeMetric) {
        inEv = Math.round(nodeMetric.incomingRate || 0);
        outEv = Math.round(nodeMetric.outgoingRate || 0);
        outEr = Math.round(nodeMetric.errorRate || 0);
        lat = nodeMetric.averageServiceTime ? Math.round(nodeMetric.averageServiceTime) : null;
      }
    }
    
    // Draw capacity bars
    drawCapacityBars(ctx, pos, node, inEv, outEv, NODE_W, NODE_H);
    
    // Draw text
    drawNodeText(ctx, pos, node, inEv, outEv, outEr, lat, NODE_H);
  });
}

function drawCapacityBars(ctx: CanvasRenderingContext2D, pos: any, node: any, inEv: number, outEv: number, NODE_W: number, NODE_H: number) {
  const capacity = typeof node.capacity === 'number' ? node.capacity : 100;
  const inRatio = Math.max(0, Math.min(1, capacity > 0 ? inEv / capacity : 0));
  const outRatio = Math.max(0, Math.min(1, capacity > 0 ? outEv / capacity : 0));
  
  const barPad = 8, barW = 6, barH = NODE_H - barPad * 2 + 2;
  
  // Background bars
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(pos.x - NODE_W/2 + 2, pos.y - NODE_H/2 + barPad - 1, barW, barH);
  ctx.fillRect(pos.x + NODE_W/2 - 2 - barW, pos.y - NODE_H/2 + barPad - 1, barW, barH);
  
  // Fill bars
  const inFillH = Math.round(barH * inRatio);
  const outFillH = Math.round(barH * outRatio);
  const inColor = inRatio < 0.5 ? '#22c55e' : (inRatio < 0.8 ? '#f59e0b' : '#ef4444');
  const outColor = outRatio < 0.5 ? '#22c55e' : (outRatio < 0.8 ? '#f59e0b' : '#ef4444');
  
  ctx.fillStyle = inColor;
  ctx.fillRect(pos.x - NODE_W/2 + 2, pos.y + NODE_H/2 - barPad - inFillH + 1, barW, inFillH);
  ctx.fillStyle = outColor;
  ctx.fillRect(pos.x + NODE_W/2 - 2 - barW, pos.y + NODE_H/2 - barPad - outFillH + 1, barW, outFillH);
}

function drawNodeText(ctx: CanvasRenderingContext2D, pos: any, node: any, inEv: number, outEv: number, outEr: number, lat: number | null, NODE_H: number) {
  ctx.fillStyle = '#fff';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  
  const textX = pos.x;
  let ty = pos.y - NODE_H/2 + 14;
  
  ctx.fillText(node.id, textX, ty);
  ty += 14;
  ctx.fillText(`in:${inEv}/s  out:${outEv}/s`, textX, ty);
  ty += 14;
  const latTxt = lat != null ? `${lat}ms` : '- ms';
  ctx.fillText(`err:${outEr}/s  lat:${latTxt}`, textX, ty);
}

function drawLinkLabels(ctx: CanvasRenderingContext2D) {
  const links = props.config.links || [];
  
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  
  links.forEach((link: any) => {
    const edgeId = `${link.from}-${link.to}`;
    const route = props.edgeRoutes.get(edgeId);
    let mid = { x: 0, y: 0 };
    
    if (route) {
      const points = [route.startPoint, ...(route.bendPoints || []), route.endPoint];
      mid = calculateMidPoint(points);
    } else {
      const fromPos = props.nodePositions.get(link.from);
      const toPos = props.nodePositions.get(link.to);
      if (fromPos && toPos) {
        mid = { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 };
      }
    }
    
    // Get link metrics
    let ev = 0, er = 0, lat: number | null = null;
    if (props.aggregatedMetrics && props.aggregatedMetrics.edgeFlows) {
      const flows = props.aggregatedMetrics.edgeFlows.get(`${link.from}->${link.to}`) || [];
      const totalRate = flows.reduce((s: number, f: any) => s + f.rate, 0);
      const totalErrors = flows.reduce((s: number, f: any) => s + f.errorRate, 0);
      const latencyWeighted = flows.reduce((s: number, f: any) => s + f.latency * f.rate, 0);
      ev = Math.round(totalRate);
      er = Math.round(totalErrors);
      lat = totalRate > 0 ? Math.round(latencyWeighted / totalRate) : null;
    }
    
    const label = `${ev}/s, ${er}/s, ${lat != null ? lat + 'ms' : '- ms'}`;
    
    // Draw with outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(label, mid.x, mid.y - 6);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, mid.x, mid.y - 6);
  });
}

function calculateMidPoint(points: {x: number, y: number}[]) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  
  let totalLength = 0;
  const segments: number[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy);
    segments.push(length);
    totalLength += length;
  }
  
  const midLength = totalLength / 2;
  let accLength = 0;
  
  for (let i = 0; i < segments.length; i++) {
    if (accLength + segments[i] >= midLength) {
      const t = (midLength - accLength) / segments[i];
      return {
        x: lerp(points[i].x, points[i + 1].x, t),
        y: lerp(points[i].y, points[i + 1].y, t)
      };
    }
    accLength += segments[i];
  }
  
  return points[Math.floor(points.length / 2)];
}

function drawErrorState(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#1e2630';
  
  // Draw grid
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

function getNodeColor(kind: string): string {
  const colors: Record<string, string> = {
    'Source': '#22c55e',
    'Ingress': '#22c55e',
    'Service': '#3b82f6',
    'LoadBalancer': '#06b6d4',
    'Cache': '#8b5cf6',
    'DB': '#f59e0b',
    'ExternalAPI': '#ef4444',
    'Queue': '#78716c',
    'Sink': '#6b7280'
  };
  return colors[kind] || '#6b7280';
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// Watch for prop changes to trigger redraw
watch(() => [props.config, props.nodePositions, props.edgeRoutes, props.aggregatedMetrics], () => {
  draw();
}, { deep: true });

// Initial draw on mount
onMounted(() => {
  draw();
});

// Expose methods and refs for parent
defineExpose({
  canvas: canvasRef,
  viewport,
  screenToWorld,
  draw
});
</script>

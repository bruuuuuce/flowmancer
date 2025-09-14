<template>
  <div 
    class="overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">Draw.io Import</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>

    <!-- File upload area -->
    <div 
      class="upload-zone"
      :class="{ 'dragging': isDragging }"
      data-test="drawio-upload-zone"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <input 
        ref="fileInput" 
        type="file" 
        accept=".drawio,.xml" 
        data-test="drawio-file-input"
        @change="handleFileSelect"
        style="display: none;"
      >
      
      <div v-if="!hasFile" class="upload-placeholder">
        <div class="upload-icon">📁</div>
        <p>Drop a draw.io file here or click to browse</p>
        <small>Supports .drawio and .xml files</small>
      </div>
      
      <div v-else class="file-info" data-test="drawio-file-info">
        <div class="file-name" data-test="drawio-file-name">{{ fileName }}</div>
        <div class="file-stats" data-test="drawio-file-stats">{{ nodeCount }} nodes, {{ connectionCount }} connections</div>
        <button class="btn" @click="clearFile" data-test="drawio-clear-btn" style="margin-top: 8px;">Clear</button>
      </div>
    </div>

    <!-- Preview and validation -->
    <div v-if="graph" class="graph-preview" data-test="drawio-preview">
      <h4>Preview</h4>
      
      <!-- Validation errors -->
      <div v-if="validationErrors.length > 0" class="validation-errors" data-test="drawio-validation-errors">
        <h5>⚠️ Validation Issues:</h5>
        <ul>
          <li v-for="error in validationErrors" :key="error" class="error-item">{{ error }}</li>
        </ul>
      </div>
      
      <!-- Node mapping preview -->
      <div class="node-mapping" data-test="drawio-node-mapping">
        <h5>Node Type Mapping:</h5>
        <div class="mapping-grid">
          <div v-for="node in graph.nodes" :key="node.id" class="node-mapping-item">
            <span class="node-label">{{ node.label || node.id }}</span>
            <span class="node-type" :class="getNodeTypeClass(getInferredNodeType(node))">
              {{ getInferredNodeType(node) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Connection preview -->
      <div class="connections-preview" data-test="drawio-connections">
        <h5>Connections:</h5>
        <div class="connections-list">
          <div v-for="conn in graph.connections" :key="conn.id" class="connection-item">
            {{ getNodeLabel(conn.source) }} → {{ getNodeLabel(conn.target) }}
            <span v-if="conn.label" class="connection-label">({{ conn.label }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="graph" class="actions" data-test="drawio-actions">
      <button class="btn" @click="applyToSimulation" data-test="drawio-apply-btn" :disabled="validationErrors.length > 0">
        Apply to Simulation
      </button>
      <button class="btn" @click="exportAsJSON" data-test="drawio-export-btn">Export as JSON</button>
    </div>

    <!-- Error display -->
    <div v-if="parseError" class="error-display" data-test="drawio-parse-error">
      <h5>❌ Parse Error:</h5>
      <pre>{{ parseError }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CSSProperties } from 'vue';
import { DrawioParser, type DrawioGraph } from '../../../parsers/DrawioParser';

type OverlayMode = 'normal' | 'floating' | 'fullscreen';

const props = defineProps<{
  overlayKey: string;
  overlayMode: OverlayMode;
  getOverlayStyle: (key: string) => Partial<CSSProperties>;
  setOverlayMode: (key: string, mode: OverlayMode) => void;
  startDrag: (key: string, e: MouseEvent) => void;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', config: any): void;
}>();

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const fileName = ref('');
const graph = ref<DrawioGraph | null>(null);
const parseError = ref('');
const validationErrors = ref<string[]>([]);

const hasFile = computed(() => !!graph.value);
const nodeCount = computed(() => graph.value?.nodes.length || 0);
const connectionCount = computed(() => graph.value?.connections.length || 0);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  
  if (!event.currentTarget?.contains(event.relatedTarget as Node)) {
    isDragging.value = false;
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
}

async function processFile(file: File) {
  try {
    parseError.value = '';
    fileName.value = file.name;
    
    const content = await file.text();
    const parsedGraph = DrawioParser.parseXML(content);
    
    const errors = DrawioParser.validateGraph(parsedGraph);
    validationErrors.value = errors;
    
    graph.value = parsedGraph;
    
    console.log('✓ Draw.io file parsed successfully:', {
      nodes: parsedGraph.nodes.length,
      connections: parsedGraph.connections.length,
      validationErrors: errors.length
    });
    
  } catch (error: any) {
    parseError.value = error.message;
    graph.value = null;
    console.error('Failed to parse draw.io file:', error);
  }
}

function clearFile() {
  graph.value = null;
  fileName.value = '';
  parseError.value = '';
  validationErrors.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function getInferredNodeType(node: any): string {
  return DrawioParser['inferNodeType'](node.label, node.shape);
}

function getNodeTypeClass(nodeType: string): string {
  const typeClasses: Record<string, string> = {
    'Ingress': 'node-type-ingress',
    'Service': 'node-type-service',
    'LoadBalancer': 'node-type-lb',
    'Cache': 'node-type-cache',
    'DB': 'node-type-db',
    'ExternalAPI': 'node-type-external',
    'Queue': 'node-type-queue',
    'Sink': 'node-type-sink'
  };
  return typeClasses[nodeType] || 'node-type-default';
}

function getNodeLabel(nodeId: string): string {
  const node = graph.value?.nodes.find(n => n.id === nodeId);
  return node?.label || nodeId;
}

function applyToSimulation() {
  if (!graph.value) return;
  
  try {
    const config = DrawioParser.convertToSimulationConfig(graph.value);
    emit('apply', config);
    console.log('✓ Applied draw.io graph to simulation:', config);
  } catch (error: any) {
    parseError.value = `Failed to convert graph: ${error.message}`;
  }
}

function exportAsJSON() {
  if (!graph.value) return;
  
  try {
    const config = DrawioParser.convertToSimulationConfig(graph.value);
    const jsonStr = JSON.stringify(config, null, 2);
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.value.replace(/\.[^/.]+$/, '')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error: any) {
    parseError.value = `Failed to export: ${error.message}`;
  }
}
</script>

<style scoped>
.upload-zone {
  border: 2px dashed #374151;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.upload-zone:hover, .upload-zone.dragging {
  border-color: #60a5fa;
  background-color: rgba(96, 165, 250, 0.1);
}

.upload-placeholder {
  color: #9ca3af;
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.file-info {
  color: #e5e7eb;
}

.file-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.file-stats {
  color: #9ca3af;
  font-size: 0.875rem;
}

.graph-preview {
  margin-top: 16px;
  border-top: 1px solid #374151;
  padding-top: 16px;
}

.validation-errors {
  background-color: rgba(248, 113, 113, 0.1);
  border: 1px solid #f87171;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.error-item {
  color: #fca5a5;
  margin-bottom: 4px;
}

.node-mapping {
  margin-bottom: 16px;
}

.mapping-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.node-mapping-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background-color: rgba(55, 65, 81, 0.5);
  border-radius: 4px;
}

.node-label {
  font-weight: 500;
}

.node-type {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 600;
}

.node-type-ingress { background-color: #10b981; color: white; }
.node-type-service { background-color: #3b82f6; color: white; }
.node-type-lb { background-color: #f59e0b; color: white; }
.node-type-cache { background-color: #8b5cf6; color: white; }
.node-type-db { background-color: #ef4444; color: white; }
.node-type-external { background-color: #6b7280; color: white; }
.node-type-queue { background-color: #ec4899; color: white; }
.node-type-sink { background-color: #374151; color: white; }
.node-type-default { background-color: #6b7280; color: white; }

.connections-preview {
  margin-bottom: 16px;
}

.connections-list {
  max-height: 150px;
  overflow-y: auto;
}

.connection-item {
  padding: 2px 0;
  font-size: 0.875rem;
  font-family: monospace;
}

.connection-label {
  color: #9ca3af;
  font-style: italic;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.error-display {
  background-color: rgba(248, 113, 113, 0.1);
  border: 1px solid #f87171;
  border-radius: 4px;
  padding: 12px;
  margin-top: 16px;
}

.error-display pre {
  color: #fca5a5;
  font-size: 0.875rem;
  white-space: pre-wrap;
  margin: 0;
}

h4, h5 {
  margin: 0 0 8px 0;
  color: #e5e7eb;
}
</style>

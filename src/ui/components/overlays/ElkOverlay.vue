<template>
  <div 
    class="overlay elk-overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">ELK Layout Settings</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>

    <div class="elk-content">
      <!-- Basic Layout -->
      <div class="elk-section">
        <h4>Basic Layout</h4>
        <div class="elk-grid">
          <div class="elk-field">
            <label>Algorithm</label>
            <select :value="modelValue.algorithm" @change="onSelect('algorithm', $event)">
              <option value="layered">Layered (Best for hierarchies)</option>
              <option value="force">Force Directed (Organic)</option>
              <option value="stress">Stress (Balanced)</option>
            </select>
          </div>
          <div class="elk-field">
            <label>Direction</label>
            <select :value="modelValue.direction" @change="onSelect('direction', $event)">
              <option value="RIGHT">Left to Right →</option>
              <option value="LEFT">Right to Left ←</option>
              <option value="DOWN">Top to Bottom ↓</option>
              <option value="UP">Bottom to Top ↑</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Spacing -->
      <div class="elk-section">
        <h4>Spacing</h4>
        <div class="elk-grid">
          <div class="elk-field">
            <label>Node-Node <span class="hint">(same layer)</span></label>
            <input type="range" :value="modelValue.spacingNodeNode" min="10" max="200" @input="onNumber('spacingNodeNode', $event)"/>
            <span class="value">{{ modelValue.spacingNodeNode }}px</span>
          </div>
          <div class="elk-field">
            <label>Layer spacing</label>
            <input type="range" :value="modelValue.layerNodeNodeBetweenLayers" min="20" max="300" @input="onNumber('layerNodeNodeBetweenLayers', $event)"/>
            <span class="value">{{ modelValue.layerNodeNodeBetweenLayers }}px</span>
          </div>
          <div class="elk-field">
            <label>Edge-Edge</label>
            <input type="range" :value="modelValue.spacingEdgeEdge" min="5" max="100" @input="onNumber('spacingEdgeEdge', $event)"/>
            <span class="value">{{ modelValue.spacingEdgeEdge }}px</span>
          </div>
          <div class="elk-field">
            <label>Edge-Node</label>
            <input type="range" :value="modelValue.spacingEdgeNode" min="5" max="100" @input="onNumber('spacingEdgeNode', $event)"/>
            <span class="value">{{ modelValue.spacingEdgeNode }}px</span>
          </div>
        </div>
      </div>

      <!-- Edge Routing -->
      <div class="elk-section">
        <h4>Edge Routing</h4>
        <div class="elk-grid">
          <div class="elk-field">
            <label>Routing Style</label>
            <select :value="modelValue.edgeRouting" @change="onSelect('edgeRouting', $event)">
              <option value="ORTHOGONAL">Orthogonal (90° angles)</option>
              <option value="POLYLINE">Polyline (straight segments)</option>
              <option value="SPLINES">Splines (curved)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Layered Algorithm Options -->
      <div class="elk-section" v-if="modelValue.algorithm === 'layered'">
        <h4>Layered Algorithm Options</h4>
        <div class="elk-grid">
          <div class="elk-field">
            <label>Optimization Level <span class="hint">(quality vs speed)</span></label>
            <input type="range" :value="modelValue.thoroughness" min="1" max="10" @input="onNumber('thoroughness', $event)"/>
            <span class="value">{{ modelValue.thoroughness }}</span>
          </div>
          <div class="elk-field">
            <label>Node Placement</label>
            <select :value="modelValue.nodePlacement" @change="onSelect('nodePlacement', $event)">
              <option value="BRANDES_KOEPF">Brandes Köpf (Balanced)</option>
              <option value="LINEAR_SEGMENTS">Linear Segments</option>
              <option value="SIMPLE">Simple (Fast)</option>
            </select>
          </div>
          <div class="elk-field">
            <label>Layering Strategy</label>
            <select :value="modelValue.layeringStrategy" @change="onSelect('layeringStrategy', $event)">
              <option value="LONGEST_PATH">Longest Path (Default)</option>
              <option value="MIN_WIDTH">Minimum Width</option>
              <option value="COFFMAN_GRAHAM">Coffman-Graham</option>
            </select>
          </div>
          <div class="elk-field">
            <label>Merge Parallel Edges</label>
            <input type="checkbox" :checked="modelValue.mergeEdges" @change="onCheckbox('mergeEdges', $event)"/>
          </div>
        </div>
      </div>

      <!-- Groups/Boundaries -->
      <div class="elk-section">
        <h4>Groups & Boundaries</h4>
        <div class="elk-grid">
          <div class="elk-field">
            <label>Group Padding</label>
            <input type="range" :value="modelValue.groupPadding" min="10" max="100" @input="onNumber('groupPadding', $event)"/>
            <span class="value">{{ modelValue.groupPadding }}px</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="elk-actions">
        <button class="btn" @click="resetDefaults">Reset to Defaults</button>
        <button class="btn" @click="applyPreset('compact')">Compact Layout</button>
        <button class="btn" @click="applyPreset('spacious')">Spacious Layout</button>
        <button class="btn" @click="applyPreset('hierarchical')">Hierarchical</button>
      </div>
    </div>

    <div style="margin-top:8px; font-size:12px; opacity:0.8;">
      Changes are applied in real-time and will regenerate the diagram.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

type OverlayMode = 'normal' | 'floating' | 'fullscreen';

type ElkOptions = {
  
  algorithm: string;
  direction: string;
  edgeRouting: string;
  
  spacingNodeNode: number;
  spacingEdgeEdge: number;
  spacingEdgeNode: number;
  layerNodeNodeBetweenLayers: number;
  
  thoroughness: number;
  nodePlacement?: string;
  layeringStrategy?: string;
  mergeEdges?: boolean;
  
  groupPadding?: number;
};

const props = defineProps<{
  overlayKey: string;
  overlayMode: OverlayMode;
  getOverlayStyle: (key: string) => Partial<CSSProperties>;
  setOverlayMode: (key: string, mode: OverlayMode) => void;
  startDrag: (key: string, e: MouseEvent) => void;
  modelValue: ElkOptions;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:modelValue', v: ElkOptions): void;
}>();

function onSelect(key: keyof ElkOptions, e: Event){
  const value = (e.target as HTMLSelectElement).value;
  emit('update:modelValue', { ...props.modelValue, [key]: value } as ElkOptions);
}

function onNumber(key: keyof ElkOptions, e: Event){
  const raw = (e.target as HTMLInputElement).value;
  const value = Number(raw);
  if (!Number.isNaN(value)) emit('update:modelValue', { ...props.modelValue, [key]: value } as ElkOptions);
}

function onCheckbox(key: keyof ElkOptions, e: Event){
  const value = (e.target as HTMLInputElement).checked;
  emit('update:modelValue', { ...props.modelValue, [key]: value } as ElkOptions);
}

function resetDefaults() {
  emit('update:modelValue', {
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
}

function applyPreset(preset: 'compact' | 'spacious' | 'hierarchical') {
  const presets = {
    compact: {
      ...props.modelValue,
      spacingNodeNode: 30,
      spacingEdgeEdge: 10,
      spacingEdgeNode: 20,
      layerNodeNodeBetweenLayers: 60,
      groupPadding: 10
    },
    spacious: {
      ...props.modelValue,
      spacingNodeNode: 100,
      spacingEdgeEdge: 40,
      spacingEdgeNode: 60,
      layerNodeNodeBetweenLayers: 200,
      groupPadding: 40
    },
    hierarchical: {
      ...props.modelValue,
      algorithm: 'layered',
      direction: 'DOWN',
      edgeRouting: 'ORTHOGONAL',
      nodePlacement: 'BRANDES_KOEPF',
      layeringStrategy: 'LONGEST_PATH',
      thoroughness: 10
    }
  };
  
  emit('update:modelValue', presets[preset]);
}
</script>

<style scoped>
.elk-overlay {
  max-width: 900px;
  max-height: 80vh;
  overflow-y: auto;
}

.elk-content {
  padding: 8px 0;
}

.elk-section {
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.elk-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.elk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.elk-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elk-field label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.elk-field .hint {
  font-size: 10px;
  color: #888;
  font-weight: normal;
}

.elk-field select,
.elk-field input[type="number"],
.elk-field input[type="range"] {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
}

.elk-field input[type="range"] {
  padding: 0;
}

.elk-field input[type="checkbox"] {
  width: auto;
  margin-top: 4px;
}

.elk-field .value {
  font-size: 11px;
  color: #666;
  text-align: right;
  margin-top: -4px;
}

.elk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.elk-actions .btn {
  flex: 1;
  min-width: 120px;
  padding: 6px 12px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.elk-actions .btn:hover {
  background: #357abd;
}

@media (prefers-color-scheme: dark) {
  .elk-section {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .elk-section h4 {
    color: #e0e0e0;
  }
  
  .elk-field label {
    color: #ccc;
  }
  
  .elk-field .hint {
    color: #888;
  }
  
  .elk-field select,
  .elk-field input[type="number"],
  .elk-field input[type="range"] {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }
  
  .elk-field .value {
    color: #999;
  }
}
</style>

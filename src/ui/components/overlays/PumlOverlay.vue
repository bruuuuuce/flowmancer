<template>
  <div 
    class="overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">PUML Graph</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>
    <textarea :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" rows="15" placeholder="@startuml&#10;node1 --> node2&#10;@enduml"></textarea>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <button class="btn" @click="$emit('apply')">Apply</button>
      <button class="btn" @click="$emit('generate')">Generate from current</button>
    </div>
    <div style="color:#f88" v-if="pumlErr">{{ pumlErr }}</div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

type OverlayMode = 'normal' | 'floating' | 'fullscreen';

const props = defineProps<{
  overlayKey: string;
  overlayMode: OverlayMode;
  getOverlayStyle: (key: string) => Partial<CSSProperties>;
  setOverlayMode: (key: string, mode: OverlayMode) => void;
  startDrag: (key: string, e: MouseEvent) => void;
  modelValue: string;
  pumlErr?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:modelValue', v: string): void;
  (e: 'apply'): void;
  (e: 'generate'): void;
}>();
</script>

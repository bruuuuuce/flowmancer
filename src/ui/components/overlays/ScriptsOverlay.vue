<template>
  <div 
    class="overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">Scripts</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>
    <textarea 
      :value="modelValue" 
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" 
      rows="10" 
      :disabled="isRunning"
      placeholder="# Simple script example&#10;log &quot;Starting test...&quot;&#10;wait 1000&#10;node set api1 capacity_in=100&#10;&#10;# See docs/SCRIPT_LANGUAGE.md for reference"
    ></textarea>
    <div style="margin-top:8px; display: flex; gap: 8px; align-items: center;">
      <button class="btn" @click="runScript" :disabled="isRunning">Run</button>
      <button class="btn" @click="stopScript" :disabled="!isRunning" style="background: #f87171;">Stop</button>
      <span v-if="isRunning" style="color: #4ade80; font-size: 12px;">▶ Running...</span>
      <span v-if="error" style="color: #f87171; font-size: 12px;">{{ error }}</span>
    </div>
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
  runScript: () => void;
  stopScript: () => void;
  isRunning: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:modelValue', v: string): void;
}>();
</script>

<template>
  <div
    v-if="suggestions.length > 0 && isVisible"
    class="autocomplete-suggestions"
    :style="position"
    data-test="autocomplete-suggestions"
  >
    <div
      v-for="(suggestion, index) in suggestions"
      :key="`${suggestion.text}-${index}`"
      :class="['suggestion-item', { selected: index === selectedIndex }]"
      :data-test="`suggestion-${index}`"
      @click="$emit('select', suggestion)"
    >
      <span class="suggestion-text">{{ suggestion.text }}</span>
      <span v-if="suggestion.description" class="suggestion-description">
        {{ suggestion.description }}
      </span>
      <span :class="['suggestion-type', `type-${suggestion.type}`]">
        {{ suggestion.type }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Suggestion } from '../../composables/useAutoComplete';

interface Position {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

const props = defineProps<{
  suggestions: Suggestion[];
  selectedIndex: number;
  isVisible: boolean;
  position: Position;
}>();

const emit = defineEmits<{
  (e: 'select', suggestion: Suggestion): void;
}>();
</script>

<style scoped>
.autocomplete-suggestions {
  position: absolute;
  background: var(--bg-overlay);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  box-shadow: var(--overlay-shadow);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10000;
  min-width: 250px;
  backdrop-filter: blur(10px);
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-light);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--bg-hover);
}

.suggestion-item.selected {
  background: var(--primary-light);
}

.suggestion-text {
  flex: 1;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 13px;
  font-weight: 500;
}

.suggestion-description {
  color: var(--text-tertiary);
  font-size: 11px;
  margin: 0 8px;
  font-style: italic;
}

.suggestion-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.type-command {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.type-node {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.type-property {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.type-value {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.type-keyword {
  background: rgba(236, 72, 153, 0.2);
  color: #ec4899;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.autocomplete-suggestions::-webkit-scrollbar {
  width: 6px;
}

.autocomplete-suggestions::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.autocomplete-suggestions::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.autocomplete-suggestions::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>

<template>
  <div 
    class="overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">Console</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>
    <div class="console-help">
      Commands: node/group/link | ↑↓ for history | Tab to accept suggestion | Enter to execute | Type "help" for full list
    </div>
    <div class="console-input-wrapper">
      <span class="console-prompt">&gt;</span>
      <input 
        class="console-input"
        :value="modelValue" 
        @input="handleInput" 
        @keyup.enter="handleEnter"
        @keydown.up.prevent="handleUpKey"
        @keydown.down.prevent="handleDownKey"
        @keydown.tab.prevent="handleTab"
        @keydown.escape="handleEscape"
        @keydown.o.prevent.stop="$emit('close')"
        placeholder="Try: node add API Service capacity=100"
        ref="inputRef"
      >
      <AutoCompleteSuggestions
        :suggestions="suggestions"
        :selectedIndex="selectedIndex"
        :isVisible="showSuggestions"
        :position="suggestionsPosition"
        @select="applySuggestion"
      />
    </div>
    <div class="console-log">
      <div 
        v-for="(l,i) in log" 
        :key="i" 
        class="console-line" 
        :class="{ 
          'console-error': l.startsWith('Error:'),
          'console-command': l.startsWith('>'),
          'console-success': l.includes('Added') || l.includes('Created') || l.includes('Success'),
          'console-info': l.startsWith('[script]') || l.includes('Info')
        }"
      >
        {{ l }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { CSSProperties } from 'vue';
import { useAutoComplete } from '../../../composables/useAutoComplete';
import AutoCompleteSuggestions from '../AutoCompleteSuggestions.vue';

type OverlayMode = 'normal' | 'floating' | 'fullscreen';

const props = defineProps<{
  overlayKey: string;
  overlayMode: OverlayMode;
  getOverlayStyle: (key: string) => Partial<CSSProperties>;
  setOverlayMode: (key: string, mode: OverlayMode) => void;
  startDrag: (key: string, e: MouseEvent) => void;
  modelValue: string;
  log: string[];
  execCmd: () => void;
  config?: any; 
  groups?: any[]; 
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:modelValue', v: string): void;
  (e: 'navigate-history', direction: 'up' | 'down'): void;
}>();

const inputRef = ref<HTMLInputElement>();
const showSuggestions = ref(false);
const isNavigatingHistory = ref(false);

const availableNodes = computed(() => {
  if (!props.config?.nodes) return [];
  return props.config.nodes.map((n: any) => n.id);
});

const availableGroups = computed(() => {
  if (!props.groups) return [];
  return props.groups.map((g: any) => g.id);
});

const {
  suggestions,
  selectedIndex,
  selectNext,
  selectPrevious,
  applySuggestion: applyAutocompleteSuggestion,
  updateSuggestions,
  reset
} = useAutoComplete(availableNodes, availableGroups);

const suggestionsPosition = computed(() => ({
  top: '100%',
  left: '0',
  marginTop: '4px'
}));

watch(() => props.modelValue, (newValue) => {
  if (!isNavigatingHistory.value && newValue) {
    const cursorPos = inputRef.value?.selectionStart || newValue.length;
    updateSuggestions(newValue, cursorPos);
    showSuggestions.value = suggestions.value.length > 0;
  } else if (!newValue) {
    showSuggestions.value = false;
  }
});

const handleInput = (e: Event) => {
  isNavigatingHistory.value = false;
  emit('update:modelValue', (e.target as HTMLInputElement).value);
};

const handleEnter = () => {
  
  showSuggestions.value = false;
  reset();
  props.execCmd();
};

const handleUpKey = () => {
  if (showSuggestions.value) {
    selectPrevious();
  } else {
    isNavigatingHistory.value = true;
    emit('navigate-history', 'up');
  }
};

const handleDownKey = () => {
  if (showSuggestions.value) {
    selectNext();
  } else {
    isNavigatingHistory.value = true;
    emit('navigate-history', 'down');
  }
};

const handleTab = () => {
  if (showSuggestions.value && suggestions.value.length > 0) {
    
    const suggestionToApply = selectedIndex.value >= 0 
      ? suggestions.value[selectedIndex.value] 
      : suggestions.value[0];
    applySuggestion(suggestionToApply);
  }
};

const handleEscape = () => {
  if (showSuggestions.value) {
    showSuggestions.value = false;
    reset();
  }
};

const applySuggestion = (suggestion: any) => {
  const cursorPos = inputRef.value?.selectionStart || props.modelValue.length;
  const newValue = applyAutocompleteSuggestion(props.modelValue, cursorPos, suggestion);
  emit('update:modelValue', newValue);
  showSuggestions.value = false;
  reset();
  
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus();
      inputRef.value.setSelectionRange(newValue.length, newValue.length);
    }
  }, 0);
};

onMounted(() => {
  
  inputRef.value?.focus();
});
</script>

<style scoped>
.console-help {
  font-size: 11px;
  color: #666;
  margin-bottom: 8px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.console-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.console-prompt {
  font-family: monospace;
  font-weight: bold;
  margin-right: 8px;
  color: #4CAF50;
}

.console-input {
  flex: 1;
  font-family: monospace;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
}

.console-log {
  max-height: 200px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 8px;
}

.console-line {
  padding: 2px 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.console-line:hover {
  background: rgba(0, 0, 0, 0.05);
}

.console-error {
  color: #d32f2f;
  font-weight: bold;
}
</style>

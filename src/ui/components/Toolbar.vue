<template>
  <div class="toolbar">
    <button class="btn" @click="$emit('toggle-running')">{{ running ? 'Pause' : 'Play' }}</button>
    <button class="btn" @click="$emit('toggle-stats')">Stats</button>
    <button class="btn" @click="$emit('toggle-config')">Config</button>
    <button class="btn" @click="$emit('toggle-console')">Console</button>
    <button class="btn" @click="$emit('toggle-scripts')">Scripts</button>
    <button class="btn" @click="$emit('toggle-puml')">PUML</button>
    <button class="btn" @click="$emit('toggle-elk')">ELK</button>
    <button class="btn" @click="$emit('toggle-drawio')">Drawio</button>
    <div class="toolbar-spacer"></div>
    <button class="btn" @click="$emit('toggle-about')" title="About Flowmancer">About</button>
    <button 
      class="btn theme-toggle" 
      @click="toggleTheme"
      :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    >
      <span v-if="isDark" class="theme-icon">☀️</span>
      <span v-else class="theme-icon">🌙</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../../composables/useTheme';

const props = defineProps<{ running: boolean }>();

const { isDark, toggleTheme } = useTheme();
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
}

.toolbar-spacer {
  flex: 1;
}

.btn {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--primary);
  color: var(--text-inverse);
  border-color: var(--primary);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  min-width: 40px;
}

.theme-icon {
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
}
</style>

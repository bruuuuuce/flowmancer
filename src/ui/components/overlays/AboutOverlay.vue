<template>
  <div 
    :class="[
      'overlay',
      'about-overlay',
      `overlay-${overlayMode}`,
      { dragging: isDragging }
    ]"
    :style="getOverlayStyle"
    @mousedown="startDrag"
  >
    <div class="overlay-header">
      <div class="overlay-title">
        <span class="overlay-icon">ℹ️</span>
        About Flowmancer
      </div>
      <div class="overlay-controls">
        <button 
          class="overlay-control-btn" 
          @click="setOverlayMode('normal')"
          :class="{ active: overlayMode === 'normal' }"
          title="Normal mode"
        >
          📱
        </button>
        <button 
          class="overlay-control-btn" 
          @click="setOverlayMode('floating')"
          :class="{ active: overlayMode === 'floating' }"
          title="Floating mode"
        >
          🪟
        </button>
        <button 
          class="overlay-control-btn" 
          @click="setOverlayMode('fullscreen')"
          :class="{ active: overlayMode === 'fullscreen' }"
          title="Fullscreen mode"
        >
          🔳
        </button>
        <button 
          class="overlay-control-btn close-btn" 
          @click="$emit('close')"
          title="Close overlay"
        >
          ❌
        </button>
      </div>
    </div>

    <div class="overlay-content">
      <!-- Header Section -->
      <div class="about-header">
        <div class="project-title">
          <h1>🧙‍♂️ Flowmancer</h1>
          <div class="project-badges">
            <span class="badge version">v0.2.0</span>
            <span class="badge tech">Vue 3</span>
            <span class="badge tech">TypeScript</span>
            <span class="badge license">MIT</span>
          </div>
        </div>
        <p class="project-description">
          Interactive traffic flow simulator and analyzer for distributed systems and microservices architectures.
        </p>
      </div>

      <!-- Tech Stack Section -->
      <div class="about-section">
        <h3>🛠️ Technology Stack</h3>
        <div class="tech-grid">
          <div class="tech-item">
            <span class="tech-name">Vue.js 3</span>
            <span class="tech-desc">Progressive JavaScript Framework</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">TypeScript</span>
            <span class="tech-desc">Type-safe JavaScript</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">Vite</span>
            <span class="tech-desc">Next Generation Frontend Tooling</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">ELK.js</span>
            <span class="tech-desc">Automatic Graph Layout</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">Vitest</span>
            <span class="tech-desc">Blazing Fast Unit Testing</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">Playwright</span>
            <span class="tech-desc">End-to-End Testing</span>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="about-section">
        <h3>✨ Key Features</h3>
        <ul class="feature-list">
          <li>🎨 Visual graph editor with drag-and-drop interface</li>
          <li>📊 Real-time metrics and performance monitoring</li>
          <li>🔄 Realistic traffic simulation with load balancing</li>
          <li>📈 Advanced analytics and bottleneck detection</li>
          <li>💻 Interactive console with command-line interface</li>
          <li>📝 Multiple import formats (PlantUML, Draw.io, JSON)</li>
          <li>🎯 Deterministic simulation with reproducible results</li>
          <li>📦 Boundary groups for logical organization</li>
        </ul>
      </div>

      <!-- Keyboard Shortcuts Section -->
      <div class="about-section">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>Toggle Stats Overlay</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>C</kbd>
            <span>Toggle Config Overlay</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>K</kbd>
            <span>Toggle Console Overlay</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>R</kbd>
            <span>Toggle Scripts Overlay</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>P</kbd>
            <span>Toggle PlantUML Overlay</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>E</kbd>
            <span>Toggle ELK Settings</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>I</kbd>
            <span>Toggle About (this overlay)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Shift</kbd> + <kbd>?</kbd>
            <span>Show all shortcuts</span>
          </div>
        </div>
      </div>

      <!-- License & Author Section -->
      <div class="about-section">
        <h3>📄 License & Author</h3>
        <div class="license-info">
          <div class="license-item">
            <strong>Author:</strong> heybruce
          </div>
          <div class="license-item">
            <strong>License:</strong> MIT License
          </div>
          <div class="license-item">
            <strong>Copyright:</strong> © 2024 Flowmancer Contributors
          </div>
          <div class="license-text">
            This software is provided under the MIT License. See LICENSE file for details.
          </div>
        </div>
      </div>

      <!-- Links Section -->
      <div class="about-section">
        <h3>🔗 Links</h3>
        <div class="links-grid">
          <a href="https://github.com/heybruce/flowmancer" target="_blank" class="link-item">
            📦 GitHub Repository
          </a>
          <a href="https://github.com/heybruce/flowmancer/issues" target="_blank" class="link-item">
            🐛 Report Issues
          </a>
          <a href="https://github.com/heybruce/flowmancer#readme" target="_blank" class="link-item">
            📖 Documentation
          </a>
        </div>
      </div>

      <!-- Acknowledgments Section -->
      <div class="about-section">
        <h3>🙏 Acknowledgments</h3>
        <div class="acknowledgments">
          <p>Special thanks to the open source community and the maintainers of:</p>
          <div class="ack-links">
            <a href="https://vuejs.org/" target="_blank">Vue.js</a> •
            <a href="https://github.com/kieler/elkjs" target="_blank">ELK.js</a> •
            <a href="https://vitejs.dev/" target="_blank">Vite</a> •
            <a href="https://vitest.dev/" target="_blank">Vitest</a> •
            <a href="https://playwright.dev/" target="_blank">Playwright</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  overlayKey: string;
  overlayMode: 'normal' | 'floating' | 'fullscreen';
  getOverlayStyle: Record<string, any>;
  setOverlayMode: (mode: 'normal' | 'floating' | 'fullscreen') => void;
  startDrag: (event: MouseEvent) => void;
  isDragging: boolean;
}

defineProps<Props>();
defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.about-overlay {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 12px;
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.overlay-content {
  padding: 20px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

/* Header Styling */
.about-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
}

.project-title h1 {
  margin: 0;
  font-size: 2.5rem;
  background: linear-gradient(135deg, #4ade80, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.project-badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge.version {
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
}

.badge.tech {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
}

.badge.license {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.project-description {
  font-size: 1.1rem;
  color: #d1d5db;
  line-height: 1.6;
  margin: 20px 0 0 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* Section Styling */
.about-section {
  margin-bottom: 30px;
}

.about-section h3 {
  color: #4ade80;
  font-size: 1.3rem;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tech Grid */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
}

.tech-item {
  background: rgba(30, 30, 30, 0.5);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(100, 100, 100, 0.2);
}

.tech-name {
  display: block;
  color: #06b6d4;
  font-weight: 600;
  margin-bottom: 5px;
}

.tech-desc {
  color: #9ca3af;
  font-size: 0.9rem;
}

/* Features List */
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 10px;
}

.feature-list li {
  padding: 8px 0;
  color: #d1d5db;
  font-size: 0.95rem;
}

/* Shortcuts Grid */
.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(30, 30, 30, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(100, 100, 100, 0.2);
}

.shortcut-item kbd {
  background: rgba(100, 100, 100, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #06b6d4;
  border: 1px solid rgba(100, 100, 100, 0.3);
}

.shortcut-item span {
  color: #d1d5db;
  font-size: 0.9rem;
}

/* License Info */
.license-info {
  background: rgba(30, 30, 30, 0.5);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid rgba(100, 100, 100, 0.2);
}

.license-item {
  margin-bottom: 10px;
  color: #d1d5db;
}

.license-item strong {
  color: #4ade80;
  margin-right: 10px;
}

.license-text {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(100, 100, 100, 0.2);
  color: #9ca3af;
  font-size: 0.9rem;
  font-style: italic;
}

/* Links */
.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.link-item {
  display: block;
  padding: 12px 18px;
  background: rgba(30, 30, 30, 0.5);
  border: 1px solid rgba(100, 100, 100, 0.2);
  border-radius: 8px;
  color: #06b6d4;
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  text-align: center;
}

.link-item:hover {
  background: rgba(6, 182, 212, 0.1);
  border-color: #06b6d4;
  transform: translateY(-2px);
}

/* Acknowledgments */
.acknowledgments p {
  color: #d1d5db;
  margin-bottom: 15px;
  line-height: 1.6;
}

.ack-links {
  text-align: center;
}

.ack-links a {
  color: #06b6d4;
  text-decoration: none;
  margin: 0 8px;
  transition: color 0.2s ease;
}

.ack-links a:hover {
  color: #4ade80;
}

/* Responsive Design */
@media (max-width: 768px) {
  .overlay-content {
    padding: 15px;
  }
  
  .project-title h1 {
    font-size: 2rem;
  }
  
  .tech-grid,
  .shortcuts-grid,
  .links-grid {
    grid-template-columns: 1fr;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
  
  .shortcut-item {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

/* Scrollbar Styling */
.overlay-content::-webkit-scrollbar {
  width: 8px;
}

.overlay-content::-webkit-scrollbar-track {
  background: rgba(30, 30, 30, 0.5);
  border-radius: 4px;
}

.overlay-content::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 100, 0.4);
  border-radius: 4px;
}

.overlay-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 100, 100, 0.6);
}
</style>

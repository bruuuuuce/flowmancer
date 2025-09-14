<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          :data-test="'toast-' + toast.type"
        >
          <div class="toast-icon">
            <span v-if="toast.type === 'success'">✓</span>
            <span v-else-if="toast.type === 'error'">✕</span>
            <span v-else-if="toast.type === 'warning'">⚠</span>
            <span v-else>ℹ</span>
          </div>
          <div class="toast-content">
            <div class="toast-title" v-if="toast.title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button
            v-if="toast.dismissible"
            class="toast-close"
            @click="removeToast(toast.id)"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

const toasts = ref<Toast[]>([]);

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = Date.now().toString() + Math.random().toString(36);
  const newToast: Toast = {
    id,
    duration: 5000,
    dismissible: true,
    ...toast
  };
  
  toasts.value.push(newToast);
  
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }
  
  return id;
};

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

const clearAll = () => {
  toasts.value = [];
};

defineExpose({
  addToast,
  removeToast,
  clearAll
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--bg-overlay);
  border-radius: 8px;
  box-shadow: var(--overlay-shadow);
  backdrop-filter: blur(10px);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  border: 1px solid;
  transition: all 0.3s ease;
}

.toast-success {
  border-color: var(--success);
  background: linear-gradient(to right, var(--success-bg), var(--bg-overlay));
}

.toast-error {
  border-color: var(--error);
  background: linear-gradient(to right, var(--error-bg), var(--bg-overlay));
}

.toast-warning {
  border-color: var(--warning);
  background: linear-gradient(to right, var(--warning-bg), var(--bg-overlay));
}

.toast-info {
  border-color: var(--info);
  background: linear-gradient(to right, var(--info-bg), var(--bg-overlay));
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
}

.toast-success .toast-icon {
  background: var(--success);
  color: var(--text-inverse);
}

.toast-error .toast-icon {
  background: var(--error);
  color: var(--text-inverse);
}

.toast-warning .toast-icon {
  background: var(--warning);
  color: var(--text-inverse);
}

.toast-info .toast-icon {
  background: var(--info);
  color: var(--text-inverse);
}

.toast-content {
  flex: 1;
  color: var(--text-primary);
}

.toast-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.toast-message {
  font-size: 14px;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.toast-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

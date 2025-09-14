import { ref, Ref } from 'vue';
import type { Toast } from '../ui/components/ToastNotifications.vue';

let toastComponent: Ref<any> | null = null;

export function setToastComponent(component: Ref<any>) {
  toastComponent = component;
}

export function useToast() {
  const showSuccess = (message: string, title?: string, duration?: number) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    return toastComponent.value.addToast({
      type: 'success',
      message,
      title,
      duration: duration ?? 5000
    });
  };

  const showError = (message: string, title?: string, duration?: number) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    return toastComponent.value.addToast({
      type: 'error',
      message,
      title,
      duration: duration ?? 8000 
    });
  };

  const showWarning = (message: string, title?: string, duration?: number) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    return toastComponent.value.addToast({
      type: 'warning',
      message,
      title,
      duration: duration ?? 6000
    });
  };

  const showInfo = (message: string, title?: string, duration?: number) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    return toastComponent.value.addToast({
      type: 'info',
      message,
      title,
      duration: duration ?? 5000
    });
  };

  const show = (options: Omit<Toast, 'id'>) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    return toastComponent.value.addToast(options);
  };

  const remove = (id: string) => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    toastComponent.value.removeToast(id);
  };

  const clearAll = () => {
    if (!toastComponent?.value) {
      console.warn('Toast component not initialized');
      return;
    }
    toastComponent.value.clearAll();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    show,
    remove,
    clearAll
  };
}

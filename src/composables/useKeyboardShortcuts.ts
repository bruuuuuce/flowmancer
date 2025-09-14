import { onMounted, onUnmounted, Ref } from 'vue';

export interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  enabled: Ref<boolean> | boolean = true
) {
  const handleKeyDown = (event: KeyboardEvent) => {
    
    const isEnabled = typeof enabled === 'boolean' ? enabled : enabled.value;
    if (!isEnabled) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      
      if (event.key !== 'Escape') return;
    }

    for (const shortcut of shortcuts) {
      
      const ctrlMatch = (shortcut.ctrl || false) === (event.ctrlKey || event.metaKey);
      const shiftMatch = (shortcut.shift || false) === event.shiftKey;
      const altMatch = (shortcut.alt || false) === event.altKey;
      const metaMatch = (shortcut.meta || false) === event.metaKey;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return {
    shortcuts
  };
}

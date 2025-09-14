import { ref, Ref } from 'vue';

const STORAGE_KEY = 'traffic-sim-console-history';
const MAX_HISTORY = 100;

export function useCommandHistory() {
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const tempCommand = ref('');
  
  const loadHistory = () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          history.value = parsed.slice(-MAX_HISTORY);
        }
      }
    } catch (error) {
      console.warn('Failed to load command history:', error);
    }
  };

  const saveHistory = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
    } catch (error) {
      console.warn('Failed to save command history:', error);
    }
  };

  const addToHistory = (command: string) => {
    
    if (!command.trim() || command === history.value[history.value.length - 1]) {
      return;
    }
    
    history.value.push(command);
    
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(-MAX_HISTORY);
    }
    
    saveHistory();
    resetNavigation();
  };

  const navigatePrevious = (currentCommand: string): string | null => {
    
    if (historyIndex.value === -1) {
      tempCommand.value = currentCommand;
    }
    
    if (historyIndex.value >= history.value.length - 1) {
      return null;
    }
    
    historyIndex.value++;
    const index = history.value.length - 1 - historyIndex.value;
    return history.value[index];
  };

  const navigateNext = (): string | null => {
    
    if (historyIndex.value === -1) {
      return null;
    }
    
    historyIndex.value--;
    
    if (historyIndex.value === -1) {
      return tempCommand.value;
    }
    
    const index = history.value.length - 1 - historyIndex.value;
    return history.value[index];
  };

  const resetNavigation = () => {
    historyIndex.value = -1;
    tempCommand.value = '';
  };

  const clearHistory = () => {
    history.value = [];
    sessionStorage.removeItem(STORAGE_KEY);
    resetNavigation();
  };

  const getHistory = () => [...history.value];

  loadHistory();

  return {
    addToHistory,
    navigatePrevious,
    navigateNext,
    resetNavigation,
    clearHistory,
    getHistory,
    history: history as Readonly<Ref<string[]>>
  };
}

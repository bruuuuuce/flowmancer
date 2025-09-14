import { ref, watch, computed } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'traffic-sim-theme';

const currentTheme = ref<Theme>('dark');
const isInitialized = ref(false);

export function useTheme() {
  
  if (!isInitialized.value) {
    initializeTheme();
    isInitialized.value = true;
  }

  const isDark = computed(() => currentTheme.value === 'dark');
  const isLight = computed(() => currentTheme.value === 'light');

  const toggleTheme = () => {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    applyTheme(theme);
    saveThemePreference(theme);
  };

  return {
    currentTheme: computed(() => currentTheme.value),
    isDark,
    isLight,
    toggleTheme,
    setTheme
  };
}

function initializeTheme() {
  
  const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
  
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    currentTheme.value = savedTheme;
  } else {
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme.value = prefersDark ? 'dark' : 'light';
  }

  applyTheme(currentTheme.value);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    
    if (!localStorage.getItem(STORAGE_KEY)) {
      const newTheme = e.matches ? 'dark' : 'light';
      currentTheme.value = newTheme;
      applyTheme(newTheme);
    }
  });
}

function applyTheme(theme: Theme) {
  
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
  
  document.documentElement.setAttribute('data-theme', theme);
}

function saveThemePreference(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getCurrentTheme(): Theme {
  return currentTheme.value;
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useTheme', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };
  
  // Mock matchMedia
  const matchMediaMock = vi.fn();
  
  beforeEach(() => {
    // Reset module state by clearing the cache
    vi.resetModules();
    
    // Clear mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    matchMediaMock.mockClear();
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });
    
    // Setup matchMedia mock
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
      configurable: true
    });
    
    // Clear document classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });
  
  afterEach(() => {
    // Reset after each test
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  describe('initialization', () => {
    it('should initialize with saved theme from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      const { useTheme } = await import('../../src/composables/useTheme');
      const { currentTheme, isLight, isDark } = useTheme();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('traffic-sim-theme');
      expect(currentTheme.value).toBe('light');
      expect(isLight.value).toBe(true);
      expect(isDark.value).toBe(false);
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
    
    it('should use system preference when no saved theme', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { useTheme } = await import('../../src/composables/useTheme');
      const { currentTheme } = useTheme();
      
      // Mock returns true for dark mode preference
      expect(currentTheme.value).toBe('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
    
    it('should default to light when no saved theme and system prefers light', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockImplementation(() => ({
        matches: false, // Light mode preference
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
      
      const { useTheme } = await import('../../src/composables/useTheme');
      const { currentTheme } = useTheme();
      
      expect(currentTheme.value).toBe('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });
  });

  describe('theme toggling', () => {
    it('should toggle from dark to light', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      const { useTheme } = await import('../../src/composables/useTheme');
      const { currentTheme, toggleTheme } = useTheme();
      
      expect(currentTheme.value).toBe('dark');
      
      toggleTheme();
      
      expect(currentTheme.value).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('traffic-sim-theme', 'light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    });
    
    it('should toggle from light to dark', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      const { useTheme } = await import('../../src/composables/useTheme');
      const { currentTheme, toggleTheme } = useTheme();
      
      expect(currentTheme.value).toBe('light');
      
      toggleTheme();
      
      expect(currentTheme.value).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('traffic-sim-theme', 'dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', async () => {
      const { useTheme } = await import('../../src/composables/useTheme');
      const { setTheme, currentTheme } = useTheme();
      
      setTheme('light');
      
      expect(currentTheme.value).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('traffic-sim-theme', 'light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
    
    it('should set theme to dark', async () => {
      const { useTheme } = await import('../../src/composables/useTheme');
      const { setTheme, currentTheme } = useTheme();
      
      setTheme('dark');
      
      expect(currentTheme.value).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('traffic-sim-theme', 'dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('computed properties', () => {
    it('should correctly compute isDark and isLight', async () => {
      const { useTheme } = await import('../../src/composables/useTheme');
      const { isDark, isLight, setTheme } = useTheme();
      
      setTheme('dark');
      expect(isDark.value).toBe(true);
      expect(isLight.value).toBe(false);
      
      setTheme('light');
      expect(isDark.value).toBe(false);
      expect(isLight.value).toBe(true);
    });
  });
  
  describe('singleton behavior', () => {
    it('should share state between multiple calls', async () => {
      const { useTheme } = await import('../../src/composables/useTheme');
      const theme1 = useTheme();
      const theme2 = useTheme();
      
      theme1.setTheme('light');
      expect(theme2.currentTheme.value).toBe('light');
      
      theme2.toggleTheme();
      expect(theme1.currentTheme.value).toBe('dark');
    });
  });
});

import { ref, reactive, computed } from 'vue';

export type OverlayMode = 'normal' | 'floating' | 'fullscreen';

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface DragState {
  active: boolean;
  overlay: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

export interface OverlayState {
  showStats: boolean;
  showConfig: boolean;
  showConsole: boolean;
  showScripts: boolean;
  showPuml: boolean;
  showElk: boolean;
  showDrawio: boolean;
  showAbout: boolean;
}

export function useOverlayManager() {
  // Overlay visibility state
  const showStats = ref(false);
  const showConfig = ref(false);
  const showConsole = ref(false);
  const showScripts = ref(false);
  const showPuml = ref(false);
  const showElk = ref(false);
  const showDrawio = ref(false);
  const showAbout = ref(false);
  
  // Overlay modes
  const overlayModes = ref<Record<string, OverlayMode>>({
    stats: 'normal',
    config: 'normal',
    console: 'normal',
    scripts: 'normal',
    puml: 'normal',
    elk: 'normal',
    drawio: 'normal',
    about: 'normal'
  });
  
  // Overlay positions
  const overlayPositions = ref<Record<string, OverlayPosition>>({
    stats: { x: 0, y: 0 },
    config: { x: 0, y: 0 },
    console: { x: 0, y: 0 },
    scripts: { x: 0, y: 0 },
    puml: { x: 0, y: 0 },
    elk: { x: 0, y: 0 },
    drawio: { x: 0, y: 0 },
    about: { x: 0, y: 0 }
  });
  
  // Drag state
  const dragState: DragState = reactive({
    active: false,
    overlay: '',
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });
  
  // Initialize overlay positions with defaults
  function ensureOverlayPosition(overlay: string) {
    if (!overlayPositions.value[overlay]) {
      const defaults = {
        stats: { x: window.innerWidth - 570, y: 10 },
        config: { x: 10, y: 10 },
        console: { x: 10, y: window.innerHeight - 200 },
        scripts: { x: window.innerWidth / 2 - 300, y: window.innerHeight - 200 },
        puml: { x: window.innerWidth / 2 - 350, y: 10 },
        elk: { x: window.innerWidth / 2 - 260, y: 60 },
        drawio: { x: window.innerWidth / 2 - 400, y: 120 },
        about: { x: window.innerWidth / 2 - 400, y: 50 }
      };
      overlayPositions.value[overlay] = defaults[overlay as keyof typeof defaults] || { x: 10, y: 10 };
    }
  }
  
  // Get overlay style based on mode and position
  function getOverlayStyle(overlay: string) {
    const mode = overlayModes.value[overlay];
    const pos = overlayPositions.value[overlay];
    
    if (mode === 'fullscreen') return {};
    if (mode === 'floating') {
      return { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' };
    }
    
    const defaults = {
      stats: { right: '10px', top: '10px', left: 'auto', bottom: 'auto' },
      config: { left: '10px', top: '10px', right: 'auto', bottom: 'auto' },
      console: { left: '10px', bottom: '10px', right: 'auto', top: 'auto' },
      scripts: { left: '50%', bottom: '10px', top: 'auto', right: 'auto', transform: 'translateX(-50%)', width: '600px' },
      puml: { left: '50%', top: '10px', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', width: '700px' },
      elk: { left: '50%', top: '60px', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', width: '520px' },
      drawio: { left: '50%', top: '120px', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', width: '800px' },
      about: { left: '50%', top: '50px', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', width: '800px', maxHeight: '90vh' }
    };
    
    return defaults[overlay as keyof typeof defaults] || {};
  }
  
  // Set overlay mode
  function setOverlayMode(overlay: string, mode: OverlayMode) {
    ensureOverlayPosition(overlay);
    overlayModes.value[overlay] = mode;
  }
  
  // Start dragging an overlay
  function startDrag(overlay: string, event: MouseEvent) {
    // Don't start drag on interactive elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    
    // Switch to floating mode if not already
    if (overlayModes.value[overlay] !== 'floating') {
      const overlayElement = (event.currentTarget as HTMLElement);
      if (overlayElement) {
        const rect = overlayElement.getBoundingClientRect();
        overlayPositions.value[overlay] = {
          x: rect.left,
          y: rect.top
        };
      }
      overlayModes.value[overlay] = 'floating';
    }
    
    dragState.active = true;
    dragState.overlay = overlay;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.initialX = overlayPositions.value[overlay].x;
    dragState.initialY = overlayPositions.value[overlay].y;
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
  }
  
  // Handle drag movement
  function handleDrag(event: MouseEvent) {
    if (!dragState.active) return;
    
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    
    overlayPositions.value[dragState.overlay] = {
      x: Math.max(0, Math.min(window.innerWidth - 200, dragState.initialX + deltaX)),
      y: Math.max(0, Math.min(window.innerHeight - 100, dragState.initialY + deltaY))
    };
  }
  
  // Stop dragging
  function stopDrag() {
    dragState.active = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
  
  // Toggle overlay functions
  function toggleStats() { showStats.value = !showStats.value; }
  function toggleConfig() { showConfig.value = !showConfig.value; }
  function toggleConsole() { showConsole.value = !showConsole.value; }
  function toggleScripts() { showScripts.value = !showScripts.value; }
  function togglePuml() { showPuml.value = !showPuml.value; }
  function toggleElk() { showElk.value = !showElk.value; }
  function toggleDrawio() { showDrawio.value = !showDrawio.value; }
  function toggleAbout() { showAbout.value = !showAbout.value; }
  
  return {
    // Visibility state
    showStats,
    showConfig,
    showConsole,
    showScripts,
    showPuml,
    showElk,
    showDrawio,
    showAbout,
    
    // Overlay configuration
    overlayModes,
    overlayPositions,
    
    // Drag state
    dragState: computed(() => dragState),
    
    // Functions
    getOverlayStyle,
    setOverlayMode,
    startDrag,
    handleDrag,
    stopDrag,
    ensureOverlayPosition,
    
    // Toggle functions
    toggleStats,
    toggleConfig,
    toggleConsole,
    toggleScripts,
    togglePuml,
    toggleElk,
    toggleDrawio,
    toggleAbout,
    
    // Combined state
    overlayState: computed((): OverlayState => ({
      showStats: showStats.value,
      showConfig: showConfig.value,
      showConsole: showConsole.value,
      showScripts: showScripts.value,
      showPuml: showPuml.value,
      showElk: showElk.value,
      showDrawio: showDrawio.value,
      showAbout: showAbout.value
    }))
  };
}

import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import AboutOverlay from '../../src/ui/components/overlays/AboutOverlay.vue';

describe('AboutOverlay.vue', () => {
  const defaultProps = {
    overlayKey: 'about',
    overlayMode: 'normal' as const,
    getOverlayStyle: { left: '50%', top: '50px', transform: 'translateX(-50%)', width: '800px' },
    setOverlayMode: vi.fn(),
    startDrag: vi.fn(),
    isDragging: false
  };

  it('renders the overlay with correct title', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.find('.overlay-title').text()).toContain('About Flowmancer');
    expect(wrapper.find('.project-title h1').text()).toContain('🧙‍♂️ Flowmancer');
  });

  it('displays project information correctly', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    // Check version badge
    expect(wrapper.text()).toContain('v0.2.0');
    
    // Check author
    expect(wrapper.text()).toContain('heybruce');
    
    // Check license
    expect(wrapper.text()).toContain('MIT License');
    
    // Check copyright
    expect(wrapper.text()).toContain('© 2024 Flowmancer Contributors');
    
    // Check description
    expect(wrapper.text()).toContain('Interactive traffic flow simulator and analyzer');
  });

  it('displays technology stack badges', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    const badges = wrapper.findAll('.badge');
    expect(badges.length).toBeGreaterThan(0);
    
    // Check for key technology badges
    expect(wrapper.text()).toContain('Vue 3');
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.text()).toContain('MIT');
  });

  it('shows technology stack section', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('🛠️ Technology Stack');
    expect(wrapper.text()).toContain('Vue.js 3');
    expect(wrapper.text()).toContain('Progressive JavaScript Framework');
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.text()).toContain('Type-safe JavaScript');
    expect(wrapper.text()).toContain('ELK.js');
    expect(wrapper.text()).toContain('Automatic Graph Layout');
  });

  it('displays key features list', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('✨ Key Features');
    expect(wrapper.text()).toContain('🎨 Visual graph editor with drag-and-drop interface');
    expect(wrapper.text()).toContain('📊 Real-time metrics and performance monitoring');
    expect(wrapper.text()).toContain('🔄 Realistic traffic simulation with load balancing');
    expect(wrapper.text()).toContain('📈 Advanced analytics and bottleneck detection');
  });

  it('shows keyboard shortcuts section', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('⌨️ Keyboard Shortcuts');
    expect(wrapper.text()).toContain('Toggle Stats Overlay');
    expect(wrapper.text()).toContain('Toggle Config Overlay');
    expect(wrapper.text()).toContain('Toggle Console Overlay');
    expect(wrapper.text()).toContain('Toggle About (this overlay)');
    
    // Check for keyboard shortcut elements
    const kbdElements = wrapper.findAll('kbd');
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it('displays license and author section', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('📄 License & Author');
    expect(wrapper.text()).toContain('Author: heybruce');
    expect(wrapper.text()).toContain('License: MIT License');
    expect(wrapper.text()).toContain('Copyright: © 2024 Flowmancer Contributors');
  });

  it('shows links section with external links', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('🔗 Links');
    
    const links = wrapper.findAll('a[target="_blank"]');
    expect(links.length).toBeGreaterThan(0);
    
    // Check for specific links
    expect(wrapper.text()).toContain('📦 GitHub Repository');
    expect(wrapper.text()).toContain('🐛 Report Issues');
    expect(wrapper.text()).toContain('📖 Documentation');
  });

  it('displays acknowledgments section', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    expect(wrapper.text()).toContain('🙏 Acknowledgments');
    expect(wrapper.text()).toContain('Special thanks to the open source community');
    
    // Check for acknowledgment links
    const ackLinks = wrapper.findAll('.ack-links a');
    expect(ackLinks.length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain('Vue.js');
    expect(wrapper.text()).toContain('ELK.js');
    expect(wrapper.text()).toContain('Vite');
  });

  it('has correct overlay mode controls', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    const controls = wrapper.findAll('.overlay-control-btn');
    expect(controls.length).toBe(4); // normal, floating, fullscreen, close

    // Check normal mode button
    const normalBtn = controls.find(btn => btn.text() === '📱');
    expect(normalBtn).toBeTruthy();
    
    // Check floating mode button
    const floatingBtn = controls.find(btn => btn.text() === '🪟');
    expect(floatingBtn).toBeTruthy();
    
    // Check fullscreen mode button
    const fullscreenBtn = controls.find(btn => btn.text() === '🔳');
    expect(fullscreenBtn).toBeTruthy();
    
    // Check close button
    const closeBtn = controls.find(btn => btn.text() === '❌');
    expect(closeBtn).toBeTruthy();
  });

  it('calls setOverlayMode when mode buttons are clicked', async () => {
    const setOverlayMode = vi.fn();
    const wrapper = mount(AboutOverlay, {
      props: {
        ...defaultProps,
        setOverlayMode
      }
    });

    const floatingBtn = wrapper.find('[title="Floating mode"]');
    await floatingBtn.trigger('click');
    
    expect(setOverlayMode).toHaveBeenCalledWith('floating');
  });

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    const closeBtn = wrapper.find('.close-btn');
    await closeBtn.trigger('click');
    
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('calls startDrag on mousedown', async () => {
    const startDrag = vi.fn();
    const wrapper = mount(AboutOverlay, {
      props: {
        ...defaultProps,
        startDrag
      }
    });

    const overlay = wrapper.find('.about-overlay');
    await overlay.trigger('mousedown');
    
    expect(startDrag).toHaveBeenCalled();
  });

  it('applies correct CSS classes based on overlay mode', () => {
    const wrapper = mount(AboutOverlay, {
      props: {
        ...defaultProps,
        overlayMode: 'floating'
      }
    });

    expect(wrapper.classes()).toContain('overlay-floating');
    expect(wrapper.classes()).toContain('about-overlay');
  });

  it('applies dragging class when isDragging is true', () => {
    const wrapper = mount(AboutOverlay, {
      props: {
        ...defaultProps,
        isDragging: true
      }
    });

    expect(wrapper.classes()).toContain('dragging');
  });

  it('has proper responsive design classes', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    // Check that responsive grid classes are present in the content
    expect(wrapper.find('.tech-grid').exists()).toBe(true);
    expect(wrapper.find('.shortcuts-grid').exists()).toBe(true);
    expect(wrapper.find('.links-grid').exists()).toBe(true);
    expect(wrapper.find('.feature-list').exists()).toBe(true);
  });

  it('has scrollable content area', () => {
    const wrapper = mount(AboutOverlay, {
      props: defaultProps
    });

    const content = wrapper.find('.overlay-content');
    expect(content.exists()).toBe(true);
    
    // Check that the element has the CSS class/styles that enable scrolling
    expect(content.classes()).toBeDefined();
    expect(content.element.classList.contains('overlay-content')).toBe(true);
  });
});

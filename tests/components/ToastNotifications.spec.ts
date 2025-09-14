import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ToastNotifications from '../../src/ui/components/ToastNotifications.vue';

describe('ToastNotifications', () => {
  let teleportTarget: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create a teleport target
    teleportTarget = document.createElement('div');
    teleportTarget.id = 'teleport-target';
    document.body.appendChild(teleportTarget);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up teleport target
    document.body.innerHTML = '';
  });

  it('should mount correctly', () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('should add a toast notification', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      message: 'Test message'
    });
    
    await nextTick();
    
    const toast = wrapper.find('[data-test="toast-success"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain('Test message');
  });

  it('should display different toast types with correct styling', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({ type: 'success', message: 'Success' });
    component.addToast({ type: 'error', message: 'Error' });
    component.addToast({ type: 'warning', message: 'Warning' });
    component.addToast({ type: 'info', message: 'Info' });
    
    await nextTick();
    
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="toast-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="toast-warning"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="toast-info"]').exists()).toBe(true);
    
    expect(wrapper.find('.toast-success').exists()).toBe(true);
    expect(wrapper.find('.toast-error').exists()).toBe(true);
    expect(wrapper.find('.toast-warning').exists()).toBe(true);
    expect(wrapper.find('.toast-info').exists()).toBe(true);
  });

  it('should display title when provided', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      title: 'Test Title',
      message: 'Test message'
    });
    
    await nextTick();
    
    expect(wrapper.find('.toast-title').exists()).toBe(true);
    expect(wrapper.find('.toast-title').text()).toBe('Test Title');
  });

  it('should auto-dismiss toast after duration', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      message: 'Test message',
      duration: 1000
    });
    
    await nextTick();
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(true);
    
    // Advance time
    vi.advanceTimersByTime(1000);
    await nextTick();
    
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(false);
  });

  it('should not auto-dismiss when duration is 0', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      message: 'Test message',
      duration: 0
    });
    
    await nextTick();
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(true);
    
    // Advance time
    vi.advanceTimersByTime(10000);
    await nextTick();
    
    // Should still be there
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(true);
  });

  it('should remove toast when close button is clicked', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      message: 'Test message',
      dismissible: true
    });
    
    await nextTick();
    
    const closeButton = wrapper.find('.toast-close');
    expect(closeButton.exists()).toBe(true);
    
    await closeButton.trigger('click');
    await nextTick();
    
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(false);
  });

  it('should not show close button when dismissible is false', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({
      type: 'success',
      message: 'Test message',
      dismissible: false
    });
    
    await nextTick();
    
    expect(wrapper.find('.toast-close').exists()).toBe(false);
  });

  it('should remove specific toast by id', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    const id1 = component.addToast({ type: 'success', message: 'Message 1' });
    const id2 = component.addToast({ type: 'error', message: 'Message 2' });
    
    await nextTick();
    
    expect(wrapper.findAll('.toast').length).toBe(2);
    
    component.removeToast(id1);
    await nextTick();
    
    expect(wrapper.findAll('.toast').length).toBe(1);
    expect(wrapper.find('[data-test="toast-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="toast-success"]').exists()).toBe(false);
  });

  it('should clear all toasts', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({ type: 'success', message: 'Message 1' });
    component.addToast({ type: 'error', message: 'Message 2' });
    component.addToast({ type: 'warning', message: 'Message 3' });
    
    await nextTick();
    expect(wrapper.findAll('.toast').length).toBe(3);
    
    component.clearAll();
    await nextTick();
    
    expect(wrapper.findAll('.toast').length).toBe(0);
  });

  it('should stack multiple toasts vertically', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({ type: 'success', message: 'Message 1' });
    component.addToast({ type: 'error', message: 'Message 2' });
    component.addToast({ type: 'info', message: 'Message 3' });
    
    await nextTick();
    
    const toasts = wrapper.findAll('.toast');
    expect(toasts.length).toBe(3);
    
    // Check they have different messages
    expect(toasts[0].text()).toContain('Message 1');
    expect(toasts[1].text()).toContain('Message 2');
    expect(toasts[2].text()).toContain('Message 3');
  });

  it('should display correct icons for each type', async () => {
    const wrapper = mount(ToastNotifications, {
      global: {
        stubs: {
          teleport: true
        }
      }
    });
    const component = wrapper.vm as any;
    
    component.addToast({ type: 'success', message: 'Success' });
    component.addToast({ type: 'error', message: 'Error' });
    component.addToast({ type: 'warning', message: 'Warning' });
    component.addToast({ type: 'info', message: 'Info' });
    
    await nextTick();
    
    const successIcon = wrapper.find('.toast-success .toast-icon');
    const errorIcon = wrapper.find('.toast-error .toast-icon');
    const warningIcon = wrapper.find('.toast-warning .toast-icon');
    const infoIcon = wrapper.find('.toast-info .toast-icon');
    
    expect(successIcon.text()).toBe('✓');
    expect(errorIcon.text()).toBe('✕');
    expect(warningIcon.text()).toBe('⚠');
    expect(infoIcon.text()).toBe('ℹ');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { useKeyboardShortcuts } from '../../src/composables/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register and unregister event listeners on mount/unmount', () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler: () => {} }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    const wrapper = mount(TestComponent);
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler when matching key is pressed', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    mount(TestComponent);

    const event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when different key is pressed', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    mount(TestComponent);

    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle modifier keys correctly', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', ctrl: true, handler: handler1 },
          { key: 's', shift: true, handler: handler2 },
          { key: 's', handler: handler3 }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    mount(TestComponent);

    // Test Ctrl+S
    let event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    document.dispatchEvent(event);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
    expect(handler3).not.toHaveBeenCalled();

    // Test Shift+S
    event = new KeyboardEvent('keydown', { key: 's', shiftKey: true });
    document.dispatchEvent(event);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).not.toHaveBeenCalled();

    // Test plain S
    event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  it('should ignore shortcuts when typing in input fields', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler }
        ]);
        return {};
      },
      template: '<div><input id="test-input" /></div>'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('#test-input').element;

    // Simulate typing in input
    const event = new KeyboardEvent('keydown', { key: 's' });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow Escape key even in input fields', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 'Escape', handler }
        ]);
        return {};
      },
      template: '<div><input id="test-input" /></div>'
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find('#test-input').element;

    // Simulate Escape in input
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should respect enabled flag', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        const enabled = ref(false);
        useKeyboardShortcuts(
          [{ key: 's', handler }],
          enabled
        );
        return { enabled };
      },
      template: '<div></div>'
    });

    const wrapper = mount(TestComponent);

    // Should not trigger when disabled
    let event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();

    // Enable and test again
    wrapper.vm.enabled = true;
    event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle case insensitive keys', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    mount(TestComponent);

    // Test uppercase S
    const event = new KeyboardEvent('keydown', { key: 'S' });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should prevent default and stop propagation when handling shortcut', () => {
    const handler = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts([
          { key: 's', handler }
        ]);
        return {};
      },
      template: '<div></div>'
    });

    mount(TestComponent);

    const event = new KeyboardEvent('keydown', { key: 's', cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

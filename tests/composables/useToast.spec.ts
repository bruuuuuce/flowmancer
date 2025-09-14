import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast, setToastComponent } from '../../src/composables/useToast';
import { ref } from 'vue';

describe('useToast', () => {
  let toast: ReturnType<typeof useToast>;
  let mockToastComponent: any;
  let toasts: any[];
  
  beforeEach(() => {
    vi.clearAllMocks();
    toasts = [];
    
    // Create a mock toast component
    mockToastComponent = {
      addToast: vi.fn((options: any) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast = { ...options, id };
        toasts.push(toast);
        return id;
      }),
      removeToast: vi.fn((id: string) => {
        const index = toasts.findIndex(t => t.id === id);
        if (index !== -1) {
          toasts.splice(index, 1);
        }
      }),
      clearAll: vi.fn(() => {
        toasts.length = 0;
      })
    };
    
    // Set the mock component
    setToastComponent(ref(mockToastComponent));
    toast = useToast();
  });
  
  describe('show method', () => {
    it('should add a toast with provided options', () => {
      const id = toast.show({ message: 'Test message', type: 'info', duration: 3000 });
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Test message',
        type: 'info',
        duration: 3000
      });
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        message: 'Test message',
        type: 'info',
        duration: 3000
      });
    });
    
    it('should add toast with custom type', () => {
      toast.show({ message: 'Success!', type: 'success', duration: 5000 });
      
      expect(toasts[0].type).toBe('success');
    });
    
    it('should add toast with custom duration', () => {
      toast.show({ message: 'Long toast', type: 'info', duration: 10000 });
      
      expect(toasts[0].duration).toBe(10000);
    });
    
    it('should add toast with title', () => {
      toast.show({ message: 'Message', type: 'info', title: 'Important', duration: 3000 });
      
      expect(toasts[0].title).toBe('Important');
    });
    
    it('should add non-dismissible toast', () => {
      toast.show({ message: 'Cannot dismiss', type: 'info', dismissible: false, duration: 0 });
      
      expect(toasts[0].dismissible).toBe(false);
    });
    
    it('should add multiple toasts', () => {
      const id1 = toast.show({ message: 'First', type: 'info', duration: 3000 });
      const id2 = toast.show({ message: 'Second', type: 'info', duration: 3000 });
      const id3 = toast.show({ message: 'Third', type: 'info', duration: 3000 });
      
      expect(toasts).toHaveLength(3);
      expect(toasts[0].id).toBe(id1);
      expect(toasts[1].id).toBe(id2);
      expect(toasts[2].id).toBe(id3);
    });
    
    it('should generate unique IDs for each toast', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        const id = toast.show({ message: `Toast ${i}`, type: 'info', duration: 3000 });
        ids.add(id);
      }
      
      expect(ids.size).toBe(100); // All IDs should be unique
    });
  });
  
  describe('showSuccess method', () => {
    it('should create a success toast', () => {
      toast.showSuccess('Operation completed');
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Operation completed',
        type: 'success',
        duration: 5000
      });
      expect(toasts[0].type).toBe('success');
    });
    
    it('should accept title and duration', () => {
      toast.showSuccess('Done!', 'Success', 10000);
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Done!',
        type: 'success',
        title: 'Success',
        duration: 10000
      });
    });
  });
  
  describe('showError method', () => {
    it('should create an error toast', () => {
      toast.showError('Something went wrong');
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Something went wrong',
        type: 'error',
        duration: 8000
      });
    });
    
    it('should accept title and duration', () => {
      toast.showError('Failed!', 'Error', 0); // No auto-dismiss
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Failed!',
        type: 'error',
        title: 'Error',
        duration: 0
      });
    });
  });
  
  describe('showWarning method', () => {
    it('should create a warning toast', () => {
      toast.showWarning('Be careful');
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'Be careful',
        type: 'warning',
        duration: 6000
      });
    });
  });
  
  describe('showInfo method', () => {
    it('should create an info toast', () => {
      toast.showInfo('For your information');
      
      expect(mockToastComponent.addToast).toHaveBeenCalledWith({
        message: 'For your information',
        type: 'info',
        duration: 5000
      });
    });
  });
  
  describe('remove method', () => {
    it('should remove a toast by ID', () => {
      const id1 = toast.show({ message: 'First', type: 'info', duration: 3000 });
      const id2 = toast.show({ message: 'Second', type: 'info', duration: 3000 });
      const id3 = toast.show({ message: 'Third', type: 'info', duration: 3000 });
      
      toast.remove(id2);
      
      expect(mockToastComponent.removeToast).toHaveBeenCalledWith(id2);
      expect(toasts).toHaveLength(2);
      expect(toasts.find(t => t.id === id2)).toBeUndefined();
      expect(toasts[0].id).toBe(id1);
      expect(toasts[1].id).toBe(id3);
    });
    
    it('should handle removing non-existent toast', () => {
      toast.show({ message: 'Test', type: 'info', duration: 3000 });
      
      toast.remove('non-existent-id');
      
      expect(toasts).toHaveLength(1);
    });
    
    it('should handle removing from empty list', () => {
      expect(() => toast.remove('any-id')).not.toThrow();
      expect(toasts).toHaveLength(0);
    });
  });
  
  describe('clearAll method', () => {
    it('should remove all toasts', () => {
      toast.show({ message: 'First', type: 'info', duration: 3000 });
      toast.show({ message: 'Second', type: 'info', duration: 3000 });
      toast.show({ message: 'Third', type: 'info', duration: 3000 });
      
      expect(toasts).toHaveLength(3);
      
      toast.clearAll();
      
      expect(mockToastComponent.clearAll).toHaveBeenCalled();
      expect(toasts).toHaveLength(0);
    });
    
    it('should handle clearing empty list', () => {
      expect(() => toast.clearAll()).not.toThrow();
      expect(toasts).toHaveLength(0);
    });
  });
  
  describe('no toast component initialized', () => {
    it('should handle calls when toast component is not set', () => {
      // Reset the toast component to null
      setToastComponent(ref(null));
      const uninitialized = useToast();
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => uninitialized.show({ message: 'Test', type: 'info' })).not.toThrow();
      expect(() => uninitialized.showSuccess('Test')).not.toThrow();
      expect(() => uninitialized.showError('Test')).not.toThrow();
      expect(() => uninitialized.showWarning('Test')).not.toThrow();
      expect(() => uninitialized.showInfo('Test')).not.toThrow();
      expect(() => uninitialized.remove('id')).not.toThrow();
      expect(() => uninitialized.clearAll()).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Toast component not initialized');
      
      consoleSpy.mockRestore();
    });
  });
});

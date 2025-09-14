import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCommandHistory } from '../../src/composables/useCommandHistory';

describe('useCommandHistory', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should initialize with empty history', () => {
    const history = useCommandHistory();
    expect(history.getHistory()).toEqual([]);
  });

  it('should add commands to history', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    history.addToHistory('command3');
    
    const commands = history.getHistory();
    expect(commands).toEqual(['command1', 'command2', 'command3']);
  });

  it('should not add empty commands to history', () => {
    const history = useCommandHistory();
    
    history.addToHistory('');
    history.addToHistory('  ');
    history.addToHistory('\n');
    
    expect(history.getHistory()).toEqual([]);
  });

  it('should not add duplicate consecutive commands', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command1');
    history.addToHistory('command1');
    
    expect(history.getHistory()).toEqual(['command1']);
  });

  it('should allow non-consecutive duplicates', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    history.addToHistory('command1');
    
    expect(history.getHistory()).toEqual(['command1', 'command2', 'command1']);
  });

  it('should navigate to previous commands', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    history.addToHistory('command3');
    
    // Navigate up through history
    expect(history.navigatePrevious('current')).toBe('command3');
    expect(history.navigatePrevious('current')).toBe('command2');
    expect(history.navigatePrevious('current')).toBe('command1');
    
    // Can't go further back
    expect(history.navigatePrevious('current')).toBeNull();
  });

  it('should navigate to next commands', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    history.addToHistory('command3');
    
    // Navigate up first
    history.navigatePrevious('current');
    history.navigatePrevious('current');
    history.navigatePrevious('current');
    
    // Now navigate down
    expect(history.navigateNext()).toBe('command2');
    expect(history.navigateNext()).toBe('command3');
    expect(history.navigateNext()).toBe('current'); // Back to original
    
    // Can't go further forward
    expect(history.navigateNext()).toBeNull();
  });

  it('should save current command when starting navigation', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    
    // Start typing a new command
    const currentCommand = 'new command in progress';
    
    // Navigate up
    history.navigatePrevious(currentCommand);
    history.navigatePrevious(currentCommand);
    
    // Navigate back down to original
    history.navigateNext();
    const restored = history.navigateNext();
    
    expect(restored).toBe(currentCommand);
  });

  it('should reset navigation after adding to history', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    
    // Navigate up
    history.navigatePrevious('current');
    
    // Add new command
    history.addToHistory('command3');
    
    // Navigation should be reset
    expect(history.navigateNext()).toBeNull();
    expect(history.navigatePrevious('new')).toBe('command3');
  });

  it('should persist history in sessionStorage', () => {
    const history1 = useCommandHistory();
    
    history1.addToHistory('command1');
    history1.addToHistory('command2');
    
    // Create new instance - should load from sessionStorage
    const history2 = useCommandHistory();
    
    expect(history2.getHistory()).toEqual(['command1', 'command2']);
  });

  it('should limit history size to MAX_HISTORY', () => {
    const history = useCommandHistory();
    
    // Add more than MAX_HISTORY (100) commands
    for (let i = 0; i < 105; i++) {
      history.addToHistory(`command${i}`);
    }
    
    const commands = history.getHistory();
    expect(commands.length).toBe(100);
    expect(commands[0]).toBe('command5'); // Oldest 5 should be removed
    expect(commands[99]).toBe('command104'); // Most recent
  });

  it('should clear history', () => {
    const history = useCommandHistory();
    
    history.addToHistory('command1');
    history.addToHistory('command2');
    history.addToHistory('command3');
    
    history.clearHistory();
    
    expect(history.getHistory()).toEqual([]);
    expect(sessionStorage.getItem('traffic-sim-console-history')).toBeNull();
  });

  it('should handle corrupted sessionStorage gracefully', () => {
    // Set invalid JSON in sessionStorage
    sessionStorage.setItem('traffic-sim-console-history', 'invalid json {');
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const history = useCommandHistory();
    
    // Should start with empty history despite corruption
    expect(history.getHistory()).toEqual([]);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load command history:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle non-array data in sessionStorage', () => {
    // Set non-array data
    sessionStorage.setItem('traffic-sim-console-history', '"not an array"');
    
    const history = useCommandHistory();
    
    // Should start with empty history
    expect(history.getHistory()).toEqual([]);
  });

  it('should handle sessionStorage errors gracefully', () => {
    const history = useCommandHistory();

    // First add a valid command successfully
    history.addToHistory('valid command');

    // Now mock sessionStorage.setItem to throw
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw when adding to history despite storage error
    expect(() => history.addToHistory('another command')).not.toThrow();

    // In-memory history should still include the command
    expect(history.getHistory()).toEqual(['valid command', 'another command']);

    // Restore
    sessionStorage.setItem = originalSetItem;
  });
});

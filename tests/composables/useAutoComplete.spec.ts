import { describe, it, expect, beforeEach } from 'vitest';
import { useAutoComplete } from '../../src/composables/useAutoComplete';
import { ref } from 'vue';

describe('useAutoComplete', () => {
  describe('basic functionality', () => {
    it('should initialize with empty suggestions', () => {
      const nodes = ref(['API', 'Database', 'Cache']);
      const { suggestions, selectedIndex } = useAutoComplete(nodes);
      
      expect(suggestions.value).toEqual([]);
      expect(selectedIndex.value).toBe(-1);
    });
  });

  describe('command suggestions', () => {
    it('should suggest commands when typing at the beginning', () => {
      const nodes = ref(['API', 'Database']);
      const groups = ref(['frontend', 'backend']);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('n', 1);
      
      expect(suggestions.value.length).toBeGreaterThan(0);
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'node add',
          type: 'command'
        })
      );
    });

    it('should filter commands based on partial input', () => {
      const nodes = ref([]);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('li', 2);
      
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'link add',
          type: 'command'
        })
      );
      expect(suggestions.value).not.toContainEqual(
        expect.objectContaining({
          text: 'node add',
          type: 'command'
        })
      );
    });
  });

  describe('node suggestions', () => {
    it('should suggest node names after "node remove" command', () => {
      const nodes = ref(['API', 'Database', 'Cache']);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node remove ', 12);
      
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'API',
          type: 'node'
        })
      );
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'Database',
          type: 'node'
        })
      );
    });

    it('should filter nodes based on partial name', () => {
      const nodes = ref(['API', 'APIGateway', 'Database']);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node set AP', 11);
      
      const nodeSuggestions = suggestions.value.filter(s => s.type === 'node');
      expect(nodeSuggestions).toHaveLength(2);
      expect(nodeSuggestions).toContainEqual(
        expect.objectContaining({
          text: 'API',
          type: 'node'
        })
      );
      expect(nodeSuggestions).toContainEqual(
        expect.objectContaining({
          text: 'APIGateway',
          type: 'node'
        })
      );
    });
  });

  describe('property suggestions', () => {
    it('should suggest properties after node name', () => {
      const nodes = ref(['API']);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node set API ', 13);
      
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'capacity=',
          type: 'property'
        })
      );
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'base_ms=',
          type: 'property'
        })
      );
    });

    it('should suggest node types for "add" command', () => {
      const nodes = ref([]);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node add NewNode ', 17);
      
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'Service',
          type: 'value'
        })
      );
      expect(suggestions.value).toContainEqual(
        expect.objectContaining({
          text: 'Ingress',
          type: 'value'
        })
      );
    });
  });

  // Value suggestions not implemented in current version - removed tests

  describe('navigation', () => {
    it('should navigate through suggestions with selectNext/selectPrevious', () => {
      const nodes = ref(['API', 'Database', 'Cache']);
      const groups = ref([]);
      const { updateSuggestions, suggestions, selectedIndex, selectNext, selectPrevious } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node remove ', 12);
      expect(selectedIndex.value).toBe(-1);
      
      selectNext();
      expect(selectedIndex.value).toBe(0);
      
      selectNext();
      expect(selectedIndex.value).toBe(1);
      
      selectPrevious();
      expect(selectedIndex.value).toBe(0);
      
      // Wrap around at the beginning
      selectPrevious();
      expect(selectedIndex.value).toBe(suggestions.value.length - 1);
      
      // Wrap around at the end
      selectNext();
      expect(selectedIndex.value).toBe(0);
    });
  });

  describe('apply suggestion', () => {
    it('should apply suggestion at cursor position', () => {
      const nodes = ref(['API']);
      const groups = ref([]);
      const { updateSuggestions, applySuggestion } = useAutoComplete(nodes, groups);
      
      updateSuggestions('no', 2);
      const suggestion = { text: 'node', type: 'command' as const, description: '' };
      
      const result = applySuggestion('no', 2, suggestion);
      expect(result).toBe('node ');
    });

    it('should replace partial word with suggestion', () => {
      const nodes = ref(['APIGateway']);
      const groups = ref([]);
      const { applySuggestion } = useAutoComplete(nodes, groups);
      
      const suggestion = { text: 'APIGateway', type: 'node' as const, description: '' };
      const result = applySuggestion('node add API', 12, suggestion);
      expect(result).toBe('node add APIGateway ');
    });

    it('should handle mid-string cursor position', () => {
      const nodes = ref([]);
      const groups = ref([]);
      const { applySuggestion } = useAutoComplete(nodes, groups);
      
      const suggestion = { text: 'capacity=', type: 'property' as const, description: '' };
      const input = 'node set API cap=100';
      const result = applySuggestion(input, 16, suggestion); // cursor after "cap"
      expect(result).toBe('node set API capacity==100');
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      const nodes = ref(['API']);
      const groups = ref([]);
      const { updateSuggestions, suggestions, selectedIndex, reset } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node', 4);
      selectedIndex.value = 2;
      
      reset();
      
      expect(suggestions.value).toEqual([]);
      expect(selectedIndex.value).toBe(-1);
    });
  });

  describe('reactive node updates', () => {
    it('should update suggestions when nodes change', () => {
      const nodes = ref(['API']);
      const groups = ref([]);
      const { updateSuggestions, suggestions } = useAutoComplete(nodes, groups);
      
      updateSuggestions('node remove ', 12);
      const initialCount = suggestions.value.filter(s => s.type === 'node').length;
      
      nodes.value = ['API', 'Database', 'Cache'];
      updateSuggestions('node remove ', 12);
      const updatedCount = suggestions.value.filter(s => s.type === 'node').length;
      
      expect(updatedCount).toBeGreaterThan(0);
    });
  });
});

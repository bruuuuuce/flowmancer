import { ref, computed, Ref } from 'vue';

export interface Suggestion {
  text: string;
  type: 'command' | 'node' | 'property' | 'value' | 'keyword';
  description?: string;
  insertText?: string; 
}

const COMMANDS = [
  { 
    text: 'node add', 
    type: 'command' as const, 
    description: 'Add a new node',
    pattern: /^node\s+add\s*/i
  },
  { 
    text: 'node remove', 
    type: 'command' as const, 
    description: 'Remove a node',
    pattern: /^node\s+remove\s*/i
  },
  { 
    text: 'node set', 
    type: 'command' as const, 
    description: 'Set node property',
    pattern: /^node\s+set\s*/i
  },
  { 
    text: 'node get', 
    type: 'command' as const, 
    description: 'Get node info',
    pattern: /^node\s+get\s*/i
  },
  { 
    text: 'node isolate', 
    type: 'command' as const, 
    description: 'Remove node connections',
    pattern: /^node\s+isolate\s*/i
  },
  { 
    text: 'group create', 
    type: 'command' as const, 
    description: 'Create a boundary group',
    pattern: /^group\s+create\s*/i
  },
  { 
    text: 'group remove', 
    type: 'command' as const, 
    description: 'Remove a group',
    pattern: /^group\s+remove\s*/i
  },
  { 
    text: 'group add-node', 
    type: 'command' as const, 
    description: 'Add node to group',
    pattern: /^group\s+add-node\s*/i
  },
  { 
    text: 'group remove-node', 
    type: 'command' as const, 
    description: 'Remove node from group',
    pattern: /^group\s+remove-node\s*/i
  },
  { 
    text: 'group list', 
    type: 'command' as const, 
    description: 'List all groups',
    pattern: /^group\s+list$/i
  },
  { 
    text: 'group isolate', 
    type: 'command' as const, 
    description: 'Isolate group connections',
    pattern: /^group\s+isolate\s*/i
  },
  { 
    text: 'graph add', 
    type: 'command' as const, 
    description: 'Add nodes/links PUML-style',
    pattern: /^graph\s+add\s*/i
  },
  { 
    text: 'graph remove', 
    type: 'command' as const, 
    description: 'Remove links PUML-style',
    pattern: /^graph\s+remove\s*/i
  },
  { 
    text: 'link add', 
    type: 'command' as const, 
    description: 'Add a link between nodes',
    pattern: /^link\s+add\s*/i
  },
  { 
    text: 'link remove', 
    type: 'command' as const, 
    description: 'Remove a link',
    pattern: /^link\s+remove\s*/i
  },
  { 
    text: 'log', 
    type: 'command' as const, 
    description: 'Log a message',
    pattern: /^log\s*/i
  },
  { 
    text: 'set', 
    type: 'command' as const, 
    description: 'Set a variable',
    pattern: /^set\s*/i
  },
  { 
    text: 'wait', 
    type: 'command' as const, 
    description: 'Wait for milliseconds',
    pattern: /^wait\s*/i
  },
  { 
    text: 'export puml', 
    type: 'command' as const, 
    description: 'Export to PlantUML',
    pattern: /^export\s+puml/i
  },
  { 
    text: 'snapshot', 
    type: 'command' as const, 
    description: 'Save config snapshot',
    pattern: /^snapshot\s*/i
  },
  { 
    text: 'clear', 
    type: 'command' as const, 
    description: 'Clear console',
    pattern: /^clear$/i
  },
  { 
    text: 'help', 
    type: 'command' as const, 
    description: 'Show help',
    pattern: /^help$/i
  },
  { 
    text: 'history', 
    type: 'command' as const, 
    description: 'Show command history',
    pattern: /^history$/i
  }
];

const NODE_TYPES = [
  'Source', 'Service', 'LoadBalancer', 'Cache', 'DB', 
  'ExternalAPI', 'Queue', 'Sink', 'Ingress' 
];

const NODE_PROPERTIES = [
  'capacity', 'capacity_in', 'capacity_out', 'base_ms', 'jitter_ms', 
  'p_fail', 'rateRps', 'timeout_ms', 'hitRatio', 'maxQueue'
];

const GROUP_COLORS = [
  { color: '#10b981', name: 'Green' },
  { color: '#3b82f6', name: 'Blue' },
  { color: '#ef4444', name: 'Red' },
  { color: '#f59e0b', name: 'Orange' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#64748b', name: 'Gray' }
];

export function useAutoComplete(availableNodes: Ref<string[]>, availableGroups?: Ref<string[]>) {
  const suggestions = ref<Suggestion[]>([]);
  const selectedIndex = ref(-1);
  const isVisible = ref(false);

  const reset = () => {
    suggestions.value = [];
    selectedIndex.value = -1;
    isVisible.value = false;
  };

  const selectNext = () => {
    if (suggestions.value.length === 0) return;
    selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
  };

  const selectPrevious = () => {
    if (suggestions.value.length === 0) return;
    if (selectedIndex.value <= 0) {
      selectedIndex.value = suggestions.value.length - 1;
    } else {
      selectedIndex.value--;
    }
  };

  const getSelectedSuggestion = (): Suggestion | null => {
    if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
      return suggestions.value[selectedIndex.value];
    }
    return null;
  };

  const updateSuggestions = (input: string, cursorPosition: number): void => {
    if (!input.trim()) {
      
      reset();
      return;
    }

    const beforeCursor = input.slice(0, cursorPosition).toLowerCase();
    const results: Suggestion[] = [];

    if (/^node\s+add\s+\w+\s*/i.test(beforeCursor)) {
      
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      NODE_TYPES.forEach(type => {
        if (type.toLowerCase().startsWith(partial)) {
          results.push({
            text: type,
            type: 'value',
            description: `Node type: ${type}`
          });
        }
      });

      const parts = beforeCursor.split(/\s+/);
      if (parts.length >= 4) {
        NODE_PROPERTIES.forEach(prop => {
          if (prop.toLowerCase().includes(partial)) {
            results.push({
              text: `${prop}=`,
              type: 'property',
              description: `Set ${prop}`,
              insertText: `${prop}=`
            });
          }
        });
      }
    }
    
    else if (/^node\s+(remove|get|set)\s*/i.test(beforeCursor)) {
      
      const nodeIds = availableNodes.value;
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      nodeIds.forEach(id => {
        if (id.toLowerCase().startsWith(partial)) {
          results.push({
            text: id,
            type: 'node',
            description: `Node: ${id}`
          });
        }
      });

      if (/^node\s+set\s+\w+\s+/i.test(beforeCursor)) {
        NODE_PROPERTIES.forEach(prop => {
          if (prop.toLowerCase().startsWith(partial)) {
            results.push({
              text: `${prop}=`,
              type: 'property',
              description: `Set ${prop}`,
              insertText: `${prop}=`
            });
          }
        });
      }
    }
    
    else if (/^group\s+(add-node|remove-node)\s*/i.test(beforeCursor)) {
      const parts = beforeCursor.split(/\s+/);
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      if (parts.length === 3) {
        
        if (availableGroups?.value) {
          availableGroups.value.forEach(id => {
            if (id.toLowerCase().startsWith(partial)) {
              results.push({
                text: id,
                type: 'value',
                description: `Group: ${id}`
              });
            }
          });
        }
      } else if (parts.length === 4) {
        
        const nodeIds = availableNodes.value;
        nodeIds.forEach(id => {
          if (id.toLowerCase().startsWith(partial)) {
            results.push({
              text: id,
              type: 'node',
              description: `Node: ${id}`
            });
          }
        });
      }
    }
    
    else if (/^group\s+create\s*/i.test(beforeCursor)) {
      const parts = beforeCursor.split(/\s+/);
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      if (parts.length >= 5 && partial.startsWith('color=')) {
        
        const colorPartial = partial.slice(6); 
        GROUP_COLORS.forEach(({ color, name }) => {
          if (color.toLowerCase().includes(colorPartial.toLowerCase()) || 
              name.toLowerCase().includes(colorPartial.toLowerCase())) {
            results.push({
              text: `color=${color}`,
              type: 'property',
              description: `${name} (${color})`,
              insertText: `color=${color}`
            });
          }
        });
      } else if (parts.length >= 4) {
        
        if (!partial || 'color='.startsWith(partial)) {
          results.push({
            text: 'color=',
            type: 'property',
            description: 'Set group color',
            insertText: 'color=#'
          });
        }
      }
    }
    
    else if (/^group\s+remove\s*/i.test(beforeCursor)) {
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      if (availableGroups?.value) {
        availableGroups.value.forEach(id => {
          if (id.toLowerCase().startsWith(partial)) {
            results.push({
              text: id,
              type: 'value',
              description: `Group: ${id}`
            });
          }
        });
      }
    }
    
    else if (/^link\s+(add|remove)\s*/i.test(beforeCursor)) {
      const nodeIds = availableNodes.value;
      const parts = beforeCursor.split(/\s+/);
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const partial = beforeCursor.slice(lastSpace + 1);
      
      nodeIds.forEach(id => {
        if (id.toLowerCase().startsWith(partial)) {
          results.push({
            text: id,
            type: 'node',
            description: parts.length === 3 ? `From: ${id}` : `To: ${id}`
          });
        }
      });
    }
    
    else {
      COMMANDS.forEach(cmd => {
        if (cmd.text.toLowerCase().startsWith(beforeCursor)) {
          results.push({
            text: cmd.text,
            type: cmd.type,
            description: cmd.description
          });
        }
      });
    }

    suggestions.value = results;
    isVisible.value = results.length > 0;
    
    selectedIndex.value = -1;
  };

  const applySuggestion = (input: string, cursorPosition: number, suggestion: Suggestion): string => {
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    
    const lastSpace = beforeCursor.lastIndexOf(' ');
    const wordStart = lastSpace + 1;
    
    let insertText = suggestion.insertText || suggestion.text;
    
    if (suggestion.type === 'command' || suggestion.type === 'node') {
      insertText += ' ';
    }
    
    const newText = beforeCursor.slice(0, wordStart) + insertText + afterCursor;
    
    return newText;
  };

  return {
    suggestions: suggestions as Readonly<Ref<Suggestion[]>>,
    selectedIndex: selectedIndex as Readonly<Ref<number>>,
    isVisible,
    reset,
    selectNext,
    selectPrevious,
    getSelectedSuggestion,
    updateSuggestions, 
    applySuggestion
  };
}

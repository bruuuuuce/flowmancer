import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { ScriptInterpreter, type ScriptContext } from '../scripting/ScriptInterpreter';
import { useCommandHistory } from './useCommandHistory';

export interface ConsoleState {
  cmd: string;
  log: string[];
  script: string;
  scriptRunning: boolean;
  scriptError: string | undefined;
}

export function useConsoleManager(config: Ref<any>, cfgText: Ref<string>, lastAggregatedMetrics: Ref<any>, recalculateStatistics: (source: string) => void, generatePuml: () => void, pumlText: Ref<string>) {
  // Console state
  const cmd = ref(''); 
  const log = ref<string[]>([]);
  
  // Script state
  const script = ref(`# Example script - modify as needed
log "start"
wait 100
log "end"
`);
  const scriptRunning = ref(false);
  const scriptError = ref<string | undefined>(undefined);
  
  // Interpreters
  let consoleInterpreter: ScriptInterpreter | null = null;
  let consoleContext: ScriptContext | null = null;
  let scriptInterpreter: ScriptInterpreter | null = null;
  
  const commandHistory = useCommandHistory();
  
  // Console context initialization
  function initConsoleContext() {
    consoleContext = {
      config: JSON.parse(JSON.stringify(config.value)),
      metrics: lastAggregatedMetrics.value,
      log: (msg: string) => log.value.push(msg),
      updateConfig: (newConfig: any) => {
        config.value = newConfig;
        cfgText.value = JSON.stringify(newConfig, null, 2);
        recalculateStatistics('console command');
      },
      applyChanges: () => {
        if (consoleContext) {
          config.value = JSON.parse(JSON.stringify(consoleContext.config));
          cfgText.value = JSON.stringify(consoleContext.config, null, 2);
          recalculateStatistics('console applyChanges');
        }
      },
      generatePuml: () => {
        generatePuml();
        return pumlText.value;
      },
      variables: new Map(),
      snapshots: new Map()
    };
    consoleInterpreter = new ScriptInterpreter(consoleContext);
  }
  
  // History navigation
  function handleHistoryNavigation(direction: 'up' | 'down') {
    if (direction === 'up') {
      const previousCommand = commandHistory.navigatePrevious(cmd.value);
      if (previousCommand !== null) {
        cmd.value = previousCommand;
      }
    } else {
      const nextCommand = commandHistory.navigateNext();
      if (nextCommand !== null) {
        cmd.value = nextCommand;
      }
    }
  }
  
  // Execute console command
  async function execCmd() {
    const command = cmd.value.trim();
    if (!command) return;
    
    log.value.push(`> ${command}`);
    commandHistory.addToHistory(command);
    cmd.value = '';
    
    if (command === 'clear') {
      log.value = [];
      return;
    }
    
    if (command === 'history') {
      const history = commandHistory.getHistory();
      if (history.length === 0) {
        log.value.push('No command history');
      } else {
        log.value.push('Command history:');
        history.forEach((cmd, i) => {
          log.value.push(`  ${i + 1}: ${cmd}`);
        });
      }
      return;
    }
    
    if (command === 'help') {
      log.value.push('Available commands:');
      log.value.push('  Node commands:');
      log.value.push('    node add <id> <kind> [properties]  - Add a new node');
      log.value.push('    node remove <id>                   - Remove a node');
      log.value.push('    node set <id> <property>=<value>   - Set node property');
      log.value.push('    node get <id> [property]           - Get node info');
      log.value.push('    node isolate <id> [in|out|both]    - Remove node connections');
      log.value.push('  Group/Boundary commands:');
      log.value.push('    group create <id> <name> [color=#hex] - Create a boundary group');
      log.value.push('    group remove <id>                  - Remove a group');
      log.value.push('    group add-node <group-id> <node-id> - Add node to group');
      log.value.push('    group remove-node <group-id> <node-id> - Remove node from group');
      log.value.push('    group list                         - List all groups');
      log.value.push('    group isolate <id> [in|out|internal|external|all] - Isolate group');
      log.value.push('  Graph commands (PUML-style):');
      log.value.push('    graph add <expression>             - Add nodes/links (A -> B)');
      log.value.push('    graph add A -> [B,C,D]             - One to many connections');
      log.value.push('    graph add A:Service -> B:Cache     - With node types');
      log.value.push('    graph remove A -> *                - Remove all from A');
      log.value.push('  Link commands:');
      log.value.push('    link add <from> <to>               - Add a link');
      log.value.push('    link remove <from> <to>            - Remove a link');
      log.value.push('  Other commands:');
      log.value.push('    log <message>                      - Log a message');
      log.value.push('    set <var> = <value>                - Set a variable');
      log.value.push('    export puml                        - Export to PlantUML');
      log.value.push('    snapshot [name]                    - Save config snapshot');
      log.value.push('    clear                              - Clear console');
      log.value.push('    history                            - Show command history');
      log.value.push('    help                               - Show this help');
      log.value.push('  Examples:');
      log.value.push('    node add API Service capacity=100');
      log.value.push('    group create frontend "Frontend Layer" color=#4ade80');
      log.value.push('    group add-node frontend API');
      log.value.push('    link add API Database');
      log.value.push('    node set API capacity=200');
      return;
    }
    
    try {
      // Initialize console context if not exists
      if (!consoleInterpreter || !consoleContext) {
        initConsoleContext();
      }
      
      if (consoleContext) {
        consoleContext.config = JSON.parse(JSON.stringify(config.value));
        consoleContext.metrics = lastAggregatedMetrics.value;
      }
      
      if (consoleInterpreter) {
        await consoleInterpreter.execute(command);
        
        if (consoleContext) {
          config.value = JSON.parse(JSON.stringify(consoleContext.config));
          cfgText.value = JSON.stringify(consoleContext.config, null, 2);
          recalculateStatistics('console final apply');
        }
      }
    } catch (error: any) {
      log.value.push(`Error: ${error.message}`);
    }
  }
  
  // Script execution
  async function runScript() {
    try {
      scriptRunning.value = true;
      scriptError.value = undefined;
      
      const context: ScriptContext = {
        config: JSON.parse(JSON.stringify(config.value)), 
        metrics: lastAggregatedMetrics.value,
        log: (msg: string) => log.value.push(`[script] ${msg}`),
        updateConfig: (newConfig: any) => {
          config.value = newConfig;
          cfgText.value = JSON.stringify(newConfig, null, 2);
          recalculateStatistics('script updateConfig');
        },
        applyChanges: () => {
          config.value = JSON.parse(JSON.stringify(context.config));
          cfgText.value = JSON.stringify(context.config, null, 2);
          recalculateStatistics('script applyChanges');
        },
        generatePuml: () => {
          generatePuml();
          return pumlText.value;
        },
        variables: new Map(),
        snapshots: new Map()
      };
      
      scriptInterpreter = new ScriptInterpreter(context);
      await scriptInterpreter.execute(script.value);
      
      config.value = JSON.parse(JSON.stringify(context.config));
      cfgText.value = JSON.stringify(context.config, null, 2);
      recalculateStatistics('script completed');
      
      log.value.push('[script] Completed successfully');
    } catch (error: any) {
      scriptError.value = error.message;
      log.value.push(`[script] Error: ${error.message}`);
    } finally {
      scriptRunning.value = false;
      scriptInterpreter = null;
    }
  }
  
  // Stop script execution
  function stopScript() {
    if (scriptInterpreter) {
      scriptInterpreter.stop();
      log.value.push('[script] Stopped by user');
    }
  }

  return {
    // State
    cmd,
    log: computed(() => log.value),
    script,
    scriptRunning: computed(() => scriptRunning.value),
    scriptError: computed(() => scriptError.value),
    
    // Console functions
    execCmd,
    handleHistoryNavigation,
    initConsoleContext,
    
    // Script functions
    runScript,
    stopScript,
    
    // Console state
    consoleState: computed((): ConsoleState => ({
      cmd: cmd.value,
      log: log.value,
      script: script.value,
      scriptRunning: scriptRunning.value,
      scriptError: scriptError.value
    }))
  };
}

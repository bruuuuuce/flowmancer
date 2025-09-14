# Traffic Simulator Script Language

## Overview
The script language allows automating actions on the traffic simulator diagram. Scripts are executed line by line with support for timing control, conditional execution, and graph manipulation.

## Command Reference

### Node Operations

#### node add <id> <kind> [properties]
Creates a new node with specified properties.
```
node add api1 Service
node add db1 DB capacity_in=50 capacity_out=100 base_ms=100
node add ingress1 Ingress rateRps=100
```

#### node remove <id>
Removes a node and all its connections.
```
node remove api1
```

#### node set <id> <property>=<value> [...]
Updates properties of an existing node.
```
node set api1 capacity_in=100 capacity_out=200
node set lb1 routing.policy=weighted routing.weights.api1=70 routing.weights.api2=30
```

#### node get <id> [property]
Gets node properties (logs to console).
```
node get api1
node get api1 capacity_in
```

### Link Operations

#### link add <from> <to>
Creates a link between two nodes.
```
link add ingress1 lb1
link add lb1 api1
```

#### link remove <from> <to>
Removes a link between two nodes.
```
link remove lb1 api1
```

### Flow Control

#### wait <milliseconds>
Pauses script execution for specified time.
```
wait 1000  # Wait 1 second
wait 500   # Wait 500ms
```

#### loop <count>
Repeats the next block of commands.
```
loop 5
  node set api1 capacity_in=$random(50,150)
  wait 1000
end
```

#### if <condition>
Conditional execution based on node properties or metrics.
```
if node.api1.err_in > 0
  node set api1 capacity_in=200
  log "Increased api1 capacity due to input errors"
end
```

### Export and Logging

#### export puml [filename]
Exports current graph as PlantUML with metrics annotations.
```
export puml
export puml snapshot-1.puml
```

#### log <message>
Logs a message to the console.
```
log "Starting stress test..."
log "Current RPS: $metrics.totalRPS"
```

#### snapshot [name]
Saves current configuration snapshot.
```
snapshot before-test
# ... run test ...
snapshot after-test
```

### Variables and Expressions

#### Variables
- `$random(min, max)` - Random number between min and max
- `$time` - Current timestamp
- `$metrics.totalRPS` - Total system RPS
- `$metrics.totalErrors` - Total system errors
- `$node.<id>.<property>` - Access node property
- `$i` - Loop iteration counter (inside loops)

#### Examples
```
# Gradual capacity increase
loop 10
  node set api1 capacity_in=$i*10+50
  wait 500
end

# Random load testing
loop 20
  node set ingress1 rateRps=$random(10,200)
  wait 2000
  log "RPS: $metrics.totalRPS, Errors: $metrics.totalErrors"
end
```

### Complete Example Scripts

#### Stress Test Script
```
# Stress test with gradual load increase
log "Starting stress test..."
snapshot initial

# Start with low load
node set ingress1 rateRps=10
wait 2000

# Gradually increase load
loop 10
  node set ingress1 rateRps=$i*20
  wait 1000
  log "Load: $i*20 RPS, System RPS: $metrics.totalRPS"
  
  if $metrics.totalErrors > 10
    log "System overloaded at $i*20 RPS"
    break
  end
end

export puml stress-test-result.puml
log "Stress test completed"
```

#### Failover Test Script
```
# Test failover scenario
log "Testing failover scenario..."

# Normal operation
node add api1 Service capacity_in=100
node add api2 Service capacity_in=100
link add lb1 api1
link add lb1 api2
node set lb1 routing.policy=weighted routing.weights.api1=50 routing.weights.api2=50
wait 3000

# Simulate api1 failure
log "Simulating api1 failure..."
node set api1 p_fail=1.0
wait 2000

# Check if traffic shifts to api2
if $node.api2.incomingRate > 80
  log "Failover successful - traffic shifted to api2"
else
  log "Failover failed - traffic not properly redistributed"
end

# Restore api1
node set api1 p_fail=0.01
log "api1 restored"
wait 2000

export puml failover-test.puml
```

#### Capacity Planning Script
```
# Find optimal capacity settings
log "Starting capacity planning..."

# Test different capacity configurations
loop 5
  set capacity_in = $i * 50
  node set api1 capacity_in=$capacity_in
  wait 2000
  
  if $node.api1.err_in == 0
    log "Capacity $capacity_in is sufficient"
    break
  else
    log "Capacity $capacity_in insufficient, errors: $node.api1.err_in"
  end
end

log "Optimal capacity found: $capacity_in"
```

## Execution Model

1. Scripts are executed line by line
2. Commands are case-insensitive
3. Comments start with # 
4. Blank lines are ignored
5. Errors stop execution and report line number
6. All changes are applied immediately to the live graph
7. Wait commands are non-blocking (UI remains responsive)

## Error Handling

Scripts will stop and report errors for:
- Syntax errors (invalid command format)
- Reference errors (node/link doesn't exist)
- Type errors (invalid property values)
- Runtime errors (division by zero, etc.)

Error format: `Line X: <error message>`

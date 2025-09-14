# Script Language Extensions

## Overview
Extended scripting capabilities for batch operations, node/group isolation, and PUML-like graph manipulation.

## 1. Node Isolation Commands

### `node isolate <id> [direction]`
Removes connections to/from a specific node.

**Parameters:**
- `id`: Node identifier
- `direction`: Optional. One of:
  - `in` - Remove all incoming edges
  - `out` - Remove all outgoing edges  
  - `both` - Remove all edges (default)

**Examples:**
```bash
node isolate API in          # Remove all incoming connections to API
node isolate Cache out       # Remove all outgoing connections from Cache
node isolate Database        # Completely isolate Database (both directions)
```

### `node disconnect <id> [target]`
Alternative syntax for connection removal.

**Parameters:**
- `id`: Node identifier
- `target`: Specific node to disconnect from, or `all`

**Examples:**
```bash
node disconnect API from Database  # Remove specific connection
node disconnect API from all       # Remove all incoming
node disconnect API to all         # Remove all outgoing
```

## 2. Group/Boundary Isolation Commands

### `group isolate <id> [scope]`
Removes connections for an entire boundary group.

**Parameters:**
- `id`: Group identifier
- `scope`: Optional. One of:
  - `in` - Remove incoming edges to group
  - `out` - Remove outgoing edges from group
  - `internal` - Remove edges within group
  - `external` - Remove edges crossing group boundary
  - `all` - Remove all edges (default)

**Examples:**
```bash
group isolate frontend in         # No incoming traffic to frontend group
group isolate backend out         # Backend group cannot send traffic out
group isolate processing internal  # Remove internal group connections
```

## 3. PUML-Style Graph Manipulation

### `graph add <expression>`
Creates nodes and edges using PUML-like syntax.

**Syntax patterns:**
- `A -> B` - Simple connection
- `A -> [B, C, D]` - One to many
- `[A, B] -> C` - Many to one
- `A -> B -> C` - Chain
- `A:Type -> B` - With node type
- `A[prop=value] -> B` - With properties

**Examples:**
```bash
graph add A -> B                        # Create nodes and edge
graph add API:Service -> Cache:Cache    # With types
graph add LB -> [Service1, Service2]    # Load balancer to services
graph add Frontend[capacity=100] -> API # With properties
```

### `graph remove <expression>`
Removes edges matching the pattern.

**Wildcard support:**
- `*` matches any node
- `A -> *` - All edges from A
- `* -> B` - All edges to B

**Examples:**
```bash
graph remove A -> B          # Remove specific edge
graph remove API -> *        # Remove all outgoing from API
graph remove * -> Database   # Remove all incoming to Database
```

### `graph apply ... end`
Multi-line graph definition block.

**Syntax:**
```bash
graph apply
  Ingress -> LoadBalancer
  LoadBalancer -> [ServiceA, ServiceB]
  ServiceA -> Cache -> Database
  ServiceB -> Database
  @group(backend, "Backend Services", #3b82f6)
    ServiceA
    ServiceB
    Cache
  @end
end
```

## 4. Query and Selection

### `node select <criteria>`
Selects nodes based on criteria for batch operations.

**Criteria syntax:**
- `kind=<type>` - By node type
- `capacity<n`, `capacity>n`, `capacity=n` - By capacity
- `group=<id>` - By group membership
- `has:<property>` - Has property
- `id~pattern` - ID matches pattern

**Examples:**
```bash
node select kind=Service              # All service nodes
node select capacity<50               # Low capacity nodes
node select group=frontend            # Nodes in frontend group
node select id~API*                   # Nodes with ID starting with API
```

### Pipe operations on selections
Selected nodes can be piped to operations:

```bash
node select kind=Cache | set hitRatio=0.9     # Set property on all caches
node select capacity<50 | remove              # Remove low capacity nodes
node select group=test | isolate in           # Isolate all test nodes
```

## 5. Batch Operations

### `batch ... end`
Execute multiple operations atomically.

```bash
batch
  node add ServiceA Service capacity=100
  node add ServiceB Service capacity=100
  graph add LoadBalancer -> [ServiceA, ServiceB]
  group create services "Service Pool"
  group add-node services ServiceA
  group add-node services ServiceB
end
```

## 6. Variables and Templates

### Using variables in graph operations
```bash
set services = [ServiceA, ServiceB, ServiceC]
graph add LoadBalancer -> $services
```

### Template expansion
```bash
# Create multiple similar nodes
for i in 1..5
  node add Service_$i Service capacity=100
  graph add LoadBalancer -> Service_$i
end
```

## 7. Examples

### Complete service mesh setup
```bash
# Create a microservices architecture
graph apply
  # Ingress layer
  Client:Ingress -> Gateway:LoadBalancer
  
  # Service layer
  Gateway -> [Auth:Service, API:Service]
  API -> [Users:Service, Orders:Service, Products:Service]
  
  # Data layer
  Users -> UserDB:DB
  Orders -> OrderDB:DB
  Products -> [ProductDB:DB, Cache:Cache]
  Cache -> ProductDB
  
  # Monitoring
  * -> Metrics:Sink[monitoring=true]
end

# Group services
group create frontend "Frontend" color=#4ade80
group add-node frontend Client Gateway

group create services "Services" color=#3b82f6  
group add-node services Auth API Users Orders Products

group create data "Data Layer" color=#f59e0b
group add-node data UserDB OrderDB ProductDB Cache
```

### Chaos engineering simulation
```bash
# Simulate failures
log "Starting chaos test..."

# Take down a service
node isolate Orders both
wait 2000
log "Orders service isolated"

# Restore with reduced capacity
node set Orders capacity=50
graph add API -> Orders
wait 2000

# Remove random connections
graph remove Products -> *
wait 1000
graph add Products -> [ProductDB, Cache]

log "Chaos test completed"
```

### Progressive rollout
```bash
# Blue-green deployment simulation
batch
  # Create new version
  node add ServiceV2 Service capacity=0
  
  # Gradually shift traffic
  for percent in [10, 25, 50, 75, 100]
    node set ServiceV1 capacity=$((100 - percent))
    node set ServiceV2 capacity=$percent
    log "Rollout at ${percent}%"
    wait 2000
  end
  
  # Remove old version
  node remove ServiceV1
end
```

## Implementation Notes

These extensions require updates to:
1. `ScriptInterpreter.ts` - New command handlers
2. `useAutoComplete.ts` - Autocomplete for new commands
3. Console help text - Document new commands

The implementation should maintain backward compatibility with existing scripts.

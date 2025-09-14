# Statistics Dashboard

The enhanced Statistics Dashboard provides comprehensive insights into your traffic simulation through a tabbed interface with multiple specialized views.

## Features

### Global Stats Bar
Always visible at the top, showing:
- **RPS** (Requests Per Second) - Current throughput
- **In Flight** - Number of active messages in the system
- **Nodes** - Total node count
- **Links** - Total link count

### Tabbed Views

#### 1. Overview Tab
Quick system health summary with:
- Performance metrics (throughput, latency, error rate)
- Top bottlenecks identification
- System-wide aggregated statistics

#### 2. Nodes Tab
Detailed per-node statistics table with:
- Node ID and type
- Input/output rates
- Processing latency
- Capacity and utilization percentage (with visual bars)
- Error rates
- Sortable columns for easy analysis
- Color-coded highlighting for overloaded nodes (>80% utilization)

#### 3. Paths Tab
End-to-end path analysis featuring:
- Complete path listings from ingress to sink nodes
- Traffic rate per path
- End-to-end latency measurements
- Packet drop rates
- Path status indicators (healthy/degraded/critical)
- Filtering options:
  - All paths
  - Critical paths (>100ms latency)
  - Lossy paths (>1% drop rate)
  - Top 10 by traffic volume

#### 4. Boundaries Tab
Group-based statistics when boundary groups are defined:
- Per-group traffic analysis
- Ingress/egress/internal traffic rates
- Average internal latency
- Cross-boundary link counts
- Visual group identification with colors

#### 5. Analysis Tab
Intelligent system analysis providing:
- **Bottleneck Detection**: Identifies nodes with >80% utilization
- **Critical Path Analysis**: Highlights paths with performance issues
- **Smart Recommendations**: Actionable suggestions for system optimization
- Severity indicators (critical/high/medium)
- Impact assessment showing affected paths

#### 6. Topology Tab
Graph structure analysis including:
- **Loop Detection**: Identifies circular dependencies that could cause infinite message loops
- **Graph Properties**: 
  - Graph type classification
  - Connectivity status
  - Maximum depth calculation
  - Isolated node detection
- **Connectivity Matrix**: Visual representation of node reachability

## Visual Indicators

### Color Coding
- **Green**: Healthy/normal operation
- **Yellow/Orange**: Warning states (70-90% utilization)
- **Red**: Critical issues (>90% utilization, errors)

### Utilization Bars
Visual representation of resource usage with percentage display

### Status Badges
Quick visual indicators for:
- Path health (healthy/degraded/critical)
- Bottleneck severity
- Issue types

## Interactive Features

### Sorting
Click column headers in tables to sort by that metric

### Filtering
Path analysis supports multiple filter presets for focused analysis

### Tab Badges
Dynamic count badges on tabs show relevant metrics (e.g., node count, issue count)

### Overlay Modes
- **Normal**: Default positioned view
- **Floating**: Draggable window mode
- **Fullscreen**: Maximized view for detailed analysis

## Metrics Collection

The dashboard integrates with the metrics composable (`useMetrics`) which provides:
- Real-time metric updates
- Historical data tracking
- Automatic bottleneck detection
- Critical path identification

## Usage Tips

1. **Start with Overview**: Get a quick system health check
2. **Drill into Nodes**: Identify specific bottlenecks
3. **Analyze Paths**: Understand end-to-end performance
4. **Check Topology**: Ensure no loops or connectivity issues
5. **Follow Recommendations**: Apply suggested optimizations

## Keyboard Shortcuts

The Statistics Dashboard supports keyboard navigation:
- `Tab`: Navigate between tabs
- `Arrow keys`: Navigate within tables
- `Escape`: Close overlay (when not in fullscreen)

## Technical Implementation

The enhanced stats overlay is implemented as a Vue 3 component with:
- Reactive data binding to simulation metrics
- Computed properties for derived statistics
- Efficient rendering with virtual scrolling for large datasets
- CSS variables for consistent theming
- Full TypeScript support

## Performance Considerations

- Metrics are calculated lazily using computed properties
- Tables use virtual scrolling for large datasets
- Loop detection is limited to prevent performance issues
- History tracking is capped at 100 data points

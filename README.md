# 🧙‍♂️ Flowmancer

> *Master the art of distributed system flows*

[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status: WIP](https://img.shields.io/badge/Status-Work%20in%20Progress-orange.svg)]()

**Flowmancer** is an interactive, browser-based traffic flow simulator that lets you conjure, visualize, and master the flow of data through distributed systems and microservices architectures. Watch as your messages dance through the network, revealing bottlenecks, optimizing paths, and bringing clarity to complexity.

## ✨ Features

### 🎨 Visualization & Interface
- **Visual Graph Editor** - Drag-and-drop interface with automatic layout using ELK.js
- **Real-time Canvas Rendering** - Smooth 60 FPS visualization with viewport controls (zoom, pan)
- **Multi-mode Overlays** - Normal, floating, and fullscreen modes for all interface panels
- **Responsive Design** - Optimized for desktop and mobile devices
- **Theme Support** - Light/dark theme toggle with system preference detection
- **Toast Notifications** - User-friendly feedback system for actions and errors

### 📊 Metrics & Analytics  
- **Advanced Stats Dashboard** - Multi-tabbed interface with Overview, Nodes, Paths, Boundaries, Analysis, and Topology views
- **Real-time Metrics** - Monitor throughput, latency, error rates, and system utilization
- **Bottleneck Detection** - Automatic identification of system constraints and performance issues
- **Path Analysis** - Detailed flow analysis with filtering and sorting capabilities
- **Utilization Tracking** - Visual capacity usage indicators and performance bars
- **Boundary Group Analytics** - Cross-cutting metrics for logical service groups
- **Connectivity Matrix** - Topology analysis with adjacency visualization
- **Performance Recommendations** - AI-powered suggestions for system optimization

### 🔄 Traffic Simulation
- **Realistic Message Flow** - Configurable traffic patterns with load balancing simulation
- **Deterministic Engine** - Reproducible results with configurable parameters
- **Multiple Node Types** - Source, Service, Cache, LoadBalancer, Database, Queue, and Sink
- **Dynamic Routing** - Support for complex routing policies and traffic distribution
- **Error Simulation** - Configurable failure rates and error propagation
- **Queue Management** - Realistic buffering with overflow and backpressure handling

### 💻 Interactive Tools
- **Smart Console** - Command-line interface with auto-completion and command history
- **Script Engine** - JavaScript-based automation with real-time execution
- **Configuration Management** - Live JSON editing with validation and error reporting
- **Import/Export Support** - PlantUML, Draw.io, and JSON format compatibility
- **Baseline Management** - Load and save predefined configurations
- **ELK Layout Controls** - Fine-tune automatic graph layout parameters

### 🎛️ Advanced Configuration
- **Boundary Groups** - Organize nodes into logical groups for better visualization
- **Custom Node Properties** - Configurable capacity, latency, error rates, and service times
- **Link Customization** - Bidirectional connections with independent properties
- **Group Styling** - Custom colors and labels for organizational clarity
- **Persistent State** - Automatic state management across browser sessions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/bruuuuuce/flowmancer.git
cd flowmancer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Usage

### Basic Configuration

The simulator starts with a default configuration. You can modify it through multiple interfaces:

1. **Config Overlay** (`Ctrl+C`) - Edit JSON configuration directly with live validation
2. **Interactive Console** (`Ctrl+K`) - Use commands with auto-completion and history
3. **Script Engine** (`Ctrl+R`) - Write and execute JavaScript automation scripts
4. **Import Tools** - Load from PlantUML (`Ctrl+P`) or Draw.io formats
5. **ELK Controls** (`Ctrl+E`) - Fine-tune automatic graph layout parameters
6. **Stats Dashboard** (`Ctrl+S`) - Monitor and analyze system performance

### Node Types

- **Source** - Traffic generator (configurable RPS)
- **Service** - Processing node with capacity and latency
- **LoadBalancer** - Distributes traffic across targets
- **Cache** - Caching layer with hit ratio
- **Database** - Data storage with higher latency
- **Queue** - Message queue with configurable depth
- **Sink** - Traffic terminator

### Console Commands

The interactive console supports a rich command set with auto-completion and history:

```bash
# Node operations
node add API Service capacity=100 latency=50
node remove API
node set API capacity=200 errorRate=0.01
node get API
node list          # List all nodes
node off API       # Temporarily disable node
node on API        # Re-enable node

# Link operations
link add API Database weight=0.8
link remove API Database
link list          # Show all connections

# Group operations (Boundary Groups)
group create frontend "Frontend Layer" color=#4ade80
group add-node frontend API
group remove-node frontend API
group list         # Show all groups
group delete frontend

# Import/Export
export puml        # Export to PlantUML format
export json        # Export current configuration
load baseline      # Load default configuration
snapshot          # Save current state

# Analysis
stats             # Show current metrics
paths             # List all traffic paths
bottlenecks       # Identify performance constraints

# Utility
clear             # Clear console history
help              # Show all available commands
version           # Show application version
```

### Keyboard Shortcuts

Flowmancer supports comprehensive keyboard navigation for power users:

**Core Controls:**
- `Space` - Play/Pause simulation
- `Escape` - Close all overlays
- `Shift+?` - Show complete keyboard shortcuts help

**Overlay Toggles:**
- `S` - Toggle Stats dashboard (multi-tabbed analytics)
- `C` - Toggle Config editor (JSON configuration)
- `O` - Toggle Console (interactive command-line)
- `R` - Toggle Scripts (JavaScript automation)
- `P` - Toggle PlantUML editor (import/export)
- `E` - Toggle ELK settings (layout controls)
- `D` - Toggle Draw.io import
- `Ctrl+I` - Toggle About overlay (project information)

**Advanced Navigation:**
- Mouse wheel zoom on canvas
- Click and drag to pan viewport
- Overlay drag & drop in floating mode
- Tab navigation through interface elements

## 🏗️ Architecture

Flowmancer follows a clean, modular architecture with separation of concerns:

```
src/
├── ui/                    # Vue 3 + TypeScript components
│   ├── App.vue           # Main application (refactored with composables)
│   └── components/       # UI components
│       ├── overlays/     # Multi-mode overlay windows
│       │   ├── StatsOverlayEnhanced.vue    # Advanced analytics dashboard
│       │   ├── ConfigOverlay.vue           # JSON configuration editor
│       │   ├── ConsoleOverlay.vue          # Interactive command-line
│       │   ├── ScriptsOverlay.vue          # JavaScript automation
│       │   ├── PumlOverlay.vue            # PlantUML import/export
│       │   ├── ElkOverlay.vue             # Layout configuration
│       │   ├── DrawioOverlay.vue          # Draw.io integration
│       │   └── AboutOverlay.vue           # Project information
│       ├── Toolbar.vue                    # Main navigation
│       └── ToastNotifications.vue         # User feedback system
├── composables/          # Vue 3 composables (business logic)
│   ├── useCanvasManager.ts               # Canvas rendering & ELK integration
│   ├── useOverlayManager.ts               # Multi-mode overlay system
│   ├── useMetricsManager.ts               # Real-time metrics engine
│   ├── useConsoleManager.ts               # Command-line interface
│   ├── useConfigManager.ts                # Configuration management
│   ├── useKeyboardShortcuts.ts           # Keyboard navigation
│   ├── useToast.ts                       # Notification system
│   └── useTheme.ts                       # Theme management
├── metrics/              # Advanced metrics system
│   ├── MetricNode.ts     # Node-level calculations
│   ├── MetricsAggregator.ts # System-wide aggregation
│   └── PathAnalyzer.ts   # Traffic flow analysis
├── scripting/            # JavaScript automation engine
│   ├── ScriptInterpreter.ts              # Script execution environment
│   └── CommandProcessor.ts               # Console command handling
└── parsers/              # Import/export formats
    ├── puml.ts          # PlantUML parser
    ├── drawio.ts        # Draw.io XML parser
    └── json.ts          # JSON configuration

```

### Design Patterns Used

- **Composables Pattern**: Business logic extracted into reusable Vue 3 composables
- **Observer Pattern**: Reactive metrics system with real-time updates  
- **Command Pattern**: Console commands with undo/redo support
- **Strategy Pattern**: Pluggable node types and routing algorithms
- **Factory Pattern**: Dynamic node and link creation
- **Module Pattern**: Clean separation of concerns across domains

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:run -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:headed
```

## 🛠️ Development

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run
```

## 📊 Advanced Metrics System

Flowmancer features a sophisticated, deterministic metrics engine designed for accuracy and performance:

### Core Engine Features
- **Topological Calculation** - Metrics computed in dependency order for accuracy
- **Cycle Detection** - Graceful handling of circular dependencies and feedback loops
- **Deterministic Results** - Reproducible outcomes with configurable random seeds
- **60 FPS Updates** - Smooth real-time visualization without performance degradation
- **Memory Efficient** - Optimized data structures for large topology support
- **Thread-Safe** - Concurrent metric calculation with web workers

### Comprehensive Metrics Dashboard

**Overview Tab:**
- Global RPS (Requests Per Second) and system health
- Total inflight requests and queue depths
- System-wide error rates and success metrics
- Real-time performance indicators

**Nodes Tab:**
- Per-node throughput, utilization, and capacity metrics
- Latency distributions with percentiles (P50, P95, P99)
- Error rates and failure categorization
- Queue lengths and backpressure indicators
- Interactive sorting and filtering

**Paths Tab:**
- End-to-end path analysis from sources to sinks
- Traffic distribution across parallel paths
- Path-specific latency and error tracking
- Load balancer effectiveness metrics
- Critical path identification

**Boundaries Tab:**
- Cross-cutting metrics for boundary groups
- Service mesh and microservice boundary analysis
- Inter-service communication patterns
- Dependency mapping and impact analysis

**Analysis Tab:**
- **Bottleneck Detection** - Automatic identification of system constraints
- **Performance Recommendations** - AI-powered optimization suggestions
- **Capacity Planning** - Scaling recommendations based on utilization
- **SLA Compliance** - Service level agreement tracking
- **Trend Analysis** - Historical performance patterns

**Topology Tab:**
- **Connectivity Matrix** - Visual representation of system dependencies
- **Graph Properties** - Centrality, clustering, and network metrics
- **Critical Nodes** - Single points of failure identification
- **Network Diameter** - Communication path efficiency analysis

### Key Performance Indicators

- **RPS** (Requests Per Second) - Traffic generation and processing rates
- **Throughput** - Effective message processing capacity
- **Latency** - Response times with configurable jitter and percentiles
- **Error Rate** - Failure probabilities with categorization
- **Utilization** - Resource usage as percentage of capacity
- **Queue Depth** - Buffered message counts and wait times
- **Availability** - Uptime and service reliability metrics
- **Saturation** - Resource exhaustion indicators

## 🤝 Contributing

Contributions are welcome! This project is a work in progress and there's plenty of room for improvement.

### Areas for Contribution

1. **Code Refactoring** - Split large components (App.vue, StatsOverlayEnhanced.vue)
2. **Testing** - Increase test coverage
3. **Documentation** - Add JSDoc comments and guides
4. **Features** - New node types, routing policies, visualizations
5. **Performance** - Optimize rendering and calculations
6. **UI/UX** - Improve interface and user experience

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Project Status

### ✅ Recently Completed (v0.2.0)

- **Complete Architecture Refactoring** - Extracted business logic into reusable Vue 3 composables
- **Advanced Stats Dashboard** - Multi-tabbed analytics with comprehensive metrics
- **Modular Overlay System** - Clean separation of concerns across all interface panels
- **About/Info Overlay** - Professional project information display
- **Enhanced Testing** - 234+ unit tests with comprehensive coverage
- **Performance Optimization** - 60 FPS rendering with efficient memory management
- **Professional UI/UX** - Consistent design system with responsive layouts

### 🔧 Known Limitations

- **ELK Worker Compatibility** - Worker file name may vary between ELK.js releases
- **Large Topology Performance** - Canvas rendering may slow down with 1000+ nodes
- **Mobile Touch Support** - Drag operations optimized primarily for desktop
- **Browser Compatibility** - Modern browsers required (Chrome 90+, Firefox 88+, Safari 14+)

## 🗺️ Roadmap

### 🎯 Next Release (v0.3.0)

- [ ] **Performance Enhancements**
  - [ ] WebGL-based canvas rendering for large topologies
  - [ ] Virtual scrolling for metrics tables
  - [ ] Web Worker metrics calculation

- [ ] **Advanced Features**
  - [ ] Circuit breaker pattern simulation
  - [ ] Chaos engineering integration (failure injection)
  - [ ] Time-series data export (CSV, JSON, Prometheus)
  - [ ] Custom node type plugins

### 🚀 Future Vision (v1.0.0)

- [ ] **Enterprise Features**
  - [ ] Multi-tenant simulation environments
  - [ ] SSO integration and user management
  - [ ] Persistent configuration storage
  - [ ] Collaboration tools (shared workspaces)
  - [ ] API for programmatic access

- [ ] **Deployment & Scaling**
  - [ ] Docker containerization
  - [ ] Kubernetes deployment manifests
  - [ ] Cloud platform integration (AWS, Azure, GCP)
  - [ ] Performance recording and playback
  - [ ] Distributed simulation across multiple nodes

- [ ] **Advanced Analytics**
  - [ ] Machine learning-powered anomaly detection
  - [ ] Predictive capacity planning
  - [ ] Cost optimization recommendations
  - [ ] SLA violation alerting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [ELK.js](https://github.com/kieler/elkjs) - Automatic graph layout
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [Vitest](https://vitest.dev/) - Blazing Fast Unit Test Framework
- [Playwright](https://playwright.dev/) - E2E Testing

## 👨‍💻 Author

**bruce** - Lead Developer & Architect

## 📧 Contact

Project Link: [https://github.com/bruuuuuce/flowmancer](https://github.com/abruschieri/flowmancer)
Author Link: [https://heybruce.dev](https://heybruce.dev)

---

**Note:** This project is a work in progress. Contributions and feedback are highly appreciated, just like full cups of coffee!

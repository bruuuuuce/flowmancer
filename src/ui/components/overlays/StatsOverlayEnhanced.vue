<template>
  <div 
    class="overlay stats-overlay"
    :class="{ 'overlay-floating': overlayMode === 'floating', 'overlay-fullscreen': overlayMode === 'fullscreen' }"
    :style="getOverlayStyle(overlayKey)"
    @mousedown="(e) => startDrag(overlayKey, e as MouseEvent)"
  >
    <div class="overlay-header">
      <h3 style="margin: 0;">Stats</h3>
      <div class="overlay-controls">
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'normal')" title="Normal">◱</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'floating')" title="Floating">↗</button>
        <button class="overlay-btn" @click="setOverlayMode(overlayKey, 'fullscreen')" title="Fullscreen">⛶</button>
        <button class="overlay-btn" @click="$emit('close')" title="Close">×</button>
      </div>
    </div>

    <!-- Global Stats Bar -->
    <div class="stats-global-bar">
      <div class="stats-badge">
        <span class="stats-badge-label">RPS</span>
        <span class="stats-badge-value">{{ stats.rps }}</span>
      </div>
      <div class="stats-badge">
        <span class="stats-badge-label">In Flight</span>
        <span class="stats-badge-value">{{ stats.inflight }}</span>
      </div>
      <div class="stats-badge">
        <span class="stats-badge-label">Nodes</span>
        <span class="stats-badge-value">{{ nodeCount }}</span>
      </div>
      <div class="stats-badge">
        <span class="stats-badge-label">Links</span>
        <span class="stats-badge-value">{{ linkCount }}</span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="stats-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="stats-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="stats-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-panel">
        <h4>System Overview</h4>
        <div class="overview-grid">
          <div class="overview-card">
            <h5>Performance</h5>
            <div class="metric-row">
              <span>Total Throughput:</span>
              <span class="metric-value">{{ totalThroughput.toFixed(1) }} msg/s</span>
            </div>
            <div class="metric-row">
              <span>Avg Latency:</span>
              <span class="metric-value">{{ avgLatency.toFixed(1) }} ms</span>
            </div>
            <div class="metric-row">
              <span>Error Rate:</span>
              <span class="metric-value error">{{ errorRate.toFixed(2) }}%</span>
            </div>
          </div>
          
          <div class="overview-card">
            <h5>Top Bottlenecks</h5>
            <div v-for="node in topBottlenecks" :key="node.id" class="metric-row">
              <span>{{ node.id }}:</span>
              <span class="metric-value" :class="{ error: node.utilization > 0.9 }">
                {{ (node.utilization * 100).toFixed(0) }}% utilized
              </span>
            </div>
          </div>
        </div>
        
        <!-- Node Capacity Errors -->
        <div v-if="nodeErrors && nodeErrors.length > 0" style="margin-top: 16px;">
          <h5>Node Capacity Status</h5>
          <div class="table-container">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th title="Input capacity errors">err_in/s</th>
                  <th title="Output capacity errors">err_out/s</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="n in nodeErrors" :key="n.id">
                  <td>{{ n.id }}</td>
                  <td :style="{ color: n.err_in > 0 ? '#f87171' : 'inherit' }">{{ n.err_in.toFixed(1) }}</td>
                  <td :style="{ color: n.err_out > 0 ? '#fbbf24' : 'inherit' }">{{ n.err_out.toFixed(1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Link Throughput -->
        <div v-if="linkStats && linkStats.length > 0" style="margin-top: 16px;">
          <h5>Link Throughput</h5>
          <div class="table-container">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>Link</th>
                  <th>→ Rate</th>
                  <th>← Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in linkStats" :key="l.id">
                  <td>{{ l.id.replace('->', '-') }} ({{ l.id }})</td>
                  <td>{{ l.ab.toFixed(1) }}</td>
                  <td>{{ l.ba.toFixed(1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Nodes Tab -->
      <div v-if="activeTab === 'nodes'" class="tab-panel">
        <h4>Node Statistics</h4>
        <div class="table-container">
          <table class="stats-table">
            <thead>
              <tr>
                <th @click="sortNodes('id')">Node <span class="sort-icon">{{ getSortIcon('id') }}</span></th>
                <th @click="sortNodes('type')">Type</th>
                <th @click="sortNodes('inRate')">In Rate</th>
                <th @click="sortNodes('outRate')">Out Rate</th>
                <th @click="sortNodes('latency')">Latency</th>
                <th @click="sortNodes('capacity')">Capacity</th>
                <th @click="sortNodes('utilization')">Utilization</th>
                <th @click="sortNodes('errors')">Errors/s</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="node in sortedNodeStats" :key="node.id" :class="{ highlight: node.utilization > 0.8 }">
                <td class="node-id">{{ node.id }}</td>
                <td>{{ node.type }}</td>
                <td>{{ node.inRate.toFixed(1) }}</td>
                <td>{{ node.outRate.toFixed(1) }}</td>
                <td>{{ node.latency ? node.latency.toFixed(1) + ' ms' : '-' }}</td>
                <td>{{ node.capacity }}</td>
                <td>
                  <div class="utilization-bar">
                    <div 
                      class="utilization-fill" 
                      :style="{ width: (node.utilization * 100) + '%' }"
                      :class="getUtilizationClass(node.utilization)"
                    ></div>
                    <span class="utilization-text">{{ (node.utilization * 100).toFixed(0) }}%</span>
                  </div>
                </td>
                <td :class="{ error: node.errors > 0 }">{{ node.errors.toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Paths Tab -->
      <div v-if="activeTab === 'paths'" class="tab-panel">
        <h4>Path Analysis</h4>
        <div class="paths-filters">
          <select v-model="pathFilter" class="path-filter">
            <option value="all">All Paths</option>
            <option value="critical">Critical Paths (>100ms)</option>
            <option value="lossy">Lossy Paths (>1% drop)</option>
            <option value="top">Top 10 by Traffic</option>
          </select>
        </div>
        <div class="table-container">
          <table class="stats-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Hops</th>
                <th>Traffic Rate</th>
                <th>End-to-End Latency</th>
                <th>Drop Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="path in filteredPaths" :key="path.id">
                <td class="path-name">{{ path.from }} → {{ path.to }}</td>
                <td>{{ path.hops }}</td>
                <td>{{ path.rate.toFixed(1) }} msg/s</td>
                <td :class="{ warning: path.latency > 100, error: path.latency > 200 }">
                  {{ path.latency.toFixed(1) }} ms
                </td>
                <td :class="{ warning: path.dropRate > 0.01, error: path.dropRate > 0.05 }">
                  {{ (path.dropRate * 100).toFixed(2) }}%
                </td>
                <td>
                  <span class="status-badge" :class="getPathStatus(path)">
                    {{ getPathStatus(path) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Drop Breakdown Section -->
        <div v-if="dropDetails" class="drop-breakdown-section">
          <h4 style="margin-top: 16px;">Drop Breakdown by Node</h4>
          <div class="table-container">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th title="Processing errors (from p_fail)">Processing Errors/s</th>
                  <th title="Errors received from upstream">Incoming Errors/s</th>
                  <th title="Total drops per second">Total Drops/s</th>
                  <th>Drop %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in dropDetails" :key="d.nodeId">
                  <td class="node-id">{{ d.nodeId }}</td>
                  <td :class="{ error: d.processingErrors > 0 }">
                    {{ d.processingErrors.toFixed(3) }}
                  </td>
                  <td :class="{ warning: d.incomingErrors > 0 }">
                    {{ d.incomingErrors.toFixed(3) }}
                  </td>
                  <td :class="{ error: d.totalDrops > 0 }">
                    <strong>{{ d.totalDrops.toFixed(3) }}</strong>
                  </td>
                  <td :class="{ error: getDropPercentage(d) > 1 }">
                    {{ getDropPercentage(d).toFixed(2) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="drop-summary">
            <span>Total system drops: <strong>{{ totalDropRate.toFixed(3) }}/s</strong></span>
            <span class="separator">•</span>
            <span>Overall drop rate: <strong :class="{ error: dropPercentage > 1 }">{{ dropPercentage.toFixed(2) }}%</strong></span>
          </div>
        </div>
      </div>

      <!-- Boundaries Tab -->
      <div v-if="activeTab === 'boundaries'" class="tab-panel">
        <h4>Boundary Group Statistics</h4>
        <div v-if="!groupStats || groupStats.length === 0" class="empty-state">
          No boundary groups defined
        </div>
        <div v-else class="boundary-cards">
          <div v-for="group in groupStats" :key="group.id" class="boundary-card">
            <div class="boundary-header" :style="{ borderColor: group.color }">
              <h5>{{ group.name }}</h5>
              <span class="boundary-node-count">{{ group.nodeCount }} nodes</span>
            </div>
            <div class="boundary-metrics">
              <div class="metric-row">
                <span>Ingress Traffic:</span>
                <span class="metric-value">{{ group.ingressRate.toFixed(1) }} msg/s</span>
              </div>
              <div class="metric-row">
                <span>Egress Traffic:</span>
                <span class="metric-value">{{ group.egressRate.toFixed(1) }} msg/s</span>
              </div>
              <div class="metric-row">
                <span>Internal Traffic:</span>
                <span class="metric-value">{{ group.internalRate.toFixed(1) }} msg/s</span>
              </div>
              <div class="metric-row">
                <span>Avg Internal Latency:</span>
                <span class="metric-value">{{ group.avgInternalLatency.toFixed(1) }} ms</span>
              </div>
              <div class="metric-row">
                <span>Cross-boundary Links:</span>
                <span class="metric-value">{{ group.crossBoundaryLinks }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Tab -->
      <div v-if="activeTab === 'analysis'" class="tab-panel">
        <h4>System Analysis</h4>
        
        <div class="analysis-section">
          <h5>🔴 Bottlenecks</h5>
          <div v-if="bottlenecks.length === 0" class="info-message">
            No bottlenecks detected
          </div>
          <div v-else class="bottleneck-list">
            <div v-for="bottleneck in bottlenecks" :key="bottleneck.id" class="bottleneck-item">
              <span class="bottleneck-node">{{ bottleneck.id }}</span>
              <span class="bottleneck-severity" :class="bottleneck.severity">
                {{ bottleneck.severity }} ({{ (bottleneck.utilization * 100).toFixed(0) }}% utilized)
              </span>
              <span class="bottleneck-impact">
                Affecting {{ bottleneck.affectedPaths }} paths
              </span>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h5>⚠️ Critical Paths</h5>
          <div v-if="criticalPaths.length === 0" class="info-message">
            No critical paths identified
          </div>
          <div v-else class="critical-paths-list">
            <div v-for="path in criticalPaths" :key="path.id" class="critical-path-item">
              <span class="path-route">{{ path.route }}</span>
              <div class="path-issues">
                <span v-for="issue in path.issues" :key="issue" class="issue-badge">
                  {{ issue }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h5>📊 Recommendations</h5>
          <ul class="recommendations">
            <li v-for="rec in recommendations" :key="rec">{{ rec }}</li>
          </ul>
        </div>
      </div>

      <!-- Topology Tab -->
      <div v-if="activeTab === 'topology'" class="tab-panel">
        <h4>Topology Analysis</h4>
        
        <div class="topology-section">
          <h5>🔄 Detected Loops</h5>
          <div v-if="loops.length === 0" class="info-message success">
            ✓ No loops detected in the topology
          </div>
          <div v-else class="loops-list">
            <div v-for="(loop, index) in loops" :key="index" class="loop-item">
              <span class="loop-label">Loop {{ index + 1 }}:</span>
              <span class="loop-path">{{ loop.join(' → ') }} → {{ loop[0] }}</span>
              <span class="loop-warning">⚠️ May cause infinite message circulation</span>
            </div>
          </div>
        </div>

        <div class="topology-section">
          <h5>📐 Graph Properties</h5>
          <div class="graph-properties" v-if="topologyAnalysis">
            <div class="property-row">
              <span>Type:</span>
              <span class="property-value">{{ topologyAnalysis.type }}</span>
            </div>
            <div v-if="topologyAnalysis.subtype" class="property-row">
              <span>Subtype:</span>
              <span class="property-value">{{ topologyAnalysis.subtype }}</span>
            </div>
            <div class="property-row">
              <span>Details:</span>
              <span class="property-value" style="font-size: 11px;">{{ topologyAnalysis.details }}</span>
            </div>
            <div class="property-divider"></div>
            <div class="property-row">
              <span>Connectivity:</span>
              <span class="property-value">
                <span v-if="topologyAnalysis.isStronglyConnected" class="success">Strongly Connected</span>
                <span v-else-if="topologyAnalysis.isConnected">Weakly Connected</span>
                <span v-else class="error">Disconnected ({{ topologyAnalysis.componentCount }} components)</span>
              </span>
            </div>
            <div class="property-row">
              <span>Acyclicity:</span>
              <span class="property-value">
                <span v-if="topologyAnalysis.isDAG" class="success">DAG (No cycles)</span>
                <span v-else class="warning">Cyclic</span>
              </span>
            </div>
            <div class="property-divider"></div>
            <div class="property-row">
              <span>Max Depth:</span>
              <span class="property-value">{{ topologyAnalysis.maxDepth }} hops</span>
            </div>
            <div class="property-row">
              <span>Diameter:</span>
              <span class="property-value" title="Longest shortest path between any two nodes">
                {{ topologyAnalysis.diameter }} hops
              </span>
            </div>
            <div class="property-row">
              <span>Density:</span>
              <span class="property-value" title="Ratio of actual edges to possible edges">
                {{ (topologyAnalysis.density * 100).toFixed(1) }}%
              </span>
            </div>
            <div class="property-divider"></div>
            <div class="property-row">
              <span>Avg Degree:</span>
              <span class="property-value">{{ topologyAnalysis.avgDegree.toFixed(2) }}</span>
            </div>
            <div class="property-row">
              <span>Max In-degree:</span>
              <span class="property-value">{{ topologyAnalysis.maxInDegree }}</span>
            </div>
            <div class="property-row">
              <span>Max Out-degree:</span>
              <span class="property-value">{{ topologyAnalysis.maxOutDegree }}</span>
            </div>
            <div class="property-divider"></div>
            <div class="property-row">
              <span>Central Nodes:</span>
              <span class="property-value">
                <span v-if="topologyAnalysis.centralNodes.length > 0">
                  {{ topologyAnalysis.centralNodes.join(', ') }}
                </span>
                <span v-else>None</span>
              </span>
            </div>
            <div class="property-row">
              <span>Leaf Nodes:</span>
              <span class="property-value">
                <span v-if="topologyAnalysis.leafNodes.length > 0">
                  {{ topologyAnalysis.leafNodes.join(', ') }}
                </span>
                <span v-else>None</span>
              </span>
            </div>
            <div class="property-row">
              <span>Isolated Nodes:</span>
              <span class="property-value" :class="{ warning: topologyAnalysis.isolatedNodes > 0 }">
                {{ topologyAnalysis.isolatedNodes }}
              </span>
            </div>
          </div>
          <div v-else class="info-message">
            No topology data available
          </div>
        </div>

        <div class="topology-section">
          <h5>🌐 Connectivity Matrix</h5>
          <div class="connectivity-info">
            Shows reachability between all node pairs
          </div>
          <div class="connectivity-matrix">
            <!-- Simplified connectivity visualization -->
            <div class="matrix-grid">
              <div v-for="(row, i) in connectivityMatrix" :key="i" class="matrix-row">
                <div v-for="(cell, j) in row" :key="j" class="matrix-cell" :class="{ 
                  connected: cell, 
                  self: i === j 
                }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { CSSProperties } from 'vue';
import { TopologyAnalyzer, type TopologyAnalysis } from '../../../utils/topologyAnalyzer';
import { useStatsNodeAnalysis } from '../../../composables/useStatsNodeAnalysis';
import { useStatsPathAnalysis } from '../../../composables/useStatsPathAnalysis';
import { useStatsTopologyAnalysis } from '../../../composables/useStatsTopologyAnalysis';
import { useStatsRecommendations } from '../../../composables/useStatsRecommendations';
import { useStatsAggregation } from '../../../composables/useStatsAggregation';

type OverlayMode = 'normal' | 'floating' | 'fullscreen';

type DropDetail = {
  nodeId: string;
  processingErrors: number;
  incomingErrors: number;
  totalDrops: number;
};

const props = defineProps<{
  overlayKey: string;
  overlayMode: OverlayMode;
  getOverlayStyle: (key: string) => Partial<CSSProperties>;
  setOverlayMode: (key: string, mode: OverlayMode) => void;
  startDrag: (key: string, e: MouseEvent) => void;
  stats: { rps: number; inflight: number };
  linkStats: Array<{ id: string; ab: number; ba: number }>;
  nodeErrors?: Array<{ id: string; err_in: number; err_out: number }>;
  dropDetails?: Array<DropDetail>;
  config?: any;
  metrics?: any;
  aggregatedMetrics?: any;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const activeTab = ref('overview');

const tabs = computed(() => [
  { id: 'overview', label: 'Overview' },
  { id: 'nodes', label: 'Nodes', badge: nodeCount.value },
  { id: 'paths', label: 'Paths', badge: pathStats.value.length },
  { id: 'boundaries', label: 'Boundaries', badge: groupCount.value },
  { id: 'analysis', label: 'Analysis' },
  { id: 'topology', label: 'Topology' }
]);

onMounted(() => {
  console.log('StatsOverlayEnhanced mounted with tabs:', tabs.value);
  console.log('Active tab:', activeTab.value);
});

// Initialize node analysis composable
const nodeAnalysis = useStatsNodeAnalysis(() => ({
  config: props.config,
  metrics: props.metrics,
  nodeErrors: props.nodeErrors,
  stats: props.stats
}));

// Extract values from node analysis
const {
  nodeSortKey,
  nodeSortAsc,
  nodeCount,
  linkCount,
  nodeStats,
  sortedNodeStats,
  bottlenecks: nodeBottlenecks,
  topBottlenecks: nodeTopBottlenecks,
  totalThroughput: nodeTotalThroughput,
  avgLatency: nodeAvgLatency,
  errorRate: nodeErrorRate,
  nodeErrors: filteredNodeErrors,
  sortNodes,
  getSortIcon,
  getUtilizationClass
} = nodeAnalysis;

// Initialize path analysis composable
const pathAnalysis = useStatsPathAnalysis(() => ({
  config: props.config,
  aggregatedMetrics: props.aggregatedMetrics
}));

// Extract values from path analysis
const {
  pathFilter,
  pathStats,
  filteredPaths,
  criticalPaths: pathCriticalPaths,
  avgEndToEndLatency,
  totalPathThroughput,
  topTrafficPaths,
  pathSummary,
  filterOptions: pathFilterOptions,
  getPathStatus,
  getPathStatusClass,
  setPathFilter
} = pathAnalysis;

// Initialize topology analysis composable
const topologyAnalysisComposable = useStatsTopologyAnalysis(() => ({
  config: props.config,
  nodeCount: nodeCount.value
}));

// Extract values from topology analysis
const {
  loops: topologyLoops,
  topologyAnalysis: fullTopologyAnalysis,
  graphProperties,
  connectivityMatrix,
  topologyMetrics,
  topologyDetails,
  topologyIssues,
  topologyHealthScore
} = topologyAnalysisComposable;

// Initialize recommendations composable
const recommendationsComposable = useStatsRecommendations(() => ({
  nodeBottlenecks: nodeBottlenecks.value,
  pathCriticalPaths: pathCriticalPaths.value,
  topologyLoops: topologyLoops.value,
  errorRate: nodeErrorRate.value,
  dropDetails: props.dropDetails,
  stats: props.stats,
  metrics: props.metrics
}));

// Extract values from recommendations analysis
const {
  bottlenecks: enhancedBottlenecks,
  recommendations,
  priorityRecommendations,
  issueCount: recommendationIssueCount,
  systemHealthScore,
  healthStatus,
  issueAnalysis,
  optimizationSuggestions,
  calculateTotalDropRate,
  calculateDropPercentage,
  getDropPercentage
} = recommendationsComposable;

// Initialize aggregation composable
const aggregationComposable = useStatsAggregation(() => ({
  config: props.config,
  linkStats: props.linkStats,
  metrics: props.metrics
}));

// Extract values from aggregation analysis
const {
  groupCount,
  groupStats,
  totalLinkThroughput,
  groupsByThroughput,
  groupsByLatency,
  boundaryMetrics,
  problematicGroups,
  groupUtilization,
  topPerformingGroups,
  trafficFlowEfficiency,
  boundaryRecommendations
} = aggregationComposable;

// Use link-based throughput calculation for backward compatibility with existing display
const totalThroughput = computed(() => totalLinkThroughput.value);

// Use node-based calculations for more accurate metrics
const avgLatency = computed(() => nodeAvgLatency.value);
const errorRate = computed(() => nodeErrorRate.value);
const topBottlenecks = computed(() => nodeTopBottlenecks.value);

// Use recommendations analysis from composable
const bottlenecks = computed(() => enhancedBottlenecks.value);
const criticalPaths = computed(() => pathCriticalPaths.value);
const issueCount = computed(() => recommendationIssueCount.value);

// Use topology analysis from composable
const loops = computed(() => topologyLoops.value);
const topologyAnalysis = computed(() => fullTopologyAnalysis.value);

// Use drop rate calculations from recommendations composable
const totalDropRate = computed(() => calculateTotalDropRate());
const dropPercentage = computed(() => calculateDropPercentage());

// getPathStatus is now provided by pathAnalysis composable
// getDropPercentage is now provided by recommendations composable
</script>

<style scoped>
.stats-overlay {
  min-width: 600px;
  max-width: 90vw;
}

.overlay-fullscreen .stats-overlay {
  min-width: auto;
}

.stats-global-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.stats-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--border-primary, #333);
  min-height: 36px; 
}

.stats-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  font-size: 14px;
  white-space: nowrap;
}

.stats-tab:hover {
  color: var(--text-primary, #fff);
  background: var(--bg-hover, rgba(255, 255, 255, 0.1));
}

.stats-tab.active {
  color: var(--primary, #00a6fb);
  font-weight: 600;
}

.stats-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
}

.tab-badge {
  background: var(--primary);
  color: var(--text-inverse);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 4px;
}

.stats-content {
  max-height: 70vh; 
  overflow-y: auto;
}

.tab-panel {
  padding: 8px;
}

.tab-panel h4 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.tab-panel h5 {
  margin: 8px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.overview-card {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.metric-value {
  font-weight: 600;
  color: var(--primary);
}

.metric-value.error {
  color: var(--error);
}

.table-container {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.stats-table th {
  background: var(--bg-tertiary);
  padding: 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid var(--border-light);
  cursor: pointer;
  user-select: none;
}

.stats-table td {
  padding: 6px 8px;
  border: 1px solid var(--border-light);
}

.stats-table tr:hover {
  background: var(--bg-hover);
}

.stats-table tr.highlight {
  background: var(--warning-bg);
}

.utilization-bar {
  position: relative;
  height: 20px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.utilization-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  transition: width 0.3s, background 0.3s;
}

.utilization-fill.normal {
  background: var(--success);
}

.utilization-fill.warning {
  background: var(--warning);
}

.utilization-fill.critical {
  background: var(--error);
}

.utilization-text {
  position: relative;
  display: block;
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
}

.paths-filters {
  margin-bottom: 12px;
}

.path-filter {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  color: var(--text-primary);
}

.path-name {
  font-weight: 600;
  color: var(--text-primary);
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.healthy {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge.degraded {
  background: var(--warning-bg);
  color: var(--warning);
}

.status-badge.critical {
  background: var(--error-bg);
  color: var(--error);
}

.boundary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.boundary-card {
  background: var(--bg-tertiary);
  border-radius: 6px;
  overflow: hidden;
}

.boundary-header {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-left: 4px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.boundary-header h5 {
  margin: 0;
  font-size: 14px;
}

.boundary-node-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.boundary-metrics {
  padding: 12px;
}

.analysis-section {
  margin-bottom: 20px;
}

.bottleneck-list, .critical-paths-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bottleneck-item, .critical-path-item {
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  border-left: 3px solid var(--error);
}

.bottleneck-node, .path-route {
  font-weight: 600;
  margin-right: 12px;
}

.bottleneck-severity {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-right: 12px;
}

.bottleneck-severity.critical {
  background: var(--error-bg);
  color: var(--error);
}

.bottleneck-severity.high {
  background: var(--warning-bg);
  color: var(--warning);
}

.bottleneck-severity.medium {
  background: var(--info-bg);
  color: var(--info);
}

.path-issues {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.issue-badge {
  padding: 2px 6px;
  background: var(--warning-bg);
  color: var(--warning);
  border-radius: 3px;
  font-size: 11px;
}

.recommendations {
  list-style: none;
  padding: 0;
}

.recommendations li {
  padding: 8px;
  margin-bottom: 6px;
  background: var(--info-bg);
  border-left: 3px solid var(--info);
  border-radius: 3px;
  font-size: 13px;
}

.topology-section {
  margin-bottom: 20px;
}

.loops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loop-item {
  padding: 8px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: 4px;
  font-size: 12px;
}

.loop-label {
  font-weight: 600;
  margin-right: 8px;
}

.loop-path {
  font-family: monospace;
  color: var(--text-primary);
}

.loop-warning {
  display: block;
  margin-top: 4px;
  color: var(--warning);
  font-size: 11px;
}

.graph-properties {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 6px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.property-value {
  font-weight: 600;
  color: var(--text-primary);
}

.connectivity-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.connectivity-matrix {
  background: var(--bg-tertiary);
  padding: 8px;
  border-radius: 6px;
}

.matrix-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.matrix-row {
  display: flex;
  gap: 2px;
}

.matrix-cell {
  width: 20px;
  height: 20px;
  background: var(--bg-secondary);
  border-radius: 2px;
}

.matrix-cell.connected {
  background: var(--success);
}

.matrix-cell.self {
  background: var(--primary);
}

.info-message {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  color: var(--text-secondary);
  text-align: center;
}

.info-message.success {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success);
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.warning {
  color: var(--warning) !important;
}

.error {
  color: var(--error) !important;
}

.sort-icon {
  margin-left: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.drop-breakdown-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-secondary);
}

.drop-summary {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.drop-summary .separator {
  color: var(--text-tertiary);
}

.drop-summary strong {
  color: var(--primary);
  font-weight: 600;
}

.drop-summary strong.error {
  color: var(--error);
}

.node-id {
  font-weight: 600;
  color: var(--text-primary);
}

.property-divider {
  margin: 8px 0;
  border-top: 1px solid var(--border-light);
}

.success {
  color: var(--success) !important;
  font-weight: 600;
}
</style>

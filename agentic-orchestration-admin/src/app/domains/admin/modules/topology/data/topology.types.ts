export type TopologyBand = 'application' | 'reach' | 'ao';

/** Sub-grouping inside the Application band. */
export type TopologyAppGroup = 'reach' | 'web-api';

export type TopologyNodeStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'starting'
  | 'draining'
  | 'unknown'
  | 'offline';

export type TopologyEdgeKind =
  | 'request'
  | 'stream'
  | 'reverse-tunnel'
  | 'advertisement'
  | 'bypass';

export type TopologyNodeKind =
  | 'app'
  | 'ui'
  | 'overlay-source'
  | 'local-tools'
  | 'openclaw'
  | 'ao-web'
  | 'ao-chat'
  | 'web-api-client'
  | 'session-bridge'
  | 'overlay-packer'
  | 'local-mcp-host'
  | 'speech-client'
  | 'mtls-enroller'
  | 'engine'
  | 'endpoint'
  | 'web-ui'
  | 'planner'
  | 'catalog'
  | 'model-backend'
  | 'model-runtime'
  |   'execution-backend'
  | 'worker'
  | 'mcp-sidecar'
  | 'platform'
  | 'storage'
  | 'k8s-workload'
  | string;

/** Overlay ids currently registered by one Reach appId. */
export interface TopologyAppMembers {
  appId: string;
  instanceCount: number;
  ids: string[];
}

export interface TopologyNode {
  id: string;
  kind: TopologyNodeKind;
  band: TopologyBand;
  label: string;
  sublabel?: string;
  status: TopologyNodeStatus | string;
  statusReason?: string;
  instrumented?: boolean;
  deployed?: boolean;
  count?: number;
  breakdown?: Record<string, number>;
  parent?: string;
  /** Reach client appId when this node belongs to an app group. */
  appId?: string;
  /**
   * Application-band family: Reach-framework clients vs Web API / bypass clients.
   * Drives the two labeled frames inside band 1.
   */
  appGroup?: TopologyAppGroup;
  /** Distinct connecting client IPs seen for this Web API app (graph summary). */
  clientIpCount?: number;
  /** Connected Reach sessions for this appId (Application header). */
  instanceCount?: number;
  /** Apps currently owning / using this Reach or AO component. */
  ownedByApps?: string[];
  /** Per-app overlay member ids (agents / MCPs / skills) for catalog modals. */
  appMembers?: TopologyAppMembers[];
  /** Canvas accordion: parent can expand nested children (e.g. Kubernetes). */
  expandable?: boolean;
  /** Discriminator for expandable clusters (`k8s` vs catalog overlays). */
  clusterKind?: 'k8s' | string;
  /** In-cluster probe summary on platform node. */
  k8s?: {
    namespace?: string | null;
    reachable?: boolean;
    probedAt?: string;
  };
  /** Pod inventory for a k8s workload leaf. */
  k8sResource?: {
    name?: string;
    role?: string;
    group?: string;
    logSource?: string;
    pods?: Array<{
      name: string;
      phase: string;
      ready: boolean;
      restarts: number;
      nodeName?: string | null;
      containers?: Array<{
        name: string;
        ready: boolean;
        restartCount: number;
        state?: string | null;
      }>;
    }>;
  };
  lastProbeAt?: string | null;
}

export interface TopologyEdge {
  id: string;
  from: string;
  to: string;
  kind: TopologyEdgeKind | string;
  protocol?: string;
  port?: number;
  instrumented?: boolean;
  status?: string;
}

export interface TopologyCapabilities {
  edgeMetrics?: string[];
  nodeProbes?: string[];
  historyWindow?: string;
  sources?: Record<
    string,
    { reachable?: boolean; role?: string; note?: string; probeHost?: string | null }
  >;
}

export interface TopologyGraph {
  seq: number;
  generatedAt?: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  capabilities?: TopologyCapabilities;
  notes?: string[];
  meta?: Record<string, unknown>;
}

export interface TopologyNodeDetail {
  id: string;
  node: TopologyNode;
  inbound: TopologyEdge[];
  outbound: TopologyEdge[];
  logSource?: string;
  configKeys?: string[];
  /** Apps that currently own or use this component (Reach overlays / sidecars). */
  ownedByApps?: string[];
  /** Per-app overlay member ids for Agents / MCP / Skills clusters. */
  appMembers?: TopologyAppMembers[];
  /** Connecting client IPs for Web API apps (from token usage ledger). */
  clientIps?: Array<{
    ip: string;
    lastSeenAt?: string | null;
    count?: number;
  }>;
  k8sResource?: TopologyNode['k8sResource'];
  probe?: {
    lastProbeAt?: string | null;
    instrumented?: boolean;
    status?: string;
    statusReason?: string | null;
  };
  members?: {
    count?: number;
    breakdown?: Record<string, number> | null;
    note?: string;
    pods?: TopologyNode['k8sResource'] extends { pods?: infer P } ? P : unknown;
  } | null;
  generatedAt?: string;
}

export interface PositionedNode extends TopologyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  rank: number;
  order: number;
  displayStatus: TopologyNodeStatus | string;
}

export interface PositionedEdge extends TopologyEdge {
  points: string;
  pathD: string;
}

export interface LayoutResult {
  width: number;
  height: number;
  bands: Array<{
    id: TopologyBand;
    label: string;
    y: number;
    height: number;
  }>;
  /** Labeled frames for Reach apps vs Web API inside the Application band. */
  applicationFamilies?: Array<{
    id: TopologyAppGroup;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

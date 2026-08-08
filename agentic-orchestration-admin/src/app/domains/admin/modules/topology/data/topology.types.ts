export type TopologyBand = 'application' | 'reach' | 'ao';

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
  | 'execution-backend'
  | 'worker'
  | 'mcp-sidecar'
  | 'platform'
  | 'storage'
  | string;

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
  /** Reach product id (e.g. knowbuddy) when this node belongs to an app group. */
  appId?: string;
  /** Connected Reach sessions for this appId (Application header). */
  instanceCount?: number;
  /** Apps currently owning / using this Reach or AO component. */
  ownedByApps?: string[];
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
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

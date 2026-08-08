export type AoStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'unset'
  | 'running'
  | 'info';

export type AoSource =
  | 'process-env'
  | 'env.jetson'
  | 'k8s-secret'
  | 'yaml-catalog'
  | 'runtime'
  | 'default'
  | 'unknown';

export type AoApplyTier =
  | 'live'
  | 'next-run'
  | 'next-session'
  | 'restart-web'
  | 'restart-engine'
  | 'redeploy';

export interface EffectiveConfigEntry {
  key: string;
  label?: string;
  value: string | number | boolean | null;
  displayValue?: string;
  secret?: boolean;
  set?: boolean;
  plane?: string;
  source: AoSource | string;
  sourceFile?: string | null;
  sourcePath?: string | null;
  overriddenBy?: unknown[];
  applyTier?: AoApplyTier | string;
  tier?: string;
  group?: string;
  description?: string;
}

export interface EffectiveConfigResponse {
  entries?: EffectiveConfigEntry[] | Record<string, EffectiveConfigEntry>;
  keys?: Record<string, EffectiveConfigEntry>;
  fingerprint?: string;
  generatedAt?: string;
  writeApi?: boolean;
  phase?: number;
}

export interface ConfigFingerprint {
  fingerprint: string;
  generatedAt?: string;
}

export interface CatalogEntry {
  id: string;
  kind?: string;
  name?: string;
  type?: string;
  role?: string;
  description?: string | null;
  status?: AoStatus | string;
  availability?: AoStatus | string;
  gateReason?: string | null;
  fixKey?: string | null;
  planner_hint?: string | null;
  plannerHint?: string | null;
  min_vram_gb?: number | null;
  file?: string | null;
  availabilityTrace?: Array<{
    step: string;
    result: string;
    detail?: string;
    fixKey?: string | null;
  }>;
}

export interface CatalogListResponse {
  items?: CatalogEntry[];
  entries?: CatalogEntry[];
  providers?: CatalogEntry[];
}

export interface TopologyComponent {
  id: string;
  label: string;
  status: AoStatus | string;
  port?: number | string | null;
  nodePort?: number | string | null;
  url?: string | null;
  urlHint?: string | null;
  detail?: string | null;
  fact?: string | null;
  tls?: boolean;
  overlays?: boolean;
  mcpTunnel?: boolean;
  warmPool?: boolean;
  delegation?: boolean;
}

export interface TopologyAttention {
  severity?: string;
  message?: string;
  href?: string;
}

export interface TopologyResponse {
  components?: TopologyComponent[];
  attention?: TopologyAttention[];
  ports?: Record<string, number>;
  reachGuard?: {
    correctEnginePort?: number;
    incorrectWebPort?: number;
    message?: string;
  };
  environment?: string;
  generatedAt?: string;
}

export interface StorageEntry {
  id?: string;
  path: string;
  label?: string;
  bytes?: number | null;
  sizeBytes?: number | null;
  sizeHuman?: string | null;
  files?: number;
  exists?: boolean;
  kind?: string;
}

export interface StorageResponse {
  roots?: StorageEntry[];
  entries?: StorageEntry[];
  generatedAt?: string;
}

export interface PingResponse {
  ok?: boolean;
  service?: string;
  pid?: number;
  instance?: string;
}

export interface SessionResponse {
  userName?: string | null;
  sessionId?: string | null;
}

export interface HostMetrics {
  ts?: string;
  hostname?: string;
  platform?: string;
  arch?: string;
  scope?: string;
  uptimeSec?: number;
  loadAvg?: number[];
  cpu?: { percent?: number | null; cores?: number; source?: string };
  memory?: {
    totalBytes?: number;
    usedBytes?: number;
    availableBytes?: number;
    usedPercent?: number | null;
    percent?: number | null;
  };
  jetson?: unknown;
}

export interface AgentProvider {
  id: string;
  type?: string;
  role?: string;
  planner_hint?: string;
  min_vram_gb?: number | null;
}

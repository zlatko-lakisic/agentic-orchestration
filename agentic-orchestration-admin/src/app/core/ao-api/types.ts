export type AoStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'unset'
  | 'running'
  | 'info'
  | 'not_deployed';

export type AoSource =
  | 'process-env'
  | 'process'
  | 'env.jetson'
  | 'tracked'
  | 'tool_env'
  | 'web_env'
  | 'example'
  | 'k8s-secret'
  | 'yaml-catalog'
  | 'runtime'
  | 'default'
  | 'unset'
  | 'unknown';

export type AoApplyTier =
  | 'live'
  | 'next-run'
  | 'next_run'
  | 'next-session'
  | 'next_session'
  | 'restart-web'
  | 'restart-engine'
  | 'redeploy'
  | 'restart';

export interface EffectiveConfigEntry {
  key: string;
  label?: string;
  value?: string | number | boolean | null;
  effective?: string | number | boolean | null;
  default?: string | number | boolean | null;
  displayValue?: string;
  secret?: boolean;
  set?: boolean;
  plane?: string;
  source: AoSource | string;
  sourceFile?: string | null;
  sourcePath?: string | null;
  overriddenBy?: unknown[];
  overrides?: Array<{ plane: string; path: string; value?: string | null }>;
  applyTier?: AoApplyTier | string;
  tier?: string;
  group?: string;
  component?: string | null;
  section?: string | null;
  pathExists?: boolean;
  injected?: boolean;
  /** Short definition for hover help (from .env.example / KEY_META). */
  help?: string;
  description?: string;
  wikiPage?: string;
  wikiAnchor?: string;
  wikiUrl?: string;
  secretState?: { set?: boolean; usedBy?: string[] };
}

export interface EffectiveConfigResponse {
  entries?: EffectiveConfigEntry[] | Record<string, EffectiveConfigEntry>;
  keys?: Record<string, EffectiveConfigEntry>;
  fingerprint?: string;
  generatedAt?: string;
  writeApi?: boolean | { tokens?: boolean };
  phase?: number;
  includeInjected?: boolean;
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
  hostname?: string | null;
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
  visibility?: 'present' | 'absent' | 'not_mounted_here' | string;
  probeScope?: string;
  owner?: string;
  mountExpected?: boolean;
}

export interface StorageResponse {
  roots?: StorageEntry[];
  entries?: StorageEntry[];
  generatedAt?: string;
  probeScope?: string;
}

export interface AccessPosture {
  generatedAt?: string;
  severity?: 'ok' | 'warning' | 'critical' | string;
  verdict?: string;
  details?: string[];
  flags?: Record<string, unknown>;
}

export interface ApiAccessToken {
  id: string;
  prefix: string;
  appId: string;
  label?: string;
  createdAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
  lastUsedIp?: string | null;
  status?: 'active' | 'revoked' | 'expired' | string;
  /** Plaintext secret — only present on mint response. */
  token?: string;
}

export interface ApiAccessTokenUsage {
  ts?: string;
  tokenId?: string | null;
  appId?: string;
  ip?: string;
  path?: string;
  status?: number | null;
  latencyMs?: number | null;
  promptChars?: number | null;
}

export interface AdminRun {
  id: string;
  scope?: string;
  userId?: string | null;
  started?: string | null;
  updatedAt?: string | null;
  steps?: number | null;
  mode?: string | null;
  outcome?: string | null;
  lastGoal?: string | null;
  path?: string;
}

export interface RunsListResponse {
  generatedAt?: string;
  scopeNote?: string;
  runs?: AdminRun[];
}

export interface RunDetail extends AdminRun {
  stepsDetail?: Array<{
    id: string;
    exitCode?: number | null;
    provider?: string | null;
    durationMs?: number | null;
  }>;
  plannerHistory?: unknown[];
  lastAnswerExcerpt?: string | null;
}

export interface SupportBundle {
  generatedAt?: string;
  fingerprint?: string;
  environment?: string;
  hostname?: string | null;
  config?: Record<string, unknown>;
  storage?: StorageResponse;
  topology?: unknown;
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
  cpu?: {
    percent?: number | null;
    cores?: number;
    model?: string | null;
    source?: string;
    tempC?: number | null;
  };
  memory?: {
    totalBytes?: number;
    usedBytes?: number;
    availableBytes?: number;
    usedPercent?: number | null;
    percent?: number | null;
  };
  gpu?: {
    percent?: number | null;
    vramTotalGb?: number | null;
    vramUsedGb?: number | null;
    vramFreeGb?: number | null;
    vramUsedPercent?: number | null;
    vramSource?: string | null;
    name?: string | null;
    freqMhz?: number | null;
    tempC?: number | null;
  } | null;
  jetson?: unknown;
}

export interface AgentProvider {
  id: string;
  type?: string;
  role?: string;
  planner_hint?: string;
  min_vram_gb?: number | null;
}

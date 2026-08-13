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
  writeApi?: boolean | { tokens?: boolean; appPrefs?: boolean; mtlsClients?: boolean; control?: boolean };
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
  /** True when this token is (or was just) assigned to the Admin Web UI (ao-web). */
  assignedToWeb?: boolean;
  /** True when this token is (or was just) assigned to the Chat Web UI (ao-chat). */
  assignedToChat?: boolean;
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

/** Sticky dynamic-planning prefs keyed by appId (Access → Dynamic planning by app). */
export interface AppPlanningPrefs {
  appId: string;
  dynamicPlanning: boolean;
  defaultRunMode?: 'dynamic' | 'dynamic-iterative' | null;
  /** When non-empty, only these stock agents (+ client.* overlays) are available. */
  allowedAgentProviderIds?: string[];
}

export interface MtlsClient {
  serial?: string | null;
  subject?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  revoked?: boolean;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

export interface MtlsEnrollToken {
  ok?: boolean;
  token: string;
  expiresAt?: number | string | null;
  maxUses?: number;
  clientName?: string | null;
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
  ok?: boolean | null;
  exitCode?: number | null;
  lastRunId?: string | null;
  error?: string | null;
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
    error?: string | null;
    recoverable?: boolean | null;
    recoveryHint?: string | null;
    resultText?: string | null;
    ok?: boolean | null;
  }>;
  plannerHistory?: unknown[];
  lastAnswerExcerpt?: string | null;
  k8sJobs?: Array<{
    job_name?: string;
    namespace?: string;
    pod_name?: string | null;
    succeeded?: boolean;
    failed?: boolean;
    message?: string | null;
  }>;
}

export interface TraceListItem {
  runId: string;
  updatedAt?: string | null;
  startedAt?: string | null;
  eventCount?: number | null;
  lastKind?: string | null;
  lastMessage?: string | null;
  durationMs?: number | null;
  clientIp?: string | null;
  appId?: string | null;
  userName?: string | null;
  userId?: string | null;
  mode?: string | null;
  hasPlan?: boolean;
  hasDecision?: boolean;
  hasSteps?: boolean;
  hasTools?: boolean;
  hasQa?: boolean;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface TracesListResponse {
  generatedAt?: string;
  runs?: TraceListItem[];
}

export interface RunTraceEvent {
  ts?: number;
  run_id?: string;
  kind?: string;
  actor?: string;
  message?: string;
  detail?: Record<string, unknown>;
}

export interface TraceInstrumentation {
  capabilities?: Record<string, boolean>;
  present?: Record<string, boolean>;
  recorded?: string[];
  missing?: string[];
  notInstrumented?: string[];
  summary?: string;
}

export interface RunTraceResponse {
  runId: string;
  eventCount?: number;
  events?: RunTraceEvent[];
  mermaid?: string;
  durationMs?: number | null;
  instrumentation?: TraceInstrumentation;
  depth?: string;
  clientIp?: string | null;
  appId?: string | null;
  userName?: string | null;
  userId?: string | null;
  mode?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface LlmUsageRollupRow {
  key: string;
  calls: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ApiUsageRollupRow {
  key: string;
  calls: number;
  latencyMsSum?: number;
  promptCharsSum?: number;
}

export interface LlmUsageEventRow {
  ts?: number | string | null;
  runId?: string | null;
  userId?: string | null;
  userName?: string | null;
  appId?: string | null;
  clientIp?: string | null;
  tokenId?: string | null;
  source?: string | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  ok?: boolean | null;
}

export interface LlmSpendTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  label?: string;
  from?: string;
  to?: string;
}

export interface LlmSpendDay {
  day: string;
  ts: number;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmUsageResponse {
  generatedAt?: string;
  recent?: LlmUsageEventRow[];
  spend?: {
    /** Preset key: 6h | 1d | 7d | 15d | 30d */
    window?: string;
    windowHours?: number;
    windowDays?: number;
    granularity?: '15m' | '1h' | '1d' | string;
    bucketMs?: number;
    previous?: LlmSpendTotals;
    current?: LlmSpendTotals;
    growthPct?: {
      totalTokens?: number;
      calls?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
    timeline?: LlmSpendDay[];
  };
  llm?: {
    byUserId?: LlmUsageRollupRow[];
    byClientIp?: LlmUsageRollupRow[];
    byAppId?: LlmUsageRollupRow[];
    byTokenId?: LlmUsageRollupRow[];
    byModel?: LlmUsageRollupRow[];
    grandTotal?: {
      calls: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  api?: {
    byAppId?: ApiUsageRollupRow[];
    byClientIp?: ApiUsageRollupRow[];
    byTokenId?: ApiUsageRollupRow[];
  };
  /** Local ledger vs run-trace backfill counts for this install only. */
  sources?: {
    ledgerRows?: number;
    traceDerivedRows?: number;
    mergedRows?: number;
  };
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

export type ControlTargetKind =
  | 'k8s-deployment'
  | 'k8s-stack'
  | 'host-service'
  | 'host-reboot';

export interface ControlTarget {
  id: string;
  label: string;
  kind: ControlTargetKind | string;
  group: 'apps' | 'stack' | 'host' | string;
  description?: string;
  confirmPhrase?: string | null;
  disconnectLikely?: boolean;
  available: boolean;
  reason?: string | null;
  members?: string[];
  rebootVia?: string | null;
}

export interface ControlRestartAction {
  id: string;
  ok: boolean;
  detail?: string;
}

export interface ControlRestartResult {
  ok?: boolean;
  accepted?: boolean;
  target?: string;
  actions?: ControlRestartAction[];
  disconnectLikely?: boolean;
  hostname?: string;
  requestedAt?: string;
  at?: string;
  error?: string;
  code?: string;
}

export interface ControlStatus {
  generatedAt?: string;
  hostname?: string | null;
  kubernetes?: {
    available?: boolean;
    namespace?: string | null;
    error?: string | null;
  };
  hostControl?: {
    available?: boolean;
    dir?: string | null;
    armed?: boolean;
    mode?: string | null;
    reboot?: boolean;
    ollama?: boolean;
    sysrq?: boolean;
    reason?: string | null;
    installedAt?: string | null;
  };
  targets: ControlTarget[];
  lastAction?: ControlRestartResult | null;
}

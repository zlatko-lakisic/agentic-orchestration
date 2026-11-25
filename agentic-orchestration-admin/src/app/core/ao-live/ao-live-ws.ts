import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { HostMetrics } from '@/app/core/ao-api/types';
import { WebAuth } from '@/app/core/ao-api/web-auth';

export type MetricsPoint = {
  t: number;
  cpu: number | null;
  mem: number | null;
  gpu: number | null;
  vram: number | null;
  cpuTemp: number | null;
  gpuTemp: number | null;
}

export type AdminLogEntry = {
  id: number;
  source: string;
  level: string;
  ts: string;
  line: string;
}

/** Rolling window for Overview sparks + Host utilization CPU/GPU charts (#101). */
export const HISTORY_MAX = 10;
const LOG_MAX = 200;
const HISTORY_UI_MIN_MS = 1000;
const DEFAULT_FEED_INTERVAL_MS = 4000;
/** Reconnect backoff: base * 2^attempt, capped, with +/-25% jitter. */
export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30_000;
/** How long pages may show "connecting" before the socket is reported unavailable. */
export const CONNECT_GRACE_MS = 8000;
/** Server close code for a missing / revoked first-party token (server.mjs). */
const WS_CLOSE_UNAUTHORIZED = 4401;
/** Reserved feed-error key for connection-wide (not per-topic) failures. */
const CONNECTION_ERROR_KEY = '_';

export type LiveAcquireOptions = {
  metrics?: boolean;
  logs?: boolean;
  topology?: boolean;
  feeds?: string[];
  /** Per-topic feed query params, e.g. `{ traces: { limit: 500 } }`. */
  feedParams?: Record<string, Record<string, unknown>>;
  feedIntervalMs?: number;
  logSources?: string[] | null;
}

/** One consumer's claim on the shared socket; release it in ngOnDestroy. */
export type LiveHandle = {
  /** Drop this consumer's subscriptions (idempotent). */
  release(): void;
  /** Replace this consumer's query params for one feed topic and push now. */
  setFeedParams(topic: string, params: Record<string, unknown>): void;
  /** Restrict the log stream to these sources (null = all). */
  setLogSources(sources: string[] | null): void;
  /** Ask the web process to tail worker Job pods for this run_id (in-cluster). */
  followRunLogs(runId: string): void;
}

type Consumer = {
  metrics: boolean;
  logs: boolean;
  topology: boolean;
  feeds: Set<string>;
  feedParams: Map<string, Record<string, unknown>>;
  feedIntervalMs: number | null;
  logSources: string[] | null;
  followRuns: Set<string>;
}

type Desired = {
  metrics: boolean;
  logs: boolean;
  logSources: string[] | null;
  followRuns: Set<string>;
  topology: boolean;
  feeds: Set<string>;
  feedParams: Record<string, Record<string, unknown>>;
  feedIntervalMs: number;
}

/** What the server currently holds for the open socket. */
type SentState = {
  metrics: boolean;
  logs: boolean;
  logSourcesKey: string;
  followRuns: Set<string>;
  topology: boolean;
  watches: Set<string>;
  feeds: Set<string>;
  feedIntervalMs: number;
  feedParamsKey: string;
}

function freshSent(): SentState {
  return {
    metrics: false,
    logs: false,
    logSourcesKey: '',
    followRuns: new Set(),
    topology: false,
    watches: new Set(),
    feeds: new Set(),
    feedIntervalMs: 0,
    feedParamsKey: '',
  };
}

function logKey(e: { source: string; level: string; ts: string; line: string }) {
  return [e.ts, e.source, e.level, e.line].join('\u001f');
}

function watchKey(target: string, id: string) {
  return `${target}:${id}`;
}

@Injectable({ providedIn: 'root' })
export class AoLiveWs implements OnDestroy {
  private readonly webAuth = inject(WebAuth);
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  /** Live consumers keyed by handle id; the server state is the union of their wants. */
  private readonly consumers = new Map<number, Consumer>();
  private nextConsumerId = 1;
  /** Refcounted node/edge watches (topology detail dialogs). */
  private readonly watches = new Map<
    string,
    { target: 'node' | 'edge'; id: string; count: number }
  >();
  private sent = freshSent();

  /** Consecutive failed connection attempts (drives backoff). */
  private attempt = 0;
  /** True once the server sent a frame on the current socket (auth accepted). */
  private established = false;
  /** Token rides `?access_token=` only after a server rejected the subprotocol form. */
  private useQueryAuth = false;
  private queryFallbackTried = false;
  private currentSocketUsedQuery = false;
  private currentSocketHadToken = false;

  private logSeq = 0;
  /** Newest server timestamp accepted into `logs` (history replays stop there). */
  private logWatermark = '';
  private logsAtWatermark = new Map<string, number>();
  private logReplay: { watermark: string; budget: Map<string, number> } | null =
    null;

  private lastHistoryPushMs = 0;
  private visibilityHandler: (() => void) | null = null;

  /** Topology WS events (snapshot / delta / health / metrics / watch). */
  readonly topologyEvents = new Subject<{ type: string; [k: string]: unknown }>();

  /** Latest snapshot per admin feed topic (llm_usage, traces, runs, ...). */
  readonly feeds = signal<Record<string, unknown>>({});
  private readonly topicErrors = signal<Record<string, string>>({});
  /** Set when the socket cannot be (re)established or was rejected. */
  readonly connectionError = signal<string | null>(null);
  /** Per-topic feed errors; key `_` carries connection-wide failures. */
  readonly feedErrors = computed<Record<string, string>>(() => {
    const topics = this.topicErrors();
    const conn = this.connectionError();
    return conn ? { ...topics, [CONNECTION_ERROR_KEY]: conn } : topics;
  });

  readonly connected = signal(false);
  readonly metrics = signal<HostMetrics | null>(null);
  readonly history = signal<MetricsPoint[]>([]);
  readonly logs = signal<AdminLogEntry[]>([]);
  readonly logSourceOptions = signal<string[]>([
    'web',
    'coordinator',
    'engine',
    'warm-pool',
    'broker',
  ]);

  readonly latestCpu = computed(() => roundMetric(this.metrics()?.cpu?.percent));

  readonly latestMem = computed(() => {
    const m = this.metrics()?.memory;
    return roundMetric(m?.usedPercent ?? m?.percent);
  });

  readonly latestGpu = computed(() => {
    const g = this.metrics()?.gpu;
    const n = roundMetric(g?.percent);
    if (n != null) return n;
    const jetson = this.metrics()?.jetson as
      | { gpu?: { percent?: number | null } }
      | null
      | undefined;
    return roundMetric(jetson?.gpu?.percent);
  });

  readonly latestVram = computed(() => {
    const g = this.metrics()?.gpu;
    const discrete = roundMetric(g?.vramUsedPercent);
    if (discrete != null) return discrete;
    return roundMetric(g?.unifiedUsedPercent);
  });

  /** True when the host uses unified memory (Jetson) rather than discrete VRAM. */
  readonly gpuMemoryIsUnified = computed(
    () => String(this.metrics()?.gpu?.memoryKind || '').toLowerCase() === 'unified',
  );

  /** Card/modal label: VRAM on discrete GPUs, Unified on Jetson. */
  readonly gpuMemoryKindLabel = computed(() =>
    this.gpuMemoryIsUnified() ? 'Unified' : 'VRAM',
  );

  readonly latestCpuTemp = computed(() =>
    roundMetric(this.metrics()?.cpu?.tempC),
  );

  readonly latestGpuTemp = computed(() => {
    const n = roundMetric(this.metrics()?.gpu?.tempC);
    if (n != null) return n;
    const jetson = this.metrics()?.jetson as
      | { temperature?: Record<string, number | { temp?: number } | null> }
      | null
      | undefined;
    const temps = jetson?.temperature;
    if (!temps || typeof temps !== 'object') return null;
    for (const key of ['gpu', 'GPU', 'tj', 'Tj', 'cpu']) {
      const raw = temps[key];
      const v =
        typeof raw === 'number'
          ? raw
          : raw && typeof raw === 'object'
            ? raw.temp
            : null;
      const rounded = roundMetric(v);
      if (rounded != null) return rounded;
    }
    return null;
  });

  readonly cpuModel = computed(() => {
    const model = this.metrics()?.cpu?.model;
    return model ? String(model) : null;
  });

  readonly gpuName = computed(() => {
    const name = this.metrics()?.gpu?.name;
    return name ? String(name) : null;
  });

  readonly memoryLabel = computed(() => {
    const m = this.metrics()?.memory;
    if (!m?.totalBytes) return null;
    return formatBytes(m.totalBytes);
  });

  readonly vramLabel = computed(() => {
    const g = this.metrics()?.gpu;
    if (g?.vramTotalGb != null) {
      const total = roundMetric(g.vramTotalGb);
      if (total == null) return null;
      const used = roundMetric(g.vramUsedGb);
      if (used != null) {
        return `${used} / ${total} GiB`;
      }
      return `${total} GiB`;
    }
    // Jetson unified memory (#100): prefer structured unified* from host-metrics,
    // then fall back to jetson.ramText (e.g. "19.3/61.4GB").
    if (g?.unifiedTotalGb != null) {
      const total = roundMetric(g.unifiedTotalGb);
      if (total == null) return null;
      const used = roundMetric(g.unifiedUsedGb);
      if (used != null) {
        return `${used} / ${total} GiB`;
      }
      return `${total} GiB`;
    }
    const ramText = String(
      (this.metrics()?.jetson as { ramText?: string | null } | null | undefined)
        ?.ramText || '',
    ).trim();
    const m = ramText.match(/^([\d.]+)\s*\/\s*([\d.]+)/);
    if (!m) return null;
    return `${m[1]} / ${m[2]} GiB`;
  });

  /**
   * Register a consumer of the shared live connection (call from ngOnInit).
   * The returned handle owns exactly what was asked for here: releasing it
   * unsubscribes those topics on the server unless another consumer still
   * wants them.
   */
  acquire(opts: LiveAcquireOptions): LiveHandle {
    const id = this.nextConsumerId++;
    const consumer: Consumer = {
      metrics: Boolean(opts.metrics),
      logs: Boolean(opts.logs),
      topology: Boolean(opts.topology),
      feeds: new Set(),
      feedParams: new Map(),
      feedIntervalMs:
        opts.feedIntervalMs != null && Number(opts.feedIntervalMs) > 0
          ? Number(opts.feedIntervalMs)
          : null,
      logSources: opts.logSources?.length ? [...opts.logSources] : null,
      followRuns: new Set(),
    };
    for (const t of opts.feeds || []) {
      const topic = String(t || '').trim();
      if (topic) consumer.feeds.add(topic);
    }
    if (opts.feedParams && typeof opts.feedParams === 'object') {
      for (const [topic, params] of Object.entries(opts.feedParams)) {
        if (params && typeof params === 'object') {
          consumer.feedParams.set(topic, { ...params });
        }
      }
    }
    this.consumers.set(id, consumer);
    this.bindVisibility();
    this.ensureConnected();
    this.sync();

    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.consumers.delete(id);
        this.afterWantsChanged();
      },
      setFeedParams: (topic, params) => {
        if (released) return;
        const t = String(topic || '').trim();
        if (!t) return;
        consumer.feedParams.set(t, { ...(params || {}) });
        // Always ask for a fresh push: callers use this as "apply filters now".
        this.syncAndRefreshFeeds();
      },
      setLogSources: (sources) => {
        if (released) return;
        consumer.logSources = sources?.length ? [...sources] : null;
        this.sync();
      },
      followRunLogs: (runId) => {
        if (released) return;
        const rid = String(runId || '').trim();
        if (!rid) return;
        consumer.logs = true;
        consumer.followRuns.add(rid);
        this.ensureConnected();
        this.sync();
      },
    };
  }

  /** Ask the server for a fresh snapshot of every subscribed feed now. */
  refreshFeeds() {
    this.ensureConnected();
    this.syncAndRefreshFeeds();
  }

  /** Typed helper for the latest snapshot of a feed topic. */
  feedData<T = unknown>(topic: string): T | null {
    const raw = this.feeds()[topic];
    return (raw as T) ?? null;
  }

  /**
   * True until the first snapshot (or error) arrives for an admin feed topic.
   * Turns false when the socket is reported unavailable, so pages show the
   * connection error instead of a spinner that never ends.
   */
  feedLoading(topic: string): boolean {
    const t = String(topic || '').trim();
    if (!t) return false;
    const errors = this.feedErrors();
    if (errors[t] || errors[CONNECTION_ERROR_KEY]) return false;
    return !Object.prototype.hasOwnProperty.call(this.feeds(), t);
  }

  resyncTopology() {
    this.send({ type: 'topology_resync' });
  }

  /** Focused live series for a node/edge modal; pair with unsubscribeTopologyWatch. */
  subscribeTopologyWatch(target: 'node' | 'edge', id: string) {
    const key = watchKey(target, id);
    const cur = this.watches.get(key);
    if (cur) cur.count += 1;
    else this.watches.set(key, { target, id, count: 1 });
    this.bindVisibility();
    this.ensureConnected();
    this.sync();
  }

  unsubscribeTopologyWatch(target: 'node' | 'edge', id: string) {
    const key = watchKey(target, id);
    const cur = this.watches.get(key);
    if (!cur) return;
    cur.count -= 1;
    if (cur.count <= 0) this.watches.delete(key);
    this.afterWantsChanged();
  }

  clearLogs() {
    this.logs.set([]);
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.unbindVisibility();
    this.closeSocket();
  }

  private active(): boolean {
    return this.consumers.size > 0 || this.watches.size > 0;
  }

  private afterWantsChanged() {
    if (this.active()) {
      this.sync();
      return;
    }
    this.unbindVisibility();
    this.closeSocket();
  }

  /** Union of what every live consumer wants right now. */
  private desired(): Desired {
    const d: Desired = {
      metrics: false,
      logs: false,
      logSources: [],
      followRuns: new Set(),
      topology: this.watches.size > 0,
      feeds: new Set(),
      feedParams: {},
      feedIntervalMs: 0,
    };
    let allLogSources = false;
    const logSources = new Set<string>();
    for (const c of this.consumers.values()) {
      if (c.metrics) d.metrics = true;
      if (c.topology) d.topology = true;
      if (c.logs) {
        d.logs = true;
        if (c.logSources?.length) for (const s of c.logSources) logSources.add(s);
        else allLogSources = true;
        for (const rid of c.followRuns) d.followRuns.add(rid);
      }
      for (const topic of c.feeds) {
        d.feeds.add(topic);
        // Every subscribed topic gets its own namespace so the server never
        // falls back to another topic's params.
        d.feedParams[topic] = {
          ...(d.feedParams[topic] || {}),
          ...(c.feedParams.get(topic) || {}),
        };
      }
      if (c.feeds.size && c.feedIntervalMs != null) {
        d.feedIntervalMs = d.feedIntervalMs
          ? Math.min(d.feedIntervalMs, c.feedIntervalMs)
          : c.feedIntervalMs;
      }
    }
    d.logSources = allLogSources || !logSources.size ? null : [...logSources].sort();
    if (!d.feedIntervalMs) d.feedIntervalMs = DEFAULT_FEED_INTERVAL_MS;
    return d;
  }

  /**
   * Bring the server in line with `desired()` by sending only what changed.
   * Returns true when a feed message was sent (the server pushes a fresh
   * snapshot of every subscribed feed on subscribe and on params).
   */
  private sync(): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    let feedsPushed = false;
    const d = this.desired();
    const hidden = this.tabHidden();
    const sent = this.sent;

    // Host metrics are high-frequency: pause while the tab is hidden.
    const wantMetrics = d.metrics && !hidden;
    if (wantMetrics !== sent.metrics) {
      this.send({
        type: wantMetrics ? 'host_metrics_subscribe' : 'host_metrics_unsubscribe',
      });
      sent.metrics = wantMetrics;
    }

    // Logs: the server replays its history on every subscribe, so only
    // (re)subscribe when the stream is new or the source filter changed.
    if (d.logs) {
      const key = JSON.stringify(d.logSources);
      if (!sent.logs || key !== sent.logSourcesKey) {
        if (sent.logs) {
          // Filter changed: start over so deselected sources disappear.
          this.logs.set([]);
          this.logWatermark = '';
          this.logsAtWatermark = new Map();
          this.logReplay = null;
        } else if (this.logWatermark) {
          this.logReplay = {
            watermark: this.logWatermark,
            budget: new Map(this.logsAtWatermark),
          };
        }
        this.send({
          type: 'admin_logs_subscribe',
          sources: d.logSources?.length ? d.logSources : undefined,
        });
        sent.logs = true;
        sent.logSourcesKey = key;
      }
      for (const rid of d.followRuns) {
        if (sent.followRuns.has(rid)) continue;
        this.send({ type: 'admin_logs_follow_run', runId: rid });
        sent.followRuns.add(rid);
      }
    } else if (sent.logs) {
      this.send({ type: 'admin_logs_unsubscribe' });
      sent.logs = false;
      sent.logSourcesKey = '';
      sent.followRuns.clear();
    }

    // Topology: `topology_subscribe` resets the server's watch set, so it is
    // sent once per (re)subscription and the watches are replayed after it.
    const wantTopology = d.topology && !hidden;
    if (wantTopology && !sent.topology) {
      this.send({ type: 'topology_subscribe' });
      sent.topology = true;
      sent.watches.clear();
    } else if (!wantTopology && sent.topology) {
      this.send({ type: 'topology_unsubscribe' });
      sent.topology = false;
      sent.watches.clear();
    }
    if (sent.topology) {
      for (const [key, w] of this.watches) {
        if (sent.watches.has(key)) continue;
        this.send({ type: 'topology_watch_subscribe', target: w.target, id: w.id });
        sent.watches.add(key);
      }
      for (const key of [...sent.watches]) {
        if (this.watches.has(key)) continue;
        const sep = key.indexOf(':');
        this.send({
          type: 'topology_watch_unsubscribe',
          target: key.slice(0, sep),
          id: key.slice(sep + 1),
        });
        sent.watches.delete(key);
      }
    }

    // Feeds: targeted unsubscribe for topics nobody wants any more.
    const wantFeeds = hidden ? new Set<string>() : d.feeds;
    const removed = [...sent.feeds].filter((t) => !wantFeeds.has(t));
    if (removed.length) {
      this.send(
        wantFeeds.size
          ? { type: 'admin_feed_unsubscribe', topics: removed }
          : { type: 'admin_feed_unsubscribe' },
      );
      for (const t of removed) sent.feeds.delete(t);
      if (!wantFeeds.size) {
        sent.feedIntervalMs = 0;
        sent.feedParamsKey = '';
      }
    }
    if (wantFeeds.size) {
      const added = [...wantFeeds].filter((t) => !sent.feeds.has(t));
      const params = this.paramsFor(wantFeeds, d);
      const paramsKey = JSON.stringify(params);
      if (added.length || d.feedIntervalMs !== sent.feedIntervalMs) {
        this.send({
          type: 'admin_feed_subscribe',
          // The server adds these to the socket's topic set and restarts its
          // timer; resending only the new ones avoids touching the rest.
          topics: added.length ? added : [...wantFeeds],
          intervalMs: d.feedIntervalMs,
          params,
        });
        for (const t of added) sent.feeds.add(t);
        sent.feedIntervalMs = d.feedIntervalMs;
        sent.feedParamsKey = paramsKey;
        feedsPushed = true;
      } else if (paramsKey !== sent.feedParamsKey) {
        this.send({ type: 'admin_feed_params', params });
        sent.feedParamsKey = paramsKey;
        feedsPushed = true;
      }
    }
    return feedsPushed;
  }

  private paramsFor(topics: Set<string>, d: Desired) {
    const out: Record<string, Record<string, unknown>> = {};
    for (const t of [...topics].sort()) out[t] = d.feedParams[t] || {};
    return out;
  }

  /**
   * Reconcile subscriptions, then make sure the server pushes a fresh snapshot
   * of the subscribed feeds now (it ticks on `admin_feed_params`).
   */
  private syncAndRefreshFeeds() {
    if (this.sync()) return;
    if (!this.sent.feeds.size) return;
    this.send({
      type: 'admin_feed_params',
      params: this.paramsFor(this.sent.feeds, this.desired()),
    });
  }

  private send(msg: Record<string, unknown>) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket is closing; onclose schedules the reconnect */
    }
  }

  private wsBaseUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // ng serve (3873) talks directly to the local web process.
    return location.port === '3873'
      ? 'ws://127.0.0.1:3847/'
      : `${proto}//${location.host}/`;
  }

  private ensureConnected() {
    if (this.destroyed || !this.active()) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.reconnectTimer) return;
    this.openSocket();
  }

  private openSocket() {
    if (this.destroyed || !this.active()) return;
    this.startConnectGrace();
    const token = this.webAuth.bearer();
    const viaQuery = Boolean(token) && this.useQueryAuth;
    let ws: WebSocket;
    try {
      if (token && !viaQuery) {
        // Preferred: token travels in Sec-WebSocket-Protocol, never in the URL
        // (URLs end up in proxy and access logs).
        ws = new WebSocket(this.wsBaseUrl(), ['ao-auth', `ao-bearer.${token}`]);
      } else if (token) {
        ws = new WebSocket(
          `${this.wsBaseUrl()}?access_token=${encodeURIComponent(token)}`,
        );
      } else {
        ws = new WebSocket(this.wsBaseUrl());
      }
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.established = false;
    this.currentSocketUsedQuery = viaQuery;
    this.currentSocketHadToken = Boolean(token);
    this.sent = freshSent();
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.connected.set(true);
      this.sync();
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this.onMessage(ev);
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.established = false;
      this.connected.set(false);
      this.sent = freshSent();
      const code = Number((ev as CloseEvent | undefined)?.code || 0);
      if (code === WS_CLOSE_UNAUTHORIZED) {
        void this.onUnauthorized();
        return;
      }
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }

  /** The server accepted the socket (it only sends frames after auth). */
  private markEstablished() {
    if (this.established) return;
    this.established = true;
    this.attempt = 0;
    this.clearConnectGrace();
    this.connectionError.set(null);
  }

  private async onUnauthorized() {
    // A server that predates subprotocol auth ignores it and closes with 4401:
    // retry once with the legacy query form before treating it as a bad token.
    if (
      this.currentSocketHadToken &&
      !this.currentSocketUsedQuery &&
      !this.queryFallbackTried
    ) {
      this.queryFallbackTried = true;
      this.useQueryAuth = true;
      this.openSocket();
      return;
    }
    this.clearConnectGrace();
    this.connectionError.set(
      'Live connection rejected: the web UI token is missing, expired or revoked. Retrying…',
    );
    const before = this.webAuth.bearer();
    try {
      await this.webAuth.refreshOnce();
    } catch {
      /* keep retrying with what we have */
    }
    if (this.webAuth.bearer() !== before) {
      // New credentials: start again with the preferred (subprotocol) form.
      this.useQueryAuth = false;
      this.queryFallbackTried = false;
    }
    this.scheduleReconnect();
  }

  private tabHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden;
  }

  private bindVisibility() {
    if (this.visibilityHandler || typeof document === 'undefined') return;
    this.visibilityHandler = () => {
      if (!this.active()) return;
      this.sync();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private unbindVisibility() {
    if (!this.visibilityHandler || typeof document === 'undefined') return;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.visibilityHandler = null;
  }

  private onMessage(ev: MessageEvent) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(ev.data || ''));
    } catch {
      return;
    }
    // `null`, numbers, strings and arrays are valid JSON but not protocol frames.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const msg = parsed as Record<string, unknown>;
    this.markEstablished();
    const type = String(msg['type'] || '');
    if (type === 'host_metrics') {
      if (this.tabHidden()) return;
      const sample = msg as unknown as HostMetrics;
      this.metrics.set(sample);
      this.pushHistory(sample);
      return;
    }
    if (type === 'admin_logs_sources' && Array.isArray(msg['sources'])) {
      this.logSourceOptions.set((msg['sources'] as unknown[]).map(String));
      return;
    }
    if (type === 'admin_log') {
      this.onLogLine(msg);
      return;
    }
    if (
      type === 'topology_snapshot' ||
      type === 'topology_delta' ||
      type === 'topology_health' ||
      type === 'topology_metrics' ||
      type === 'topology_watch_snapshot' ||
      type === 'topology_watch_tick'
    ) {
      if (
        this.tabHidden() &&
        (type === 'topology_health' ||
          type === 'topology_metrics' ||
          type === 'topology_watch_tick')
      ) {
        return;
      }
      this.topologyEvents.next({ ...msg, type });
      return;
    }
    if (type === 'admin_feed') {
      // Keep applying feed snapshots even while the tab is hidden so dashboards
      // are fresh when the user returns (unlike high-frequency host metrics).
      const topic = String(msg['topic'] || '').trim();
      if (!topic) return;
      const payload = msg['data'];
      const generatedAt = msg['generatedAt'];
      const data =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? {
              ...(payload as Record<string, unknown>),
              ...(generatedAt != null ? { generatedAt } : {}),
            }
          : payload;
      this.feeds.update((prev) => ({ ...prev, [topic]: data }));
      this.topicErrors.update((prev) => {
        if (!prev[topic]) return prev;
        const next = { ...prev };
        delete next[topic];
        return next;
      });
      return;
    }
    if (type === 'admin_feed_error') {
      const topic = String(msg['topic'] || '').trim() || CONNECTION_ERROR_KEY;
      const message = String(msg['message'] || 'Feed error');
      this.topicErrors.update((prev) => ({ ...prev, [topic]: message }));
    }
  }

  private onLogLine(msg: Record<string, unknown>) {
    const entry = {
      source: String(msg['source'] || 'web'),
      level: String(msg['level'] || 'info'),
      ts: String(msg['ts'] || new Date().toISOString()),
      line: String(msg['line'] || ''),
    };
    const key = logKey(entry);
    const replay = this.logReplay;
    if (replay) {
      // The server replays its ring buffer in order on every subscribe. Skip
      // what this buffer already took: everything older than the watermark,
      // plus the entries already seen at exactly the watermark timestamp.
      if (entry.ts < replay.watermark) return;
      if (entry.ts === replay.watermark) {
        const left = replay.budget.get(key) || 0;
        if (left > 0) {
          replay.budget.set(key, left - 1);
          return;
        }
      } else {
        this.logReplay = null;
      }
    }
    if (entry.ts > this.logWatermark) {
      this.logWatermark = entry.ts;
      this.logsAtWatermark = new Map([[key, 1]]);
    } else if (entry.ts === this.logWatermark) {
      this.logsAtWatermark.set(key, (this.logsAtWatermark.get(key) || 0) + 1);
    }
    const next: AdminLogEntry = { id: ++this.logSeq, ...entry };
    this.logs.update((prev) => {
      const out = [...prev, next];
      return out.length > LOG_MAX ? out.slice(out.length - LOG_MAX) : out;
    });
  }

  private pushHistory(sample: HostMetrics) {
    const now = Date.now();
    // Throttle chart series updates (~1 Hz) even when the server pushes every 2s.
    if (now - this.lastHistoryPushMs < HISTORY_UI_MIN_MS) {
      return;
    }
    this.lastHistoryPushMs = now;
    const t = Date.parse(String(sample.ts || '')) || now;
    const cpu = roundMetric(sample.cpu?.percent);
    const mem = roundMetric(sample.memory?.usedPercent ?? sample.memory?.percent);
    const jetson = sample.jetson as
      | { gpu?: { percent?: number | null } }
      | null
      | undefined;
    const gpu = roundMetric(sample.gpu?.percent ?? jetson?.gpu?.percent);
    const vram = roundMetric(
      sample.gpu?.vramUsedPercent ?? sample.gpu?.unifiedUsedPercent,
    );
    const cpuTemp = roundMetric(sample.cpu?.tempC);
    let gpuTemp: number | null = roundMetric(sample.gpu?.tempC);
    if (gpuTemp == null) {
      const temps = (sample.jetson as { temperature?: Record<string, unknown> } | undefined)
        ?.temperature;
      if (temps && typeof temps === 'object') {
        for (const key of ['gpu', 'GPU', 'tj', 'Tj', 'cpu']) {
          const raw = temps[key];
          const v =
            typeof raw === 'number'
              ? raw
              : raw && typeof raw === 'object' && 'temp' in raw
                ? Number((raw as { temp?: unknown }).temp)
                : null;
          const rounded = roundMetric(v);
          if (rounded != null) {
            gpuTemp = rounded;
            break;
          }
        }
      }
    }
    this.history.update((prev) => {
      const last = prev[prev.length - 1];
      // Hold last known values so charts stay continuous across brief null samples.
      const nextPoint: MetricsPoint = {
        t,
        cpu: cpu ?? last?.cpu ?? null,
        mem: mem ?? last?.mem ?? null,
        gpu: gpu ?? last?.gpu ?? null,
        vram: vram ?? last?.vram ?? null,
        cpuTemp: cpuTemp ?? last?.cpuTemp ?? null,
        gpuTemp: gpuTemp ?? last?.gpuTemp ?? null,
      };
      const next = [...prev, nextPoint];
      return next.length > HISTORY_MAX
        ? next.slice(next.length - HISTORY_MAX)
        : next;
    });
  }

  /** Exponential backoff with jitter so a fleet of tabs does not reconnect in step. */
  private scheduleReconnect() {
    if (this.destroyed || !this.active()) return;
    if (this.reconnectTimer) return;
    this.startConnectGrace();
    const exp = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** Math.min(this.attempt, 16),
    );
    const delay = Math.round(exp * (0.75 + Math.random() * 0.5));
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private startConnectGrace() {
    if (this.connectGraceTimer || this.established || this.connectionError()) return;
    this.connectGraceTimer = setTimeout(() => {
      this.connectGraceTimer = null;
      if (this.established || !this.active()) return;
      this.connectionError.set('Live connection unavailable. Retrying…');
    }, CONNECT_GRACE_MS);
  }

  private clearConnectGrace() {
    if (!this.connectGraceTimer) return;
    clearTimeout(this.connectGraceTimer);
    this.connectGraceTimer = null;
  }

  private closeSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearConnectGrace();
    this.connectionError.set(null);
    this.attempt = 0;
    const ws = this.ws;
    this.ws = null;
    this.established = false;
    this.connected.set(false);
    this.sent = freshSent();
    if (!ws) return;
    try {
      // Closing the socket drops every server-side subscription for it.
      ws.close();
    } catch {
      /* ignore */
    }
  }
}

function roundMetric(n: unknown): number | null {
  if (n == null || n === '') return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.round(v);
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let x = n;
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

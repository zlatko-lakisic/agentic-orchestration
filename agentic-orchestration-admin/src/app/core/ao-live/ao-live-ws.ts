import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { HostMetrics } from '@/app/core/ao-api/types';

export interface MetricsPoint {
  t: number;
  cpu: number | null;
  mem: number | null;
  gpu: number | null;
  vram: number | null;
}

export interface AdminLogEntry {
  id: number;
  source: string;
  level: string;
  ts: string;
  line: string;
}

const HISTORY_MAX = 90;
const LOG_MAX = 200;
const RECONNECT_MS = 2500;
const HISTORY_UI_MIN_MS = 1000;

@Injectable({ providedIn: 'root' })
export class AoLiveWs implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private wantMetrics = false;
  private wantLogs = false;
  private logSources: string[] | null = null;
  private logSeq = 0;
  private refCount = 0;
  private lastHistoryPushMs = 0;
  private visibilityHandler: (() => void) | null = null;

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

  readonly latestCpu = computed(() => {
    const n = this.metrics()?.cpu?.percent;
    return n == null || Number.isNaN(Number(n)) ? null : Number(n);
  });

  readonly latestMem = computed(() => {
    const m = this.metrics()?.memory;
    const n = m?.usedPercent ?? m?.percent;
    return n == null || Number.isNaN(Number(n)) ? null : Number(n);
  });

  readonly latestGpu = computed(() => {
    const g = this.metrics()?.gpu;
    const n = g?.percent;
    if (n != null && !Number.isNaN(Number(n))) return Number(n);
    const jetson = this.metrics()?.jetson as
      | { gpu?: { percent?: number | null } }
      | null
      | undefined;
    const j = jetson?.gpu?.percent;
    return j == null || Number.isNaN(Number(j)) ? null : Number(j);
  });

  readonly latestVram = computed(() => {
    const n = this.metrics()?.gpu?.vramUsedPercent;
    return n == null || Number.isNaN(Number(n)) ? null : Number(n);
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
    if (g?.vramTotalGb == null) return null;
    const total = Number(g.vramTotalGb);
    if (!Number.isFinite(total)) return null;
    if (g.vramUsedGb != null && Number.isFinite(Number(g.vramUsedGb))) {
      return `${Number(g.vramUsedGb).toFixed(1)} / ${total.toFixed(1)} GiB`;
    }
    return `${total.toFixed(1)} GiB`;
  });

  /** Acquire a shared live connection (call from component ngOnInit). */
  acquire(opts: { metrics?: boolean; logs?: boolean; logSources?: string[] }) {
    this.refCount += 1;
    if (opts.metrics) this.wantMetrics = true;
    if (opts.logs) this.wantLogs = true;
    if (opts.logSources) this.logSources = [...opts.logSources];
    this.bindVisibility();
    this.ensureConnected();
    this.pushSubscriptions();
  }

  /** Release one consumer (call from component ngOnDestroy). */
  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.wantMetrics = false;
      this.wantLogs = false;
      this.unbindVisibility();
      this.closeSocket();
    }
  }

  setLogSources(sources: string[] | null) {
    this.logSources = sources;
    if (this.wantLogs && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'admin_logs_subscribe',
          sources: sources?.length ? sources : undefined,
        })
      );
    }
  }

  clearLogs() {
    this.logs.set([]);
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.closeSocket();
  }

  private wsUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // ng serve (3873) talks directly to the local web process.
    if (location.port === '3873') {
      return 'ws://127.0.0.1:3847/';
    }
    return `${proto}//${location.host}/`;
  }

  private ensureConnected() {
    if (this.destroyed || this.refCount <= 0) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    try {
      const ws = new WebSocket(this.wsUrl());
      this.ws = ws;
      ws.onopen = () => {
        this.connected.set(true);
        this.pushSubscriptions();
      };
      ws.onmessage = (ev) => this.onMessage(ev);
      ws.onclose = () => {
        this.connected.set(false);
        this.ws = null;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private pushSubscriptions() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (this.wantMetrics && !this.tabHidden()) {
      ws.send(JSON.stringify({ type: 'host_metrics_subscribe' }));
    }
    if (this.wantMetrics && this.tabHidden()) {
      ws.send(JSON.stringify({ type: 'host_metrics_unsubscribe' }));
    }
    if (this.wantLogs) {
      ws.send(
        JSON.stringify({
          type: 'admin_logs_subscribe',
          sources: this.logSources?.length ? this.logSources : undefined,
        })
      );
    }
  }

  private tabHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden;
  }

  private bindVisibility() {
    if (this.visibilityHandler || typeof document === 'undefined') return;
    this.visibilityHandler = () => {
      if (this.refCount <= 0) return;
      this.pushSubscriptions();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private unbindVisibility() {
    if (!this.visibilityHandler || typeof document === 'undefined') return;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.visibilityHandler = null;
  }

  private onMessage(ev: MessageEvent) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(ev.data || ''));
    } catch {
      return;
    }
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
      const entry: AdminLogEntry = {
        id: ++this.logSeq,
        source: String(msg['source'] || 'web'),
        level: String(msg['level'] || 'info'),
        ts: String(msg['ts'] || new Date().toISOString()),
        line: String(msg['line'] || ''),
      };
      this.logs.update((prev) => {
        const next = [...prev, entry];
        return next.length > LOG_MAX ? next.slice(next.length - LOG_MAX) : next;
      });
    }
  }

  private pushHistory(sample: HostMetrics) {
    const now = Date.now();
    // Throttle chart series updates (~1 Hz) even when the server pushes every 2s.
    if (now - this.lastHistoryPushMs < HISTORY_UI_MIN_MS) {
      return;
    }
    this.lastHistoryPushMs = now;
    const t = Date.parse(String(sample.ts || '')) || now;
    const cpu =
      sample.cpu?.percent == null || Number.isNaN(Number(sample.cpu.percent))
        ? null
        : Number(sample.cpu.percent);
    const memRaw = sample.memory?.usedPercent ?? sample.memory?.percent;
    const mem =
      memRaw == null || Number.isNaN(Number(memRaw)) ? null : Number(memRaw);
    const jetson = sample.jetson as
      | { gpu?: { percent?: number | null } }
      | null
      | undefined;
    const gpuRaw = sample.gpu?.percent ?? jetson?.gpu?.percent;
    const gpu =
      gpuRaw == null || Number.isNaN(Number(gpuRaw)) ? null : Number(gpuRaw);
    const vramRaw = sample.gpu?.vramUsedPercent;
    const vram =
      vramRaw == null || Number.isNaN(Number(vramRaw)) ? null : Number(vramRaw);
    this.history.update((prev) => {
      const next = [...prev, { t, cpu, mem, gpu, vram }];
      return next.length > HISTORY_MAX
        ? next.slice(next.length - HISTORY_MAX)
        : next;
    });
  }

  private scheduleReconnect() {
    if (this.destroyed || this.refCount <= 0) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, RECONNECT_MS);
  }

  private closeSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.connected.set(false);
    if (!ws) return;
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'host_metrics_unsubscribe' }));
        ws.send(JSON.stringify({ type: 'admin_logs_unsubscribe' }));
      }
      ws.close();
    } catch {
      /* ignore */
    }
  }
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

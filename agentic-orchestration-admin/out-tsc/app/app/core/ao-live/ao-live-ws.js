import { __decorate } from "tslib";
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { WebAuth } from '@/app/core/ao-api/web-auth';
const HISTORY_MAX = 90;
const LOG_MAX = 200;
const RECONNECT_MS = 2500;
const HISTORY_UI_MIN_MS = 1000;
let AoLiveWs = class AoLiveWs {
    webAuth = inject(WebAuth);
    ws = null;
    reconnectTimer = null;
    destroyed = false;
    wantMetrics = false;
    wantLogs = false;
    wantTopology = false;
    wantFeeds = new Set();
    feedParams = {};
    feedIntervalMs = 4000;
    logSources = null;
    logSeq = 0;
    refCount = 0;
    lastHistoryPushMs = 0;
    visibilityHandler = null;
    /** Topology WS events (snapshot / delta / health / metrics / watch). */
    topologyEvents = new Subject();
    /** Latest snapshot per admin feed topic (llm_usage, traces, runs, …). */
    feeds = signal({});
    feedErrors = signal({});
    connected = signal(false);
    metrics = signal(null);
    history = signal([]);
    logs = signal([]);
    logSourceOptions = signal([
        'web',
        'coordinator',
        'engine',
        'warm-pool',
        'broker',
    ]);
    latestCpu = computed(() => roundMetric(this.metrics()?.cpu?.percent));
    latestMem = computed(() => {
        const m = this.metrics()?.memory;
        return roundMetric(m?.usedPercent ?? m?.percent);
    });
    latestGpu = computed(() => {
        const g = this.metrics()?.gpu;
        const n = roundMetric(g?.percent);
        if (n != null)
            return n;
        const jetson = this.metrics()?.jetson;
        return roundMetric(jetson?.gpu?.percent);
    });
    latestVram = computed(() => roundMetric(this.metrics()?.gpu?.vramUsedPercent));
    latestCpuTemp = computed(() => roundMetric(this.metrics()?.cpu?.tempC));
    latestGpuTemp = computed(() => {
        const n = roundMetric(this.metrics()?.gpu?.tempC);
        if (n != null)
            return n;
        const jetson = this.metrics()?.jetson;
        const temps = jetson?.temperature;
        if (!temps || typeof temps !== 'object')
            return null;
        for (const key of ['gpu', 'GPU', 'tj', 'Tj', 'cpu']) {
            const raw = temps[key];
            const v = typeof raw === 'number'
                ? raw
                : raw && typeof raw === 'object'
                    ? raw.temp
                    : null;
            const rounded = roundMetric(v);
            if (rounded != null)
                return rounded;
        }
        return null;
    });
    cpuModel = computed(() => {
        const model = this.metrics()?.cpu?.model;
        return model ? String(model) : null;
    });
    gpuName = computed(() => {
        const name = this.metrics()?.gpu?.name;
        return name ? String(name) : null;
    });
    memoryLabel = computed(() => {
        const m = this.metrics()?.memory;
        if (!m?.totalBytes)
            return null;
        return formatBytes(m.totalBytes);
    });
    vramLabel = computed(() => {
        const g = this.metrics()?.gpu;
        if (g?.vramTotalGb == null)
            return null;
        const total = roundMetric(g.vramTotalGb);
        if (total == null)
            return null;
        const used = roundMetric(g.vramUsedGb);
        if (used != null) {
            return `${used} / ${total} GiB`;
        }
        return `${total} GiB`;
    });
    /** Acquire a shared live connection (call from component ngOnInit). */
    acquire(opts) {
        this.refCount += 1;
        if (opts.metrics)
            this.wantMetrics = true;
        if (opts.logs)
            this.wantLogs = true;
        if (opts.topology)
            this.wantTopology = true;
        if (opts.feeds?.length) {
            for (const t of opts.feeds) {
                const topic = String(t || '').trim();
                if (topic)
                    this.wantFeeds.add(topic);
            }
        }
        if (opts.feedParams && typeof opts.feedParams === 'object') {
            this.feedParams = { ...this.feedParams, ...opts.feedParams };
        }
        if (opts.feedIntervalMs != null) {
            this.feedIntervalMs = Number(opts.feedIntervalMs) || 4000;
        }
        if (opts.logSources)
            this.logSources = [...opts.logSources];
        this.bindVisibility();
        this.ensureConnected();
        this.pushSubscriptions();
    }
    /** Update feed query params (e.g. traces filters) and request an immediate push. */
    setFeedParams(params) {
        this.feedParams = { ...this.feedParams, ...params };
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        ws.send(JSON.stringify({
            type: 'admin_feed_params',
            params: this.feedParams,
        }));
    }
    /** Re-subscribe to active feeds so the server pushes a fresh snapshot now. */
    refreshFeeds() {
        this.ensureConnected();
        this.pushSubscriptions();
    }
    /** Typed helper for the latest snapshot of a feed topic. */
    feedData(topic) {
        const raw = this.feeds()[topic];
        return raw ?? null;
    }
    /**
     * True until the first snapshot (or error) arrives for an admin feed topic.
     * Use this to show a loading animation instead of an empty-state flash.
     */
    feedLoading(topic) {
        const t = String(topic || '').trim();
        if (!t)
            return false;
        const errors = this.feedErrors();
        if (errors[t] || errors['_'])
            return false;
        return !Object.prototype.hasOwnProperty.call(this.feeds(), t);
    }
    resyncTopology() {
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        ws.send(JSON.stringify({ type: 'topology_resync' }));
    }
    /** Focused live series for a node/edge modal — pair with unsubscribeTopologyWatch. */
    subscribeTopologyWatch(target, id) {
        this.wantTopology = true;
        this.ensureConnected();
        this.pushSubscriptions();
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        ws.send(JSON.stringify({ type: 'topology_watch_subscribe', target, id }));
    }
    unsubscribeTopologyWatch(target, id) {
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        ws.send(JSON.stringify({ type: 'topology_watch_unsubscribe', target, id }));
    }
    /** Release one consumer (call from component ngOnDestroy). */
    release() {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0) {
            this.wantMetrics = false;
            this.wantTopology = false;
            this.wantLogs = false;
            this.wantFeeds.clear();
            this.feedParams = {};
            this.unbindVisibility();
            this.closeSocket();
        }
    }
    setLogSources(sources) {
        this.logSources = sources;
        if (this.wantLogs && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'admin_logs_subscribe',
                sources: sources?.length ? sources : undefined,
            }));
        }
    }
    /** Ask the web process to tail worker Job pods for this run_id (in-cluster). */
    followRunLogs(runId) {
        const rid = String(runId || '').trim();
        if (!rid)
            return;
        this.wantLogs = true;
        this.ensureConnected();
        this.pushSubscriptions();
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        ws.send(JSON.stringify({ type: 'admin_logs_follow_run', runId: rid }));
    }
    clearLogs() {
        this.logs.set([]);
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.closeSocket();
    }
    wsUrl() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        // ng serve (3873) talks directly to the local web process.
        let base = location.port === '3873'
            ? 'ws://127.0.0.1:3847/'
            : `${proto}//${location.host}/`;
        const token = this.webAuth.bearer();
        if (token) {
            const join = base.includes('?') ? '&' : '?';
            base = `${base}${join}access_token=${encodeURIComponent(token)}`;
        }
        return base;
    }
    ensureConnected() {
        if (this.destroyed || this.refCount <= 0)
            return;
        if (this.ws &&
            (this.ws.readyState === WebSocket.OPEN ||
                this.ws.readyState === WebSocket.CONNECTING)) {
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
                }
                catch {
                    /* ignore */
                }
            };
        }
        catch {
            this.scheduleReconnect();
        }
    }
    pushSubscriptions() {
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        if (this.wantMetrics && !this.tabHidden()) {
            ws.send(JSON.stringify({ type: 'host_metrics_subscribe' }));
        }
        if (this.wantMetrics && this.tabHidden()) {
            ws.send(JSON.stringify({ type: 'host_metrics_unsubscribe' }));
        }
        if (this.wantLogs) {
            ws.send(JSON.stringify({
                type: 'admin_logs_subscribe',
                sources: this.logSources?.length ? this.logSources : undefined,
            }));
        }
        if (this.wantTopology && !this.tabHidden()) {
            ws.send(JSON.stringify({ type: 'topology_subscribe' }));
        }
        if (this.wantTopology && this.tabHidden()) {
            ws.send(JSON.stringify({ type: 'topology_unsubscribe' }));
        }
        if (this.wantFeeds.size && !this.tabHidden()) {
            ws.send(JSON.stringify({
                type: 'admin_feed_subscribe',
                topics: [...this.wantFeeds],
                intervalMs: this.feedIntervalMs,
                params: this.feedParams,
            }));
        }
        if (this.wantFeeds.size && this.tabHidden()) {
            ws.send(JSON.stringify({ type: 'admin_feed_unsubscribe' }));
        }
    }
    tabHidden() {
        return typeof document !== 'undefined' && document.hidden;
    }
    bindVisibility() {
        if (this.visibilityHandler || typeof document === 'undefined')
            return;
        this.visibilityHandler = () => {
            if (this.refCount <= 0)
                return;
            this.pushSubscriptions();
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    unbindVisibility() {
        if (!this.visibilityHandler || typeof document === 'undefined')
            return;
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.visibilityHandler = null;
    }
    onMessage(ev) {
        let msg;
        try {
            msg = JSON.parse(String(ev.data || ''));
        }
        catch {
            return;
        }
        const type = String(msg['type'] || '');
        if (type === 'host_metrics') {
            if (this.tabHidden())
                return;
            const sample = msg;
            this.metrics.set(sample);
            this.pushHistory(sample);
            return;
        }
        if (type === 'admin_logs_sources' && Array.isArray(msg['sources'])) {
            this.logSourceOptions.set(msg['sources'].map(String));
            return;
        }
        if (type === 'admin_log') {
            const entry = {
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
            return;
        }
        if (type === 'topology_snapshot' ||
            type === 'topology_delta' ||
            type === 'topology_health' ||
            type === 'topology_metrics' ||
            type === 'topology_watch_snapshot' ||
            type === 'topology_watch_tick') {
            if (this.tabHidden() &&
                (type === 'topology_health' ||
                    type === 'topology_metrics' ||
                    type === 'topology_watch_tick')) {
                return;
            }
            this.topologyEvents.next({ ...msg, type });
            return;
        }
        if (type === 'admin_feed') {
            // Keep applying feed snapshots even while the tab is hidden so dashboards
            // are fresh when the user returns (unlike high-frequency host metrics).
            const topic = String(msg['topic'] || '').trim();
            if (!topic)
                return;
            const payload = msg['data'];
            const generatedAt = msg['generatedAt'];
            const data = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? {
                    ...payload,
                    ...(generatedAt != null ? { generatedAt } : {}),
                }
                : payload;
            this.feeds.update((prev) => ({ ...prev, [topic]: data }));
            this.feedErrors.update((prev) => {
                if (!prev[topic])
                    return prev;
                const next = { ...prev };
                delete next[topic];
                return next;
            });
            return;
        }
        if (type === 'admin_feed_error') {
            const topic = String(msg['topic'] || '').trim() || '_';
            const message = String(msg['message'] || 'Feed error');
            this.feedErrors.update((prev) => ({ ...prev, [topic]: message }));
        }
    }
    pushHistory(sample) {
        const now = Date.now();
        // Throttle chart series updates (~1 Hz) even when the server pushes every 2s.
        if (now - this.lastHistoryPushMs < HISTORY_UI_MIN_MS) {
            return;
        }
        this.lastHistoryPushMs = now;
        const t = Date.parse(String(sample.ts || '')) || now;
        const cpu = roundMetric(sample.cpu?.percent);
        const mem = roundMetric(sample.memory?.usedPercent ?? sample.memory?.percent);
        const jetson = sample.jetson;
        const gpu = roundMetric(sample.gpu?.percent ?? jetson?.gpu?.percent);
        const vram = roundMetric(sample.gpu?.vramUsedPercent);
        const cpuTemp = roundMetric(sample.cpu?.tempC);
        let gpuTemp = roundMetric(sample.gpu?.tempC);
        if (gpuTemp == null) {
            const temps = sample.jetson
                ?.temperature;
            if (temps && typeof temps === 'object') {
                for (const key of ['gpu', 'GPU', 'tj', 'Tj', 'cpu']) {
                    const raw = temps[key];
                    const v = typeof raw === 'number'
                        ? raw
                        : raw && typeof raw === 'object' && 'temp' in raw
                            ? Number(raw.temp)
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
            const nextPoint = {
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
    scheduleReconnect() {
        if (this.destroyed || this.refCount <= 0)
            return;
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.ensureConnected();
        }, RECONNECT_MS);
    }
    closeSocket() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const ws = this.ws;
        this.ws = null;
        this.connected.set(false);
        if (!ws)
            return;
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'host_metrics_unsubscribe' }));
                ws.send(JSON.stringify({ type: 'admin_logs_unsubscribe' }));
                ws.send(JSON.stringify({ type: 'topology_unsubscribe' }));
                ws.send(JSON.stringify({ type: 'admin_feed_unsubscribe' }));
            }
            ws.close();
        }
        catch {
            /* ignore */
        }
    }
};
AoLiveWs = __decorate([
    Injectable({ providedIn: 'root' })
], AoLiveWs);
export { AoLiveWs };
function roundMetric(n) {
    if (n == null || n === '')
        return null;
    const v = Number(n);
    if (!Number.isFinite(v))
        return null;
    return Math.round(v);
}
function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0)
        return '—';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let x = n;
    let i = 0;
    while (x >= 1024 && i < units.length - 1) {
        x /= 1024;
        i += 1;
    }
    return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

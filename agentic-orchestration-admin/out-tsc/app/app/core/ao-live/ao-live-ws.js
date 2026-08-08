import { __decorate } from "tslib";
import { Injectable, computed, signal } from '@angular/core';
const HISTORY_MAX = 180;
const LOG_MAX = 400;
const RECONNECT_MS = 2500;
let AoLiveWs = class AoLiveWs {
    ws = null;
    reconnectTimer = null;
    destroyed = false;
    wantMetrics = false;
    wantLogs = false;
    logSources = null;
    logSeq = 0;
    refCount = 0;
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
    latestCpu = computed(() => {
        const n = this.metrics()?.cpu?.percent;
        return n == null || Number.isNaN(Number(n)) ? null : Number(n);
    });
    latestMem = computed(() => {
        const m = this.metrics()?.memory;
        const n = m?.usedPercent ?? m?.percent;
        return n == null || Number.isNaN(Number(n)) ? null : Number(n);
    });
    latestGpu = computed(() => {
        const jetson = this.metrics()?.jetson;
        const n = jetson?.gpu?.percent;
        return n == null || Number.isNaN(Number(n)) ? null : Number(n);
    });
    /** Acquire a shared live connection (call from component ngOnInit). */
    acquire(opts) {
        this.refCount += 1;
        if (opts.metrics)
            this.wantMetrics = true;
        if (opts.logs)
            this.wantLogs = true;
        if (opts.logSources)
            this.logSources = [...opts.logSources];
        this.ensureConnected();
        this.pushSubscriptions();
    }
    /** Release one consumer (call from component ngOnDestroy). */
    release() {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0) {
            this.wantMetrics = false;
            this.wantLogs = false;
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
        if (location.port === '3873') {
            return 'ws://127.0.0.1:3847/';
        }
        return `${proto}//${location.host}/`;
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
        if (this.wantMetrics) {
            ws.send(JSON.stringify({ type: 'host_metrics_subscribe' }));
        }
        if (this.wantLogs) {
            ws.send(JSON.stringify({
                type: 'admin_logs_subscribe',
                sources: this.logSources?.length ? this.logSources : undefined,
            }));
        }
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
        }
    }
    pushHistory(sample) {
        const t = Date.parse(String(sample.ts || '')) || Date.now();
        const cpu = sample.cpu?.percent == null || Number.isNaN(Number(sample.cpu.percent))
            ? null
            : Number(sample.cpu.percent);
        const memRaw = sample.memory?.usedPercent ?? sample.memory?.percent;
        const mem = memRaw == null || Number.isNaN(Number(memRaw)) ? null : Number(memRaw);
        const jetson = sample.jetson;
        const gpuRaw = jetson?.gpu?.percent;
        const gpu = gpuRaw == null || Number.isNaN(Number(gpuRaw)) ? null : Number(gpuRaw);
        this.history.update((prev) => {
            const next = [...prev, { t, cpu, mem, gpu }];
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

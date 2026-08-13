import { __decorate } from "tslib";
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
let AoApi = class AoApi {
    http = inject(HttpClient);
    toResult(err) {
        const status = err.status || 0;
        const message = (err.error && (err.error.error || err.error.message)) ||
            err.message ||
            `Request failed (${status || 'network'})`;
        return {
            ok: false,
            status,
            message: String(message),
            missing: status === 404,
        };
    }
    get(path) {
        return this.http.get(path, { observe: 'response' }).pipe(map((res) => ({ ok: true, data: res.body })), catchError((err) => of(this.toResult(err))));
    }
    post(path, body) {
        return this.http.post(path, body, { observe: 'response' }).pipe(map((res) => ({ ok: true, data: res.body })), catchError((err) => of(this.toResult(err))));
    }
    put(path, body) {
        return this.http.put(path, body, { observe: 'response' }).pipe(map((res) => ({ ok: true, data: res.body })), catchError((err) => of(this.toResult(err))));
    }
    delete(path) {
        return this.http.delete(path, { observe: 'response' }).pipe(map((res) => ({ ok: true, data: res.body })), catchError((err) => of(this.toResult(err))));
    }
    ping() {
        return this.get('/api/ping');
    }
    session() {
        return this.get('/api/session');
    }
    hostMetrics() {
        return this.get('/api/host-metrics');
    }
    agentProviders() {
        return this.get('/api/agent-providers').pipe(map((r) => {
            if (!r.ok)
                return r;
            return { ok: true, data: (r.data.providers ?? []) };
        }));
    }
    effectiveConfig(opts) {
        const q = opts?.includeInjected ? '?includeInjected=1' : '';
        return this.get(`/api/v1/admin/config/effective${q}`).pipe(map((r) => (r.ok ? { ok: true, data: normalizeEffective(r.data) } : r)));
    }
    fingerprint() {
        return this.get('/api/v1/admin/config/fingerprint');
    }
    catalogs(kind) {
        return this.get(`/api/v1/admin/catalogs/${kind}`).pipe(map((r) => {
            if (!r.ok)
                return r;
            const items = r.data.items ?? r.data.entries ?? r.data.providers ?? [];
            return { ok: true, data: items };
        }));
    }
    catalogDetail(kind, id) {
        return this.get(`/api/v1/admin/catalogs/${kind}/${encodeURIComponent(id)}`);
    }
    topology() {
        return this.get('/api/v1/admin/health/topology');
    }
    topologyGraph() {
        return this.get('/api/v1/admin/topology/graph');
    }
    topologyNode(id) {
        return this.get(`/api/v1/admin/topology/node/${encodeURIComponent(id)}`);
    }
    storage() {
        return this.get('/api/v1/admin/storage');
    }
    accessPosture() {
        return this.get('/api/v1/admin/access/posture');
    }
    runs(limit = 50) {
        return this.get(`/api/v1/admin/runs?limit=${limit}`);
    }
    runDetail(id) {
        return this.get(`/api/v1/admin/runs/${encodeURIComponent(id)}`);
    }
    traces(limit = 50, opts) {
        const q = new URLSearchParams();
        q.set('limit', String(limit));
        if (opts?.client)
            q.set('client', opts.client);
        if (opts?.clientIp)
            q.set('clientIp', opts.clientIp);
        if (opts?.crewOnly)
            q.set('crewOnly', '1');
        return this.get(`/api/v1/admin/traces?${q.toString()}`);
    }
    runTrace(id, depth = 'all') {
        const q = depth && depth !== 'all' ? `?depth=${encodeURIComponent(depth)}` : '';
        return this.get(`/api/v1/admin/traces/${encodeURIComponent(id)}${q}`);
    }
    llmUsage(limit = 200) {
        return this.get(`/api/v1/admin/llm-usage?limit=${limit}`);
    }
    supportBundle() {
        return this.get('/api/v1/admin/support-bundle');
    }
    listApiTokens() {
        return this.get('/api/v1/admin/tokens').pipe(map((r) => {
            if (!r.ok)
                return r;
            return { ok: true, data: r.data.tokens ?? [] };
        }));
    }
    mintApiToken(body) {
        return this.post('/api/v1/admin/tokens', body);
    }
    revokeApiToken(id) {
        return this.delete(`/api/v1/admin/tokens/${encodeURIComponent(id)}`);
    }
    apiTokenUsage(id, limit = 100) {
        return this.get(`/api/v1/admin/tokens/${encodeURIComponent(id)}/usage?limit=${limit}`).pipe(map((r) => {
            if (!r.ok)
                return r;
            return { ok: true, data: r.data.usage ?? [] };
        }));
    }
    listAppPrefs() {
        return this.get('/api/v1/admin/app-prefs').pipe(map((r) => {
            if (!r.ok)
                return r;
            return { ok: true, data: r.data.apps ?? [] };
        }));
    }
    setAppPrefs(appId, body) {
        return this.put(`/api/v1/admin/app-prefs/${encodeURIComponent(appId)}`, body);
    }
    listMtlsClients() {
        return this.get('/api/v1/admin/mtls/clients').pipe(map((r) => {
            if (!r.ok)
                return r;
            return { ok: true, data: r.data.clients ?? [] };
        }));
    }
    revokeMtlsClient(body) {
        return this.post('/api/v1/admin/mtls/clients/revoke', body);
    }
    unrevokeMtlsClient(body) {
        return this.post('/api/v1/admin/mtls/clients/unrevoke', body);
    }
    mintMtlsEnrollToken(body) {
        return this.post('/api/v1/admin/mtls/enroll-tokens', body);
    }
    controlStatus() {
        return this.get('/api/v1/admin/control').pipe(map((r) => {
            if (!r.ok)
                return r;
            return {
                ok: true,
                data: {
                    ...r.data,
                    targets: r.data.targets ?? [],
                },
            };
        }));
    }
    controlRestart(body) {
        return this.post('/api/v1/admin/control/restart', body);
    }
};
AoApi = __decorate([
    Injectable({ providedIn: 'root' })
], AoApi);
export { AoApi };
function normalizeEffective(raw) {
    if (Array.isArray(raw.entries)) {
        return raw.entries.map(normalizeEntry);
    }
    if (raw.entries && typeof raw.entries === 'object') {
        return Object.values(raw.entries).map(normalizeEntry);
    }
    if (raw.keys && typeof raw.keys === 'object') {
        return Object.entries(raw.keys).map(([key, entry]) => normalizeEntry({ ...entry, key: entry.key || key }));
    }
    return [];
}
/** Map backend plane names to UI source chips. */
export function normalizeSource(source, sourcePath) {
    const s = String(source || 'unset');
    if (s === 'process')
        return 'process-env';
    if (s === 'tracked') {
        if (sourcePath && sourcePath.includes('env.jetson'))
            return 'env.jetson';
        if (sourcePath && sourcePath.includes('env.nvr'))
            return 'env.nvr';
        if (sourcePath && sourcePath.includes('env.host'))
            return 'env.host';
        return 'tracked';
    }
    return s;
}
function normalizeEntry(entry) {
    const effective = entry.effective !== undefined && entry.effective !== null
        ? entry.effective
        : entry.value ?? null;
    return {
        ...entry,
        label: entry.label || entry.key,
        effective,
        value: effective,
        applyTier: entry.applyTier || entry.tier || 'restart',
        tier: entry.tier || entry.applyTier || 'restart',
        source: normalizeSource(entry.source, entry.sourcePath || entry.sourceFile),
        sourceFile: entry.sourceFile || entry.sourcePath || null,
    };
}

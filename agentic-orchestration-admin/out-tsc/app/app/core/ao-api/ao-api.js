import { __decorate } from "tslib";
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
let AoApi = class AoApi {
    http = inject(HttpClient);
    get(path) {
        return this.http.get(path, { observe: 'response' }).pipe(map((res) => ({ ok: true, data: res.body })), catchError((err) => {
            const status = err.status || 0;
            const message = (err.error && (err.error.error || err.error.message)) ||
                err.message ||
                `Request failed (${status || 'network'})`;
            return of({
                ok: false,
                status,
                message: String(message),
                missing: status === 404,
            });
        }));
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
    effectiveConfig() {
        return this.get('/api/v1/admin/config/effective').pipe(map((r) => (r.ok ? { ok: true, data: normalizeEffective(r.data) } : r)));
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
    storage() {
        return this.get('/api/v1/admin/storage');
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
function normalizeEntry(entry) {
    return {
        ...entry,
        label: entry.label || entry.key,
        applyTier: entry.applyTier || entry.tier || 'restart',
        tier: entry.tier || entry.applyTier || 'restart',
        source: entry.source || 'unset',
        sourceFile: entry.sourceFile || entry.sourcePath || null,
    };
}

import { __decorate } from "tslib";
import { Injectable, computed, inject, signal } from '@angular/core';
import { AoApi } from '@/app/core/ao-api/ao-api';
let EffectiveConfigStore = class EffectiveConfigStore {
    api = inject(AoApi);
    loading = signal(false);
    error = signal(null);
    missing = signal(false);
    entries = signal([]);
    fingerprint = signal(null);
    lastLoadedAt = signal(null);
    byKey = computed(() => {
        const map = new Map();
        for (const e of this.entries()) {
            map.set(e.key, e);
        }
        return map;
    });
    entriesForGroup(group) {
        const groups = Array.isArray(group) ? group : [group];
        const set = new Set(groups.map((g) => g.toLowerCase()));
        return this.entries().filter((e) => {
            const g = (e.group || inferGroup(e.key)).toLowerCase();
            return set.has(g);
        });
    }
    search(query) {
        const q = query.trim().toLowerCase();
        if (!q)
            return [];
        return this.entries().filter((e) => e.key.toLowerCase().includes(q) ||
            String(e.description || '')
                .toLowerCase()
                .includes(q) ||
            String(e.displayValue ?? e.value ?? '')
                .toLowerCase()
                .includes(q));
    }
    load() {
        this.loading.set(true);
        this.error.set(null);
        this.api.effectiveConfig().subscribe((r) => {
            this.loading.set(false);
            if (!r.ok) {
                this.missing.set(r.missing);
                this.error.set(r.message);
                this.entries.set([]);
                return;
            }
            this.missing.set(false);
            this.entries.set(r.data);
            this.lastLoadedAt.set(new Date().toISOString());
        });
        this.api.fingerprint().subscribe((r) => {
            if (r.ok) {
                this.fingerprint.set(r.data.fingerprint);
            }
        });
    }
};
EffectiveConfigStore = __decorate([
    Injectable({ providedIn: 'root' })
], EffectiveConfigStore);
export { EffectiveConfigStore };
/** Heuristic grouping until admin API returns group metadata. */
export function inferGroup(key) {
    const k = key.toUpperCase();
    if (k.includes('PLANNER') ||
        k.includes('ITERATIVE') ||
        k.includes('SESSION') ||
        k.includes('ANSWER_CACHE') ||
        k.includes('WEB_DEFAULT')) {
        return 'planner';
    }
    if (k.includes('EXECUTION') ||
        k.includes('K8S') ||
        k.includes('WARM_POOL') ||
        k.includes('RUN_STORE') ||
        k.includes('SUBPROCESS') ||
        k.includes('DELEGAT')) {
        return 'execution';
    }
    if (k.includes('OLLAMA') ||
        k.includes('OPENAI') ||
        k.includes('ANTHROPIC') ||
        k.includes('VRAM') ||
        k.includes('MODEL') ||
        k.includes('KEEPALIVE') ||
        k.includes('AUTO_ENSURE') ||
        k.includes('API_KEY')) {
        return 'models';
    }
    if (k.includes('SOCIETY') || k.includes('QA') || k.includes('ANONYM') || k.includes('KB_') || k.includes('LEARN')) {
        return 'memory';
    }
    if (k.includes('MTLS') || k.includes('DEAL') || k.includes('IDENTITY') || k.includes('BRIDGE')) {
        return 'security';
    }
    if (k.includes('OPENCLAW') || k.includes('REACH') || k.includes('SPEECH') || k.includes('HOME_ASSISTANT') || k.includes('SEARCH')) {
        return 'integrations';
    }
    if (k.includes('JETSON') || k.includes('SERVE') || k.includes('VERTICAL') || k.includes('ORCHESTRATOR_CONTEXT')) {
        return 'deployments';
    }
    return 'advanced';
}

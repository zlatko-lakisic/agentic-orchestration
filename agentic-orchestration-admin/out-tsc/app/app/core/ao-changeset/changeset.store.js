import { __decorate } from "tslib";
import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStorage } from '@/app/core/local-storage';
const STORAGE_KEY = 'ao-admin.changeset.v0';
let ChangeSetStore = class ChangeSetStore {
    localStorage = inject(LocalStorage);
    entries = signal(this.restore());
    count = computed(() => this.entries().length);
    hasPending = computed(() => this.count() > 0);
    restore() {
        const raw = this.localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        try {
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    persist() {
        this.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
    }
    upsert(entry) {
        this.entries.update((list) => {
            const next = list.filter((e) => e.key !== entry.key);
            next.push(entry);
            return next;
        });
        this.persist();
    }
    remove(key) {
        this.entries.update((list) => list.filter((e) => e.key !== key));
        this.persist();
    }
    clear() {
        this.entries.set([]);
        this.persist();
    }
    /** Phase 0: export local change set as a text diff artefact. */
    exportDiff() {
        const lines = [
            '# AO Admin change set (Phase 0 — local only)',
            '# Apply manually to the appropriate .env / env.jetson / Secret.',
            `# Generated: ${new Date().toISOString()}`,
            '',
        ];
        for (const e of this.entries()) {
            lines.push(`# ${e.key}  tier=${e.applyTier}  source=${e.source ?? '?'}`);
            lines.push(`- ${e.key}=${e.from ?? ''}`);
            lines.push(`+ ${e.key}=${e.to ?? ''}`);
            lines.push('');
        }
        return lines.join('\n');
    }
};
ChangeSetStore = __decorate([
    Injectable({ providedIn: 'root' })
], ChangeSetStore);
export { ChangeSetStore };

import { Injectable, computed, inject, signal } from '@angular/core';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { EffectiveConfigEntry } from '@/app/core/ao-api/types';

@Injectable({ providedIn: 'root' })
export class EffectiveConfigStore {
  private api = inject(AoApi);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly missing = signal(false);
  readonly entries = signal<EffectiveConfigEntry[]>([]);
  readonly fingerprint = signal<string | null>(null);
  readonly lastLoadedAt = signal<string | null>(null);

  readonly byKey = computed(() => {
    const map = new Map<string, EffectiveConfigEntry>();
    for (const e of this.entries()) {
      map.set(e.key, e);
    }
    return map;
  });

  entriesForGroup(group: string | string[]): EffectiveConfigEntry[] {
    const groups = Array.isArray(group) ? group : [group];
    const set = new Set(groups.map((g) => g.toLowerCase()));
    return this.entries().filter((e) => {
      const g = (e.group || inferGroup(e.key)).toLowerCase();
      return set.has(g);
    });
  }

  search(query: string): EffectiveConfigEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.entries().filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        String(e.description || '')
          .toLowerCase()
          .includes(q) ||
        String(e.displayValue ?? e.value ?? '')
          .toLowerCase()
          .includes(q)
    );
  }

  load(): void {
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
}

/** Heuristic grouping until admin API returns group metadata. */
export function inferGroup(key: string): string {
  const k = key.toUpperCase();
  if (
    k.includes('PLANNER') ||
    k.includes('ITERATIVE') ||
    k.includes('SESSION') ||
    k.includes('ANSWER_CACHE') ||
    k.includes('WEB_DEFAULT')
  ) {
    return 'planner';
  }
  if (
    k.includes('EXECUTION') ||
    k.includes('K8S') ||
    k.includes('WARM_POOL') ||
    k.includes('RUN_STORE') ||
    k.includes('SUBPROCESS') ||
    k.includes('DELEGAT')
  ) {
    return 'execution';
  }
  if (
    k.includes('OLLAMA') ||
    k.includes('OPENAI') ||
    k.includes('ANTHROPIC') ||
    k.includes('VRAM') ||
    k.includes('MODEL') ||
    k.includes('KEEPALIVE') ||
    k.includes('AUTO_ENSURE') ||
    k.includes('API_KEY')
  ) {
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

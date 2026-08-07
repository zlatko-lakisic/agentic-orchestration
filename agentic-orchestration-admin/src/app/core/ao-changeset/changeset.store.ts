import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStorage } from '@/app/core/local-storage';
import { AoApplyTier, AoSource } from '@/app/core/ao-api/types';
// AoApplyTier alias

export interface ChangeSetEntry {
  key: string;
  from: string | null;
  to: string | null;
  plane?: string;
  applyTier: AoApplyTier | string;
  source?: AoSource | string;
}

const STORAGE_KEY = 'ao-admin.changeset.v0';

@Injectable({ providedIn: 'root' })
export class ChangeSetStore {
  private localStorage = inject(LocalStorage);

  readonly entries = signal<ChangeSetEntry[]>(this.restore());
  readonly count = computed(() => this.entries().length);
  readonly hasPending = computed(() => this.count() > 0);

  private restore(): ChangeSetEntry[] {
    const raw = this.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ChangeSetEntry[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    this.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
  }

  upsert(entry: ChangeSetEntry): void {
    this.entries.update((list) => {
      const next = list.filter((e) => e.key !== entry.key);
      next.push(entry);
      return next;
    });
    this.persist();
  }

  remove(key: string): void {
    this.entries.update((list) => list.filter((e) => e.key !== key));
    this.persist();
  }

  clear(): void {
    this.entries.set([]);
    this.persist();
  }

  /** Phase 0: export local change set as a text diff artefact. */
  exportDiff(): string {
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
}

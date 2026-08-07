import { Component, OnInit, inject, signal } from '@angular/core';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { StorageEntry } from '@/app/core/ao-api/types';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-data-page',
  imports: [StatusChip, ErrorState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Data & storage</h1>
        <p class="mt-1 text-sm text-neutral-500">Runtime directories under the tool root (wipe actions are Phase 1+)</p>
      </header>
      @if (error()) { <ao-error-state [message]="error()!" /> }
      <div class="overflow-hidden rounded-lg border border-neutral-800">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-neutral-800 font-mono text-2xs text-neutral-500">
            <tr><th class="px-3 py-2">name</th><th class="px-3 py-2">path</th><th class="px-3 py-2">files</th><th class="px-3 py-2">bytes</th><th class="px-3 py-2">status</th></tr>
          </thead>
          <tbody>
            @for (r of roots(); track r.path) {
              <tr class="border-b border-neutral-900">
                <td class="px-3 py-2">{{ r.label || r.id }}</td>
                <td class="px-3 py-2 font-mono text-xs text-neutral-400 break-all">{{ r.path }}</td>
                <td class="px-3 py-2 font-mono text-xs">{{ r.files ?? '—' }}</td>
                <td class="px-3 py-2 font-mono text-xs">{{ formatBytes(r.bytes ?? r.sizeBytes) }}</td>
                <td class="px-3 py-2"><ao-status-chip [status]="r.exists ? 'healthy' : 'unset'" [label]="r.exists ? 'Present' : 'Missing'" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class DataPage implements OnInit {
  private api = inject(AoApi);
  readonly roots = signal<StorageEntry[]>([]);
  readonly error = signal<string | null>(null);
  ngOnInit() {
    this.api.storage().subscribe((r) => {
      if (!r.ok) { this.error.set(r.message); return; }
      this.roots.set(r.data.roots || r.data.entries || []);
    });
  }
  formatBytes(n?: number | null) {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KiB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MiB`;
    return `${(n / 1024 ** 3).toFixed(2)} GiB`;
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { CatalogEntry } from '@/app/core/ao-api/types';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

const KINDS = [
  { id: 'agents', label: 'Agents' },
  { id: 'mcp', label: 'MCP' },
  { id: 'skills', label: 'Skills' },
  { id: 'rag', label: 'RAG' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'harnesses', label: 'Harnesses' },
  { id: 'societies', label: 'Societies' },
];

@Component({
  selector: 'ao-catalogs-page',
  imports: [RouterLink, StatusChip, EmptyState, ErrorState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-4 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Catalogs</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Every entry shows availability; hidden items link to the credential that unblocks them.
        </p>
      </header>

      <div class="mb-4 flex flex-wrap gap-2">
        @for (k of kinds; track k.id) {
          <a
            class="rounded-md border px-2.5 py-1 text-xs"
            [class.border-primary-500]="kind() === k.id"
            [class.text-primary-300]="kind() === k.id"
            [class.border-neutral-700]="kind() !== k.id"
            [routerLink]="['/catalogs', k.id]"
          >{{ k.label }}</a>
        }
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      } @else if (!entries().length) {
        <ao-empty-state message="No catalog entries loaded." />
      } @else {
        <div class="overflow-hidden rounded-lg border border-neutral-800">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-neutral-800 bg-neutral-900/80 font-mono text-2xs text-neutral-500">
              <tr>
                <th class="px-3 py-2">id</th>
                <th class="px-3 py-2">type</th>
                <th class="px-3 py-2">status</th>
                <th class="px-3 py-2">gate</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entries(); track e.id) {
                <tr class="border-b border-neutral-900 hover:bg-neutral-900/50">
                  <td class="px-3 py-2">
                    <a class="font-mono text-xs text-primary-300 hover:underline" [routerLink]="['/catalogs', kind(), e.id]">{{ e.id }}</a>
                    @if (e.role || e.description) {
                      <div class="mt-0.5 max-w-md truncate text-xs text-neutral-500">{{ e.role || e.description }}</div>
                    }
                  </td>
                  <td class="px-3 py-2 font-mono text-xs text-neutral-400">{{ e.type || '—' }}</td>
                  <td class="px-3 py-2"><ao-status-chip [status]="e.status || 'available'" /></td>
                  <td class="px-3 py-2 text-xs text-neutral-400">
                    @if (e.gateReason && e.fixKey) {
                      <a class="text-amber-400 hover:underline" [routerLink]="fixRoute(e.fixKey)" [queryParams]="{ flash: e.fixKey }">{{ e.gateReason }} →</a>
                    } @else {
                      {{ e.gateReason || '—' }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class CatalogsPage implements OnInit {
  private api = inject(AoApi);
  private route = inject(ActivatedRoute);
  readonly kinds = KINDS;
  readonly kind = signal('agents');
  readonly entries = signal<CatalogEntry[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      const k = pm.get('kind') || 'agents';
      this.kind.set(k);
      this.load(k);
    });
  }

  load(kind: string) {
    this.error.set(null);
    this.api.catalogs(kind).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        this.entries.set([]);
        return;
      }
      this.entries.set(r.data);
    });
  }

  fixRoute(key: string): string {
    if (key.includes('API_KEY') || key.includes('TOKEN') || key.includes('OLLAMA') || key.includes('HF_')) {
      return '/runtime/models';
    }
    if (key.includes('MCP') || key.includes('HOME_ASSISTANT') || key.includes('FILESYSTEM')) {
      return '/integrations';
    }
    return '/advanced';
  }
}

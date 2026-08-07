import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { CatalogEntry } from '@/app/core/ao-api/types';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-catalog-detail-page',
  imports: [RouterLink, StatusChip, ErrorState],
  template: `
    <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <a class="text-xs text-neutral-500 hover:underline" [routerLink]="['/catalogs', kind()]">← Catalogs</a>
      @if (error()) {
        <ao-error-state class="mt-4" [message]="error()!" />
      } @else if (entry()) {
        <header class="mt-3 mb-6 border-b border-neutral-800 pb-4">
          <div class="flex items-center gap-3">
            <h1 class="font-mono text-lg font-semibold">{{ entry()!.id }}</h1>
            <ao-status-chip [status]="entry()!.status || 'available'" />
          </div>
          <p class="mt-2 text-sm text-neutral-400">{{ entry()!.description || entry()!.plannerHint || entry()!.role || '' }}</p>
        </header>
        <dl class="space-y-3 font-mono text-xs">
          <div class="flex justify-between gap-4 border-b border-neutral-900 py-2"><dt class="text-neutral-500">type</dt><dd>{{ entry()!.type || '—' }}</dd></div>
          <div class="flex justify-between gap-4 border-b border-neutral-900 py-2"><dt class="text-neutral-500">file</dt><dd>{{ entry()!.file || '—' }}</dd></div>
          <div class="flex justify-between gap-4 border-b border-neutral-900 py-2"><dt class="text-neutral-500">gate</dt><dd>{{ entry()!.gateReason || 'none' }}</dd></div>
        </dl>
        <h2 class="mt-8 mb-3 text-md font-medium">Availability trace</h2>
        <ol class="space-y-2">
          @for (step of entry()!.availabilityTrace || []; track step.step) {
            <li class="rounded-md border border-neutral-800 px-3 py-2 text-sm">
              <div class="flex items-center gap-2">
                <ao-status-chip [status]="step.result" />
                <span class="font-mono text-xs">{{ step.step }}</span>
              </div>
              <div class="mt-1 text-xs text-neutral-400">{{ step.detail }}</div>
            </li>
          }
        </ol>
      }
    </div>
  `,
})
export class CatalogDetailPage implements OnInit {
  private api = inject(AoApi);
  private route = inject(ActivatedRoute);
  readonly kind = signal('agents');
  readonly entry = signal<(CatalogEntry & { availabilityTrace?: any[]; file?: string; plannerHint?: string }) | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      const kind = pm.get('kind') || 'agents';
      const id = pm.get('id') || '';
      this.kind.set(kind);
      this.api.catalogDetail(kind, id).subscribe((r) => {
        if (!r.ok) {
          this.error.set(r.message);
          this.entry.set(null);
          return;
        }
        this.entry.set(r.data as any);
      });
    });
  }
}

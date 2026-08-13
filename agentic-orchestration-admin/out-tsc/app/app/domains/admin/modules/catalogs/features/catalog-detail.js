import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
/** Fuse Order detail drawer pattern. */
let CatalogDetailPage = class CatalogDetailPage {
    api = inject(AoApi);
    route = inject(ActivatedRoute);
    router = inject(Router);
    kind = signal('agents');
    entry = signal(null);
    error = signal(null);
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
                this.entry.set(r.data);
            });
        });
    }
    close() {
        this.router.navigate(['/capabilities', this.kind()]);
    }
};
CatalogDetailPage = __decorate([
    Component({
        selector: 'ao-catalog-detail-page',
        imports: [MatIcon, MatIconButton, MatTooltip, MatDivider, StatusChip, ErrorState],
        template: `
    <div class="flex w-full flex-col">
      <div
        class="relative w-full border-b bg-neutral-100 px-6 py-6 sm:px-8 dark:bg-neutral-800"
      >
        <div class="flex items-start gap-x-3">
          <div class="flex min-w-0 flex-auto flex-col gap-y-1">
            <div class="truncate font-mono text-xl font-bold tracking-tighter sm:text-2xl">
              {{ entry()?.id || '…' }}
            </div>
            <div class="text-neutral-500">
              {{ entry()?.description || entry()?.role || kind() }}
            </div>
          </div>
          @if (entry()) {
            <ao-status-chip [status]="entry()!.status || 'available'" />
          }
          <button
            matIconButton
            type="button"
            [matTooltip]="'Close'"
            (click)="close()"
          >
            <mat-icon svgIcon="x" />
          </button>
        </div>
      </div>

      <div class="relative flex flex-auto flex-col p-6 sm:p-8">
        @if (error()) {
          <ao-error-state [message]="error()!" />
        } @else if (entry(); as e) {
          <div class="flex flex-col gap-y-6">
            <div class="grid gap-3 font-mono text-xs">
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">type</span>
                <span>{{ e.type || '—' }}</span>
              </div>
              <mat-divider />
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">file</span>
                <span class="truncate text-right">{{ e.file || '—' }}</span>
              </div>
              <mat-divider />
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">gate</span>
                <span class="text-right">{{ e.gateReason || 'none' }}</span>
              </div>
            </div>

            <div>
              <div class="mb-3 text-lg font-medium">Availability trace</div>
              <div class="flex flex-col gap-y-2">
                @for (step of e.availabilityTrace || []; track step.step) {
                  <div
                    class="rounded-lg border px-3 py-2"
                  >
                    <div class="flex items-center gap-2">
                      <ao-status-chip [status]="step.result" />
                      <span class="font-mono text-xs">{{ step.step }}</span>
                    </div>
                    <div class="mt-1 text-sm text-neutral-500">
                      {{ step.detail }}
                    </div>
                  </div>
                } @empty {
                  <div class="text-sm text-neutral-500">No trace steps</div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
    })
], CatalogDetailPage);
export { CatalogDetailPage };

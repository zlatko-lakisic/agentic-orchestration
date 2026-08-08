import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { NAVIGATION, NavigationItem } from '@/app/domains/admin/layout/data/navigation';

type PaletteHit = {
  kind: 'nav' | 'config';
  label: string;
  detail: string;
  route: string;
  flash?: string;
};

/**
 * Fuse Assistant overlay chrome (layout/ui/assistant.ts) used for search.
 */
@Component({
  selector: 'ao-command-palette',
  imports: [
    FormsModule,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatIcon,
    MatIconButton,
    MatTooltip,
  ],
  template: `
    <span
      class="hidden"
      cdkOverlayOrigin
      #trigger="cdkOverlayOrigin"
    ></span>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger"
      [cdkConnectedOverlayOpen]="visible()"
      [cdkConnectedOverlayHasBackdrop]="true"
      (detach)="close()"
      (backdropClick)="close()"
    >
      <div
        class="fixed inset-y-0 right-0 flex w-96 max-w-full flex-col bg-white shadow-(--mat-sys-level2) dark:bg-neutral-800"
      >
        <div class="flex items-center gap-x-2 border-b px-4 py-3">
          <div class="flex min-w-0 flex-auto items-center gap-x-3">
            <mat-icon
              class="size-4.5 text-primary-600"
              svgIcon="sparkles"
            />
            <div class="truncate text-xl font-semibold tracking-tighter">
              Search
            </div>
          </div>
          <button
            class="text-neutral-500"
            matIconButton
            type="button"
            [matTooltip]="'Close'"
            (click)="close()"
          >
            <mat-icon svgIcon="x" />
          </button>
        </div>

        <div class="border-b px-4 py-3">
          <input
            class="w-full border-0 bg-transparent outline-none"
            placeholder="Search pages and settings…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            autofocus
          />
        </div>

        <div class="flex flex-auto flex-col gap-y-1 overflow-y-auto px-2 py-3">
          @for (hit of hits(); track hit.label + hit.route + hit.detail) {
            <button
              type="button"
              class="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              (click)="go(hit)"
            >
              <span class="text-sm font-medium">{{ hit.label }}</span>
              <span class="font-mono text-xs text-neutral-500">{{
                hit.detail
              }}</span>
            </button>
          } @empty {
            <div class="px-3 py-6 text-sm text-neutral-500">No matches</div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class CommandPalette {
  private router = inject(Router);
  private config = inject(EffectiveConfigStore);

  readonly visible = signal(false);
  readonly query = signal('');

  readonly hits = computed(() => {
    const q = this.query().trim().toLowerCase();
    const out: PaletteHit[] = [];
    for (const hit of this.flattenNav(NAVIGATION)) {
      if (
        !q ||
        hit.label.toLowerCase().includes(q) ||
        hit.detail.toLowerCase().includes(q)
      ) {
        out.push(hit);
      }
    }
    if (q) {
      for (const e of this.config.entries()) {
        if (
          e.key.toLowerCase().includes(q) ||
          String(e.label || '')
            .toLowerCase()
            .includes(q)
        ) {
          out.push({
            kind: 'config',
            label: e.label || e.key,
            detail: e.key,
            route: this.routeForGroup(e.group),
            flash: e.key,
          });
        }
      }
    }
    return out.slice(0, 40);
  });

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.visible.update((v) => !v);
    }
    if (ev.key === 'Escape') this.close();
  }

  open() {
    this.visible.set(true);
    this.config.load();
  }

  close() {
    this.visible.set(false);
    this.query.set('');
  }

  go(hit: PaletteHit) {
    const url = hit.flash
      ? `${hit.route}?flash=${encodeURIComponent(hit.flash)}`
      : hit.route;
    void this.router.navigateByUrl(url);
    this.close();
  }

  private flattenNav(
    items: NavigationItem[],
    acc: PaletteHit[] = []
  ): PaletteHit[] {
    for (const it of items) {
      if (it.route) {
        acc.push({
          kind: 'nav',
          label: it.label,
          detail: it.route,
          route: it.route,
        });
      }
      if (it.children) this.flattenNav(it.children, acc);
    }
    return acc;
  }

  private routeForGroup(group?: string): string {
    switch (group) {
      case 'planner':
        return '/runtime/planner';
      case 'execution':
      case 'engine':
        return '/runtime/execution';
      case 'models':
        return '/runtime/models';
      case 'memory':
        return '/memory';
      case 'security':
        return '/security';
      case 'integrations':
        return '/integrations';
      case 'deployments':
        return '/deployments';
      default:
        return '/advanced';
    }
  }
}

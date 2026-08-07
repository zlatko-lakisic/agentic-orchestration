import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'ao-command-palette',
  imports: [FormsModule],
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
        (click)="close()"
      >
        <div
          class="w-full max-w-xl overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <input
            class="w-full border-b border-neutral-800 bg-transparent px-4 py-3 font-mono text-sm outline-none"
            placeholder="Search settings, catalogs, pages…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            autofocus
          />
          <div class="max-h-80 overflow-auto py-1">
            @for (hit of hits(); track hit.label + hit.route + hit.detail) {
              <button
                type="button"
                class="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-neutral-800"
                (click)="go(hit)"
              >
                <span class="text-sm">{{ hit.label }}</span>
                <span class="font-mono text-2xs text-neutral-500">{{ hit.detail }}</span>
              </button>
            } @empty {
              <div class="px-4 py-6 text-sm text-neutral-500">No matches</div>
            }
          </div>
        </div>
      </div>
    }
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
      if (!q || hit.label.toLowerCase().includes(q) || hit.detail.toLowerCase().includes(q)) {
        out.push(hit);
      }
    }
    if (q) {
      for (const e of this.config.entries()) {
        if (e.key.toLowerCase().includes(q) || String(e.label || '').toLowerCase().includes(q)) {
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

  /** Called from layout template `#palette.open()` */
  open() {
    this.visible.set(true);
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

  private flattenNav(items: NavigationItem[], acc: PaletteHit[] = []): PaletteHit[] {
    for (const it of items) {
      if (it.route) {
        acc.push({ kind: 'nav', label: it.label, detail: it.route, route: it.route });
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

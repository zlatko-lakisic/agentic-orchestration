import { __decorate } from "tslib";
import { I18nPluralPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggle, MatButtonToggleGroup, } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatPrefix } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSidenav, MatSidenavContainer, MatSidenavContent, } from '@angular/material/sidenav';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet, } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { Media } from '@/app/core/media';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
const KINDS = [
    { id: 'agents', label: 'Agents' },
    { id: 'mcp', label: 'MCP servers' },
    { id: 'skills', label: 'Skills' },
    { id: 'rag', label: 'RAG sources' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'harnesses', label: 'Harnesses' },
    { id: 'societies', label: 'Societies' },
];
/** Fuse Orders list pattern: header + search + mat-table + end detail drawer. */
let CatalogsPage = class CatalogsPage {
    api = inject(AoApi);
    route = inject(ActivatedRoute);
    router = inject(Router);
    media = inject(Media);
    kinds = KINDS;
    kind = signal('agents');
    entries = signal([]);
    error = signal(null);
    search = signal('');
    statusFilter = signal('all');
    providerFilter = signal('all');
    columns = ['id', 'type', 'status', 'gate'];
    counts = computed(() => {
        const tally = new Map();
        for (const e of this.entries()) {
            const s = String(e.status || 'available');
            tally.set(s, (tally.get(s) ?? 0) + 1);
        }
        return [...tally.entries()]
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count);
    });
    providers = computed(() => {
        const set = new Set();
        for (const e of this.entries()) {
            if (e.type)
                set.add(String(e.type));
        }
        return [...set].sort((a, b) => a.localeCompare(b));
    });
    dataSource = new MatTableDataSource([]);
    url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url), startWith(this.router.url)), { initialValue: this.router.url });
    isMobile = computed(() => this.media.match(`(max-width: 639px)`)());
    detailOpen = computed(() => /\/capabilities\/[^/]+\/[^/]+/.test(this.url().split('?')[0]));
    ngOnInit() {
        this.route.paramMap.subscribe((pm) => {
            const k = pm.get('kind') || 'agents';
            this.kind.set(k);
            this.statusFilter.set('all');
            this.providerFilter.set('all');
            this.load(k);
        });
    }
    load(kind) {
        this.error.set(null);
        this.api.catalogs(kind).subscribe((r) => {
            if (!r.ok) {
                this.error.set(r.message);
                this.entries.set([]);
                this.dataSource.data = [];
                return;
            }
            this.entries.set(r.data);
            this.applyFilter();
        });
    }
    onSearch(value) {
        this.search.set(value);
        this.applyFilter();
    }
    onStatusFilter(value) {
        this.statusFilter.set(value || 'all');
        this.applyFilter();
    }
    onProviderFilter(value) {
        this.providerFilter.set(value || 'all');
        this.applyFilter();
    }
    applyFilter() {
        const rows = this.entries();
        const needle = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        const provider = this.providerFilter();
        let filtered = !needle
            ? [...rows]
            : rows.filter((e) => e.id.toLowerCase().includes(needle) ||
                String(e.type || '')
                    .toLowerCase()
                    .includes(needle) ||
                String(e.role || e.description || '')
                    .toLowerCase()
                    .includes(needle) ||
                String(e.gateReason || '')
                    .toLowerCase()
                    .includes(needle));
        if (status !== 'all') {
            filtered = filtered.filter((e) => {
                const s = String(e.status || 'available');
                if (status === 'gated')
                    return Boolean(e.gateReason) || s !== 'available';
                return s === status;
            });
        }
        if (provider !== 'all') {
            filtered = filtered.filter((e) => String(e.type || '') === provider);
        }
        // Gated / non-available first — those are the actionable rows.
        filtered.sort((a, b) => {
            const ag = a.gateReason || (a.status && a.status !== 'available') ? 0 : 1;
            const bg = b.gateReason || (b.status && b.status !== 'available') ? 0 : 1;
            return ag - bg || a.id.localeCompare(b.id);
        });
        this.dataSource.data = filtered;
    }
    closeDetail() {
        this.router.navigate(['/capabilities', this.kind()]);
    }
    fixRoute(key) {
        if (key.includes('API_KEY') ||
            key.includes('TOKEN') ||
            key.includes('OLLAMA') ||
            key.includes('HF_')) {
            return '/components/ollama';
        }
        if (key.includes('MCP') ||
            key.includes('HOME_ASSISTANT') ||
            key.includes('FILESYSTEM')) {
            return '/components';
        }
        return '/settings';
    }
};
CatalogsPage = __decorate([
    Component({
        selector: 'ao-catalogs-page',
        imports: [
            I18nPluralPipe,
            MatIcon,
            MatFormField,
            MatInput,
            MatPrefix,
            MatTableModule,
            MatSidenavContainer,
            MatSidenav,
            MatSidenavContent,
            MatTabNav,
            MatTabLink,
            MatTabNavPanel,
            MatButtonToggle,
            MatButtonToggleGroup,
            MatSelect,
            MatOption,
            RouterOutlet,
            RouterLink,
            RouterLinkActive,
            StatusChip,
            EmptyState,
            ErrorState,
        ],
        host: {
            class: 'lg:h-full',
        },
        template: `
    <div
      class="@container mx-auto flex h-full w-full flex-auto flex-col overflow-hidden"
    >
      <mat-sidenav-container
        class="h-full flex-auto [&_.mat-drawer-backdrop]:fixed"
        (backdropClick)="closeDetail()"
      >
        <mat-sidenav
          class="w-full border-none bg-white sm:w-lg dark:bg-neutral-900"
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="detailOpen()"
          [position]="'end'"
          [fixedInViewport]="isMobile()"
          disableClose
        >
          <router-outlet />
        </mat-sidenav>

        <mat-sidenav-content
          class="flex flex-auto flex-col"
          [class.border-r]="detailOpen()"
        >
          <div
            class="flex flex-col gap-4 border-b px-6 py-4 lg:px-8 lg:py-8"
          >
            <div class="flex items-center gap-x-4">
              <div class="flex flex-col gap-y-0.5">
                <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
                  Capabilities
                </div>
                <div class="text-neutral-500">
                  {{
                    entries().length
                      | i18nPlural
                        : {
                            '=0': 'No entries',
                            '=1': '1 entry',
                            other: '# entries',
                          }
                  }}
                  · what this deployment can do, and what is gated
                </div>
              </div>
              <div class="flex-auto"></div>
              <mat-form-field class="w-40 sm:w-64">
                <mat-icon
                  matPrefix
                  svgIcon="search"
                />
                <input
                  placeholder="Search capabilities"
                  matInput
                  [value]="search()"
                  (input)="onSearch($any($event.target).value)"
                />
              </mat-form-field>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                class="rounded-full px-3 py-1 font-medium"
                [class]="
                  statusFilter() === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                "
                (click)="onStatusFilter('all')"
              >
                {{ entries().length }} total
              </button>
              @for (c of counts(); track c.status) {
                <button
                  type="button"
                  class="rounded-full px-3 py-1 font-medium"
                  [class]="
                    statusFilter() === c.status
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  "
                  (click)="onStatusFilter(c.status)"
                >
                  {{ c.count }} {{ c.status }}
                </button>
              }
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <mat-button-toggle-group
                aria-label="Availability"
                [value]="statusFilter()"
                (change)="onStatusFilter($any($event).value)"
              >
                <mat-button-toggle value="all">All</mat-button-toggle>
                <mat-button-toggle value="available">
                  Available
                </mat-button-toggle>
                <mat-button-toggle value="gated">Gated</mat-button-toggle>
              </mat-button-toggle-group>

              @if (providers().length > 1) {
                <mat-form-field class="w-48">
                  <mat-select
                    [value]="providerFilter()"
                    (selectionChange)="onProviderFilter($any($event).value)"
                  >
                    <mat-option value="all">All providers</mat-option>
                    @for (p of providers(); track p) {
                      <mat-option [value]="p">{{ p }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
            </div>

            <nav
              mat-tab-nav-bar
              [mat-stretch-tabs]="false"
              [tabPanel]="tabPanel"
              ngSkipHydration
            >
              @for (k of kinds; track k.id) {
                <a
                  mat-tab-link
                  routerLinkActive
                  [routerLink]="['/capabilities', k.id]"
                  [active]="rla.isActive"
                  #rla="routerLinkActive"
                >
                  {{ k.label }}
                </a>
              }
            </nav>
            <mat-tab-nav-panel #tabPanel />
          </div>

          @if (error()) {
            <div class="p-6 lg:px-8">
              <ao-error-state [message]="error()!" />
            </div>
          } @else if (!entries().length) {
            <div class="p-6 lg:px-8">
              <ao-empty-state message="No catalog entries loaded." />
            </div>
          } @else {
            <div class="relative flex-auto overflow-auto">
              <table
                class="-mt-px w-full border-separate border-spacing-0 whitespace-nowrap"
                mat-table
                [dataSource]="dataSource"
              >
                <ng-container matColumnDef="id">
                  <th
                    class="pl-6 lg:pl-8"
                    mat-header-cell
                    *matHeaderCellDef
                  >
                    Id
                  </th>
                  <td
                    class="pl-6 lg:pl-8"
                    mat-cell
                    *matCellDef="let e"
                  >
                    <a
                      class="font-mono text-sm font-medium text-primary-600 hover:underline"
                      [routerLink]="['/capabilities', kind(), e.id]"
                    >
                      {{ e.id }}
                    </a>
                    @if (e.role || e.description) {
                      <div
                        class="mt-1 max-w-md truncate text-sm text-neutral-500"
                      >
                        {{ e.role || e.description }}
                      </div>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="type">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                  >
                    Type
                  </th>
                  <td
                    mat-cell
                    *matCellDef="let e"
                  >
                    <span class="font-mono text-sm text-neutral-500">{{
                      e.type || '—'
                    }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                  >
                    Status
                  </th>
                  <td
                    mat-cell
                    *matCellDef="let e"
                  >
                    <ao-status-chip [status]="e.status || 'available'" />
                  </td>
                </ng-container>

                <ng-container matColumnDef="gate">
                  <th
                    class="pr-6 lg:pr-8"
                    mat-header-cell
                    *matHeaderCellDef
                  >
                    Gate
                  </th>
                  <td
                    class="pr-6 lg:pr-8"
                    mat-cell
                    *matCellDef="let e"
                  >
                    @if (e.gateReason && e.fixKey) {
                      <a
                        class="text-sm text-primary-600 hover:underline"
                        [routerLink]="fixRoute(e.fixKey)"
                        [queryParams]="{ flash: e.fixKey }"
                        >{{ e.gateReason }} →</a
                      >
                    } @else {
                      <span class="text-sm text-neutral-500">{{
                        e.gateReason || '—'
                      }}</span>
                    }
                  </td>
                </ng-container>

                <tr
                  class="bg-white dark:bg-neutral-900"
                  mat-header-row
                  *matHeaderRowDef="columns; sticky: true"
                ></tr>
                <tr
                  class="cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/2.5"
                  mat-row
                  *matRowDef="let row; columns: columns"
                  [routerLink]="['/capabilities', kind(), row.id]"
                ></tr>
              </table>
            </div>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
    })
], CatalogsPage);
export { CatalogsPage };

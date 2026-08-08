import { I18nPluralPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatPrefix } from '@angular/material/input';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Media } from '@/app/core/media';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { CatalogEntry } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

const KINDS = [
  { id: 'agents', label: 'Agents' },
  { id: 'mcp', label: 'MCP' },
  { id: 'skills', label: 'Skills' },
  { id: 'rag', label: 'RAG' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'harnesses', label: 'Harnesses' },
  { id: 'societies', label: 'Societies' },
];

/** Fuse Orders list pattern: header + search + mat-table + end detail drawer. */
@Component({
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
                  Catalogs
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
                  · availability and credential gates
                </div>
              </div>
              <div class="flex-auto"></div>
              <mat-form-field class="w-40 sm:w-64">
                <mat-icon
                  matPrefix
                  svgIcon="search"
                />
                <input
                  placeholder="Search catalogs"
                  matInput
                  [value]="search()"
                  (input)="onSearch($any($event.target).value)"
                />
              </mat-form-field>
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
                  [routerLink]="['/catalogs', k.id]"
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
                      [routerLink]="['/catalogs', kind(), e.id]"
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
                        class="text-sm text-amber-600 hover:underline dark:text-amber-400"
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
                  mat-header-row
                  *matHeaderRowDef="columns"
                ></tr>
                <tr
                  class="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  mat-row
                  *matRowDef="let row; columns: columns"
                  [routerLink]="['/catalogs', kind(), row.id]"
                ></tr>
              </table>
            </div>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export class CatalogsPage implements OnInit {
  private api = inject(AoApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private media = inject(Media);

  readonly kinds = KINDS;
  readonly kind = signal('agents');
  readonly entries = signal<CatalogEntry[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly columns = ['id', 'type', 'status', 'gate'];
  readonly dataSource = new MatTableDataSource<CatalogEntry>([]);

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected isMobile = computed(() =>
    this.media.match(`(max-width: 639px)`)()
  );
  protected detailOpen = computed(() =>
    /\/catalogs\/[^/]+\/[^/]+/.test(this.url().split('?')[0])
  );

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
        this.dataSource.data = [];
        return;
      }
      this.entries.set(r.data);
      this.applyFilter(r.data, this.search());
    });
  }

  onSearch(value: string) {
    this.search.set(value);
    this.applyFilter(this.entries(), value);
  }

  private applyFilter(rows: CatalogEntry[], q: string) {
    const needle = q.trim().toLowerCase();
    this.dataSource.data = !needle
      ? rows
      : rows.filter(
          (e) =>
            e.id.toLowerCase().includes(needle) ||
            String(e.type || '')
              .toLowerCase()
              .includes(needle) ||
            String(e.role || e.description || '')
              .toLowerCase()
              .includes(needle)
        );
  }

  closeDetail() {
    this.router.navigate(['/catalogs', this.kind()]);
  }

  fixRoute(key: string): string {
    if (
      key.includes('API_KEY') ||
      key.includes('TOKEN') ||
      key.includes('OLLAMA') ||
      key.includes('HF_')
    ) {
      return '/runtime/models';
    }
    if (
      key.includes('MCP') ||
      key.includes('HOME_ASSISTANT') ||
      key.includes('FILESYSTEM')
    ) {
      return '/integrations';
    }
    return '/advanced';
  }
}

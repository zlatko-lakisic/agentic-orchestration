import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import {
  HostMetrics,
  PingResponse,
  SessionResponse,
  TopologyComponent,
  TopologyResponse,
} from '@/app/core/ao-api/types';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

/**
 * Overview — Fuse dashboard composition:
 * - Project: filled summary KPI cards (text-5xl + change row)
 * - Finance: statement watermark cards + mat-progress-bar resource rows
 * - Analytics: insights list (icon + text)
 * Industry ops dashboards (K8s / Datadog style) use the same strip → gauges → tiles → alerts flow.
 */
@Component({
  selector: 'ao-overview-page',
  imports: [
    RouterLink,
    ErrorState,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatDivider,
    MatProgressBarModule,
    DecimalPipe,
    NgClass,
  ],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <!-- Header (Fuse Analytics / Finance) -->
      <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Overview
          </div>
          <div class="text-neutral-500">
            Control-plane health, host utilization, and items that need attention
          </div>
        </div>
        <div class="flex-auto"></div>
        <div class="flex items-center gap-x-3">
          <button
            class="hidden sm:inline-flex"
            matButton="outlined"
            type="button"
            (click)="reload()"
          >
            <mat-icon svgIcon="refresh-cw" />
            Refresh
          </button>
          <div class="sm:hidden">
            <button
              matIconButton
              type="button"
              [matMenuTriggerFor]="actionsMenu"
            >
              <mat-icon svgIcon="ellipsis" />
            </button>
            <mat-menu #actionsMenu="matMenu">
              <button
                mat-menu-item
                type="button"
                (click)="reload()"
              >
                Refresh
              </button>
            </mat-menu>
          </div>
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      <!-- Summary stats (Fuse Project) -->
      <div
        class="grid gap-4 sm:gap-6 @max-md:grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4"
      >
        @for (item of summary(); track item.title) {
          <mat-card appearance="filled">
            <mat-card-header>
              <div class="flex items-center gap-x-2">
                <mat-icon
                  class="size-4"
                  [svgIcon]="item.icon"
                />
                <div class="font-medium tracking-tight">{{ item.title }}</div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="text-5xl font-semibold tabular-nums">
                {{ item.value | number }}
              </div>
              <div class="mt-2 flex items-center gap-x-1">
                <mat-icon
                  class="size-4"
                  [class]="item.toneClass"
                  [svgIcon]="item.toneIcon"
                />
                <div
                  class="flex items-center gap-x-1 text-sm font-medium text-neutral-500"
                >
                  <div>{{ item.caption }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Host utilization (Fuse Finance budget progress rows) -->
      <div class="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
        <mat-card
          class="overflow-hidden"
          appearance="outlined"
        >
          <div class="flex flex-col px-5 py-4">
            <div class="flex flex-col">
              <div class="mr-4 truncate text-lg font-medium tracking-tight">
                Host utilization
              </div>
              <div class="font-medium text-neutral-500">
                {{ metrics()?.hostname || 'Coordinator host' }}
                · scope {{ metrics()?.scope || '—' }}
              </div>
            </div>

            <div class="mt-6 mr-2 flex items-start">
              <div class="flex flex-col">
                <div
                  class="text-3xl font-semibold tracking-tighter tabular-nums md:text-4xl"
                >
                  {{ cpuPercent() ?? '—'
                  }}@if (cpuPercent() != null) {
                    <span class="text-xl text-neutral-500">%</span>
                  }
                </div>
                <div class="text-sm font-medium text-neutral-500">CPU</div>
              </div>
              <div class="ml-8 flex flex-col md:ml-16">
                <div
                  class="text-3xl font-semibold tracking-tighter tabular-nums md:text-4xl"
                >
                  {{ memPercent() ?? '—'
                  }}@if (memPercent() != null) {
                    <span class="text-xl text-neutral-500">%</span>
                  }
                </div>
                <div class="text-sm font-medium text-neutral-500">Memory</div>
              </div>
            </div>
          </div>

          <mat-divider />

          <div class="flex flex-col gap-y-5 px-5 py-5">
            <div class="flex items-end">
              <div class="flex-auto leading-none">
                <div class="text-sm font-medium text-neutral-500">CPU</div>
                <div class="text-2xl font-medium tabular-nums">
                  {{ cpuPercent() ?? '—' }}%
                  @if (metrics()?.cpu?.cores) {
                    <span class="text-sm font-normal text-neutral-500">
                      · {{ metrics()?.cpu?.cores }} cores
                    </span>
                  }
                </div>
                <mat-progress-bar
                  class="mt-2 rounded-full"
                  [mode]="'determinate'"
                  [color]="resourceBarColor(cpuPercent())"
                  [value]="cpuPercent() ?? 0"
                />
              </div>
            </div>
            <div class="flex items-end">
              <div class="flex-auto leading-none">
                <div class="text-sm font-medium text-neutral-500">Memory</div>
                <div class="text-2xl font-medium tabular-nums">
                  {{ memPercent() ?? '—' }}%
                </div>
                <mat-progress-bar
                  class="mt-2 rounded-full"
                  [mode]="'determinate'"
                  [color]="resourceBarColor(memPercent())"
                  [value]="memPercent() ?? 0"
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <div class="font-medium text-neutral-500">Load</div>
                <div class="font-mono tabular-nums">
                  {{ (metrics()?.loadAvg || []).join(' · ') || '—' }}
                </div>
              </div>
              <div>
                <div class="font-medium text-neutral-500">Uptime</div>
                <div class="font-mono tabular-nums">
                  {{ formatUptime(metrics()?.uptimeSec) }}
                </div>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Web process (Fuse Project issues sidebar density) -->
        <mat-card
          appearance="filled"
          class="flex flex-col"
        >
          <mat-card-header>
            <div class="flex flex-auto items-center gap-x-2">
              <mat-icon
                class="size-4"
                svgIcon="server"
              />
              <div class="font-medium tracking-tight">Web process</div>
              <div class="ml-auto">
                <button
                  class="tiny"
                  matIconButton
                  type="button"
                  [matMenuTriggerFor]="webMenu"
                >
                  <mat-icon svgIcon="ellipsis-vertical" />
                </button>
                <mat-menu #webMenu="matMenu">
                  <button
                    mat-menu-item
                    type="button"
                    (click)="reload()"
                  >
                    Refresh data
                  </button>
                  <a
                    mat-menu-item
                    href="/"
                  >
                    Open chat
                  </a>
                </mat-menu>
              </div>
            </div>
          </mat-card-header>
          <mat-card-content class="flex flex-auto flex-col">
            <div class="text-3xl font-semibold">
              {{ ping()?.service || '—' }}
            </div>
            <div class="mt-0.5 text-sm text-neutral-500">
              Coordinator web UI and Admin API process
            </div>

            <div class="mt-4 flex flex-col gap-y-3">
              <div class="flex items-center gap-x-1">
                <div class="text-neutral-500">pid</div>
                <div class="flex-auto"></div>
                <div class="font-medium tabular-nums">
                  {{ ping()?.pid ?? '—' }}
                </div>
              </div>
              <div class="flex items-center gap-x-1">
                <div class="text-neutral-500">instance</div>
                <div class="flex-auto"></div>
                <div class="max-w-[60%] truncate font-mono text-sm font-medium">
                  {{ ping()?.instance || '—' }}
                </div>
              </div>
              <div class="flex items-center gap-x-1">
                <div class="text-neutral-500">user</div>
                <div class="flex-auto"></div>
                <div class="font-medium">
                  {{ session()?.userName || '—' }}
                </div>
              </div>
              <div class="flex items-center gap-x-1">
                <div class="text-neutral-500">session</div>
                <div class="flex-auto"></div>
                <div class="max-w-[60%] truncate font-mono text-sm font-medium">
                  {{ session()?.sessionId || '—' }}
                </div>
              </div>
            </div>

            <div class="flex-auto"></div>
            <div class="mt-4 text-xs text-neutral-500">
              Reach / KnowBuddy must target the engine port, not this web
              process.
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (topology()?.reachGuard; as rg) {
        <mat-card
          class="p-6"
          appearance="outlined"
        >
          <div class="flex items-center gap-x-2">
            <mat-icon
              class="size-5 text-primary-600 dark:text-primary-500"
              svgIcon="sparkles"
            />
            <div class="truncate text-lg font-medium tracking-tight">
              Reach port guard
            </div>
          </div>
          <div class="mt-4 flex items-start gap-x-3">
            <mat-icon
              class="size-5 shrink-0 text-neutral-500"
              svgIcon="octagon-alert"
            />
            <div class="text-neutral-500">{{ rg.message }}</div>
          </div>
        </mat-card>
      }

      <!-- Section title (Fuse Analytics) -->
      <div class="mt-4 w-full">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Topology
        </div>
        <div class="text-neutral-500">
          Runtime components and how they are exposed on this host
        </div>
      </div>

      <!-- Topology tiles (Fuse Finance statement cards) -->
      <div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-2">
        @for (c of components(); track c.id) {
          <mat-card
            class="relative overflow-hidden px-5 py-4"
            appearance="outlined"
          >
            <div class="absolute right-0 bottom-0 -m-6 h-24 w-24">
              <mat-icon
                class="size-24"
                [ngClass]="watermarkClass(c.status)"
                [svgIcon]="watermarkIcon(c.status)"
              />
            </div>
            <div class="flex items-center">
              <div class="flex min-w-0 flex-col">
                <div class="truncate text-lg font-medium tracking-tight">
                  {{ c.label }}
                </div>
                <div
                  class="text-sm font-medium"
                  [ngClass]="statusTextClass(c.status)"
                >
                  {{ statusLabel(c.status) }}
                </div>
              </div>
              <div class="-mt-2 ml-auto">
                <button
                  mat-icon-button
                  type="button"
                  [matMenuTriggerFor]="compMenu"
                >
                  <mat-icon svgIcon="ellipsis" />
                </button>
                <mat-menu #compMenu="matMenu">
                  <button
                    mat-menu-item
                    type="button"
                    (click)="reload()"
                  >
                    Refresh
                  </button>
                  @if (c.url) {
                    <a
                      mat-menu-item
                      [href]="c.url"
                      target="_blank"
                      rel="noopener"
                    >
                      Open URL
                    </a>
                  }
                </mat-menu>
              </div>
            </div>
            <div class="mt-4 flex flex-row flex-wrap gap-6">
              <div class="flex flex-col">
                <div class="text-sm font-medium text-neutral-500">Port</div>
                <div class="text-3xl font-medium tabular-nums">
                  {{ c.port ?? '—' }}
                </div>
              </div>
              <div class="flex flex-col">
                <div class="text-sm font-medium text-neutral-500">NodePort</div>
                <div class="text-3xl font-medium tabular-nums">
                  {{ c.nodePort ?? '—' }}
                </div>
              </div>
              <div class="flex min-w-0 flex-col">
                <div class="text-sm font-medium text-neutral-500">Detail</div>
                <div class="max-w-56 truncate text-sm text-neutral-500">
                  {{ c.fact || c.detail || '—' }}
                </div>
              </div>
            </div>
          </mat-card>
        } @empty {
          <mat-card
            class="px-5 py-8"
            appearance="outlined"
          >
            <div class="text-neutral-500">No topology components reported</div>
          </mat-card>
        }
      </div>

      <!-- Needs attention (Fuse Analytics AI Insights) -->
      <mat-card
        class="p-6"
        appearance="outlined"
      >
        <div class="flex items-center gap-x-2">
          <mat-icon
            class="size-5 text-primary-600 dark:text-primary-500"
            svgIcon="sparkles"
          />
          <div class="truncate text-lg font-medium tracking-tight">
            Needs attention
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-y-4">
          @for (a of topology()?.attention || []; track a.message) {
            <div class="flex items-start gap-x-3">
              <mat-icon
                class="size-5 shrink-0 text-neutral-500"
                [svgIcon]="
                  a.severity === 'warning' ? 'octagon-alert' : 'circle-alert'
                "
              />
              <div class="min-w-0 flex-auto">
                <div class="text-neutral-500">{{ a.message }}</div>
                @if (a.href) {
                  <a
                    matButton
                    class="mt-1"
                    [routerLink]="a.href"
                  >
                    Open
                  </a>
                }
              </div>
            </div>
          } @empty {
            <div class="flex items-start gap-x-3">
              <mat-icon
                class="size-5 shrink-0 text-green-600"
                svgIcon="circle-check"
              />
              <div class="text-neutral-500">Nothing flagged</div>
            </div>
          }
        </div>
      </mat-card>
    </div>
  `,
})
export class OverviewPage implements OnInit {
  private api = inject(AoApi);
  readonly topology = signal<TopologyResponse | null>(null);
  readonly ping = signal<PingResponse | null>(null);
  readonly session = signal<SessionResponse | null>(null);
  readonly metrics = signal<HostMetrics | null>(null);
  readonly error = signal<string | null>(null);

  readonly components = computed(
    () => (this.topology()?.components || []) as TopologyComponent[]
  );

  readonly cpuPercent = computed(() => {
    const n = this.metrics()?.cpu?.percent;
    return n == null || Number.isNaN(Number(n)) ? null : Number(n);
  });

  readonly memPercent = computed(() => {
    const m = this.metrics()?.memory;
    const n = m?.usedPercent ?? m?.percent;
    return n == null || Number.isNaN(Number(n)) ? null : Number(n);
  });

  readonly summary = computed(() => {
    const comps = this.components();
    const healthy = comps.filter((c) =>
      ['healthy', 'available', 'succeeded'].includes(
        String(c.status || '').toLowerCase()
      )
    ).length;
    const degraded = comps.filter((c) =>
      ['degraded', 'warning', 'running', 'reconciling'].includes(
        String(c.status || '').toLowerCase()
      )
    ).length;
    const failed = comps.filter((c) =>
      ['failed', 'blocking'].includes(String(c.status || '').toLowerCase())
    ).length;
    const attention = this.topology()?.attention?.length ?? 0;
    return [
      {
        title: 'Healthy',
        icon: 'circle-check',
        value: healthy,
        caption: 'components up',
        toneIcon: 'arrow-up',
        toneClass: 'text-green-600',
      },
      {
        title: 'Degraded',
        icon: 'octagon-alert',
        value: degraded,
        caption: 'need watch',
        toneIcon: degraded ? 'arrow-up' : 'arrow-down',
        toneClass: degraded ? 'text-amber-600' : 'text-green-600',
      },
      {
        title: 'Failed',
        icon: 'circle-x',
        value: failed,
        caption: 'blocking',
        toneIcon: failed ? 'arrow-up' : 'arrow-down',
        toneClass: failed ? 'text-red-600' : 'text-green-600',
      },
      {
        title: 'Attention',
        icon: 'bell',
        value: attention,
        caption: 'open items',
        toneIcon: attention ? 'arrow-up' : 'arrow-down',
        toneClass: attention ? 'text-amber-600' : 'text-green-600',
      },
    ];
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.error.set(null);
    this.api.topology().subscribe((r) => {
      if (r.ok) this.topology.set(r.data);
      else this.error.set(r.message);
    });
    this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
    this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
    this.api.hostMetrics().subscribe((r) => r.ok && this.metrics.set(r.data));
  }

  resourceBarColor(pct: number | null): 'primary' | 'warn' | 'error' {
    if (pct == null) return 'primary';
    if (pct >= 90) return 'error';
    if (pct >= 75) return 'warn';
    return 'primary';
  }

  statusLabel(status: string | undefined): string {
    const s = String(status || 'unknown').replace(/-/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  statusTextClass(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (['healthy', 'available', 'succeeded'].includes(s)) {
      return 'text-green-600';
    }
    if (['failed', 'blocking'].includes(s)) return 'text-red-600';
    if (['degraded', 'warning', 'running', 'reconciling'].includes(s)) {
      return 'text-amber-600';
    }
    return 'text-neutral-500';
  }

  watermarkIcon(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (['healthy', 'available', 'succeeded'].includes(s)) return 'circle-check';
    if (['failed', 'blocking'].includes(s)) return 'circle-x';
    return 'circle-alert';
  }

  watermarkClass(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (['healthy', 'available', 'succeeded'].includes(s)) {
      return 'text-green-600/25 dark:text-green-500/25';
    }
    if (['failed', 'blocking'].includes(s)) {
      return 'text-red-600/25 dark:text-red-500/25';
    }
    return 'text-amber-600/25 dark:text-amber-500/25';
  }

  formatUptime(sec?: number): string {
    if (sec == null || !Number.isFinite(sec)) return '—';
    const s = Math.floor(sec);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}

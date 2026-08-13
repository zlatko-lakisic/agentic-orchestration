import { DecimalPipe, NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import {
  MatChipListbox,
  MatChipListboxChange,
  MatChipOption,
} from '@angular/material/chips';
import {
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexFill,
  ApexStroke,
  ApexTooltip,
  ChartComponent,
} from 'ng-apexcharts';
import { AoApi } from '@/app/core/ao-api/ao-api';
import {
  PingResponse,
  SessionResponse,
  TopologyComponent,
  TopologyResponse,
} from '@/app/core/ao-api/types';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { HostUtilization } from '@/app/domains/admin/shared/host-utilization/host-utilization';

/** Topology reads top-down: each entry depends on the ones above it. */
const DEPENDENCY_ORDER = [
  'web',
  'engine',
  'execution',
  'ollama',
  'mcp',
  'speech',
  'openclaw',
  'reach',
];

/**
 * Overview — live host metrics (WS) + Fuse Apex charts + filterable live logs.
 */
@Component({
  selector: 'ao-overview-page',
  imports: [
    RouterLink,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    ErrorState,
    MatButtonModule,
    MatIconModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatChipListbox,
    HostUtilization,
    MatChipOption,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    DecimalPipe,
    NgClass,
    ChartComponent,
  ],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Overview
          </div>
          <div class="text-neutral-500">
            Live host utilization, topology, and streaming logs
          </div>
        </div>
        <div class="flex-auto"></div>
        <button
          matButton="outlined"
          type="button"
          class="mr-2"
          (click)="exportBundle()"
        >
          Export support bundle
        </button>
        <div
          class="flex items-center gap-x-1.5 text-sm"
          [ngClass]="live.connected() ? 'text-green-600' : 'text-neutral-500'"
        >
          <span
            class="inline-block size-2 rounded-full"
            [ngClass]="
              live.connected() ? 'bg-green-500 animate-pulse' : 'bg-neutral-400'
            "
          ></span>
          {{ live.connected() ? 'Live' : 'Reconnecting…' }}
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

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
                <div class="text-sm font-medium text-neutral-500">
                  {{ item.caption }}
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Live host utilization: CPU/mem left, GPU/VRAM right -->
      <ao-host-utilization />

      <div class="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
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
                <a
                  matButton
                  href="/"
                >
                  Open chat
                </a>
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
            </div>
          </mat-card-content>
        </mat-card>

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
        } @else {
          <mat-card
            class="p-6"
            appearance="outlined"
          >
            <div class="flex items-center gap-x-2">
              <mat-icon
                class="size-5 text-primary-600 dark:text-primary-500"
                svgIcon="activity"
              />
              <div class="truncate text-lg font-medium tracking-tight">
                Sparkline snapshots
              </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div class="text-xs font-medium text-neutral-500">CPU</div>
                <apx-chart
                  class="h-16"
                  [chart]="sparkChart.chart"
                  [colors]="['#f59e0b']"
                  [fill]="sparkChart.fill"
                  [series]="sparkSeries('cpu')"
                  [stroke]="sparkChart.stroke"
                  [tooltip]="sparkChart.tooltip"
                />
              </div>
              <div>
                <div class="text-xs font-medium text-neutral-500">Memory</div>
                <apx-chart
                  class="h-16"
                  [chart]="sparkChart.chart"
                  [colors]="['#60a5fa']"
                  [fill]="sparkChart.fill"
                  [series]="sparkSeries('mem')"
                  [stroke]="sparkChart.stroke"
                  [tooltip]="sparkChart.tooltip"
                />
              </div>
              <div>
                <div class="text-xs font-medium text-neutral-500">GPU</div>
                <apx-chart
                  class="h-16"
                  [chart]="sparkChart.chart"
                  [colors]="['#c084fc']"
                  [fill]="sparkChart.fill"
                  [series]="sparkSeries('gpu')"
                  [stroke]="sparkChart.stroke"
                  [tooltip]="sparkChart.tooltip"
                />
              </div>
            </div>
          </mat-card>
        }
      </div>

      <mat-card class="overflow-hidden" appearance="outlined">
        <mat-card-header>
          <div class="flex w-full items-start justify-between gap-3">
            <div>
              <div class="text-lg font-medium tracking-tight">
                Deployment topology
              </div>
              <div class="text-sm text-neutral-500">
                Live three-band graph of what is deployed and healthy
              </div>
            </div>
            <a matButton="filled" routerLink="/topology">
              <mat-icon svgIcon="share-2" />
              Open Topology
            </a>
          </div>
        </mat-card-header>
        <mat-card-content class="pt-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              {{ orderedComponents().length }} components reported
            </span>
            <span
              class="font-medium"
              [ngClass]="
                topologyUnhealthyCount() > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-500'
              "
            >
              {{ topologyUnhealthyCount() }} unhealthy
            </span>
            @if (topology()?.generatedAt; as ts) {
              <span class="text-neutral-500">Snapshot {{ ts }}</span>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Live logs (collapsed by default for triage) -->
      <mat-expansion-panel
        class="!rounded-xl !border !shadow-none"
        [expanded]="logsExpanded()"
        (opened)="logsExpanded.set(true)"
        (closed)="logsExpanded.set(false)"
      >
        <mat-expansion-panel-header>
          <mat-panel-title>Live logs</mat-panel-title>
          <mat-panel-description>
            Streaming from web + cluster tails
            @if (runIdFilter()) {
              · filter {{ runIdFilter() }}
            }
          </mat-panel-description>
        </mat-expansion-panel-header>
        <div class="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center">
          <div class="min-w-0 flex-auto text-sm text-neutral-500">
            Filter sources · errors red, warnings amber
          </div>
          <mat-form-field class="w-full sm:w-72" appearance="outline" subscriptSizing="dynamic">
            <mat-label>run_id filter</mat-label>
            <input
              matInput
              [ngModel]="runIdFilter()"
              (ngModelChange)="onRunIdFilterChange($event)"
              placeholder="paste run_id"
            />
          </mat-form-field>
          <button
            matButton="outlined"
            type="button"
            (click)="followLogs.set(!followLogs())"
          >
            <mat-icon [svgIcon]="followLogs() ? 'circle-check' : 'circle'" />
            {{ followLogs() ? 'Following' : 'Follow' }}
          </button>
          <button
            matButton="outlined"
            type="button"
            (click)="live.clearLogs()"
          >
            Clear
          </button>
        </div>
        <div class="pb-3">
          <mat-chip-listbox
            aria-label="Log sources"
            [multiple]="true"
            [value]="selectedSources()"
            (change)="onSourcesChange($event)"
          >
            @for (src of live.logSourceOptions(); track src) {
              <mat-chip-option [value]="src">{{ src }}</mat-chip-option>
            }
          </mat-chip-listbox>
        </div>
        <div
          #logViewport
          class="max-h-96 overflow-y-auto bg-neutral-950 px-4 py-3 font-mono text-xs leading-relaxed text-neutral-200"
        >
          @for (entry of filteredLogs(); track entry.id) {
            <div class="flex gap-x-2 whitespace-pre-wrap break-all">
              <span class="shrink-0 text-neutral-500">{{
                formatLogTime(entry.ts)
              }}</span>
              <span
                class="w-24 shrink-0 truncate font-semibold"
                [ngClass]="sourceClass(entry.source)"
                >{{ entry.source }}</span
              >
              <span [ngClass]="levelClass(entry.level)">{{ entry.line }}</span>
            </div>
          } @empty {
            <div class="text-neutral-500">Waiting for log lines…</div>
          }
        </div>
      </mat-expansion-panel>
    </div>
  `,
})
export class OverviewPage implements OnInit, OnDestroy {
  private api = inject(AoApi);
  private route = inject(ActivatedRoute);
  readonly live = inject(AoLiveWs);

  private logViewport =
    viewChild<ElementRef<HTMLDivElement>>('logViewport');

  readonly topology = signal<TopologyResponse | null>(null);
  readonly ping = signal<PingResponse | null>(null);
  readonly session = signal<SessionResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly selectedSources = signal<string[]>([]);
  readonly followLogs = signal(true);
  readonly runIdFilter = signal('');
  readonly logsExpanded = signal(false);

  readonly components = computed(
    () => (this.topology()?.components || []) as TopologyComponent[]
  );

  /** Dependency order for the topology list; unknown ids keep API order at the end. */
  readonly orderedComponents = computed(() => {
    const rank = (id: string) => {
      const i = DEPENDENCY_ORDER.indexOf(id);
      return i === -1 ? DEPENDENCY_ORDER.length : i;
    };
    return [...this.components()].sort((a, b) => rank(a.id) - rank(b.id));
  });

  readonly topologyUnhealthyCount = computed(
    () =>
      this.components().filter((c) =>
        ['failed', 'degraded', 'blocking', 'warning'].includes(
          String(c.status || '').toLowerCase()
        )
      ).length
  );

  readonly filteredLogs = computed(() => {
    const allow = new Set(this.selectedSources());
    const needle = this.runIdFilter().trim().toLowerCase();
    let logs = this.live.logs();
    if (allow.size) logs = logs.filter((e) => allow.has(e.source));
    if (needle) {
      logs = logs.filter((e) => String(e.line || '').toLowerCase().includes(needle));
    }
    return logs;
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
    const healthyNames = comps
      .filter((c) =>
        ['healthy', 'available', 'succeeded'].includes(
          String(c.status || '').toLowerCase()
        )
      )
      .map((c) => c.id)
      .join(', ');
    return [
      {
        title: 'Healthy',
        icon: 'circle-check',
        value: healthy,
        caption: healthyNames || 'components up',
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

  protected sparkChart = {
    chart: {
      animations: { enabled: false, dynamicAnimation: { enabled: false } },
      fontFamily: 'inherit',
      foreColor: 'inherit',
      height: '101%',
      width: '101%',
      type: 'area',
      sparkline: { enabled: true },
    } as ApexChart,
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.5,
        opacityFrom: 0.4,
        opacityTo: 0.05,
      },
    } as ApexFill,
    stroke: { curve: 'smooth', width: 2 } as ApexStroke,
    tooltip: { enabled: false } as ApexTooltip,
  };

  constructor() {
    effect(() => {
      const err =
        this.live.feedErrors()['topology'] || this.live.feedErrors()['_'];
      if (err) this.error.set(err);
      const snap = this.live.feeds()['topology'] as
        | TopologyResponse
        | undefined;
      if (!snap) return;
      this.error.set(null);
      this.topology.set(snap);
    });

    effect(() => {
      // Auto-scroll log viewport when new lines arrive.
      this.filteredLogs();
      if (!this.followLogs()) return;
      queueMicrotask(() => {
        const el = this.logViewport()?.nativeElement;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
      });
    });
  }

  ngOnInit() {
    this.selectedSources.set([...this.live.logSourceOptions()]);
    this.live.acquire({
      metrics: true,
      logs: true,
      feeds: ['topology'],
      feedIntervalMs: 5000,
    });
    // Session / ping are relatively static identity context (one-shot HTTP).
    this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
    this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
    const qRun =
      String(this.route.snapshot.queryParamMap.get('runId') || '').trim() ||
      String(this.route.snapshot.queryParamMap.get('q') || '').trim();
    if (qRun) {
      this.applyRunIdFilter(qRun);
    }
  }

  onRunIdFilterChange(value: string) {
    this.applyRunIdFilter(String(value || ''));
  }

  private applyRunIdFilter(value: string) {
    const rid = value.trim();
    this.runIdFilter.set(rid);
    if (rid) {
      this.logsExpanded.set(true);
      this.live.followRunLogs(rid);
    }
  }

  ngOnDestroy() {
    this.live.release();
  }

  sparkSeries(key: 'cpu' | 'mem' | 'gpu' | 'vram'): ApexAxisChartSeries {
    const vals = this.live
      .history()
      .map((h) => h[key])
      .filter((v): v is number => v != null);
    return [{ name: key, data: vals.length ? vals : [0] }];
  }

  onSourcesChange(ev: MatChipListboxChange) {
    const value = ev.value as string[] | string | undefined;
    const list = Array.isArray(value) ? value : value ? [value] : [];
    this.selectedSources.set(list);
    this.live.setLogSources(list.length ? list : null);
  }

  exportBundle() {
    this.api.supportBundle().subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      const blob = new Blob([JSON.stringify(r.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ao-support-bundle-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  reload() {
    this.error.set(null);
    this.live.setFeedParams({});
    this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
    this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
  }

  componentHref(c: TopologyComponent): string | null {
    const raw = c.url || c.urlHint;
    if (!raw) return null;
    const host = location.hostname || '127.0.0.1';
    const resolved = String(raw)
      .replace(/__HOST__/g, host)
      .replace(/<host>/gi, host)
      .split(/\s+/)[0];
    if (!resolved || resolved.includes('<')) return null;
    if (resolved.startsWith('/')) {
      return `${location.protocol}//${location.host}${resolved}`;
    }
    return resolved;
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

  statusDotClass(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (['healthy', 'available', 'succeeded'].includes(s)) return 'bg-green-500';
    if (['failed', 'blocking'].includes(s)) return 'bg-red-500';
    if (['degraded', 'warning', 'running', 'reconciling'].includes(s)) {
      return 'bg-amber-500';
    }
    return 'bg-neutral-400';
  }

  formatLogTime(ts: string): string {
    const d = new Date(ts);
    return Number.isFinite(d.getTime())
      ? d.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '--:--:--';
  }

  sourceClass(source: string): string {
    switch (source) {
      case 'engine':
        return 'text-violet-400';
      case 'coordinator':
        return 'text-sky-400';
      case 'warm-pool':
        return 'text-amber-400';
      case 'broker':
        return 'text-rose-400';
      default:
        return 'text-emerald-400';
    }
  }

  levelClass(level: string): string {
    if (level === 'error') return 'text-red-300';
    if (level === 'warn') return 'text-amber-200';
    return 'text-neutral-200';
  }
}

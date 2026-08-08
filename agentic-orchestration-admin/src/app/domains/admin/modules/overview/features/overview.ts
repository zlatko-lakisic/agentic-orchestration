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
import { MatDivider } from '@angular/material/divider';
import {
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
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
import { Theming } from '@/app/core/theming';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

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
    ErrorState,
    MatButtonModule,
    MatIconModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatDivider,
    MatProgressBarModule,
    MatChipListbox,
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
      <mat-card
        class="overflow-hidden"
        appearance="outlined"
      >
        <div class="flex flex-col gap-y-1 px-5 pt-5 sm:flex-row sm:items-start">
          <div class="min-w-0 flex-auto">
            <div class="text-lg font-medium tracking-tight">
              Host utilization
            </div>
            <div class="font-medium text-neutral-500">
              {{ live.metrics()?.hostname || 'Coordinator host' }}
              · scope {{ live.metrics()?.scope || '—' }}
              · WebSocket push ~2s
            </div>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-1 gap-2 px-2 pb-2 xl:grid-cols-2">
          <!-- CPU + Memory -->
          <div class="flex min-w-0 flex-col">
            <div class="flex flex-wrap items-end gap-x-6 gap-y-2 px-3 pt-2">
              <div class="min-w-0 flex-auto">
                <div class="text-sm font-medium text-neutral-500">CPU</div>
                <div class="truncate text-sm font-medium">
                  {{ live.cpuModel() || '—' }}
                </div>
                <div class="text-xs text-neutral-500">
                  {{ live.metrics()?.cpu?.cores ?? '—' }} cores · memory
                  {{ live.memoryLabel() || '—' }}
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">CPU</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestCpu() ?? '—'
                  }}@if (live.latestCpu() != null) {
                    <span class="text-lg text-neutral-500">%</span>
                  }
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">Memory</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestMem() ?? '—'
                  }}@if (live.latestMem() != null) {
                    <span class="text-lg text-neutral-500">%</span>
                  }
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">Temp</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestCpuTemp() != null ? (live.latestCpuTemp() | number: '1.0-1') : '—'
                  }}@if (live.latestCpuTemp() != null) {
                    <span class="text-lg text-neutral-500">°C</span>
                  }
                </div>
              </div>
            </div>
            <apx-chart
              class="h-64 w-full"
              [chart]="utilChart.chart"
              [colors]="cpuMemChartColors"
              [dataLabels]="utilChart.dataLabels"
              [fill]="utilChart.fill"
              [grid]="utilChart.grid"
              [legend]="utilChart.legend"
              [series]="cpuMemSeries()"
              [stroke]="utilChart.stroke"
              [tooltip]="cpuMemTooltip()"
              [xaxis]="utilChart.xaxis"
              [yaxis]="cpuMemYaxis"
            />
          </div>

          <!-- GPU + VRAM -->
          <div class="flex min-w-0 flex-col">
            <div class="flex flex-wrap items-end gap-x-6 gap-y-2 px-3 pt-2">
              <div class="min-w-0 flex-auto">
                <div class="text-sm font-medium text-neutral-500">GPU</div>
                <div class="truncate text-sm font-medium">
                  {{ live.gpuName() || 'No GPU metrics' }}
                </div>
                <div class="text-xs text-neutral-500">
                  VRAM {{ live.vramLabel() || '—' }}
                  @if (live.metrics()?.gpu?.vramSource) {
                    · {{ live.metrics()?.gpu?.vramSource }}
                  }
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">GPU</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestGpu() ?? '—'
                  }}@if (live.latestGpu() != null) {
                    <span class="text-lg text-neutral-500">%</span>
                  }
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">VRAM</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestVram() ?? '—'
                  }}@if (live.latestVram() != null) {
                    <span class="text-lg text-neutral-500">%</span>
                  }
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">Temp</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestGpuTemp() != null ? (live.latestGpuTemp() | number: '1.0-1') : '—'
                  }}@if (live.latestGpuTemp() != null) {
                    <span class="text-lg text-neutral-500">°C</span>
                  }
                </div>
              </div>
            </div>
            <apx-chart
              class="h-64 w-full"
              [chart]="utilChart.chart"
              [colors]="gpuVramChartColors"
              [dataLabels]="utilChart.dataLabels"
              [fill]="utilChart.fill"
              [grid]="utilChart.grid"
              [legend]="utilChart.legend"
              [series]="gpuVramSeries()"
              [stroke]="utilChart.stroke"
              [tooltip]="gpuVramTooltip()"
              [xaxis]="utilChart.xaxis"
              [yaxis]="gpuVramYaxis"
            />
          </div>
        </div>

        <mat-divider />

        <div class="flex flex-wrap gap-x-8 gap-y-3 px-5 py-4 text-sm">
          <div>
            <div class="font-medium text-neutral-500">Load</div>
            <div class="font-mono tabular-nums">
              {{ (live.metrics()?.loadAvg || []).join(' · ') || '—' }}
            </div>
          </div>
          <div>
            <div class="font-medium text-neutral-500">Uptime</div>
            <div class="font-mono tabular-nums">
              {{ formatUptime(live.metrics()?.uptimeSec) }}
            </div>
          </div>
          <div class="min-w-40 flex-auto">
            <div class="font-medium text-neutral-500">CPU</div>
            <mat-progress-bar
              class="mt-1 rounded-full"
              mode="determinate"
              [color]="resourceBarColor(live.latestCpu())"
              [value]="live.latestCpu() ?? 0"
            />
          </div>
          <div class="min-w-40 flex-auto">
            <div class="font-medium text-neutral-500">Memory</div>
            <mat-progress-bar
              class="mt-1 rounded-full"
              mode="determinate"
              [color]="resourceBarColor(live.latestMem())"
              [value]="live.latestMem() ?? 0"
            />
          </div>
          <div class="min-w-40 flex-auto">
            <div class="font-medium text-neutral-500">GPU</div>
            <mat-progress-bar
              class="mt-1 rounded-full"
              mode="determinate"
              [color]="resourceBarColor(live.latestGpu())"
              [value]="live.latestGpu() ?? 0"
            />
          </div>
          <div class="min-w-40 flex-auto">
            <div class="font-medium text-neutral-500">VRAM</div>
            <mat-progress-bar
              class="mt-1 rounded-full"
              mode="determinate"
              [color]="resourceBarColor(live.latestVram())"
              [value]="live.latestVram() ?? 0"
            />
          </div>
        </div>
      </mat-card>

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
      <mat-expansion-panel class="!rounded-xl !border !shadow-none">
        <mat-expansion-panel-header>
          <mat-panel-title>Live logs</mat-panel-title>
          <mat-panel-description>
            Streaming from web + cluster tails
          </mat-panel-description>
        </mat-expansion-panel-header>
        <div class="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center">
          <div class="min-w-0 flex-auto text-sm text-neutral-500">
            Filter sources · errors red, warnings amber
          </div>
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
  private theming = inject(Theming);
  readonly live = inject(AoLiveWs);

  private logViewport =
    viewChild<ElementRef<HTMLDivElement>>('logViewport');
  private topologyTimer: ReturnType<typeof setInterval> | null = null;

  readonly topology = signal<TopologyResponse | null>(null);
  readonly ping = signal<PingResponse | null>(null);
  readonly session = signal<SessionResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly selectedSources = signal<string[]>([]);
  readonly followLogs = signal(true);

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
    const logs = this.live.logs();
    if (!allow.size) return logs;
    return logs.filter((e) => allow.has(e.source));
  });

  readonly cpuMemSeries = computed((): ApexAxisChartSeries => {
    const hist = this.live.history();
    return [
      {
        name: 'CPU',
        data: hist.map((h) => ({
          x: h.t,
          y: h.cpu == null ? null : Number(h.cpu.toFixed(1)),
        })),
      },
      {
        name: 'Memory',
        data: hist.map((h) => ({
          x: h.t,
          y: h.mem == null ? null : Number(h.mem.toFixed(1)),
        })),
      },
      {
        name: 'Temp',
        data: hist.map((h) => ({
          x: h.t,
          y: h.cpuTemp == null ? null : Number(h.cpuTemp.toFixed(1)),
        })),
      },
    ];
  });

  readonly gpuVramSeries = computed((): ApexAxisChartSeries => {
    const hist = this.live.history();
    return [
      {
        name: 'GPU',
        data: hist.map((h) => ({
          x: h.t,
          y: h.gpu == null ? null : Number(h.gpu.toFixed(1)),
        })),
      },
      {
        name: 'VRAM',
        data: hist.map((h) => ({
          x: h.t,
          y: h.vram == null ? null : Number(h.vram.toFixed(1)),
        })),
      },
      {
        name: 'Temp',
        data: hist.map((h) => ({
          x: h.t,
          y: h.gpuTemp == null ? null : Number(h.gpuTemp.toFixed(1)),
        })),
      },
    ];
  });

  readonly cpuMemChartColors = ['#f59e0b', '#60a5fa', '#f87171'];
  readonly gpuVramChartColors = ['#c084fc', '#34d399', '#f87171'];

  readonly cpuMemTooltip = computed(
    (): ApexTooltip => ({
      theme: this.theming.isDark() ? 'dark' : 'light',
      x: { format: 'HH:mm:ss' },
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number }) => {
          if (v == null || Number.isNaN(Number(v))) return '—';
          const idx = opts?.seriesIndex ?? 0;
          return idx === 2
            ? `${Number(v).toFixed(1)}°C`
            : `${Number(v).toFixed(1)}%`;
        },
      },
    })
  );

  readonly gpuVramTooltip = computed(
    (): ApexTooltip => ({
      theme: this.theming.isDark() ? 'dark' : 'light',
      x: { format: 'HH:mm:ss' },
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number }) => {
          if (v == null || Number.isNaN(Number(v))) return '—';
          const idx = opts?.seriesIndex ?? 0;
          return idx === 2
            ? `${Number(v).toFixed(1)}°C`
            : `${Number(v).toFixed(1)}%`;
        },
      },
    })
  );

  readonly cpuMemYaxis: ApexYAxis[] = [
    {
      seriesName: 'CPU',
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}%`,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
    },
    {
      seriesName: 'Memory',
      show: false,
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}%`,
      },
    },
    {
      seriesName: 'Temp',
      opposite: true,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}°C`,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
    },
  ];

  readonly gpuVramYaxis: ApexYAxis[] = [
    {
      seriesName: 'GPU',
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}%`,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
    },
    {
      seriesName: 'VRAM',
      show: false,
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}%`,
      },
    },
    {
      seriesName: 'Temp',
      opposite: true,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `${Math.round(v)}°C`,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
    },
  ];

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

  protected utilChart = {
    chart: {
      animations: { enabled: false, dynamicAnimation: { enabled: false } },
      fontFamily: 'inherit',
      foreColor: 'inherit',
      height: '100%',
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
    } as ApexChart,
    colors: ['#f59e0b', '#60a5fa'],
    dataLabels: { enabled: false } as ApexDataLabels,
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.4,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    } as ApexFill,
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.2)',
      strokeDashArray: 3,
      padding: { left: 8, right: 8 },
    } as ApexGrid,
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    } as ApexLegend,
    stroke: { curve: 'smooth', width: 2 } as ApexStroke,
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
      axisBorder: { show: false },
      tooltip: { enabled: false },
    } as ApexXAxis,
  };

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
    this.live.acquire({ metrics: true, logs: true });
    this.reload();
    this.topologyTimer = setInterval(() => this.reload(), 30000);
  }

  ngOnDestroy() {
    if (this.topologyTimer) {
      clearInterval(this.topologyTimer);
      this.topologyTimer = null;
    }
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
    this.api.topology().subscribe((r) => {
      if (r.ok) this.topology.set(r.data);
      else this.error.set(r.message);
    });
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

  statusDotClass(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (['healthy', 'available', 'succeeded'].includes(s)) return 'bg-green-500';
    if (['failed', 'blocking'].includes(s)) return 'bg-red-500';
    if (['degraded', 'warning', 'running', 'reconciling'].includes(s)) {
      return 'bg-amber-500';
    }
    return 'bg-neutral-400';
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

import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { AoResources, AoResourceRow } from '@/app/core/ao-api/types';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { Theming } from '@/app/core/theming';
import { resolveThermalRange } from '@/app/domains/admin/shared/thermal-ranges/thermal-ranges';

const GIB = 1024 ** 3;

/** One palette for every chart in the card: memory reads blue, VRAM green. */
const RAM_COLOR = '#60a5fa';
const VRAM_COLOR = '#34d399';
/** Matches the area charts' grid stroke so tracks and gridlines agree. */
const TRACK_COLOR = 'rgba(148, 163, 184, 0.2)';
const AXIS_TEXT = 'var(--mat-sys-on-surface)';

/**
 * Full host utilization card — CPU/mem + GPU/VRAM area charts.
 * Used on Overview and in the toolbar modal on other admin pages.
 */
@Component({
  selector: 'ao-host-utilization',
  imports: [MatCard, MatDivider, MatProgressBarModule, ChartComponent],
  host: { class: 'block' },
  template: `
    <mat-card
      class="overflow-hidden"
      appearance="outlined"
    >
      <div class="flex flex-col gap-y-1 px-5 pt-5 sm:flex-row sm:items-start">
        <div class="min-w-0 flex-auto">
          <div class="text-lg font-medium tracking-tight">Host utilization</div>
          <div class="font-medium text-neutral-500">
            {{ live.metrics()?.hostname || 'Coordinator host' }}
            · scope {{ live.metrics()?.scope || '—' }}
            · WebSocket push ~2s
          </div>
        </div>
      </div>

      @if (backgroundActivity()?.active) {
        <div
          class="mx-5 mt-3 flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2"
          role="status"
        >
          <div class="min-w-0 flex-auto">
            <div class="truncate text-sm">
              {{ backgroundActivity()?.message || 'Working…' }}
            </div>
            @if (backgroundActivity()?.percent != null) {
              <mat-progress-bar
                class="mt-2"
                mode="determinate"
                [value]="backgroundActivity()?.percent ?? 0"
              />
            }
          </div>
          @if (backgroundActivity()?.kind === 'model_pull') {
            <button
              type="button"
              class="shrink-0 rounded-md border border-amber-500/60 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-400/20 dark:text-amber-200"
              [disabled]="cancelling()"
              (click)="cancelBackground()"
            >
              {{ cancelling() ? 'Cancelling…' : 'Cancel' }}
            </button>
          }
        </div>
      }

      <div class="mt-2 grid grid-cols-1 gap-2 px-2 pb-2 xl:grid-cols-2">
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
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestCpu() ?? '—'
                }}@if (live.latestCpu() != null) {
                  <span class="text-lg text-neutral-500">%</span>
                }
              </div>
            </div>
            <div>
              <div class="text-sm font-medium text-neutral-500">Memory</div>
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestMem() ?? '—'
                }}@if (live.latestMem() != null) {
                  <span class="text-lg text-neutral-500">%</span>
                }
              </div>
            </div>
            <div>
              <div class="text-sm font-medium text-neutral-500">Temp</div>
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestCpuTemp() ?? '—'
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
            [yaxis]="cpuMemYaxis()"
          />
        </div>

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
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestGpu() ?? '—'
                }}@if (live.latestGpu() != null) {
                  <span class="text-lg text-neutral-500">%</span>
                }
              </div>
            </div>
            <div>
              <div class="text-sm font-medium text-neutral-500">VRAM</div>
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestVram() ?? '—'
                }}@if (live.latestVram() != null) {
                  <span class="text-lg text-neutral-500">%</span>
                }
              </div>
            </div>
            <div>
              <div class="text-sm font-medium text-neutral-500">Temp</div>
              <div class="text-3xl font-semibold tabular-nums tracking-tighter">
                {{ live.latestGpuTemp() ?? '—'
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
            [yaxis]="gpuVramYaxis()"
          />
        </div>
      </div>

      <mat-divider />

      <div class="flex flex-col gap-y-1 px-5 pt-4 sm:flex-row sm:items-start">
        <div class="min-w-0 flex-auto">
          <div class="text-lg font-medium tracking-tight">AO footprint</div>
          <div class="font-medium text-neutral-500">
            {{ aoFootprintCaption() }}
          </div>
        </div>
      </div>

      <div class="mt-1 grid grid-cols-1 gap-2 px-2 pb-2 xl:grid-cols-2">
        <div class="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 px-3 pt-2">
          <div>
            <div
              class="flex items-center gap-x-1.5 text-sm font-medium text-neutral-500"
            >
              <span
                class="inline-block size-2 rounded-full"
                [style.background-color]="gaugeColors[0]"
              ></span>
              AO RAM
            </div>
            <div class="text-3xl font-semibold tabular-nums tracking-tighter">
              {{ aoRamGib() ?? '—'
              }}@if (aoRamGib() != null) {
                <span class="text-lg text-neutral-500">GiB</span>
              }
            </div>
            <div class="text-xs text-neutral-500">{{ aoRamShare() }}</div>
          </div>
          <div>
            <div
              class="flex items-center gap-x-1.5 text-sm font-medium text-neutral-500"
            >
              <span
                class="inline-block size-2 rounded-full"
                [style.background-color]="gaugeColors[1]"
              ></span>
              AO VRAM
            </div>
            <div class="text-3xl font-semibold tabular-nums tracking-tighter">
              {{ aoVramGib() ?? '—'
              }}@if (aoVramGib() != null) {
                <span class="text-lg text-neutral-500">GiB</span>
              }
            </div>
            <div class="text-xs text-neutral-500">{{ aoVramShare() }}</div>
          </div>
          <apx-chart
            class="h-40 w-40 shrink-0 sm:ml-auto"
            [chart]="gaugeChart.chart"
            [colors]="gaugeColors"
            [labels]="gaugeLabels"
            [legend]="gaugeChart.legend"
            [plotOptions]="gaugePlotOptions()"
            [series]="aoGaugeSeries()"
          />
        </div>

        <div class="flex min-w-0 flex-col">
          <div class="px-3 pt-2 text-sm font-medium text-neutral-500">
            By application and model
          </div>
          @if (aoBreakdown().length) {
            <apx-chart
              class="w-full"
              [chart]="breakdownChartOptions()"
              [colors]="breakdownColors"
              [dataLabels]="breakdownChart.dataLabels"
              [grid]="utilChart.grid"
              [legend]="breakdownChart.legend"
              [plotOptions]="breakdownChart.plotOptions"
              [series]="aoBreakdownSeries()"
              [tooltip]="breakdownTooltip()"
              [xaxis]="aoBreakdownXaxis()"
              [yaxis]="breakdownYaxis"
            />
          } @else {
            <div
              class="flex h-40 items-center justify-center px-3 text-sm text-neutral-500"
            >
              {{ aoEmptyReason() }}
            </div>
          }
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
  `,
})
export class HostUtilization implements OnInit, OnDestroy {
  readonly live = inject(AoLiveWs);
  private theming = inject(Theming);
  private api = inject(AoApi);
  readonly cancelling = signal(false);
  readonly backgroundActivity = computed(
    () => this.live.metrics()?.backgroundActivity ?? null
  );

  ngOnInit() {
    this.live.acquire({ feeds: ['ao_resources'] });
  }

  ngOnDestroy() {
    this.live.release();
  }

  cancelBackground() {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.api.cancelBackgroundActivity().subscribe({
      next: () => this.cancelling.set(false),
      error: () => this.cancelling.set(false),
    });
  }

  readonly aoResources = computed(() =>
    this.live.feedData<AoResources>('ao_resources')
  );

  /** Applications first (RAM heavy), then resident models (VRAM heavy). */
  readonly aoBreakdown = computed((): AoResourceRow[] => {
    const data = this.aoResources();
    const apps = (data?.applications || []).filter(
      (r) => r.ramBytes > 0 || r.vramBytes > 0
    );
    const models = (data?.models || []).filter(
      (r) => r.ramBytes > 0 || r.vramBytes > 0
    );
    return [...apps, ...models];
  });

  readonly aoGaugeSeries = computed((): ApexNonAxisChartSeries => {
    const ao = this.aoResources()?.ao;
    return [
      Math.min(100, Math.round(ao?.ramPercentOfHost ?? 0)),
      Math.min(100, Math.round(ao?.vramPercentOfTotal ?? 0)),
    ];
  });

  /**
   * The centre of the dial reports the RAM share, the one figure that has a
   * single meaning for the whole host; hovering a ring still shows that ring.
   */
  readonly gaugePlotOptions = computed((): ApexPlotOptions => {
    const ram = this.aoResources()?.ao?.ramPercentOfHost;
    /** Apex paints SVG text with a hardcoded near-black fill unless set here. */
    const label = '#737373';
    const value = this.theming.isDark() ? '#ffffff' : '#0a0a0a';
    return {
      radialBar: {
        hollow: { size: '56%' },
        track: { background: TRACK_COLOR },
        dataLabels: {
          name: { fontSize: '12px', offsetY: -2, color: label },
          value: {
            fontSize: '22px',
            offsetY: 4,
            color: value,
            formatter: (v: number) => `${Math.round(Number(v))}%`,
          },
          total: {
            show: true,
            label: 'RAM of host',
            color: label,
            formatter: () => (ram == null ? '—' : `${Math.round(ram)}%`),
          },
        },
      },
    };
  });

  readonly aoBreakdownSeries = computed((): ApexAxisChartSeries => {
    const rows = this.aoBreakdown();
    return [
      { name: 'RAM', data: rows.map((r) => toGib(r.ramBytes)) },
      { name: 'VRAM', data: rows.map((r) => toGib(r.vramBytes)) },
    ];
  });

  readonly aoBreakdownXaxis = computed(
    (): ApexXAxis => ({
      categories: this.aoBreakdown().map((r) => this.rowLabel(r)),
      labels: {
        formatter: (v: string) => `${Number(v).toFixed(1)}`,
        style: { colors: AXIS_TEXT },
      },
      title: {
        text: 'GiB',
        style: { color: AXIS_TEXT, fontSize: '11px' },
      },
    })
  );

  /** Apex defaults category labels to a near-black fill and clips them at 160px. */
  readonly breakdownYaxis: ApexYAxis = {
    labels: {
      maxWidth: 260,
      style: { colors: AXIS_TEXT, fontSize: '12px' },
    },
  };

  /** Grow the plot with the row count so labels never collide. */
  readonly breakdownChartOptions = computed(
    (): ApexChart => ({
      ...this.breakdownChart.chart,
      height: Math.max(180, 44 + this.aoBreakdown().length * 26),
    })
  );

  readonly breakdownTooltip = computed(
    (): ApexTooltip => ({
      theme: this.theming.isDark() ? 'dark' : 'light',
      y: {
        formatter: (v: number) =>
          v == null || Number.isNaN(Number(v))
            ? '—'
            : `${Number(v).toFixed(2)} GiB`,
      },
    })
  );

  readonly aoRamGib = computed(() => {
    const bytes = this.aoResources()?.ao?.ramBytes;
    return bytes ? toGib(bytes).toFixed(1) : null;
  });

  readonly aoVramGib = computed(() => {
    const bytes = this.aoResources()?.ao?.vramBytes;
    return bytes ? toGib(bytes).toFixed(1) : null;
  });

  readonly aoRamShare = computed(() =>
    shareLabel(this.aoResources()?.ao?.ramPercentOfHost, 'of host RAM')
  );

  readonly aoVramShare = computed(() =>
    shareLabel(this.aoResources()?.ao?.vramPercentOfTotal, 'of total VRAM')
  );

  readonly aoFootprintCaption = computed(() => {
    const data = this.aoResources();
    if (!data) return 'Waiting for the first sample…';
    const ao = data.ao;
    const parts = [
      `${ao?.processes ?? 0} processes`,
      `${ao?.models ?? 0} resident models`,
    ];
    const total = this.aoResources()?.host?.ramTotalBytes;
    if (total) parts.push(`host RAM ${toGib(total).toFixed(1)} GiB`);
    return parts.join(' · ');
  });

  readonly aoEmptyReason = computed(() => {
    const data = this.aoResources();
    if (!data) return 'Waiting for the first sample…';
    return (
      data.sources?.reason ||
      'No AO processes or resident models visible from this process'
    );
  });

  private rowLabel(row: AoResourceRow): string {
    if (row.kind !== 'model') return row.label;
    const agents = row.agents || [];
    if (!agents.length) return row.label;
    /** Only the first agent fits on an axis; the rest become a count. */
    const extra = agents.length > 1 ? ` +${agents.length - 1}` : '';
    return `${row.label} (${agents[0]}${extra})`;
  }

  readonly cpuMemSeries = computed((): ApexAxisChartSeries => {
    const hist = this.live.history();
    return [
      {
        name: 'CPU',
        data: hist.map((h) => ({
          x: h.t,
          y: h.cpu == null ? null : Math.round(h.cpu),
        })),
      },
      {
        name: 'Memory',
        data: hist.map((h) => ({
          x: h.t,
          y: h.mem == null ? null : Math.round(h.mem),
        })),
      },
      {
        name: 'Temp',
        data: hist.map((h) => ({
          x: h.t,
          y: h.cpuTemp == null ? null : Math.round(h.cpuTemp),
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
          y: h.gpu == null ? null : Math.round(h.gpu),
        })),
      },
      {
        name: 'VRAM',
        data: hist.map((h) => ({
          x: h.t,
          y: h.vram == null ? null : Math.round(h.vram),
        })),
      },
      {
        name: 'Temp',
        data: hist.map((h) => ({
          x: h.t,
          y: h.gpuTemp == null ? null : Math.round(h.gpuTemp),
        })),
      },
    ];
  });

  readonly cpuMemChartColors = ['#f59e0b', RAM_COLOR, '#f87171'];
  readonly gpuVramChartColors = ['#c084fc', VRAM_COLOR, '#f87171'];

  readonly cpuThermalRange = computed(() => {
    const scope = String(this.live.metrics()?.scope || '');
    const cpuName = this.live.cpuModel();
    const gpuName = this.live.gpuName();
    const key =
      scope === 'jetson' || /jetson|tegra|orin/i.test(String(gpuName || ''))
        ? gpuName || cpuName
        : cpuName || gpuName;
    return resolveThermalRange('cpu', key);
  });

  readonly gpuThermalRange = computed(() =>
    resolveThermalRange('gpu', this.live.gpuName())
  );

  readonly cpuMemTooltip = computed(
    (): ApexTooltip => ({
      theme: this.theming.isDark() ? 'dark' : 'light',
      x: { format: 'HH:mm:ss' },
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number }) => {
          if (v == null || Number.isNaN(Number(v))) return '—';
          const idx = opts?.seriesIndex ?? 0;
          return idx === 2
            ? `${Math.round(Number(v))}°C`
            : `${Math.round(Number(v))}%`;
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
            ? `${Math.round(Number(v))}°C`
            : `${Math.round(Number(v))}%`;
        },
      },
    })
  );

  readonly cpuMemYaxis = computed((): ApexYAxis[] => {
    const range = this.cpuThermalRange();
    return [
      {
        seriesName: 'CPU',
        min: 0,
        max: 100,
        tickAmount: 4,
        forceNiceScale: false,
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
        forceNiceScale: false,
        labels: {
          formatter: (v: number) => `${Math.round(v)}%`,
        },
      },
      {
        seriesName: 'Temp',
        opposite: true,
        min: range.minC,
        max: range.maxC,
        tickAmount: 4,
        forceNiceScale: false,
        title: {
          text: `${range.minC}–${range.maxC}°C`,
          style: { color: 'var(--mat-sys-on-surface)', fontSize: '11px' },
        },
        labels: {
          formatter: (v: number) => `${Math.round(v)}°C`,
          style: { colors: 'var(--mat-sys-on-surface)' },
        },
      },
    ];
  });

  readonly gpuVramYaxis = computed((): ApexYAxis[] => {
    const range = this.gpuThermalRange();
    return [
      {
        seriesName: 'GPU',
        min: 0,
        max: 100,
        tickAmount: 4,
        forceNiceScale: false,
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
        forceNiceScale: false,
        labels: {
          formatter: (v: number) => `${Math.round(v)}%`,
        },
      },
      {
        seriesName: 'Temp',
        opposite: true,
        min: range.minC,
        max: range.maxC,
        tickAmount: 4,
        forceNiceScale: false,
        title: {
          text: `${range.minC}–${range.maxC}°C`,
          style: { color: 'var(--mat-sys-on-surface)', fontSize: '11px' },
        },
        labels: {
          formatter: (v: number) => `${Math.round(v)}°C`,
          style: { colors: 'var(--mat-sys-on-surface)' },
        },
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
      borderColor: TRACK_COLOR,
      strokeDashArray: 3,
      padding: { left: 8, right: 8 },
    } as ApexGrid,
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    } as ApexLegend,
    stroke: { curve: 'smooth', width: 2, connectNulls: true } as ApexStroke,
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

  readonly gaugeColors = [RAM_COLOR, VRAM_COLOR];
  readonly gaugeLabels = ['RAM', 'VRAM'];

  protected gaugeChart = {
    chart: {
      animations: { enabled: false },
      fontFamily: 'inherit',
      foreColor: AXIS_TEXT,
      height: '100%',
      type: 'radialBar',
      toolbar: { show: false },
    } as ApexChart,
    /** The stat blocks above carry the colour key, so no second legend here. */
    legend: { show: false } as ApexLegend,
  };

  readonly breakdownColors = [RAM_COLOR, VRAM_COLOR];

  protected breakdownChart = {
    chart: {
      animations: { enabled: false },
      fontFamily: 'inherit',
      foreColor: 'inherit',
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
    } as ApexChart,
    dataLabels: { enabled: false } as ApexDataLabels,
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    } as ApexLegend,
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '65%',
        borderRadius: 2,
      },
    } as ApexPlotOptions,
  };

  resourceBarColor(pct: number | null): 'primary' | 'warn' | 'error' {
    if (pct == null) return 'primary';
    if (pct >= 90) return 'error';
    if (pct >= 75) return 'warn';
    return 'primary';
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

function toGib(bytes: number | null | undefined): number {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / GIB) * 100) / 100;
}

function shareLabel(pct: number | null | undefined, suffix: string): string {
  const n = Number(pct);
  if (!Number.isFinite(n)) return '—';
  return `${n}% ${suffix}`;
}

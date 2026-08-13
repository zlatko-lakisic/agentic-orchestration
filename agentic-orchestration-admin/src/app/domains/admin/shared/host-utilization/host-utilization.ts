import { Component, computed, inject } from '@angular/core';
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
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { Theming } from '@/app/core/theming';
import { resolveThermalRange } from '@/app/domains/admin/shared/thermal-ranges/thermal-ranges';

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
export class HostUtilization {
  readonly live = inject(AoLiveWs);
  private theming = inject(Theming);

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

  readonly cpuMemChartColors = ['#f59e0b', '#60a5fa', '#f87171'];
  readonly gpuVramChartColors = ['#c084fc', '#34d399', '#f87171'];

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
      borderColor: 'rgba(148, 163, 184, 0.2)',
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

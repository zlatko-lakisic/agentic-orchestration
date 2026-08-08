import { __decorate } from "tslib";
import { DecimalPipe, NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild, } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, } from '@angular/material/card';
import { MatChipListbox, MatChipOption, } from '@angular/material/chips';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ChartComponent, } from 'ng-apexcharts';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { Theming } from '@/app/core/theming';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
/**
 * Overview — live host metrics (WS) + Fuse Apex charts + filterable live logs.
 */
let OverviewPage = class OverviewPage {
    api = inject(AoApi);
    theming = inject(Theming);
    live = inject(AoLiveWs);
    logViewport = viewChild('logViewport');
    topologyTimer = null;
    topology = signal(null);
    ping = signal(null);
    session = signal(null);
    error = signal(null);
    selectedSources = signal([]);
    components = computed(() => (this.topology()?.components || []));
    filteredLogs = computed(() => {
        const allow = new Set(this.selectedSources());
        const logs = this.live.logs();
        if (!allow.size)
            return logs;
        return logs.filter((e) => allow.has(e.source));
    });
    chartSeries = computed(() => {
        const hist = this.live.history();
        const series = [
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
        ];
        if (hist.some((h) => h.gpu != null)) {
            series.push({
                name: 'GPU',
                data: hist.map((h) => ({
                    x: h.t,
                    y: h.gpu == null ? null : Number(h.gpu.toFixed(1)),
                })),
            });
        }
        return series;
    });
    summary = computed(() => {
        const comps = this.components();
        const healthy = comps.filter((c) => ['healthy', 'available', 'succeeded'].includes(String(c.status || '').toLowerCase())).length;
        const degraded = comps.filter((c) => ['degraded', 'warning', 'running', 'reconciling'].includes(String(c.status || '').toLowerCase())).length;
        const failed = comps.filter((c) => ['failed', 'blocking'].includes(String(c.status || '').toLowerCase())).length;
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
    utilChart = {
        chart: {
            animations: { enabled: false },
            fontFamily: 'inherit',
            foreColor: 'inherit',
            height: '100%',
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ['#f59e0b', '#60a5fa', '#c084fc'],
        dataLabels: { enabled: false },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.4,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 90, 100],
            },
        },
        grid: {
            borderColor: 'rgba(148, 163, 184, 0.2)',
            strokeDashArray: 3,
            padding: { left: 8, right: 8 },
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
        },
        stroke: { curve: 'smooth', width: 2 },
        tooltip: computed(() => ({
            theme: this.theming.isDark() ? 'dark' : 'light',
            x: { format: 'HH:mm:ss' },
            y: { formatter: (v) => `${Number(v).toFixed(1)}%` },
        })),
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
                style: { colors: 'var(--mat-sys-on-surface)' },
            },
            axisBorder: { show: false },
            tooltip: { enabled: false },
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 4,
            labels: {
                formatter: (v) => `${Math.round(v)}%`,
                style: { colors: 'var(--mat-sys-on-surface)' },
            },
        },
    };
    sparkChart = {
        chart: {
            animations: { enabled: false },
            fontFamily: 'inherit',
            foreColor: 'inherit',
            height: '101%',
            width: '101%',
            type: 'area',
            sparkline: { enabled: true },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.5,
                opacityFrom: 0.4,
                opacityTo: 0.05,
            },
        },
        stroke: { curve: 'smooth', width: 2 },
        tooltip: { enabled: false },
    };
    constructor() {
        effect(() => {
            // Auto-scroll log viewport when new lines arrive.
            this.filteredLogs();
            queueMicrotask(() => {
                const el = this.logViewport()?.nativeElement;
                if (!el)
                    return;
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
    sparkSeries(key) {
        const vals = this.live
            .history()
            .map((h) => h[key])
            .filter((v) => v != null);
        return [{ name: key, data: vals.length ? vals : [0] }];
    }
    onSourcesChange(ev) {
        const value = ev.value;
        const list = Array.isArray(value) ? value : value ? [value] : [];
        this.selectedSources.set(list);
        this.live.setLogSources(list.length ? list : null);
    }
    reload() {
        this.error.set(null);
        this.api.topology().subscribe((r) => {
            if (r.ok)
                this.topology.set(r.data);
            else
                this.error.set(r.message);
        });
        this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
        this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
    }
    componentHref(c) {
        const raw = c.url || c.urlHint;
        if (!raw)
            return null;
        const host = location.hostname || '127.0.0.1';
        const resolved = String(raw)
            .replace(/__HOST__/g, host)
            .replace(/<host>/gi, host)
            .split(/\s+/)[0];
        if (!resolved || resolved.includes('<'))
            return null;
        if (resolved.startsWith('/')) {
            return `${location.protocol}//${location.host}${resolved}`;
        }
        return resolved;
    }
    resourceBarColor(pct) {
        if (pct == null)
            return 'primary';
        if (pct >= 90)
            return 'error';
        if (pct >= 75)
            return 'warn';
        return 'primary';
    }
    statusLabel(status) {
        const s = String(status || 'unknown').replace(/-/g, ' ');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    statusTextClass(status) {
        const s = String(status || '').toLowerCase();
        if (['healthy', 'available', 'succeeded'].includes(s)) {
            return 'text-green-600';
        }
        if (['failed', 'blocking'].includes(s))
            return 'text-red-600';
        if (['degraded', 'warning', 'running', 'reconciling'].includes(s)) {
            return 'text-amber-600';
        }
        return 'text-neutral-500';
    }
    watermarkIcon(status) {
        const s = String(status || '').toLowerCase();
        if (['healthy', 'available', 'succeeded'].includes(s))
            return 'circle-check';
        if (['failed', 'blocking'].includes(s))
            return 'circle-x';
        return 'circle-alert';
    }
    watermarkClass(status) {
        const s = String(status || '').toLowerCase();
        if (['healthy', 'available', 'succeeded'].includes(s)) {
            return 'text-green-600/25 dark:text-green-500/25';
        }
        if (['failed', 'blocking'].includes(s)) {
            return 'text-red-600/25 dark:text-red-500/25';
        }
        return 'text-amber-600/25 dark:text-amber-500/25';
    }
    formatUptime(sec) {
        if (sec == null || !Number.isFinite(sec))
            return '—';
        const s = Math.floor(sec);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0)
            return `${d}d ${h}h`;
        if (h > 0)
            return `${h}h ${m}m`;
        return `${m}m`;
    }
    formatLogTime(ts) {
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
    sourceClass(source) {
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
    levelClass(level) {
        if (level === 'error')
            return 'text-red-300';
        if (level === 'warn')
            return 'text-amber-200';
        return 'text-neutral-200';
    }
};
OverviewPage = __decorate([
    Component({
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
            MatChipListbox,
            MatChipOption,
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

      <!-- Live host utilization (Fuse Analytics multi-series area) -->
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
          <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 sm:mt-0">
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
            @if (live.latestGpu() != null) {
              <div>
                <div class="text-sm font-medium text-neutral-500">GPU</div>
                <div
                  class="text-3xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ live.latestGpu()
                  }}<span class="text-lg text-neutral-500">%</span>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="mt-2 flex flex-auto flex-col px-2 pb-2">
          <apx-chart
            class="h-72 w-full"
            [chart]="utilChart.chart"
            [colors]="utilChart.colors"
            [dataLabels]="utilChart.dataLabels"
            [fill]="utilChart.fill"
            [grid]="utilChart.grid"
            [legend]="utilChart.legend"
            [series]="chartSeries()"
            [stroke]="utilChart.stroke"
            [tooltip]="utilChart.tooltip()"
            [xaxis]="utilChart.xaxis"
            [yaxis]="utilChart.yaxis"
          />
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
          <div>
            <div class="font-medium text-neutral-500">Cores</div>
            <div class="font-mono tabular-nums">
              {{ live.metrics()?.cpu?.cores ?? '—' }}
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

      <div class="mt-2 w-full">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Topology
        </div>
        <div class="text-neutral-500">
          Runtime components and how they are exposed on this host
        </div>
      </div>

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
                @if (componentHref(c); as href) {
                  <button
                    mat-icon-button
                    type="button"
                    [matMenuTriggerFor]="compMenu"
                  >
                    <mat-icon svgIcon="ellipsis" />
                  </button>
                  <mat-menu #compMenu="matMenu">
                    <a
                      mat-menu-item
                      [href]="href"
                      target="_blank"
                      rel="noopener"
                    >
                      Open
                    </a>
                  </mat-menu>
                }
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
            @if (componentHref(c); as href) {
              <div class="mt-3">
                <a
                  matButton
                  [href]="href"
                  target="_blank"
                  rel="noopener"
                >
                  Open
                </a>
              </div>
            }
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

      <!-- Live logs -->
      <mat-card
        class="overflow-hidden"
        appearance="outlined"
      >
        <div
          class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
        >
          <div class="min-w-0 flex-auto">
            <div class="text-lg font-medium tracking-tight">Live logs</div>
            <div class="text-sm text-neutral-500">
              Streaming from web + kubectl tails when available
            </div>
          </div>
          <button
            matButton="outlined"
            type="button"
            (click)="live.clearLogs()"
          >
            Clear
          </button>
        </div>
        <div class="px-5 pb-3">
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
        <mat-divider />
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
      </mat-card>

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
], OverviewPage);
export { OverviewPage };

import { DecimalPipe, DatePipe, NgClass } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
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
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import {
  LlmSpendTotals,
  LlmUsageEventRow,
  LlmUsageResponse,
  LlmUsageRollupRow,
} from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

/**
 * Token usage — Fuse Finance dashboard pattern:
 * statement cards, spend-over-time area chart, recent transactions, budget split.
 */
@Component({
  selector: 'ao-llm-usage-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatDivider,
    MatProgressBarModule,
    MatTableModule,
    DecimalPipe,
    DatePipe,
    NgClass,
    ChartComponent,
    EmptyState,
    ErrorState,
    StatusChip,
  ],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Token usage
          </div>
          <div class="text-neutral-500">
            All local clients on this install · live WebSocket
            @if (clientAppCount() > 0) {
              <span>· {{ clientAppCount() }} app{{ clientAppCount() === 1 ? '' : 's' }}</span>
            }
            @if (live.connected()) {
              <span class="text-green-600">· connected</span>
            } @else {
              <span class="text-amber-600">· reconnecting…</span>
            }
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a matButton routerLink="/traces">Traces</a>
          <a matButton routerLink="/access">Access</a>
          <button matButton="tonal" type="button" (click)="resync()">
            <mat-icon
              class="icon-size-5"
              [svgIcon]="'refresh-cw'"
            />
            Resync
          </button>
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (data(); as d) {
        <!-- Statement cards (Fuse Finance previous / current) -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          @for (stmt of statements(); track stmt.id) {
            <mat-card appearance="outlined" class="overflow-hidden">
              <mat-card-header class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-lg font-medium tracking-tight">
                    {{ stmt.title }}
                  </div>
                  <div class="text-sm text-neutral-500">{{ stmt.caption }}</div>
                </div>
                <mat-icon
                  class="size-5 shrink-0 text-neutral-400"
                  [svgIcon]="stmt.icon"
                />
              </mat-card-header>
              <mat-card-content class="mt-4 flex flex-col gap-4">
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <div class="text-2xs font-medium uppercase text-neutral-500">
                      Calls
                    </div>
                    <div class="text-xl font-semibold tabular-nums tracking-tight">
                      {{ stmt.totals.calls | number }}
                    </div>
                  </div>
                  <div>
                    <div class="text-2xs font-medium uppercase text-neutral-500">
                      Prompt
                    </div>
                    <div class="text-xl font-semibold tabular-nums tracking-tight">
                      {{ stmt.totals.promptTokens | number }}
                    </div>
                  </div>
                  <div>
                    <div class="text-2xs font-medium uppercase text-neutral-500">
                      Completion
                    </div>
                    <div class="text-xl font-semibold tabular-nums tracking-tight">
                      {{ stmt.totals.completionTokens | number }}
                    </div>
                  </div>
                </div>
                <mat-divider />
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-neutral-500">Spent</div>
                    <div
                      class="text-3xl font-semibold tabular-nums tracking-tighter"
                    >
                      {{ stmt.totals.totalTokens | number }}
                      <span class="text-base font-medium text-neutral-500"
                        >tokens</span
                      >
                    </div>
                  </div>
                  @if (stmt.growthPct != null) {
                    <div
                      class="flex items-center gap-1 text-sm font-medium"
                      [ngClass]="
                        stmt.growthPct > 0
                          ? 'text-amber-600'
                          : stmt.growthPct < 0
                            ? 'text-green-600'
                            : 'text-neutral-500'
                      "
                    >
                      <mat-icon
                        class="size-4"
                        [svgIcon]="
                          stmt.growthPct > 0
                            ? 'arrow-up'
                            : stmt.growthPct < 0
                              ? 'arrow-down'
                              : 'minus'
                        "
                      />
                      {{ stmt.growthPct | number: '1.0-1' }}%
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Account balance / spend over time -->
        <mat-card appearance="outlined" class="overflow-hidden">
          <div
            class="flex flex-col gap-y-1 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0 flex-auto">
              <div class="text-lg font-medium tracking-tight">Token spend</div>
              <div class="font-medium text-neutral-500">
                Daily prompt + completion tokens
                @if (d.spend?.windowDays; as w) {
                  · {{ w }}-day statement windows
                }
              </div>
            </div>
            <div class="mt-3 flex shrink-0 gap-6 sm:mt-0">
              <div>
                <div class="text-sm font-medium text-neutral-500">
                  Avg daily growth
                </div>
                <div
                  class="text-2xl font-semibold tabular-nums tracking-tighter"
                  [ngClass]="
                    (d.spend?.growthPct?.totalTokens ?? 0) > 0
                      ? 'text-amber-600'
                      : (d.spend?.growthPct?.totalTokens ?? 0) < 0
                        ? 'text-green-600'
                        : ''
                  "
                >
                  {{ (d.spend?.growthPct?.totalTokens ?? 0) | number: '1.0-1' }}%
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-neutral-500">
                  Lifetime total
                </div>
                <div
                  class="text-2xl font-semibold tabular-nums tracking-tighter"
                >
                  {{ (d.llm?.grandTotal?.totalTokens ?? 0) | number }}
                </div>
              </div>
            </div>
          </div>
          <div class="h-72 w-full px-2 pb-2 pt-4">
            @if (chartSeries().length) {
              <apx-chart
                class="h-full w-full"
                [series]="chartSeries()"
                [chart]="spendChart.chart"
                [colors]="spendChart.colors"
                [dataLabels]="spendChart.dataLabels"
                [fill]="spendChart.fill"
                [grid]="spendChart.grid"
                [legend]="spendChart.legend"
                [stroke]="spendChart.stroke"
                [tooltip]="spendChart.tooltip"
                [xaxis]="spendChart.xaxis"
                [yaxis]="spendChart.yaxis"
              />
            } @else {
              <div
                class="flex h-full items-center justify-center text-sm text-neutral-500"
              >
                No token ledger rows yet — run a model call to populate spend
                over time.
              </div>
            }
          </div>
        </mat-card>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <!-- Recent transactions -->
          <mat-card appearance="outlined" class="overflow-hidden xl:col-span-2">
            <mat-card-header class="flex items-start justify-between gap-3">
              <div>
                <div class="text-lg font-medium tracking-tight">
                  Recent model calls
                </div>
                <div class="text-sm text-neutral-500">
                  {{ recentSummary() }}
                </div>
              </div>
            </mat-card-header>
            <mat-card-content class="mt-2 px-0 pb-0">
              @if (transactions().length) {
                <table mat-table [dataSource]="transactions()" class="w-full">
                  <ng-container matColumnDef="when">
                    <th mat-header-cell *matHeaderCellDef>When</th>
                    <td mat-cell *matCellDef="let r" class="whitespace-nowrap text-sm">
                      {{ r.whenMs | date: 'MMM d, HH:mm:ss' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="app">
                    <th mat-header-cell *matHeaderCellDef>App / user</th>
                    <td mat-cell *matCellDef="let r" class="font-mono text-sm">
                      {{ r.app }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="model">
                    <th mat-header-cell *matHeaderCellDef>Model</th>
                    <td mat-cell *matCellDef="let r" class="font-mono text-sm">
                      {{ r.model }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="tokens">
                    <th mat-header-cell *matHeaderCellDef>Tokens</th>
                    <td
                      mat-cell
                      *matCellDef="let r"
                      class="tabular-nums text-sm font-medium"
                    >
                      {{ r.tokens | number }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let r">
                      <ao-status-chip [status]="r.status" />
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="txCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: txCols"></tr>
                </table>
              } @else {
                <div class="px-6 pb-6 text-sm text-neutral-500">
                  No model calls recorded yet.
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Budget-style composition -->
          <mat-card appearance="outlined" class="overflow-hidden">
            <mat-card-header>
              <div>
                <div class="text-lg font-medium tracking-tight">Composition</div>
                <div class="text-sm text-neutral-500">
                  Lifetime token mix and API request volume
                </div>
              </div>
            </mat-card-header>
            <mat-card-content class="mt-4 flex flex-col gap-5">
              @for (b of budgetBars(); track b.title) {
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-baseline justify-between gap-2">
                    <div class="text-sm font-medium">{{ b.title }}</div>
                    <div class="text-sm tabular-nums text-neutral-500">
                      {{ b.value | number }}
                      <span class="ml-1 font-medium" [ngClass]="b.toneClass"
                        >{{ b.pct | number: '1.0-1' }}%</span
                      >
                    </div>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="b.pct"
                    [color]="b.color"
                  />
                </div>
              }
              @if (topApps().length) {
                <mat-divider />
                <div class="text-sm font-medium text-neutral-500">
                  Apps by tokens (this install)
                </div>
                <div class="flex flex-col gap-2">
                  @for (a of topApps(); track a.key) {
                    <div class="flex items-center justify-between gap-2 text-sm">
                      <span class="truncate font-mono">{{ a.key }}</span>
                      <span class="shrink-0 tabular-nums font-medium">{{
                        a.totalTokens ?? 0 | number
                      }}</span>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Rollup tables -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          @for (block of llmBlocks(d); track block.title) {
            <mat-card appearance="outlined" class="overflow-hidden">
              <mat-card-header>
                <div class="text-lg font-medium tracking-tight">
                  {{ block.title }}
                </div>
              </mat-card-header>
              <mat-card-content class="mt-2 px-0 pb-0">
                @if (block.rows.length) {
                  <table mat-table [dataSource]="block.rows" class="w-full">
                    <ng-container matColumnDef="key">
                      <th mat-header-cell *matHeaderCellDef>Key</th>
                      <td
                        mat-cell
                        *matCellDef="let r"
                        class="font-mono text-sm"
                      >
                        {{ r.key }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="calls">
                      <th mat-header-cell *matHeaderCellDef>Calls</th>
                      <td mat-cell *matCellDef="let r" class="tabular-nums">
                        {{ r.calls | number }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef>Tokens</th>
                      <td
                        mat-cell
                        *matCellDef="let r"
                        class="tabular-nums font-medium"
                      >
                        {{ r.totalTokens ?? 0 | number }}
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="llmCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: llmCols"></tr>
                  </table>
                } @else {
                  <div class="px-6 pb-6 text-sm text-neutral-500">
                    No rows yet.
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      } @else if (!error()) {
        <ao-empty-state message="Waiting for live token usage feed…" />
      }
    </div>
  `,
})
export class LlmUsagePage implements OnInit, OnDestroy {
  readonly live = inject(AoLiveWs);
  readonly llmCols = ['key', 'calls', 'total'];
  readonly txCols = ['when', 'app', 'model', 'tokens', 'status'];

  readonly data = computed(
    () =>
      (this.live.feeds()['llm_usage'] as LlmUsageResponse | undefined) || null,
  );
  readonly error = computed(() => {
    const e =
      this.live.feedErrors()['llm_usage'] || this.live.feedErrors()['_'];
    return e || null;
  });

  readonly statements = computed(() => {
    const d = this.data();
    const prev = d?.spend?.previous || emptyTotals();
    const cur = d?.spend?.current || emptyTotals();
    const growth = d?.spend?.growthPct?.totalTokens;
    return [
      {
        id: 'previous',
        title: 'Previous statement',
        caption: windowCaption(prev, d?.spend?.windowDays),
        icon: 'calendar',
        totals: prev,
        growthPct: null as number | null,
      },
      {
        id: 'current',
        title: 'Current statement',
        caption: windowCaption(cur, d?.spend?.windowDays),
        icon: 'wallet',
        totals: cur,
        growthPct: growth ?? null,
      },
    ];
  });

  readonly chartSeries = computed((): ApexAxisChartSeries => {
    const timeline = this.data()?.spend?.timeline || [];
    if (!timeline.length) return [];
    return [
      {
        name: 'Prompt',
        data: timeline.map((d) => ({ x: d.ts, y: d.promptTokens || 0 })),
      },
      {
        name: 'Completion',
        data: timeline.map((d) => ({ x: d.ts, y: d.completionTokens || 0 })),
      },
    ];
  });

  readonly transactions = computed(() =>
    (this.data()?.recent || []).slice(0, 12).map((r) => mapTx(r)),
  );

  readonly recentSummary = computed(() => {
    const rows = this.data()?.recent || [];
    if (!rows.length) return 'No recent calls';
    const failed = rows.filter((r) => r.ok === false).length;
    const ok = rows.length - failed;
    return `${ok} succeeded${failed ? `, ${failed} failed` : ''} · showing latest ${Math.min(12, rows.length)}`;
  });

  readonly budgetBars = computed(() => {
    const g = this.data()?.llm?.grandTotal;
    const apiCalls = (this.data()?.api?.byAppId || []).reduce(
      (n, r) => n + (r.calls || 0),
      0,
    );
    const prompt = g?.promptTokens || 0;
    const completion = g?.completionTokens || 0;
    const total = Math.max(1, prompt + completion);
    return [
      {
        title: 'Prompt tokens',
        value: prompt,
        pct: (prompt / total) * 100,
        color: 'primary' as const,
        toneClass: 'text-sky-600',
      },
      {
        title: 'Completion tokens',
        value: completion,
        pct: (completion / total) * 100,
        color: 'accent' as const,
        toneClass: 'text-amber-600',
      },
      {
        title: 'API requests (Access ledger)',
        value: apiCalls,
        pct: Math.min(100, apiCalls ? 100 : 0),
        color: 'warn' as const,
        toneClass: 'text-neutral-500',
      },
    ];
  });

  readonly topApps = computed((): LlmUsageRollupRow[] =>
    this.data()?.llm?.byAppId || [],
  );

  readonly clientAppCount = computed(
    () =>
      (this.data()?.llm?.byAppId || []).filter(
        (r) => String(r.key || '').trim() && r.key !== '(unknown)',
      ).length,
  );

  protected spendChart = {
    chart: {
      animations: { enabled: false },
      fontFamily: 'inherit',
      foreColor: 'inherit',
      height: '100%',
      type: 'area',
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
    } as ApexChart,
    colors: ['#38bdf8', '#f59e0b'],
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
    tooltip: {
      shared: true,
      x: { format: 'MMM dd' },
    } as ApexTooltip,
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
      axisBorder: { show: false },
      tooltip: { enabled: false },
    } as ApexXAxis,
    yaxis: {
      labels: {
        formatter: (v: number) =>
          Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)),
      },
    } as ApexYAxis,
  };

  ngOnInit() {
    this.live.acquire({ feeds: ['llm_usage'], feedIntervalMs: 4000 });
  }

  ngOnDestroy() {
    this.live.release();
  }

  resync() {
    this.live.setFeedParams({});
  }

  llmBlocks(d: LlmUsageResponse): { title: string; rows: LlmUsageRollupRow[] }[] {
    return [
      { title: 'By app', rows: d.llm?.byAppId || [] },
      { title: 'By user', rows: d.llm?.byUserId || [] },
      { title: 'By client IP', rows: d.llm?.byClientIp || [] },
      { title: 'By model', rows: d.llm?.byModel || [] },
    ];
  }
}

function emptyTotals(): LlmSpendTotals {
  return { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function windowCaption(t: LlmSpendTotals, days?: number): string {
  const w = days || 7;
  if (t.from && t.to) {
    const a = new Date(t.from);
    const b = new Date(t.to);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(a)} – ${fmt(b)} · ${w}-day window`;
  }
  return `${w}-day window`;
}

function mapTx(r: LlmUsageEventRow) {
  const ms = (() => {
    const n = Number(r.ts);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    const p = Date.parse(String(r.ts || ''));
    return Number.isFinite(p) ? p : Date.now();
  })();
  const app =
    String(r.appId || '').trim() ||
    String(r.userName || r.userId || '').trim() ||
    '(unknown)';
  return {
    whenMs: ms,
    app,
    model: String(r.model || r.source || '—'),
    tokens: Number(r.totalTokens) || 0,
    status: r.ok === false ? 'failed' : 'succeeded',
  };
}

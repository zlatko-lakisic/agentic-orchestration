import { DecimalPipe, NgClass } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AoClock } from '@/app/core/ao-time/ao-time';
import {
  AoAbsoluteTimePipe,
  AoTimeAgoPipe,
} from '@/app/core/ao-time/ao-time-ago.pipe';
import {
  LlmSpendTotals,
  LlmUsageEventRow,
  LlmUsageResponse,
  LlmUsageRollupRow,
} from '@/app/core/ao-api/types';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

type PanelView = 'diagram' | 'table';

type SpendRangeId = '6h' | '1d' | '7d' | '15d' | '30d';

const SPEND_RANGES: ReadonlyArray<{ id: SpendRangeId; label: string; hours: number }> = [
  { id: '6h', label: '6 hours', hours: 6 },
  { id: '1d', label: '1 day', hours: 24 },
  { id: '7d', label: '7 days', hours: 7 * 24 },
  { id: '15d', label: '15 days', hours: 15 * 24 },
  { id: '30d', label: '30 days', hours: 30 * 24 },
];

type PieSlice = { series: ApexNonAxisChartSeries; labels: string[] };

const PIE_COLORS = [
  '#38bdf8',
  '#f59e0b',
  '#34d399',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
  '#f472b6',
  '#94a3b8',
];

/** Collapse long tails into an Other slice for readable Fuse-style donuts. */
function pieFromRows(
  rows: LlmUsageRollupRow[],
  maxSlices = 7,
): PieSlice {
  const sorted = [...(rows || [])]
    .map((r) => ({
      key: String(r.key || '(unknown)'),
      total: Number(r.totalTokens) || 0,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  if (!sorted.length) return { series: [], labels: [] };
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const labels = top.map((r) => r.key);
  const series: number[] = top.map((r) => r.total);
  if (rest.length) {
    labels.push('Other');
    series.push(rest.reduce((n, r) => n + r.total, 0));
  }
  return { series, labels };
}

/**
 * Token usage — Fuse Finance dashboard pattern:
 * statement cards, spend-over-time area chart, recent transactions, budget split.
 */
@Component({
  selector: 'ao-llm-usage-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatDivider,
    MatProgressBarModule,
    MatTableModule,
    DecimalPipe,
    NgClass,
    ChartComponent,
    AoTimeAgoPipe,
    AoAbsoluteTimePipe,
    ErrorState,
    LoadingState,
    StatusChip,
  ],
  styles: `
    /* Full card width; slightly taller than wide so the bottom legend does not
       shrink the donut diameter below 100% of the container width. */
    :host ::ng-deep .ao-donut-host {
      display: block;
      width: 100%;
      max-width: 100%;
      aspect-ratio: 1 / 1.18;
      min-height: 14rem;
    }
    :host ::ng-deep .ao-donut-host > apx-chart {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
    :host ::ng-deep .ao-donut-host .apexcharts-canvas,
    :host ::ng-deep .ao-donut-host .apexcharts-svg {
      width: 100% !important;
      max-width: 100%;
    }
  `,
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
            All local clients on this install · live WebSocket every
            {{ feedSeconds() }}s
            @if (clientAppCount() > 0) {
              <span>· {{ clientAppCount() }} app{{ clientAppCount() === 1 ? '' : 's' }}</span>
            }
            @if (live.connected()) {
              <span class="text-green-600">· connected</span>
            } @else {
              <span class="text-amber-600">· reconnecting…</span>
            }
            @if (updatedAgo()) {
              <span>· updated {{ updatedAgo() }}</span>
            }
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <mat-button-toggle-group
            [value]="spendRange()"
            (change)="setSpendRange($event.value)"
            class="!h-9"
            hideSingleSelectionIndicator
          >
            @for (r of spendRanges; track r.id) {
              <mat-button-toggle [value]="r.id">{{ r.label }}</mat-button-toggle>
            }
          </mat-button-toggle-group>
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
                @switch (d.spend?.granularity) {
                  @case ('15m') {
                    Prompt + completion · 15-minute buckets
                  }
                  @case ('1h') {
                    Prompt + completion · hourly buckets
                  }
                  @default {
                    Prompt + completion · daily buckets
                  }
                }
                @if (rangeLabel(); as label) {
                  · {{ label }} window
                }
              </div>
            </div>
            <div class="mt-3 flex shrink-0 gap-6 sm:mt-0">
              <div>
                <div class="text-sm font-medium text-neutral-500">
                  Period growth
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
                [tooltip]="spendTooltip()"
                [xaxis]="spendXaxis()"
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
              @if (txDataSource.data.length) {
                <table mat-table [dataSource]="txDataSource" class="w-full">
                  <ng-container matColumnDef="when">
                    <th mat-header-cell *matHeaderCellDef>When</th>
                    <td
                      mat-cell
                      *matCellDef="let r"
                      class="whitespace-nowrap text-sm"
                      [attr.title]="r.whenMs | aoAbsoluteTime"
                    >
                      @if (r.runId) {
                        <a
                          class="text-primary-700 underline-offset-2 hover:underline dark:text-primary-400"
                          [routerLink]="['/traces']"
                          [queryParams]="{ runId: r.runId }"
                          >{{ r.whenMs | aoTimeAgo: clock.nowMs() }}</a
                        >
                      } @else {
                        {{ r.whenMs | aoTimeAgo: clock.nowMs() }}
                      }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="app">
                    <th mat-header-cell *matHeaderCellDef>App / user</th>
                    <td mat-cell *matCellDef="let r" class="font-mono text-sm">
                      <div>{{ r.app }}</div>
                      @if (r.runId) {
                        <a
                          class="text-2xs text-primary-700 underline-offset-2 hover:underline dark:text-primary-400"
                          [routerLink]="['/traces']"
                          [queryParams]="{ runId: r.runId }"
                          >run {{ r.runId }}</a
                        >
                      }
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
              <div class="flex w-full flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-medium tracking-tight">Composition</div>
                  <div class="text-sm text-neutral-500">
                    Lifetime token mix and API request volume
                  </div>
                </div>
                <mat-button-toggle-group
                  [value]="panelView('composition')"
                  (change)="setPanelView('composition', $event.value)"
                  class="!h-8"
                  hideSingleSelectionIndicator
                >
                  <mat-button-toggle value="diagram">Diagram</mat-button-toggle>
                  <mat-button-toggle value="table">Table</mat-button-toggle>
                </mat-button-toggle-group>
              </div>
            </mat-card-header>
            <mat-card-content class="mt-4 flex flex-col gap-5">
              @if (panelView('composition') === 'diagram') {
                @if (compositionPie().series.length) {
                  <div class="ao-donut-host w-full px-2">
                    <apx-chart
                      class="h-full w-full"
                      [series]="compositionPie().series"
                      [chart]="donutChart.chart"
                      [colors]="donutChart.colors"
                      [dataLabels]="donutChart.dataLabels"
                      [labels]="compositionPie().labels"
                      [legend]="donutChart.legend"
                      [plotOptions]="donutChart.plotOptions"
                      [responsive]="donutChart.responsive"
                      [stroke]="donutChart.stroke"
                      [tooltip]="donutChart.tooltip"
                    />
                  </div>
                } @else {
                  <div class="px-2 pb-2 text-sm text-neutral-500">
                    No token mix yet.
                  </div>
                }
                @if (apiRequestCount() > 0) {
                  <div class="text-sm text-neutral-500">
                    API requests (Access ledger):
                    <span
                      class="font-medium tabular-nums text-neutral-700 dark:text-neutral-300"
                      >{{ apiRequestCount() | number }}</span
                    >
                  </div>
                }
              } @else {
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
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Rollup breakdowns: donut or table — 1 col → 2×2 → 1×4 on desktop -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (block of llmBlocks(); track block.id) {
            <mat-card appearance="outlined" class="overflow-hidden">
              <mat-card-header>
                <div class="flex w-full flex-wrap items-center justify-between gap-3">
                  <div class="text-lg font-medium tracking-tight">
                    {{ block.title }}
                  </div>
                  <mat-button-toggle-group
                    [value]="panelView(block.id)"
                    (change)="setPanelView(block.id, $event.value)"
                    class="!h-8"
                    hideSingleSelectionIndicator
                  >
                    <mat-button-toggle value="diagram">Diagram</mat-button-toggle>
                    <mat-button-toggle value="table">Table</mat-button-toggle>
                  </mat-button-toggle-group>
                </div>
              </mat-card-header>
              <mat-card-content class="mt-2 px-0 pb-0">
                @if (!block.rows.length) {
                  <div class="px-6 pb-6 text-sm text-neutral-500">
                    No rows yet.
                  </div>
                } @else if (panelView(block.id) === 'diagram') {
                  <div class="ao-donut-host w-full px-2 pb-4 pt-2">
                    <apx-chart
                      class="h-full w-full"
                      [series]="block.pie.series"
                      [chart]="donutChart.chart"
                      [colors]="donutChart.colors"
                      [dataLabels]="donutChart.dataLabels"
                      [labels]="block.pie.labels"
                      [legend]="donutChart.legend"
                      [plotOptions]="donutChart.plotOptions"
                      [responsive]="donutChart.responsive"
                      [stroke]="donutChart.stroke"
                      [tooltip]="donutChart.tooltip"
                    />
                  </div>
                } @else {
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
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      } @else if (!error()) {
        <ao-loading-state
          title="Loading token usage"
          message="Connecting to the live usage feed…"
        />
      }
    </div>
  `,
})
export class LlmUsagePage implements OnInit, OnDestroy {
  readonly live = inject(AoLiveWs);
  readonly clock = inject(AoClock);
  readonly llmCols = ['key', 'calls', 'total'];
  readonly txCols = ['when', 'app', 'model', 'tokens', 'status'];
  readonly feedSeconds = signal(2);
  readonly spendRanges = SPEND_RANGES;
  /** Rolling spend window (default past 6 hours). */
  readonly spendRange = signal<SpendRangeId>('6h');
  /** Per-panel Diagram / Table preference (defaults to diagram). */
  private readonly panelViews = signal<Record<string, PanelView>>({});
  readonly txDataSource = new MatTableDataSource<ReturnType<typeof mapTx>>([]);

  readonly data = computed(
    () =>
      (this.live.feeds()['llm_usage'] as LlmUsageResponse | undefined) || null,
  );
  readonly error = computed(() => {
    const e =
      this.live.feedErrors()['llm_usage'] || this.live.feedErrors()['_'];
    return e || null;
  });

  readonly updatedAgo = computed(() => {
    const iso = this.data()?.generatedAt;
    if (!iso) return null;
    const t = Date.parse(String(iso));
    if (!Number.isFinite(t)) return null;
    const sec = Math.max(0, Math.round((this.clock.nowMs() - t) / 1000));
    if (sec < 2) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    return `${min}m ago`;
  });

  readonly statements = computed(() => {
    const d = this.data();
    const prev = d?.spend?.previous || emptyTotals();
    const cur = d?.spend?.current || emptyTotals();
    const growth = d?.spend?.growthPct?.totalTokens;
    const hours = d?.spend?.windowHours ?? this.rangeHours();
    return [
      {
        id: 'previous',
        title: 'Previous period',
        caption: windowCaption(prev, hours),
        icon: 'calendar',
        totals: prev,
        growthPct: null as number | null,
      },
      {
        id: 'current',
        title: 'Current period',
        caption: windowCaption(cur, hours),
        icon: 'wallet',
        totals: cur,
        growthPct: growth ?? null,
      },
    ];
  });

  readonly rangeLabel = computed(() => {
    const id = (this.data()?.spend?.window || this.spendRange()) as SpendRangeId;
    return SPEND_RANGES.find((r) => r.id === id)?.label || id;
  });

  readonly rangeHours = computed(() => {
    const id = this.spendRange();
    return SPEND_RANGES.find((r) => r.id === id)?.hours ?? 6;
  });

  readonly chartSeries = computed((): ApexAxisChartSeries => {
    const timeline = this.data()?.spend?.timeline || [];
    if (!timeline.length) return [];
    // Running totals within the selected window.
    let promptRun = 0;
    let completionRun = 0;
    const prompt: { x: number; y: number }[] = [];
    const completion: { x: number; y: number }[] = [];
    for (const d of timeline) {
      promptRun += d.promptTokens || 0;
      completionRun += d.completionTokens || 0;
      prompt.push({ x: d.ts, y: promptRun });
      completion.push({ x: d.ts, y: completionRun });
    }
    return [
      { name: 'Prompt', data: prompt },
      { name: 'Completion', data: completion },
    ];
  });

  readonly spendTooltip = computed(
    (): ApexTooltip => ({
      shared: true,
      x: {
        format:
          (this.data()?.spend?.granularity || '1d') === '1d'
            ? 'MMM dd'
            : 'MMM dd HH:mm',
      },
    }),
  );

  readonly spendXaxis = computed(
    (): ApexXAxis => ({
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format:
          (this.data()?.spend?.granularity || '1d') === '1d'
            ? 'MMM dd'
            : 'HH:mm',
        style: { colors: 'var(--mat-sys-on-surface)' },
      },
      axisBorder: { show: false },
      tooltip: { enabled: false },
    }),
  );

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

  readonly apiRequestCount = computed(() =>
    (this.data()?.api?.byAppId || []).reduce(
      (n, r) => n + (r.calls || 0),
      0,
    ),
  );

  readonly compositionPie = computed((): PieSlice => {
    const g = this.data()?.llm?.grandTotal;
    const prompt = Number(g?.promptTokens) || 0;
    const completion = Number(g?.completionTokens) || 0;
    const labels: string[] = [];
    const series: number[] = [];
    if (prompt > 0) {
      labels.push('Prompt');
      series.push(prompt);
    }
    if (completion > 0) {
      labels.push('Completion');
      series.push(completion);
    }
    return { series, labels };
  });

  readonly clientAppCount = computed(
    () =>
      (this.data()?.llm?.byAppId || []).filter(
        (r) => String(r.key || '').trim() && r.key !== '(unknown)',
      ).length,
  );

  readonly llmBlocks = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      {
        id: 'byApp',
        title: 'By app',
        rows: d.llm?.byAppId || [],
        pie: pieFromRows(d.llm?.byAppId || []),
      },
      {
        id: 'byUser',
        title: 'By user',
        rows: d.llm?.byUserId || [],
        pie: pieFromRows(d.llm?.byUserId || []),
      },
      {
        id: 'byClientIp',
        title: 'By client IP',
        rows: d.llm?.byClientIp || [],
        pie: pieFromRows(d.llm?.byClientIp || []),
      },
      {
        id: 'byModel',
        title: 'By model',
        rows: d.llm?.byModel || [],
        pie: pieFromRows(d.llm?.byModel || []),
      },
    ];
  });

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

  /** Fuse-style donut for composition + rollup breakdowns. */
  protected donutChart = {
    chart: {
      animations: { enabled: false },
      fontFamily: 'inherit',
      foreColor: 'var(--mat-sys-on-surface)',
      height: '100%',
      width: '100%',
      type: 'donut',
      toolbar: { show: false },
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
    } as ApexChart,
    colors: PIE_COLORS,
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: {
        fontSize: '12px',
        colors: ['var(--mat-sys-on-surface)'],
      },
      dropShadow: { enabled: false },
    } as ApexDataLabels,
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '12px',
      labels: { colors: 'var(--mat-sys-on-surface)' },
      itemMargin: { horizontal: 8, vertical: 2 },
    } as ApexLegend,
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '58%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '13px',
              offsetY: -4,
              color: 'var(--mat-sys-on-surface)',
            },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--mat-sys-on-surface)',
              formatter: (v: string) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return v;
                return Math.abs(n) >= 1000
                  ? `${(n / 1000).toFixed(1)}k`
                  : String(Math.round(n));
              },
            },
            total: {
              show: true,
              label: 'Tokens',
              fontSize: '13px',
              color: 'var(--mat-sys-on-surface)',
              formatter: (w: {
                globals: { seriesTotals: number[] };
              }) => {
                const sum = (w.globals.seriesTotals || []).reduce(
                  (a, b) => a + b,
                  0,
                );
                return Math.abs(sum) >= 1000
                  ? `${(sum / 1000).toFixed(1)}k`
                  : String(Math.round(sum));
              },
            },
          },
        },
      },
    } as ApexPlotOptions,
    responsive: [
      {
        breakpoint: 768,
        options: {
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  name: { fontSize: '11px' },
                  value: { fontSize: '16px' },
                  total: { fontSize: '11px' },
                },
              },
            },
          },
          dataLabels: { style: { fontSize: '10px' } },
        },
      },
      {
        breakpoint: 480,
        options: {
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  name: { fontSize: '10px' },
                  value: { fontSize: '14px' },
                  total: { fontSize: '10px' },
                },
              },
            },
          },
          dataLabels: { style: { fontSize: '9px' } },
        },
      },
    ] as ApexResponsive[],
    stroke: { width: 0 } as ApexStroke,
    tooltip: {
      y: {
        formatter: (v: number) =>
          `${Number(v || 0).toLocaleString()} tokens`,
      },
    } as ApexTooltip,
  };

  constructor() {
    effect(() => {
      this.txDataSource.data = this.transactions();
    });
  }

  panelView(id: string): PanelView {
    return this.panelViews()[id] || 'diagram';
  }

  setPanelView(id: string, value: PanelView | string | null | undefined) {
    const mode: PanelView = value === 'table' ? 'table' : 'diagram';
    this.panelViews.update((prev) => ({ ...prev, [id]: mode }));
  }

  setSpendRange(value: SpendRangeId | string | null | undefined) {
    const id = (SPEND_RANGES.find((r) => r.id === value)?.id ||
      '6h') as SpendRangeId;
    this.spendRange.set(id);
    this.live.setFeedParams({ llm_usage: { window: id, limit: 200 } });
  }

  private feedParams() {
    return { llm_usage: { window: this.spendRange(), limit: 200 } };
  }

  ngOnInit() {
    this.live.acquire({
      feeds: ['llm_usage'],
      feedIntervalMs: 2000,
      feedParams: this.feedParams(),
    });
  }

  ngOnDestroy() {
    this.live.release();
  }

  resync() {
    this.live.setFeedParams(this.feedParams());
    this.live.refreshFeeds();
  }
}

function emptyTotals(): LlmSpendTotals {
  return { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function windowCaption(t: LlmSpendTotals, hours?: number): string {
  const h = Math.max(1, Number(hours) || 6);
  if (t.from && t.to) {
    const a = new Date(t.from);
    const b = new Date(t.to);
    if (Number.isFinite(a.getTime()) && Number.isFinite(b.getTime())) {
      const sameDay = a.toDateString() === b.toDateString();
      if (h <= 24) {
        const opts: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };
        return `${a.toLocaleString(undefined, opts)} – ${b.toLocaleString(undefined, sameDay ? { hour: '2-digit', minute: '2-digit' } : opts)}`;
      }
      return `${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
  }
  if (h < 24) return `Rolling ${h}h`;
  if (h % 24 === 0) {
    const days = h / 24;
    return `Rolling ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Rolling ${h}h`;
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
  const runId = String(r.runId || '').trim() || null;
  return {
    whenMs: ms,
    runId,
    app,
    model: String(r.model || r.source || '—'),
    tokens: Number(r.totalTokens) || 0,
    status: r.ok === false ? 'failed' : 'succeeded',
  };
}

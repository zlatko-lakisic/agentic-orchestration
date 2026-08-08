import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { TopologyNodeDetail } from '../data/topology.types';
import { helpForNode, TOPOLOGY_WIKI_PAGE } from '../data/topology.help';
import { themeForKind } from '../data/topology.theme';

export type NodeDetailDialogData = {
  nodeId: string;
  offlineBanner?: string | null;
};

type Pt = { x: number; y: number | null };

@Component({
  selector: 'ao-node-detail-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    RouterLink,
    NgApexchartsModule,
    EnvHelp,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <span
        class="inline-block h-2.5 w-2.5 rounded-full"
        [style.background]="accent()"
      ></span>
      <span class="flex-auto">{{ detail()?.node?.label || data.nodeId }}</span>
      @if (wikiHelp(); as h) {
        <ao-env-help
          [key]="h.wikiKey"
          [help]="h.blurb"
          [wikiPage]="wikiPage"
        />
      }
    </h2>
    <mat-dialog-content class="min-w-[340px] max-w-lg">
      @if (data.offlineBanner) {
        <div
          class="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          {{ data.offlineBanner }}
        </div>
      }
      @if (loading()) {
        <p class="text-sm text-neutral-500">Loading…</p>
      } @else if (error(); as err) {
        <p class="text-sm text-red-600">{{ err }}</p>
      } @else if (detail(); as d) {
        <mat-tab-group (selectedIndexChange)="onTab($event)">
          <mat-tab label="Health">
            <div class="flex flex-col gap-3 py-3 text-sm">
              <div>
                Status:
                <strong>{{ liveStatus() || d.node.status }}</strong>
                @if (!d.probe?.instrumented) {
                  <span class="text-neutral-500"> · not instrumented</span>
                }
              </div>
              @if (d.probe?.statusReason || d.node.statusReason) {
                <div class="text-neutral-500">
                  {{ d.probe?.statusReason || d.node.statusReason }}
                </div>
              }
              <div class="text-neutral-500">
                Last probe: {{ d.probe?.lastProbeAt || '—' }}
                @if (latestLatency() != null) {
                  · RTT {{ latestLatency() }} ms
                }
              </div>
              <div
                class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 pt-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div class="mb-1 px-1 text-xs text-neutral-500">
                  Health monitor (probe latency)
                </div>
                @if (healthSeries().length) {
                  <apx-chart
                    [series]="healthChartSeries()"
                    [chart]="sparkChart"
                    [colors]="[accent()]"
                    [stroke]="sparkStroke"
                    [fill]="sparkFill"
                    [tooltip]="sparkTooltip"
                    [xaxis]="sparkXaxis"
                    [yaxis]="sparkYaxis"
                    [dataLabels]="noDataLabels"
                    [grid]="sparkGrid"
                  ></apx-chart>
                } @else {
                  <div class="px-2 pb-3 text-xs text-neutral-500">
                    Waiting for live probe samples…
                  </div>
                }
              </div>
              @if (d.members) {
                <div>
                  Cluster members: {{ d.members.count }}
                  <span class="text-neutral-500"> — {{ d.members.note }}</span>
                </div>
              }
            </div>
          </mat-tab>
          <mat-tab label="Traffic">
            <div class="flex flex-col gap-3 py-3 text-sm">
              @if (!trafficActive()) {
                <div class="text-neutral-500">Open this tab for live traffic.</div>
              } @else if (!trafficInstrumented()) {
                <div
                  class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <strong>no data</strong> — related edges are not instrumented.
                  Inbound {{ d.inbound.length }} · Outbound {{ d.outbound.length }}.
                </div>
              } @else {
                <div
                  class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 pt-2 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div class="mb-1 px-1 text-xs text-neutral-500">
                    Live rate (events/s) · websocket
                  </div>
                  <apx-chart
                    [series]="trafficRateSeries()"
                    [chart]="sparkChart"
                    [colors]="[accent()]"
                    [stroke]="sparkStroke"
                    [fill]="sparkFill"
                    [tooltip]="sparkTooltip"
                    [xaxis]="sparkXaxis"
                    [yaxis]="sparkYaxis"
                    [dataLabels]="noDataLabels"
                    [grid]="sparkGrid"
                  ></apx-chart>
                </div>
                <div
                  class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 pt-2 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div class="mb-1 px-1 text-xs text-neutral-500">
                    Latency p95 (ms)
                  </div>
                  <apx-chart
                    [series]="trafficLatencySeries()"
                    [chart]="sparkChart"
                    [colors]="['#ea580c']"
                    [stroke]="sparkStroke"
                    [fill]="sparkFill"
                    [tooltip]="sparkTooltip"
                    [xaxis]="sparkXaxis"
                    [yaxis]="sparkYaxis"
                    [dataLabels]="noDataLabels"
                    [grid]="sparkGrid"
                  ></apx-chart>
                </div>
              }
              <div>Inbound: {{ d.inbound.length }} · Outbound: {{ d.outbound.length }}</div>
              <ul class="font-mono text-xs">
                @for (e of d.outbound; track e.id) {
                  <li>{{ e.id }} · {{ e.kind }}</li>
                }
              </ul>
            </div>
          </mat-tab>
          <mat-tab label="Config">
            <div class="flex flex-col gap-2 py-3 text-sm">
              @if (d.configKeys?.length) {
                <ul class="font-mono text-xs">
                  @for (k of d.configKeys; track k) {
                    <li>{{ k }}</li>
                  }
                </ul>
                <a matButton routerLink="/settings" [mat-dialog-close]="true">
                  Open All settings
                </a>
              } @else {
                <span class="text-neutral-500">No linked config keys</span>
              }
            </div>
          </mat-tab>
          <mat-tab label="Logs">
            <div class="flex flex-col gap-2 py-3 text-sm">
              <div>
                Log source:
                <code>{{ d.logSource || 'web' }}</code>
              </div>
              <a matButton routerLink="/overview" [mat-dialog-close]="true">
                Open Overview logs
              </a>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
})
export class NodeDetailDialog implements OnInit, OnDestroy {
  readonly data = inject<NodeDetailDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<NodeDetailDialog>);
  private readonly api = inject(AoApi);
  private readonly live = inject(AoLiveWs);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<TopologyNodeDetail | null>(null);
  readonly liveStatus = signal<string | null>(null);
  readonly healthSeries = signal<Pt[]>([]);
  readonly trafficRate = signal<Pt[]>([]);
  readonly trafficLatency = signal<Pt[]>([]);
  readonly trafficActive = signal(false);
  readonly trafficInstrumented = signal(false);

  readonly wikiPage = TOPOLOGY_WIKI_PAGE;

  readonly accent = computed(() => {
    const n = this.detail()?.node;
    return themeForKind(n?.kind || 'engine', n?.band).accent;
  });

  readonly wikiHelp = computed(() => {
    const n = this.detail()?.node;
    if (n) return helpForNode(n);
    return helpForNode({ id: this.data.nodeId, kind: 'endpoint' });
  });

  readonly latestLatency = computed(() => {
    const pts = this.healthSeries();
    const last = pts.length ? pts[pts.length - 1] : null;
    return last?.y == null ? null : Math.round(Number(last.y));
  });

  readonly sparkChart: ApexChart = {
    type: 'area',
    height: 120,
    animations: { enabled: false },
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'inherit',
    foreColor: 'inherit',
  };
  readonly sparkStroke: ApexStroke = { curve: 'smooth', width: 2 };
  readonly sparkFill: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.4, opacityFrom: 0.35, opacityTo: 0.05 },
  };
  readonly sparkTooltip: ApexTooltip = { x: { format: 'HH:mm:ss' } };
  readonly sparkXaxis: ApexXAxis = {
    type: 'datetime',
    labels: { datetimeUTC: false, style: { fontSize: '10px' } },
    axisBorder: { show: false },
  };
  readonly sparkYaxis: ApexYAxis = {
    labels: { style: { fontSize: '10px' } },
    min: 0,
  };
  readonly sparkGrid: ApexGrid = {
    borderColor: 'rgba(148, 163, 184, 0.2)',
    strokeDashArray: 3,
    padding: { left: 4, right: 4 },
  };
  readonly noDataLabels: ApexDataLabels = { enabled: false };

  private sub: Subscription | null = null;
  private watching = false;
  private trafficWatch = false;

  ngOnInit() {
    this.api.topologyNode(this.data.nodeId).subscribe((r) => {
      this.loading.set(false);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.detail.set(r.data);
    });

    // Health monitor stream for this card
    this.live.subscribeTopologyWatch('node', this.data.nodeId);
    this.watching = true;
    this.sub = this.live.topologyEvents.subscribe((ev) => {
      if (
        (ev.type === 'topology_watch_snapshot' ||
          ev.type === 'topology_watch_tick') &&
        ev['target'] === 'node' &&
        ev['id'] === this.data.nodeId
      ) {
        this.applyWatch(ev);
      }
    });

    this.ref.afterClosed().subscribe(() => this.teardown());
  }

  ngOnDestroy() {
    this.teardown();
  }

  onTab(index: number) {
    // 0 health, 1 traffic, …
    if (index === 1) {
      this.trafficActive.set(true);
      this.trafficWatch = true;
    } else if (this.trafficWatch) {
      this.trafficActive.set(false);
    }
  }

  healthChartSeries(): ApexAxisChartSeries {
    return [{ name: 'latency ms', data: this.healthSeries() as { x: number; y: number }[] }];
  }

  trafficRateSeries(): ApexAxisChartSeries {
    return [{ name: 'rate', data: this.trafficRate() as { x: number; y: number }[] }];
  }

  trafficLatencySeries(): ApexAxisChartSeries {
    return [
      {
        name: 'p95 ms',
        data: this.trafficLatency() as { x: number; y: number }[],
      },
    ];
  }

  private applyWatch(ev: Record<string, unknown>) {
    const latest = ev['latest'] as { status?: string; latencyMs?: number } | null;
    if (latest?.status) this.liveStatus.set(String(latest.status));

    const health = (ev['health'] as Pt[]) || [];
    if (health.length) this.healthSeries.set(health);

    const series = ev['series'] as
      | { rate?: Pt[]; latencyP95?: Pt[]; latencyMs?: Pt[] }
      | undefined;
    if (series?.latencyMs?.length && !health.length) {
      this.healthSeries.set(series.latencyMs);
    }
    const rate = series?.rate || [];
    const lat = series?.latencyP95 || [];
    this.trafficRate.set(rate);
    this.trafficLatency.set(lat);
    this.trafficInstrumented.set(
      Boolean(ev['instrumented']) && (rate.length > 0 || lat.length > 0)
    );
  }

  private teardown() {
    this.sub?.unsubscribe();
    this.sub = null;
    if (this.watching) {
      this.live.unsubscribeTopologyWatch('node', this.data.nodeId);
      this.watching = false;
    }
  }
}

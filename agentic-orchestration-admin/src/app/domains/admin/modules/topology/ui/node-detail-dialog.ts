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
import { TopologyAppMembers, TopologyNodeDetail } from '../data/topology.types';
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
              @if (ownerLabel(d); as owners) {
                <div
                  class="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100"
                >
                  <span class="text-xs uppercase tracking-wide text-teal-700 dark:text-teal-300"
                    >Owned by app</span
                  >
                  <div class="mt-0.5 font-medium">{{ owners }}</div>
                </div>
              }
              @if (appMembers(d); as groups) {
                <div class="flex flex-col gap-2">
                  <div class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Reach overlays by app
                  </div>
                  @for (group of groups; track group.appId) {
                    <div
                      class="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                    >
                      <div class="flex items-baseline justify-between gap-2">
                        <span class="font-medium text-teal-800 dark:text-teal-200">{{
                          group.appId
                        }}</span>
                        <span class="text-xs text-neutral-500">
                          {{ group.ids.length }} id{{
                            group.ids.length === 1 ? '' : 's'
                          }}
                        </span>
                      </div>
                      <ul
                        class="mt-1 space-y-0.5 font-mono text-xs text-neutral-600 dark:text-neutral-300"
                      >
                        @for (id of group.ids; track id) {
                          <li>{{ id }}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              }
              @if (d.clientIps?.length) {
                <div class="flex flex-col gap-2">
                  <div class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Connecting IPs
                  </div>
                  <div
                    class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950"
                  >
                    <ul class="space-y-1 font-mono text-xs text-sky-950 dark:text-sky-100">
                      @for (c of d.clientIps; track c.ip) {
                        <li class="flex items-baseline justify-between gap-3">
                          <span>{{ c.ip }}</span>
                          <span class="text-[10px] text-sky-700 dark:text-sky-300">
                            @if (c.count != null) {
                              ×{{ c.count }}
                            }
                            @if (c.lastSeenAt) {
                              · {{ c.lastSeenAt }}
                            }
                          </span>
                        </li>
                      }
                    </ul>
                  </div>
                </div>
              }
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
              @if (k8sPods(d); as pods) {
                <div class="flex flex-col gap-2">
                  <div
                    class="text-xs font-medium uppercase tracking-wide text-neutral-500"
                  >
                    Pods
                  </div>
                  <div
                    class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
                  >
                    <table class="w-full text-left text-xs">
                      <thead class="bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
                        <tr>
                          <th class="px-2 py-1.5 font-medium">Name</th>
                          <th class="px-2 py-1.5 font-medium">Phase</th>
                          <th class="px-2 py-1.5 font-medium">Ready</th>
                          <th class="px-2 py-1.5 font-medium">Restarts</th>
                          <th class="px-2 py-1.5 font-medium">Node</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (p of pods; track p.name) {
                          <tr
                            class="border-t border-neutral-100 dark:border-neutral-800"
                          >
                            <td class="px-2 py-1.5 font-mono">{{ p.name }}</td>
                            <td class="px-2 py-1.5">{{ p.phase }}</td>
                            <td class="px-2 py-1.5">
                              {{ p.ready ? 'yes' : 'no' }}
                            </td>
                            <td class="px-2 py-1.5">{{ p.restarts }}</td>
                            <td class="px-2 py-1.5 text-neutral-500">
                              {{ p.nodeName || '—' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
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

  ownerLabel(d: TopologyNodeDetail): string | null {
    // Only Application injection children (Client UI / Domain overlays / Local tools).
    // Reach and AO core nodes (bridge, mTLS enroller, planner, …) are shared platform surface.
    const injectionKinds = new Set(['ui', 'overlay-source', 'local-tools']);
    if (d.node.band !== 'application' || !injectionKinds.has(d.node.kind)) {
      return null;
    }
    const apps =
      d.ownedByApps?.length
        ? d.ownedByApps
        : d.node.ownedByApps?.length
          ? d.node.ownedByApps
          : d.node.appId
            ? [d.node.appId]
            : [];
    return apps.length ? apps.join(', ') : null;
  }

  appMembers(d: TopologyNodeDetail): TopologyAppMembers[] | null {
    const groups = d.appMembers?.length
      ? d.appMembers
      : d.node.appMembers?.length
        ? d.node.appMembers
        : [];
    return groups.length ? groups : null;
  }

  k8sPods(
    d: TopologyNodeDetail
  ): NonNullable<NonNullable<TopologyNodeDetail['k8sResource']>['pods']> | null {
    const fromMembers = (
      d.members as { pods?: NonNullable<TopologyNodeDetail['k8sResource']>['pods'] } | null
    )?.pods;
    const pods =
      fromMembers?.length
        ? fromMembers
        : d.k8sResource?.pods?.length
          ? d.k8sResource.pods
          : d.node.k8sResource?.pods?.length
            ? d.node.k8sResource.pods
            : null;
    return pods?.length ? pods : null;
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

import { __decorate } from "tslib";
import { Component, inject, signal, } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { NgApexchartsModule, } from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { helpForEdge, TOPOLOGY_WIKI_PAGE } from '../data/topology.help';
let EdgeDetailDialog = class EdgeDetailDialog {
    data = inject(MAT_DIALOG_DATA);
    ref = inject((MatDialogRef));
    live = inject(AoLiveWs);
    wikiPage = TOPOLOGY_WIKI_PAGE;
    wikiHelp = helpForEdge(this.data.edge);
    instrumented = signal(Boolean(this.data.edge.instrumented));
    liveStatus = signal(null);
    latest = signal(null);
    ratePts = signal([]);
    latencyPts = signal([]);
    trafficActive = signal(false);
    sparkChart = {
        type: 'area',
        height: 120,
        animations: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'inherit',
        foreColor: 'inherit',
    };
    sparkStroke = { curve: 'smooth', width: 2 };
    sparkFill = {
        type: 'gradient',
        gradient: { shadeIntensity: 0.4, opacityFrom: 0.35, opacityTo: 0.05 },
    };
    sparkTooltip = { x: { format: 'HH:mm:ss' } };
    sparkXaxis = {
        type: 'datetime',
        labels: { datetimeUTC: false, style: { fontSize: '10px' } },
        axisBorder: { show: false },
    };
    sparkYaxis = {
        labels: { style: { fontSize: '10px' } },
        min: 0,
    };
    sparkGrid = {
        borderColor: 'rgba(148, 163, 184, 0.2)',
        strokeDashArray: 3,
        padding: { left: 4, right: 4 },
    };
    noDataLabels = { enabled: false };
    sub = null;
    watching = false;
    ngOnInit() {
        this.live.subscribeTopologyWatch('edge', this.data.edge.id);
        this.watching = true;
        this.sub = this.live.topologyEvents.subscribe((ev) => {
            if ((ev.type === 'topology_watch_snapshot' ||
                ev.type === 'topology_watch_tick') &&
                ev['target'] === 'edge' &&
                ev['id'] === this.data.edge.id) {
                this.applyWatch(ev);
            }
        });
        this.ref.afterClosed().subscribe(() => this.teardown());
    }
    ngOnDestroy() {
        this.teardown();
    }
    onTab(index) {
        this.trafficActive.set(index === 1);
    }
    rateSeries() {
        return [{ name: 'rate', data: this.ratePts() }];
    }
    latencySeries() {
        return [
            { name: 'p95 ms', data: this.latencyPts() },
        ];
    }
    applyWatch(ev) {
        this.instrumented.set(Boolean(ev['instrumented']));
        const latest = ev['latest'];
        this.latest.set(latest);
        if (latest?.errorRate != null && latest.errorRate > 0.2) {
            this.liveStatus.set('failing');
        }
        else if (latest) {
            this.liveStatus.set('ok');
        }
        const series = ev['series'];
        if (series?.rate)
            this.ratePts.set(series.rate);
        if (series?.latencyP95)
            this.latencyPts.set(series.latencyP95);
    }
    teardown() {
        this.sub?.unsubscribe();
        this.sub = null;
        if (this.watching) {
            this.live.unsubscribeTopologyWatch('edge', this.data.edge.id);
            this.watching = false;
        }
    }
};
EdgeDetailDialog = __decorate([
    Component({
        selector: 'ao-edge-detail-dialog',
        imports: [
            MatDialogModule,
            MatButtonModule,
            MatTabsModule,
            NgApexchartsModule,
            EnvHelp,
        ],
        template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <span class="flex-auto">Edge</span>
      <ao-env-help
        [key]="wikiHelp.wikiKey"
        [help]="wikiHelp.blurb"
        [wikiPage]="wikiPage"
      />
    </h2>
    <mat-dialog-content class="min-w-[320px] max-w-lg text-sm">
      <div class="font-mono text-xs break-all">{{ data.edge.id }}</div>
      <div class="mt-2">{{ data.edge.from }} → {{ data.edge.to }}</div>
      <div class="mt-1 text-neutral-500">
        kind {{ data.edge.kind }} · {{ data.edge.protocol || '—' }}
        @if (data.edge.port) {
          · :{{ data.edge.port }}
        }
      </div>

      <mat-tab-group class="mt-3" (selectedIndexChange)="onTab($event)">
        <mat-tab label="Health">
          <div class="flex flex-col gap-2 py-3">
            <div>
              Status:
              <strong>{{ liveStatus() || data.edge.status || 'idle' }}</strong>
            </div>
            @if (!instrumented()) {
              <div class="text-neutral-500">
                This edge is not instrumented — health is structural only.
              </div>
            } @else {
              <div class="text-neutral-500">
                @if (latest()?.latencyP95 != null) {
                  Latency p95 {{ latest()?.latencyP95 }} ms
                }
                @if (latest()?.errorRate != null) {
                  · error rate {{ ((latest()?.errorRate || 0) * 100).toFixed(0) }}%
                }
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Traffic">
          <div class="flex flex-col gap-3 py-3">
            @if (!trafficActive()) {
              <div class="text-neutral-500">Open this tab for live traffic.</div>
            } @else if (!instrumented()) {
              <div
                class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <strong>no data</strong> — this edge is not instrumented.
              </div>
            } @else {
              <div
                class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 pt-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div class="mb-1 px-1 text-xs text-neutral-500">
                  Live rate (events/s)
                </div>
                <apx-chart
                  [series]="rateSeries()"
                  [chart]="sparkChart"
                  [colors]="['#2563eb']"
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
                <div class="mb-1 px-1 text-xs text-neutral-500">Latency p95 (ms)</div>
                <apx-chart
                  [series]="latencySeries()"
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
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
    })
], EdgeDetailDialog);
export { EdgeDetailDialog };

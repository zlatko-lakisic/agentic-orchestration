import { __decorate } from "tslib";
import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartComponent, } from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { HostUtilizationDialog } from '@/app/domains/admin/shared/host-utilization/host-utilization-dialog';
/**
 * Compact CPU + GPU sparklines in the admin top bar.
 * One control — click opens the full Overview-style utilization modal.
 */
let HostUtilizationButton = class HostUtilizationButton {
    live = inject(AoLiveWs);
    dialog = inject(MatDialog);
    cpuColors = ['#f59e0b'];
    gpuColors = ['#c084fc'];
    cpuSeries = computed(() => [
        { name: 'CPU', data: this.sparkValues('cpu') },
    ]);
    gpuSeries = computed(() => [
        { name: 'GPU', data: this.sparkValues('gpu') },
    ]);
    sparkChart = {
        chart: {
            animations: { enabled: false, dynamicAnimation: { enabled: false } },
            fontFamily: 'inherit',
            foreColor: 'inherit',
            height: 28,
            width: 56,
            type: 'area',
            sparkline: { enabled: true },
            toolbar: { show: false },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.5,
                opacityFrom: 0.4,
                opacityTo: 0.05,
            },
        },
        stroke: { curve: 'smooth', width: 1.5 },
        tooltip: { enabled: false },
    };
    open() {
        this.dialog.open(HostUtilizationDialog, {
            autoFocus: 'dialog',
            restoreFocus: true,
            width: 'min(72rem, 96vw)',
            maxWidth: '72rem',
            maxHeight: '92vh',
            backdropClass: 'ao-host-util-backdrop',
            panelClass: 'ao-host-util-dialog',
        });
    }
    pct(value) {
        return value == null ? '—' : `${value}%`;
    }
    sparkValues(key) {
        const vals = this.live
            .history()
            .map((h) => h[key])
            .filter((v) => v != null);
        return vals.length ? vals : [0];
    }
};
HostUtilizationButton = __decorate([
    Component({
        selector: 'ao-host-utilization-button',
        imports: [MatTooltipModule, ChartComponent],
        host: { class: 'flex' },
        template: `
    <button
      type="button"
      class="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      matTooltip="Host utilization"
      aria-label="Open host utilization"
      aria-haspopup="dialog"
      (click)="open()"
    >
      <div class="flex min-w-0 items-center gap-1">
        <div class="flex flex-col items-start leading-none">
          <span class="text-[10px] font-medium text-neutral-500">CPU</span>
          <span class="text-xs font-semibold tabular-nums">
            {{ pct(live.latestCpu()) }}
          </span>
        </div>
        <apx-chart
          class="pointer-events-none h-7 w-14"
          [chart]="sparkChart.chart"
          [colors]="cpuColors"
          [fill]="sparkChart.fill"
          [series]="cpuSeries()"
          [stroke]="sparkChart.stroke"
          [tooltip]="sparkChart.tooltip"
        />
      </div>
      <span
        class="h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700"
        aria-hidden="true"
      ></span>
      <div class="flex min-w-0 items-center gap-1">
        <div class="flex flex-col items-start leading-none">
          <span class="text-[10px] font-medium text-neutral-500">GPU</span>
          <span class="text-xs font-semibold tabular-nums">
            {{ pct(live.latestGpu()) }}
          </span>
        </div>
        <apx-chart
          class="pointer-events-none h-7 w-14"
          [chart]="sparkChart.chart"
          [colors]="gpuColors"
          [fill]="sparkChart.fill"
          [series]="gpuSeries()"
          [stroke]="sparkChart.stroke"
          [tooltip]="sparkChart.tooltip"
        />
      </div>
    </button>
  `,
    })
], HostUtilizationButton);
export { HostUtilizationButton };

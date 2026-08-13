import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AoMark } from '@/app/domains/admin/shared/ao-mark/ao-mark';
import { STATUS_MARK_LIST } from '../data/topology.status';
import { KIND_THEMES, themeForBand } from '../data/topology.theme';
let TopologyLegend = class TopologyLegend {
    statuses = STATUS_MARK_LIST;
    bandReach = themeForBand('reach');
    bandAo = themeForBand('ao');
    aspects = Object.values(KIND_THEMES).filter((t, i, arr) => arr.findIndex((x) => x.aspect === t.aspect) === i);
};
TopologyLegend = __decorate([
    Component({
        selector: 'ao-topology-legend',
        imports: [MatMenuModule, MatButtonModule, MatIconModule, AoMark],
        template: `
    <button matButton type="button" [matMenuTriggerFor]="menu">
      <mat-icon svgIcon="info" />
      Legend
    </button>
    <mat-menu #menu="matMenu" class="topology-legend-menu">
      <div
        class="flex max-w-sm flex-col gap-2 px-4 py-3 text-sm"
        (click)="$event.stopPropagation()"
      >
        <div class="font-medium">Status</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          @for (s of statuses; track s.id) {
            <div class="flex items-center gap-1.5">
              <mat-icon
                class="!h-3.5 !w-3.5 !text-[14px]"
                [svgIcon]="s.icon"
                [style.color]="s.color"
              />
              {{ s.label }}
            </div>
          }
        </div>
        <div class="mt-2 font-medium">Edges</div>
        <div>Right-angle routes · hover animates dash toward the arrow</div>
        <div class="mt-2 font-medium">Bands</div>
        <div class="flex flex-col gap-1 text-xs">
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block h-2 w-2 rounded-full"
              [style.background]="bandReach.accent"
            ></span>
            <ao-mark size="xs" tint="steel" />
            Reach
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block h-2 w-2 rounded-full"
              [style.background]="bandAo.accent"
            ></span>
            <ao-mark size="xs" tint="steel" />
            <span class="text-[#3B6EA5] dark:text-[#E6EAF0]"
              >Agentic Orchestration</span
            >
          </div>
        </div>
        <div class="mt-2 font-medium">Aspects</div>
        <div class="grid grid-cols-2 gap-1">
          @for (row of aspects; track row.aspect) {
            <div class="flex items-center gap-1.5 text-xs">
              <span
                class="inline-block h-2 w-2 rounded-full"
                [style.background]="row.accent"
              ></span>
              <mat-icon
                class="!h-3.5 !w-3.5 !text-[14px]"
                [svgIcon]="row.icon"
                [style.color]="row.accent"
              />
              {{ row.aspect }}
            </div>
          }
        </div>
        <div class="mt-2 text-neutral-500">
          Uninstrumented traffic shows <em>no data</em>, never zeros.
        </div>
      </div>
    </mat-menu>
  `,
    })
], TopologyLegend);
export { TopologyLegend };

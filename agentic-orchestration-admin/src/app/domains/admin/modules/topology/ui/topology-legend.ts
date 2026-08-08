import { Component } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { KIND_THEMES } from '../data/topology.theme';

@Component({
  selector: 'ao-topology-legend',
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
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
        <div>● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline</div>
        <div class="mt-2 font-medium">Edges</div>
        <div>Right-angle routes · hover animates dash toward the arrow</div>
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
export class TopologyLegend {
  readonly aspects = Object.values(KIND_THEMES).filter(
    (t, i, arr) => arr.findIndex((x) => x.aspect === t.aspect) === i
  );
}

import { Component } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
        class="flex max-w-xs flex-col gap-2 px-4 py-3 text-sm"
        (click)="$event.stopPropagation()"
      >
        <div class="font-medium">Status</div>
        <div>● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline</div>
        <div class="mt-2 font-medium">Edges</div>
        <div>Solid dash — request · Long dash — stream</div>
        <div>Short dash up — reverse tunnel · Dots — advertisement</div>
        <div class="mt-2 text-neutral-500">
          Uninstrumented edges show <em>no data</em>, never zeros.
        </div>
      </div>
    </mat-menu>
  `,
})
export class TopologyLegend {}

import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TopologyEdge } from '../data/topology.types';

@Component({
  selector: 'ao-edge-detail-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Edge</h2>
    <mat-dialog-content class="min-w-[280px] max-w-md text-sm">
      <div class="font-mono text-xs break-all">{{ data.edge.id }}</div>
      <div class="mt-2">{{ data.edge.from }} → {{ data.edge.to }}</div>
      <div class="mt-1 text-neutral-500">
        kind {{ data.edge.kind }} · {{ data.edge.protocol || '—' }}
        @if (data.edge.port) {
          · :{{ data.edge.port }}
        }
      </div>
      <div
        class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      >
        @if (data.edge.instrumented) {
          Metrics available
        } @else {
          <strong>no data</strong> — this edge is not instrumented in Phase 1.
          Rate, latency, and errors will appear when edge metrics ship.
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
})
export class EdgeDetailDialog {
  readonly data = inject<{ edge: TopologyEdge }>(MAT_DIALOG_DATA);
}

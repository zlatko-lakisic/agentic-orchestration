import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HostUtilization } from './host-utilization';

/** Full host utilization graphs in a modal (same layout as Overview). */
@Component({
  selector: 'ao-host-utilization-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, HostUtilization],
  template: `
    <div class="relative">
      <button
        matIconButton
        type="button"
        class="absolute top-2 right-2 z-10"
        mat-dialog-close
        aria-label="Close host utilization"
      >
        <mat-icon svgIcon="x" />
      </button>
      <mat-dialog-content class="!m-0 !max-h-[90vh] !overflow-y-auto !p-0">
        <ao-host-utilization />
      </mat-dialog-content>
    </div>
  `,
})
export class HostUtilizationDialog {}

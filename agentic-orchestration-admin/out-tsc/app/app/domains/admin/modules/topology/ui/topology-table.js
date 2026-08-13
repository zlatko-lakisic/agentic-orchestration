import { __decorate } from "tslib";
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { statusGlyphColor, statusIcon } from '../data/topology.status';
let TopologyTable = class TopologyTable {
    nodes = input.required();
    edges = input.required();
    nodeClick = output();
    edgeClick = output();
    nodeCols = ['label', 'band', 'status', 'reason'];
    edgeCols = ['id', 'kind', 'instrumented'];
    statusIcon = statusIcon;
    statusGlyphColor = statusGlyphColor;
};
TopologyTable = __decorate([
    Component({
        selector: 'ao-topology-table',
        imports: [MatTableModule, MatIconModule],
        template: `
    <div class="flex flex-col gap-6">
      <div>
        <div class="mb-2 text-sm font-medium">Nodes</div>
        <table mat-table [dataSource]="nodes()" class="w-full">
          <ng-container matColumnDef="label">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let n">
              <button
                type="button"
                class="text-left underline-offset-2 hover:underline"
                (click)="nodeClick.emit(n)"
              >
                {{ n.label }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="band">
            <th mat-header-cell *matHeaderCellDef>Band</th>
            <td mat-cell *matCellDef="let n">{{ n.band }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let n">
              <span class="inline-flex items-center gap-1">
                <mat-icon
                  class="!h-3.5 !w-3.5 !text-[14px]"
                  [svgIcon]="statusIcon(n.displayStatus)"
                  [style.color]="statusGlyphColor(n.displayStatus)"
                />
                {{ n.displayStatus }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="reason">
            <th mat-header-cell *matHeaderCellDef>Reason</th>
            <td mat-cell *matCellDef="let n" class="text-neutral-500">
              {{ n.statusReason || '—' }}
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="nodeCols"></tr>
          <tr mat-row *matRowDef="let row; columns: nodeCols"></tr>
        </table>
      </div>
      <div>
        <div class="mb-2 text-sm font-medium">Edges</div>
        <table mat-table [dataSource]="edges()" class="w-full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let e">
              <button
                type="button"
                class="font-mono text-xs text-left underline-offset-2 hover:underline"
                (click)="edgeClick.emit(e)"
              >
                {{ e.id }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="kind">
            <th mat-header-cell *matHeaderCellDef>Kind</th>
            <td mat-cell *matCellDef="let e">{{ e.kind }}</td>
          </ng-container>
          <ng-container matColumnDef="instrumented">
            <th mat-header-cell *matHeaderCellDef>Metrics</th>
            <td mat-cell *matCellDef="let e">
              {{ e.instrumented ? 'yes' : 'no data' }}
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="edgeCols"></tr>
          <tr mat-row *matRowDef="let row; columns: edgeCols"></tr>
        </table>
      </div>
    </div>
  `,
    })
], TopologyTable);
export { TopologyTable };

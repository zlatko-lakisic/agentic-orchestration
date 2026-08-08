import { Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { PositionedEdge, PositionedNode } from '../data/topology.types';

@Component({
  selector: 'ao-topology-table',
  imports: [MatTableModule],
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
            <td mat-cell *matCellDef="let n">{{ n.displayStatus }}</td>
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
export class TopologyTable {
  readonly nodes = input.required<PositionedNode[]>();
  readonly edges = input.required<PositionedEdge[]>();
  readonly nodeClick = output<PositionedNode>();
  readonly edgeClick = output<PositionedEdge>();

  readonly nodeCols = ['label', 'band', 'status', 'reason'];
  readonly edgeCols = ['id', 'kind', 'instrumented'];
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { StorageEntry } from '@/app/core/ao-api/types';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

@Component({
  selector: 'ao-data-page',
  imports: [MatTableModule, StatusChip, ErrorState],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-col gap-y-0.5">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Data & storage
        </div>
        <div class="text-neutral-500">
          Runtime directories probed from the web process (wipe actions are Phase 1+)
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      <div class="relative overflow-hidden rounded-xl border">
        <table
          class="-mt-px w-full border-separate border-spacing-0 whitespace-nowrap"
          mat-table
          [dataSource]="dataSource"
        >
          <ng-container matColumnDef="name">
            <th
              class="pl-6 lg:pl-8"
              mat-header-cell
              *matHeaderCellDef
            >
              Name
            </th>
            <td
              class="pl-6 lg:pl-8"
              mat-cell
              *matCellDef="let r"
            >
              {{ r.label || r.id }}
            </td>
          </ng-container>
          <ng-container matColumnDef="path">
            <th
              mat-header-cell
              *matHeaderCellDef
            >
              Path
            </th>
            <td
              mat-cell
              *matCellDef="let r"
            >
              <span class="font-mono text-sm text-neutral-500">{{
                r.path
              }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="files">
            <th
              mat-header-cell
              *matHeaderCellDef
            >
              Files
            </th>
            <td
              mat-cell
              *matCellDef="let r"
            >
              <span class="font-mono text-sm tabular-nums">{{
                r.files ?? '—'
              }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="bytes">
            <th
              mat-header-cell
              *matHeaderCellDef
            >
              Size
            </th>
            <td
              mat-cell
              *matCellDef="let r"
            >
              <span class="font-mono text-sm tabular-nums">{{
                formatBytes(r.bytes ?? r.sizeBytes)
              }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th
              class="pr-6 lg:pr-8"
              mat-header-cell
              *matHeaderCellDef
            >
              Status
            </th>
            <td
              class="pr-6 lg:pr-8"
              mat-cell
              *matCellDef="let r"
            >
              <ao-status-chip
                [status]="
                  r.visibility === 'present' || r.exists
                    ? 'healthy'
                    : r.visibility === 'not_mounted_here'
                      ? 'info'
                      : 'unset'
                "
                [label]="visibilityLabel(r)"
              />
            </td>
          </ng-container>
          <tr
            class="bg-white dark:bg-neutral-900"
            mat-header-row
            *matHeaderRowDef="columns; sticky: true"
          ></tr>
          <tr
            class="hover:bg-neutral-100 dark:hover:bg-white/2.5"
            mat-row
            *matRowDef="let row; columns: columns"
          ></tr>
        </table>
      </div>
    </div>
  `,
})
export class DataPage implements OnInit {
  private api = inject(AoApi);
  readonly error = signal<string | null>(null);
  readonly columns = ['name', 'path', 'files', 'bytes', 'status'];
  readonly dataSource: MatTableDataSource<StorageEntry> =
    new MatTableDataSource<StorageEntry>([]);

  ngOnInit() {
    this.api.storage().subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.dataSource.data = r.data.roots || r.data.entries || [];
    });
  }

  formatBytes(n?: number | null) {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KiB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MiB`;
    return `${(n / 1024 ** 3).toFixed(2)} GiB`;
  }

  visibilityLabel(r: StorageEntry): string {
    if (r.visibility === 'present' || r.exists) return 'Present';
    if (r.visibility === 'not_mounted_here') {
      return `Not visible from this process${r.owner ? ` (${r.owner})` : ''}`;
    }
    return 'Absent';
  }
}

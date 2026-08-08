import { Component, OnInit, inject, signal } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AdminRun, RunDetail } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-runs-page',
  imports: [
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    EmptyState,
    ErrorState,
  ],
  template: `
    <div class="mx-auto flex h-full w-full max-w-7xl flex-auto flex-col overflow-hidden">
      <mat-sidenav-container class="h-full flex-auto">
        <mat-sidenav
          class="w-full border-none bg-white sm:w-lg dark:bg-neutral-900"
          mode="side"
          position="end"
          [opened]="!!detail()"
        >
          @if (detail(); as d) {
            <div class="flex flex-col gap-3 p-6">
              <div class="flex items-center justify-between">
                <div class="text-lg font-medium">{{ d.id }}</div>
                <button matIconButton type="button" (click)="detail.set(null)">
                  <mat-icon svgIcon="x" />
                </button>
              </div>
              <div class="text-sm text-neutral-500">
                scope {{ d.scope }} · updated {{ d.updatedAt || '—' }}
              </div>
              @if (d.lastGoal) {
                <p class="text-sm">{{ d.lastGoal }}</p>
              }
              @if (d.stepsDetail?.length) {
                <div class="text-sm font-medium">Steps</div>
                <ul class="text-sm">
                  @for (s of d.stepsDetail; track s.id) {
                    <li class="font-mono">
                      {{ s.id }} · exit {{ s.exitCode ?? '—' }} ·
                      {{ s.provider || '—' }}
                    </li>
                  }
                </ul>
              }
              @if (d.lastAnswerExcerpt) {
                <pre class="overflow-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">{{
                  d.lastAnswerExcerpt
                }}</pre>
              }
            </div>
          }
        </mat-sidenav>
        <mat-sidenav-content class="flex flex-col gap-4 p-6 lg:px-8 lg:pt-8">
          <div>
            <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
              Runs
            </div>
            <div class="text-neutral-500">
              Session and run-store history visible from this web process
            </div>
            @if (scopeNote()) {
              <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {{ scopeNote() }}
              </p>
            }
          </div>

          @if (error()) {
            <ao-error-state [message]="error()!" />
          }

          @if (!dataSource.data.length && !error()) {
            <ao-empty-state message="No runs visible from this process yet." />
          } @else {
            <table mat-table [dataSource]="dataSource" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Id</th>
                <td mat-cell *matCellDef="let r">
                  <button
                    class="font-mono text-sm text-left underline-offset-2 hover:underline"
                    type="button"
                    (click)="open(r)"
                  >
                    {{ r.id }}
                  </button>
                </td>
              </ng-container>
              <ng-container matColumnDef="scope">
                <th mat-header-cell *matHeaderCellDef>Scope</th>
                <td mat-cell *matCellDef="let r">{{ r.scope }}</td>
              </ng-container>
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>Updated</th>
                <td mat-cell *matCellDef="let r" class="font-mono text-sm">
                  {{ r.updatedAt || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="mode">
                <th mat-header-cell *matHeaderCellDef>Mode</th>
                <td mat-cell *matCellDef="let r">{{ r.mode || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="steps">
                <th mat-header-cell *matHeaderCellDef>Steps</th>
                <td mat-cell *matCellDef="let r">{{ r.steps ?? '—' }}</td>
              </ng-container>
              <tr
                mat-header-row
                *matHeaderRowDef="columns"
              ></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
                class="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5"
                (click)="open(row)"
              ></tr>
            </table>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export class RunsPage implements OnInit {
  private api = inject(AoApi);
  readonly error = signal<string | null>(null);
  readonly scopeNote = signal<string | null>(null);
  readonly detail = signal<RunDetail | null>(null);
  readonly columns = ['id', 'scope', 'updated', 'mode', 'steps'];
  readonly dataSource = new MatTableDataSource<AdminRun>([]);

  ngOnInit() {
    this.api.runs(80).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.scopeNote.set(r.data.scopeNote || null);
      this.dataSource.data = r.data.runs || [];
    });
  }

  open(row: AdminRun) {
    this.api.runDetail(row.id).subscribe((r) => {
      if (r.ok) this.detail.set(r.data);
      else this.detail.set({ ...row });
    });
  }
}

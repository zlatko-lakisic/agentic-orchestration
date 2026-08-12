import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AppPlanningPrefs } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-access-app-prefs',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    EmptyState,
    ErrorState,
  ],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-lg font-medium tracking-tight">
              Dynamic planning by app
            </div>
            <div class="text-sm text-neutral-500">
              Sticky defaults per <code>appId</code> for Reach and HTTP API
              calls. Per-call <code>runMode</code> always overrides.
            </div>
          </div>
        </div>
      </mat-card-header>
      <mat-card-content class="flex flex-col gap-4 pt-3">
        @if (error()) {
          <ao-error-state [message]="error()!" />
        }

        <div class="flex flex-wrap items-end gap-3">
          <mat-form-field appearance="outline" class="min-w-[12rem]">
            <mat-label>App ID</mat-label>
            <input matInput [(ngModel)]="newAppId" placeholder="knowbuddy" />
          </mat-form-field>
          <mat-checkbox [(ngModel)]="newDynamic">Enable dynamic planning</mat-checkbox>
          <mat-form-field appearance="outline" class="min-w-[10rem]">
            <mat-label>Default run mode</mat-label>
            <mat-select [(ngModel)]="newRunMode">
              <mat-option value="dynamic">dynamic</mat-option>
              <mat-option value="dynamic-iterative">dynamic-iterative</mat-option>
            </mat-select>
          </mat-form-field>
          <button
            matButton="filled"
            type="button"
            [disabled]="saving()"
            (click)="saveNew()"
          >
            Save
          </button>
        </div>

        @if (!apps().length) {
          <ao-empty-state
            title="No app planning prefs"
            message="Mint an API token or save prefs for a Reach appId to enable sticky dynamic planning."
          />
        } @else {
          <div
            class="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            <table mat-table [dataSource]="apps()" class="w-full">
              <ng-container matColumnDef="appId">
                <th mat-header-cell *matHeaderCellDef>App ID</th>
                <td mat-cell *matCellDef="let a" class="font-medium">
                  {{ a.appId }}
                </td>
              </ng-container>
              <ng-container matColumnDef="dynamicPlanning">
                <th mat-header-cell *matHeaderCellDef>Dynamic planning</th>
                <td mat-cell *matCellDef="let a">
                  <mat-checkbox
                    [ngModel]="a.dynamicPlanning"
                    (ngModelChange)="toggleDynamic(a, $event)"
                    [disabled]="savingId() === a.appId"
                  />
                </td>
              </ng-container>
              <ng-container matColumnDef="defaultRunMode">
                <th mat-header-cell *matHeaderCellDef>Default run mode</th>
                <td mat-cell *matCellDef="let a">
                  <mat-form-field appearance="outline" class="min-w-[10rem]">
                    <mat-select
                      [ngModel]="a.defaultRunMode || 'dynamic'"
                      (ngModelChange)="setRunMode(a, $event)"
                      [disabled]="savingId() === a.appId"
                    >
                      <mat-option value="dynamic">dynamic</mat-option>
                      <mat-option value="dynamic-iterative"
                        >dynamic-iterative</mat-option
                      >
                    </mat-select>
                  </mat-form-field>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class AccessAppPrefs implements OnInit {
  private readonly api = inject(AoApi);

  readonly columns = ['appId', 'dynamicPlanning', 'defaultRunMode'];
  readonly apps = signal<AppPlanningPrefs[]>([]);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly savingId = signal<string | null>(null);

  newAppId = '';
  newDynamic = true;
  newRunMode: 'dynamic' | 'dynamic-iterative' = 'dynamic';

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.listAppPrefs().subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.apps.set(r.data);
    });
  }

  saveNew() {
    const appId = this.newAppId.trim().toLowerCase();
    if (!appId) {
      this.error.set('App ID is required');
      return;
    }
    this.saving.set(true);
    this.api
      .setAppPrefs(appId, {
        dynamicPlanning: this.newDynamic,
        defaultRunMode: this.newRunMode,
      })
      .subscribe((r) => {
        this.saving.set(false);
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.newAppId = '';
        this.reload();
      });
  }

  toggleDynamic(row: AppPlanningPrefs, enabled: boolean) {
    this.patch(row.appId, {
      dynamicPlanning: enabled,
      defaultRunMode: row.defaultRunMode || 'dynamic',
    });
  }

  setRunMode(row: AppPlanningPrefs, mode: 'dynamic' | 'dynamic-iterative') {
    this.patch(row.appId, {
      dynamicPlanning: Boolean(row.dynamicPlanning),
      defaultRunMode: mode,
    });
  }

  private patch(
    appId: string,
    body: {
      dynamicPlanning: boolean;
      defaultRunMode: 'dynamic' | 'dynamic-iterative' | null;
    }
  ) {
    this.savingId.set(appId);
    this.api.setAppPrefs(appId, body).subscribe((r) => {
      this.savingId.set(null);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.reload();
    });
  }
}

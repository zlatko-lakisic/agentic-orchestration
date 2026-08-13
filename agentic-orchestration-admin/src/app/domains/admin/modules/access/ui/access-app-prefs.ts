import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AppPlanningPrefs } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';

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
    LoadingState,
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
              Sticky defaults per <code>appId</code>: dynamic planning, and which
              stock agents each app may use. Per-call <code>runMode</code> /
              <code>selectedAgentProviderIds</code> always override. Reach may
              also pass session <code>env</code> keys and allowlists.
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
          <mat-form-field appearance="outline" class="min-w-[16rem] flex-1">
            <mat-label>Allowed agents (comma-separated)</mat-label>
            <input
              matInput
              [(ngModel)]="newAllowedAgents"
              placeholder="gpt_research, ollama_llama3_2_3b"
            />
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

        @if (live.feedLoading('access')) {
          <ao-loading-state
            title="Loading app prefs"
            message="Connecting to the live access feed…"
          />
        } @else if (!apps().length) {
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
              <ng-container matColumnDef="allowedAgents">
                <th mat-header-cell *matHeaderCellDef>Allowed agents</th>
                <td mat-cell *matCellDef="let a">
                  <mat-form-field appearance="outline" class="min-w-[14rem]">
                    <input
                      matInput
                      [ngModel]="(a.allowedAgentProviderIds || []).join(', ')"
                      (change)="setAllowedAgents(a, $any($event.target).value)"
                      [disabled]="savingId() === a.appId"
                      placeholder="(all)"
                    />
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
  readonly live = inject(AoLiveWs);

  readonly columns = [
    'appId',
    'dynamicPlanning',
    'defaultRunMode',
    'allowedAgents',
  ];
  readonly apps = signal<AppPlanningPrefs[]>([]);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly savingId = signal<string | null>(null);

  newAppId = '';
  newDynamic = true;
  newRunMode: 'dynamic' | 'dynamic-iterative' = 'dynamic';
  newAllowedAgents = '';

  constructor() {
    effect(() => {
      const snap = this.live.feeds()['access'] as
        | { apps?: AppPlanningPrefs[] }
        | undefined;
      if (!snap?.apps) return;
      this.apps.set(snap.apps);
      const err =
        this.live.feedErrors()['access'] || this.live.feedErrors()['_'];
      if (err) this.error.set(err);
      else this.error.set(null);
    });
  }

  ngOnInit() {
    // Parent Access page owns the live feed subscription.
  }

  reload() {
    this.live.setFeedParams({});
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
        allowedAgentProviderIds: this.parseIds(this.newAllowedAgents),
      })
      .subscribe((r) => {
        this.saving.set(false);
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.newAppId = '';
        this.newAllowedAgents = '';
        this.reload();
      });
  }

  toggleDynamic(row: AppPlanningPrefs, enabled: boolean) {
    this.patch(row.appId, {
      dynamicPlanning: enabled,
      defaultRunMode: row.defaultRunMode || 'dynamic',
      allowedAgentProviderIds: row.allowedAgentProviderIds || [],
    });
  }

  setRunMode(row: AppPlanningPrefs, mode: 'dynamic' | 'dynamic-iterative') {
    this.patch(row.appId, {
      dynamicPlanning: Boolean(row.dynamicPlanning),
      defaultRunMode: mode,
      allowedAgentProviderIds: row.allowedAgentProviderIds || [],
    });
  }

  setAllowedAgents(row: AppPlanningPrefs, raw: string) {
    this.patch(row.appId, {
      dynamicPlanning: Boolean(row.dynamicPlanning),
      defaultRunMode: row.defaultRunMode || 'dynamic',
      allowedAgentProviderIds: this.parseIds(raw),
    });
  }

  private parseIds(raw: string): string[] {
    return String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private patch(
    appId: string,
    body: {
      dynamicPlanning: boolean;
      defaultRunMode: 'dynamic' | 'dynamic-iterative' | null;
      allowedAgentProviderIds?: string[];
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

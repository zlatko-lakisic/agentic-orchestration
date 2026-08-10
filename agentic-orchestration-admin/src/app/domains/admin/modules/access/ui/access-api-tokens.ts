import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { ApiAccessToken, ApiAccessTokenUsage } from '@/app/core/ao-api/types';
import { WebAuth } from '@/app/core/ao-api/web-auth';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import { MintTokenDialog } from './mint-token-dialog';

@Component({
  selector: 'ao-access-api-tokens',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatDialogModule,
    MatIconModule,
    MatSidenavModule,
    MatTableModule,
    EmptyState,
    ErrorState,
    StatusChip,
  ],
  template: `
    <mat-drawer-container class="min-h-[280px]" autosize>
      <mat-drawer-content>
        <mat-card appearance="outlined">
          <mat-card-header>
            <div class="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-lg font-medium tracking-tight">API tokens</div>
                <div class="text-sm text-neutral-500">
                  Orchestrate / OpenAI proxies always need a minted Bearer. Mint
                  <code>ao-web</code> for Admin and <code>ao-chat</code> for the
                  chat page (both auto-assign).
                </div>
              </div>
              <button matButton="filled" type="button" (click)="openMint()">
                Mint token
              </button>
            </div>
          </mat-card-header>
          <mat-card-content class="pt-3">
            @if (error()) {
              <ao-error-state [message]="error()!" />
            } @else if (!tokens().length) {
              <ao-empty-state
                title="No API tokens"
                message="Mint Admin (ao-web) and Chat (ao-chat) tokens first, then mint tokens for OpenClaw and other clients."
              />
            } @else {
              <div class="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table mat-table [dataSource]="tokens()" class="w-full">
                  <ng-container matColumnDef="appId">
                    <th mat-header-cell *matHeaderCellDef>App ID</th>
                    <td mat-cell *matCellDef="let t" class="font-medium">
                      {{ t.appId }}
                      @if (t.assignedToWeb) {
                        <span
                          class="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100"
                          >Admin</span
                        >
                      }
                      @if (t.assignedToChat) {
                        <span
                          class="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-900 dark:text-sky-100"
                          >Chat</span
                        >
                      }
                      @if (t.label) {
                        <div class="text-xs font-normal text-neutral-500">
                          {{ t.label }}
                        </div>
                      }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="prefix">
                    <th mat-header-cell *matHeaderCellDef>Prefix</th>
                    <td mat-cell *matCellDef="let t" class="font-mono text-sm">
                      {{ t.prefix }}…
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let t">
                      <ao-status-chip [status]="statusTone(t.status)" [label]="t.status" />
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="lastUsed">
                    <th mat-header-cell *matHeaderCellDef>Last used</th>
                    <td mat-cell *matCellDef="let t" class="text-sm">
                      @if (t.lastUsedAt) {
                        <div>{{ t.lastUsedAt | date: 'short' }}</div>
                        <div class="font-mono text-xs text-neutral-500">
                          {{ t.lastUsedIp || '—' }}
                        </div>
                      } @else {
                        <span class="text-neutral-500">Never</span>
                      }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="created">
                    <th mat-header-cell *matHeaderCellDef>Created</th>
                    <td mat-cell *matCellDef="let t" class="text-sm text-neutral-600 dark:text-neutral-400">
                      {{ t.createdAt ? (t.createdAt | date: 'mediumDate') : '—' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let t" class="whitespace-nowrap">
                      <button
                        matButton="outlined"
                        type="button"
                        class="mr-1"
                        (click)="showUsage(t)"
                      >
                        Usage
                      </button>
                      @if (t.status === 'active') {
                        <button
                          matButton="outlined"
                          type="button"
                          class="text-red-700 dark:text-red-400"
                          [disabled]="revokingId() === t.id"
                          (click)="revoke(t)"
                        >
                          Revoke
                        </button>
                      }
                    </td>
                  </ng-container>
                  <tr
                    mat-header-row
                    *matHeaderRowDef="columns; sticky: true"
                  ></tr>
                  <tr mat-row *matRowDef="let row; columns: columns"></tr>
                </table>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </mat-drawer-content>

      <mat-drawer
        mode="over"
        position="end"
        [opened]="usageOpen()"
        (closedStart)="closeUsage()"
        class="w-full max-w-md p-4"
      >
        @if (usageToken(); as t) {
          <div class="mb-4 flex items-start justify-between gap-2">
            <div>
              <div class="text-lg font-medium tracking-tight">Usage</div>
              <div class="text-sm text-neutral-500">
                {{ t.appId }} · {{ t.prefix }}…
              </div>
            </div>
            <button matIconButton type="button" (click)="closeUsage()">
              <mat-icon svgIcon="x" />
            </button>
          </div>
          @if (usageError()) {
            <ao-error-state [message]="usageError()!" />
          } @else if (!usageRows().length) {
            <ao-empty-state
              title="No usage yet"
              message="Calls authenticated with this token will appear here."
            />
          } @else {
            <div class="flex flex-col gap-2">
              @for (u of usageRows(); track u.ts + (u.ip || '') + (u.path || '')) {
                <div
                  class="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <span class="font-mono text-xs">{{ u.ip || '—' }}</span>
                    <span class="text-xs text-neutral-500">
                      {{ u.ts ? (u.ts | date: 'short') : '—' }}
                    </span>
                  </div>
                  <div class="mt-1 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {{ u.path || '—' }}
                    @if (u.status != null) {
                      · {{ u.status }}
                    }
                    @if (u.latencyMs != null) {
                      · {{ u.latencyMs }}ms
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </mat-drawer>
    </mat-drawer-container>
  `,
})
export class AccessApiTokens implements OnInit {
  private readonly api = inject(AoApi);
  private readonly webAuth = inject(WebAuth);
  private readonly dialog = inject(MatDialog);

  readonly columns = [
    'appId',
    'prefix',
    'status',
    'lastUsed',
    'created',
    'actions',
  ];
  readonly tokens = signal<ApiAccessToken[]>([]);
  readonly error = signal<string | null>(null);
  readonly revokingId = signal<string | null>(null);
  readonly usageOpen = signal(false);
  readonly usageToken = signal<ApiAccessToken | null>(null);
  readonly usageRows = signal<ApiAccessTokenUsage[]>([]);
  readonly usageError = signal<string | null>(null);

  ngOnInit() {
    this.reload();
  }

  statusTone(status: string | undefined): string {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return 'healthy';
    if (s === 'revoked' || s === 'expired') return 'failed';
    return 'warning';
  }

  reload() {
    this.api.listApiTokens().subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.tokens.set(r.data);
    });
  }

  openMint() {
    const preferWebUi = !this.webAuth.assigned() && !this.tokens().some((t) => t.assignedToWeb);
    const preferChatUi =
      !preferWebUi && !this.tokens().some((t) => t.assignedToChat);
    const ref = this.dialog.open(MintTokenDialog, {
      width: '480px',
      data: { preferWebUi, preferChatUi },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.reload();
        void this.webAuth.refreshOnce();
      }
    });
  }

  revoke(t: ApiAccessToken) {
    const wasWeb = Boolean(t.assignedToWeb);
    const wasChat = Boolean(t.assignedToChat);
    if (
      !confirm(
        wasWeb
          ? `Revoke the Admin Web UI token (${t.prefix}…)? Admin APIs will lock until you mint ao-web again.`
          : wasChat
            ? `Revoke the Chat Web UI token (${t.prefix}…)? The chat page will lock until you mint ao-chat again.`
            : `Revoke token for appId "${t.appId}" (${t.prefix}…)? Clients using it will fail auth.`
      )
    ) {
      return;
    }
    this.revokingId.set(t.id);
    this.api.revokeApiToken(t.id).subscribe((r) => {
      this.revokingId.set(null);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      if (wasWeb) this.webAuth.clear();
      this.reload();
      void this.webAuth.refreshOnce();
    });
  }

  showUsage(t: ApiAccessToken) {
    this.usageToken.set(t);
    this.usageOpen.set(true);
    this.usageError.set(null);
    this.usageRows.set([]);
    this.api.apiTokenUsage(t.id, 100).subscribe((r) => {
      if (!r.ok) {
        this.usageError.set(r.message);
        return;
      }
      this.usageRows.set(r.data);
    });
  }

  closeUsage() {
    this.usageOpen.set(false);
    this.usageToken.set(null);
  }
}

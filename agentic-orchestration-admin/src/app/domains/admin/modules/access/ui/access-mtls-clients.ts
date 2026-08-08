import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { MtlsClient } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

@Component({
  selector: 'ao-access-mtls-clients',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatTableModule,
    EmptyState,
    ErrorState,
    StatusChip,
  ],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-lg font-medium tracking-tight">mTLS clients</div>
            <div class="text-sm text-neutral-500">
              Kick one enrolled Reach client without rotating the CA
            </div>
          </div>
          <button matButton="outlined" type="button" (click)="reload()">Refresh</button>
        </div>
      </mat-card-header>
      <mat-card-content class="pt-3">
        @if (error()) {
          <ao-error-state [message]="error()!" />
        } @else if (!clients().length) {
          <ao-empty-state
            title="No enrolled clients recorded"
            message="Clients appear here after they redeem an enroll token. You can also revoke by CN if the cert was issued before this registry."
          />
          <div class="mt-3 flex flex-wrap gap-2">
            <button matButton="outlined" type="button" (click)="revokeByCn()">
              Revoke by CN…
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
            <table mat-table [dataSource]="clients()" class="w-full">
              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>Client CN</th>
                <td mat-cell *matCellDef="let c" class="font-medium">
                  {{ c.subject || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="serial">
                <th mat-header-cell *matHeaderCellDef>Serial</th>
                <td mat-cell *matCellDef="let c" class="font-mono text-xs">
                  {{ c.serial || 'CN ban' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let c">
                  <ao-status-chip
                    [status]="c.revoked ? 'failed' : 'healthy'"
                    [label]="c.revoked ? 'revoked' : 'active'"
                  />
                </td>
              </ng-container>
              <ng-container matColumnDef="issued">
                <th mat-header-cell *matHeaderCellDef>Issued</th>
                <td mat-cell *matCellDef="let c" class="text-sm text-neutral-600 dark:text-neutral-400">
                  {{ c.issuedAt ? (c.issuedAt | date: 'short') : '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let c" class="whitespace-nowrap">
                  @if (!c.revoked) {
                    <button
                      matButton="outlined"
                      type="button"
                      class="text-red-700 dark:text-red-400"
                      [disabled]="busyKey() === rowKey(c)"
                      (click)="revoke(c)"
                    >
                      Revoke
                    </button>
                  } @else {
                    <button
                      matButton="outlined"
                      type="button"
                      [disabled]="busyKey() === rowKey(c)"
                      (click)="unrevoke(c)"
                    >
                      Unrevoke
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
          <div class="mt-3">
            <button matButton="outlined" type="button" (click)="revokeByCn()">
              Revoke by CN…
            </button>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class AccessMtlsClients implements OnInit {
  private readonly api = inject(AoApi);

  readonly columns = ['subject', 'serial', 'status', 'issued', 'actions'];
  readonly clients = signal<MtlsClient[]>([]);
  readonly error = signal<string | null>(null);
  readonly busyKey = signal<string | null>(null);

  ngOnInit() {
    this.reload();
  }

  rowKey(c: MtlsClient): string {
    return `${c.serial || ''}|${c.subject || ''}`;
  }

  reload() {
    this.api.listMtlsClients().subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.clients.set(r.data);
    });
  }

  revoke(c: MtlsClient) {
    const label = c.subject || c.serial || 'client';
    if (!confirm(`Revoke mTLS access for "${label}"? Other clients stay connected.`)) {
      return;
    }
    this.busyKey.set(this.rowKey(c));
    this.api
      .revokeMtlsClient({
        serial: c.serial,
        subject: c.subject,
        reason: 'revoked from Admin',
      })
      .subscribe((r) => {
        this.busyKey.set(null);
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.reload();
      });
  }

  unrevoke(c: MtlsClient) {
    this.busyKey.set(this.rowKey(c));
    this.api
      .unrevokeMtlsClient({ serial: c.serial, subject: c.subject })
      .subscribe((r) => {
        this.busyKey.set(null);
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.reload();
      });
  }

  revokeByCn() {
    const subject = window.prompt('Client CN (common name) to revoke:');
    if (!subject?.trim()) return;
    if (!confirm(`Revoke all mTLS certs for CN "${subject.trim()}"?`)) return;
    this.api
      .revokeMtlsClient({ subject: subject.trim(), reason: 'CN ban from Admin' })
      .subscribe((r) => {
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.reload();
      });
  }
}

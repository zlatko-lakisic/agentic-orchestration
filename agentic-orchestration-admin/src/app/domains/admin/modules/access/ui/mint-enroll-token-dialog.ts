import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { MtlsEnrollToken } from '@/app/core/ao-api/types';

@Component({
  selector: 'ao-mint-enroll-token-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Mint mTLS enroll token</h2>
    <mat-dialog-content class="flex min-w-[320px] max-w-lg flex-col gap-3">
      @if (!minted()) {
        <p class="text-sm text-neutral-500">
          One-time token for Reach client certificate enrollment against the
          <strong>engine</strong> (<code>:8765</code>). Not an
          <code>ao_…</code> API token.
        </p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Client CN</mat-label>
          <input
            matInput
            [(ngModel)]="clientName"
            name="clientName"
            required
            placeholder="myapp"
            autocomplete="off"
          />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>TTL seconds</mat-label>
          <input
            matInput
            type="number"
            [(ngModel)]="ttlSeconds"
            name="ttlSeconds"
            min="60"
          />
        </mat-form-field>
        @if (error()) {
          <p class="text-sm text-red-600 dark:text-red-400">{{ error() }}</p>
        }
      } @else {
        <p class="text-sm text-amber-700 dark:text-amber-300">
          Copy this enroll token now — it will not be shown again. Paste it into
          Reach client enroll (engine URL, not Admin :30487).
        </p>
        <div
          class="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm break-all dark:border-neutral-700 dark:bg-neutral-900"
        >
          <span class="min-w-0 flex-auto">{{ minted()!.token }}</span>
          <button matIconButton type="button" (click)="copySecret()">
            <mat-icon svgIcon="copy" />
          </button>
        </div>
        <div class="text-xs text-neutral-500">
          CN {{ minted()!.clientName || '—' }} · maxUses
          {{ minted()!.maxUses ?? 1 }}
        </div>
        @if (copied()) {
          <p class="text-xs text-green-700 dark:text-green-400">Copied</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (!minted()) {
        <button matButton mat-dialog-close type="button">Cancel</button>
        <button
          matButton="filled"
          type="button"
          [disabled]="busy() || !clientName.trim()"
          (click)="mint()"
        >
          Mint
        </button>
      } @else {
        <button matButton="filled" type="button" (click)="ref.close(minted())">
          Done
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class MintEnrollTokenDialog {
  private readonly api = inject(AoApi);
  private readonly clipboard = inject(Clipboard);
  readonly ref = inject(MatDialogRef<MintEnrollTokenDialog, MtlsEnrollToken | null>);

  clientName = '';
  ttlSeconds = 86400;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly minted = signal<MtlsEnrollToken | null>(null);
  readonly copied = signal(false);

  mint() {
    const clientName = this.clientName.trim();
    if (!clientName || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.api
      .mintMtlsEnrollToken({
        clientName,
        ttlSeconds: Number(this.ttlSeconds) || 86400,
        maxUses: 1,
      })
      .subscribe((r) => {
        this.busy.set(false);
        if (!r.ok) {
          this.error.set(r.message);
          return;
        }
        this.minted.set(r.data);
      });
  }

  copySecret() {
    const t = this.minted()?.token;
    if (!t) return;
    this.clipboard.copy(t);
    this.copied.set(true);
  }
}

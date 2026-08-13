import { __decorate } from "tslib";
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { WebAuth } from '@/app/core/ao-api/web-auth';
let MintTokenDialog = class MintTokenDialog {
    api = inject(AoApi);
    webAuth = inject(WebAuth);
    clipboard = inject(Clipboard);
    ref = inject((MatDialogRef));
    data = inject(MAT_DIALOG_DATA, { optional: true });
    kind = this.data?.preferChatUi
        ? 'chat'
        : this.data?.preferWebUi
            ? 'admin'
            : 'client';
    appId = '';
    label = '';
    expiresAt = '';
    busy = signal(false);
    error = signal(null);
    minted = signal(null);
    copied = signal(false);
    mint() {
        if (this.busy())
            return;
        const assignToWeb = this.kind === 'admin';
        const assignToChat = this.kind === 'chat';
        const appId = assignToWeb ? 'ao-web' : assignToChat ? 'ao-chat' : this.appId.trim();
        if (!appId)
            return;
        this.busy.set(true);
        this.error.set(null);
        this.api
            .mintApiToken({
            appId,
            label: this.label.trim() || undefined,
            expiresAt: this.expiresAt.trim() || null,
            assignToWeb: assignToWeb || undefined,
            assignToChat: assignToChat || undefined,
        })
            .subscribe((r) => {
            this.busy.set(false);
            if (!r.ok) {
                this.error.set(r.message);
                return;
            }
            this.minted.set(r.data);
            this.webAuth.adoptMinted(r.data.token, Boolean(r.data.assignedToWeb));
        });
    }
    copySecret() {
        const t = this.minted()?.token;
        if (!t)
            return;
        this.clipboard.copy(t);
        this.copied.set(true);
    }
    closeDone() {
        this.ref.close(this.minted());
    }
};
MintTokenDialog = __decorate([
    Component({
        selector: 'ao-mint-token-dialog',
        imports: [
            FormsModule,
            MatDialogModule,
            MatButtonModule,
            MatCheckboxModule,
            MatRadioModule,
            MatFormFieldModule,
            MatInputModule,
            MatIconModule,
        ],
        template: `
    <h2 mat-dialog-title>Mint API token</h2>
    <mat-dialog-content class="flex min-w-[320px] max-w-lg flex-col gap-3">
      @if (!minted()) {
        <p class="text-sm text-neutral-500">
          Tokens authenticate orchestrate / OpenAI proxies. First-party UI
          tokens are auto-assigned to Admin (<code>ao-web</code>) or Chat
          (<code>ao-chat</code>). The secret is shown once.
        </p>
        <mat-radio-group
          class="flex flex-col gap-2"
          [(ngModel)]="kind"
          name="kind"
        >
          <mat-radio-button value="admin"
            >Admin Web UI (<code>/admin</code> · ao-web)</mat-radio-button
          >
          <mat-radio-button value="chat"
            >Chat Web UI (<code>/</code> · ao-chat)</mat-radio-button
          >
          <mat-radio-button value="client"
            >External client (custom appId)</mat-radio-button
          >
        </mat-radio-group>
        @if (kind === 'client') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>App ID</mat-label>
            <input
              matInput
              [(ngModel)]="appId"
              name="appId"
              required
              autocomplete="off"
              placeholder="openclaw"
            />
          </mat-form-field>
        } @else if (kind === 'admin') {
          <p class="text-sm text-neutral-600 dark:text-neutral-300">
            App ID fixed to <code>ao-web</code>. Replaces any previous Admin
            token and unlocks Admin APIs.
          </p>
        } @else {
          <p class="text-sm text-neutral-600 dark:text-neutral-300">
            App ID fixed to <code>ao-chat</code>. Replaces any previous Chat
            token and unlocks the chat page + its WebSocket.
          </p>
        }
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Label (optional)</mat-label>
          <input matInput [(ngModel)]="label" name="label" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Expires (optional ISO date)</mat-label>
          <input
            matInput
            [(ngModel)]="expiresAt"
            name="expiresAt"
            placeholder="2027-01-01T00:00:00Z"
            autocomplete="off"
          />
        </mat-form-field>
        @if (error()) {
          <p class="text-sm text-red-600 dark:text-red-400">{{ error() }}</p>
        }
      } @else {
        <p class="text-sm text-amber-700 dark:text-amber-300">
          Copy this token now — it will not be shown again.
        </p>
        @if (minted()!.assignedToWeb) {
          <p class="text-sm text-teal-800 dark:text-teal-200">
            Assigned to Admin Web UI — this console will use it automatically.
          </p>
        }
        @if (minted()!.assignedToChat) {
          <p class="text-sm text-teal-800 dark:text-teal-200">
            Assigned to Chat Web UI — <code>/</code> will pick it up on refresh.
          </p>
        }
        <div
          class="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm break-all dark:border-neutral-700 dark:bg-neutral-900"
        >
          <span class="min-w-0 flex-auto">{{ minted()!.token }}</span>
          <button matIconButton type="button" (click)="copySecret()">
            <mat-icon svgIcon="copy" />
          </button>
        </div>
        <div class="text-xs text-neutral-500">
          appId {{ minted()!.appId }} · prefix {{ minted()!.prefix }}…
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
          [disabled]="busy() || (kind === 'client' && !appId.trim())"
          (click)="mint()"
        >
          Mint
        </button>
      } @else {
        <button matButton="filled" type="button" (click)="closeDone()">Done</button>
      }
    </mat-dialog-actions>
  `,
    })
], MintTokenDialog);
export { MintTokenDialog };

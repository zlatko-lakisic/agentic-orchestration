import { __decorate } from "tslib";
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { ChangeSetStore } from '@/app/core/ao-changeset/changeset.store';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
let ActivityPage = class ActivityPage {
    live = inject(AoLiveWs);
    changeset = inject(ChangeSetStore);
    clipboard = inject(Clipboard);
    fingerprint = signal(null);
    timeline = signal([]);
    lastFp = null;
    lastAttention = '';
    constructor() {
        effect(() => {
            const fpSnap = this.live.feeds()['fingerprint'];
            const fp = fpSnap?.fingerprint;
            if (!fp)
                return;
            this.fingerprint.set(fp);
            if (this.lastFp && this.lastFp !== fp) {
                this.push({
                    id: `fp-${fp}-${Date.now()}`,
                    ts: new Date().toISOString(),
                    kind: 'config',
                    message: `Config fingerprint changed ${this.lastFp} → ${fp}`,
                    href: '/settings',
                });
            }
            this.lastFp = fp;
        });
        effect(() => {
            const topo = this.live.feeds()['topology'];
            if (!topo)
                return;
            const attention = (topo.attention || [])
                .map((a) => a.message)
                .join('|');
            if (this.lastAttention && this.lastAttention !== attention) {
                for (const a of topo.attention || []) {
                    this.push({
                        id: `att-${Date.now()}-${a.message}`,
                        ts: new Date().toISOString(),
                        kind: 'topology',
                        message: a.message || 'Topology attention updated',
                        href: a.href,
                    });
                }
            }
            if (!this.lastAttention && attention) {
                for (const a of topo.attention || []) {
                    this.push({
                        id: `att0-${a.message}`,
                        ts: topo.generatedAt || new Date().toISOString(),
                        kind: 'topology',
                        message: a.message || 'Attention',
                        href: a.href,
                    });
                }
            }
            this.lastAttention = attention;
        });
    }
    ngOnInit() {
        this.live.acquire({
            feeds: ['topology', 'fingerprint'],
            feedIntervalMs: 5000,
        });
    }
    ngOnDestroy() {
        this.live.release();
    }
    push(item) {
        this.timeline.update((list) => [item, ...list].slice(0, 100));
    }
    copyDiff() {
        this.clipboard.copy(this.changeset.exportDiff());
    }
};
ActivityPage = __decorate([
    Component({
        selector: 'ao-activity-page',
        imports: [
            MatCard,
            MatCardHeader,
            MatCardContent,
            MatButtonModule,
            MatIconModule,
            RouterLink,
            LoadingState,
            StatusChip,
        ],
        template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Activity
        </div>
        <div class="text-neutral-500">
          Topology transitions, config fingerprint, and local draft changes
        </div>
      </div>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="flex w-full items-center justify-between gap-2">
            <div class="font-medium">Pending local change set</div>
            <ao-status-chip status="info" label="write api: tokens only" />
          </div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-2 pt-2">
          @if (changeset.entries().length) {
            <pre class="overflow-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">{{
              changeset.exportDiff()
            }}</pre>
            <button matButton="tonal" type="button" (click)="copyDiff()">
              Copy diff
            </button>
          } @else {
            <p class="text-sm text-neutral-500">
              No local draft. Phase 0 setting rows do not stage changes yet —
              export stays manual when entries appear.
            </p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">
            Timeline
            @if (fingerprint()) {
              <span class="ml-2 font-mono text-xs text-neutral-500"
                >fp {{ fingerprint() }}</span
              >
            }
          </div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-3 pt-2">
          @for (item of timeline(); track item.id) {
            <div class="border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div class="text-xs text-neutral-500">
                {{ item.ts }} · {{ item.kind }}
              </div>
              <div class="text-sm">
                @if (item.href) {
                  <a [routerLink]="item.href" class="underline-offset-2 hover:underline">{{
                    item.message
                  }}</a>
                } @else {
                  {{ item.message }}
                }
              </div>
            </div>
          } @empty {
            @if (
              live.feedLoading('fingerprint') || live.feedLoading('topology')
            ) {
              <ao-loading-state
                title="Loading activity"
                message="Connecting to live feeds…"
              />
            } @else {
              <p class="text-sm text-neutral-500">No activity events yet.</p>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
    })
], ActivityPage);
export { ActivityPage };

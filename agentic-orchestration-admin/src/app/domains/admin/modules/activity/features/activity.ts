import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { ChangeSetStore } from '@/app/core/ao-changeset/changeset.store';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

type TimelineItem = {
  id: string;
  ts: string;
  kind: string;
  message: string;
  href?: string;
};

@Component({
  selector: 'ao-activity-page',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    RouterLink,
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
            <p class="text-sm text-neutral-500">Waiting for events…</p>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ActivityPage implements OnInit, OnDestroy {
  private api = inject(AoApi);
  protected changeset = inject(ChangeSetStore);
  private clipboard = inject(Clipboard);

  readonly fingerprint = signal<string | null>(null);
  readonly timeline = signal<TimelineItem[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFp: string | null = null;
  private lastAttention = '';

  ngOnInit() {
    this.poll();
    this.timer = setInterval(() => this.poll(), 15000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private poll() {
    this.api.fingerprint().subscribe((r) => {
      if (!r.ok) return;
      const fp = r.data.fingerprint;
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
    this.api.topology().subscribe((r) => {
      if (!r.ok) return;
      const attention = (r.data.attention || [])
        .map((a) => a.message)
        .join('|');
      if (this.lastAttention && this.lastAttention !== attention) {
        for (const a of r.data.attention || []) {
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
        for (const a of r.data.attention || []) {
          this.push({
            id: `att0-${a.message}`,
            ts: r.data.generatedAt || new Date().toISOString(),
            kind: 'topology',
            message: a.message || 'Attention',
            href: a.href,
          });
        }
      }
      this.lastAttention = attention;
    });
  }

  private push(item: TimelineItem) {
    this.timeline.update((list) => [item, ...list].slice(0, 100));
  }

  copyDiff() {
    this.clipboard.copy(this.changeset.exportDiff());
  }
}

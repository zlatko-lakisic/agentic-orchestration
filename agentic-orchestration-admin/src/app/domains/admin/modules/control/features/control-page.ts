import { DatePipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import {
  controlConfirmSpec,
  targetsInGroup,
  type ControlStatus,
  type ControlTarget,
} from '../data/control.model';
import { ControlConfirmDialog } from '../ui/control-confirm-dialog';

@Component({
  selector: 'ao-control-page',
  imports: [
    DatePipe,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    ErrorState,
    LoadingState,
    StatusChip,
  ],
  template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Control
          </div>
          <div class="text-neutral-500">
            Restart AO apps, the Kubernetes stack, or this server
            @if (status()?.hostname) {
              ({{ status()!.hostname }})
            }
          </div>
        </div>
        <button matButton="outlined" type="button" (click)="resync()">
          <mat-icon svgIcon="refresh-cw" />
          Resync
        </button>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (live.feedLoading('control')) {
        <ao-loading-state
          title="Loading control"
          message="Connecting to the live control feed…"
        />
      } @else {
      @if (flash()) {
        <mat-card appearance="outlined">
          <mat-card-content class="pt-4 text-sm text-teal-800 dark:text-teal-200">
            {{ flash() }}
          </mat-card-content>
        </mat-card>
      }

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">Apps</div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-3 pt-2">
          <p class="text-sm text-neutral-500">
            Restarts the selected workload. Coordinator takes Admin offline for
            about a minute. Ollama is a host service, not a Kubernetes pod.
          </p>
          <div class="grid gap-3 md:grid-cols-2">
            @for (t of apps(); track t.id) {
              <div
                class="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="font-medium">{{ t.label }}</div>
                    <div class="text-sm text-neutral-500">{{ t.description }}</div>
                  </div>
                  <ao-status-chip
                    [status]="t.available ? 'healthy' : 'unset'"
                    [label]="t.available ? 'ready' : 'unavailable'"
                  />
                </div>
                @if (!t.available && t.reason) {
                  <p class="text-xs text-neutral-500">{{ t.reason }}</p>
                }
                <button
                  matButton="outlined"
                  type="button"
                  [disabled]="!t.available || busyId() === t.id"
                  (click)="restart(t)"
                >
                  <mat-icon svgIcon="refresh-cw" />
                  {{ busyId() === t.id ? 'Restarting…' : 'Restart' }}
                </button>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">Kubernetes stack</div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-3 pt-2">
          @if (stack(); as s) {
            <p class="text-sm text-neutral-500">{{ s.description }}</p>
            @if (s.members?.length) {
              <p class="font-mono text-xs text-neutral-500">
                {{ s.members!.join(' → ') }}
              </p>
            }
            @if (!s.available && s.reason) {
              <p class="text-xs text-neutral-500">{{ s.reason }}</p>
            }
            <button
              matButton="filled"
              type="button"
              [disabled]="!s.available || busyId() === s.id"
              (click)="restart(s)"
            >
              <mat-icon svgIcon="refresh-cw" />
              {{ busyId() === s.id ? 'Restarting…' : 'Restart stack' }}
            </button>
          }
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="flex w-full items-center justify-between gap-2">
            <div class="font-medium">This server</div>
            <ao-status-chip
              [status]="hostArmed() ? 'healthy' : 'unset'"
              [label]="hostArmed() ? 'watcher armed' : 'watcher not armed'"
            />
          </div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-3 pt-2">
          @if (host(); as h) {
            <p class="text-sm text-neutral-500">{{ h.description }}</p>
            @if (!h.available && h.reason) {
              <p class="text-xs text-neutral-500">{{ h.reason }}</p>
            }
            <button
              matButton="filled"
              class="self-start"
              type="button"
              [disabled]="!h.available || busyId() === h.id"
              (click)="restart(h)"
            >
              <mat-icon svgIcon="power" />
              {{ busyId() === h.id ? 'Requesting reboot…' : 'Reboot server' }}
            </button>
          }
        </mat-card-content>
      </mat-card>

      @if (status()?.lastAction; as last) {
        <p class="text-xs text-neutral-500">
          Last action: {{ last.target }}
          @if (last.requestedAt || last.at) {
            · {{ (last.requestedAt || last.at) | date: 'medium' }}
          }
        </p>
      }
      }
    </div>
  `,
})
export class ControlPage implements OnInit, OnDestroy {
  private readonly api = inject(AoApi);
  readonly live = inject(AoLiveWs);
  private readonly dialog = inject(MatDialog);

  readonly status = computed(
    () =>
      (this.live.feeds()['control'] as ControlStatus | undefined) || null,
  );
  readonly actionError = signal<string | null>(null);
  readonly error = computed(() => {
    const e =
      this.actionError() ||
      this.live.feedErrors()['control'] ||
      this.live.feedErrors()['_'];
    return e || null;
  });
  readonly flash = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly apps = computed(() => targetsInGroup(this.status()?.targets, 'apps'));
  readonly stack = computed(
    () => targetsInGroup(this.status()?.targets, 'stack')[0] || null
  );
  readonly host = computed(
    () => targetsInGroup(this.status()?.targets, 'host')[0] || null
  );
  readonly hostArmed = computed(() => Boolean(this.status()?.hostControl?.armed));

  ngOnInit() {
    this.live.acquire({ feeds: ['control'], feedIntervalMs: 4000 });
  }

  ngOnDestroy() {
    this.live.release();
  }

  resync() {
    this.live.setFeedParams({});
  }

  reload() {
    this.resync();
  }

  restart(target: ControlTarget) {
    if (!target.available || this.busyId()) return;
    const spec = controlConfirmSpec(target, this.status()?.hostname);
    this.dialog
      .open(ControlConfirmDialog, { data: spec, width: '480px' })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(target.id);
        this.flash.set(null);
        this.api
          .controlRestart({
            target: target.id,
            confirm: spec.phrase || undefined,
          })
          .subscribe((r) => {
            this.busyId.set(null);
            if (!r.ok) {
              this.actionError.set(r.message);
              return;
            }
            this.actionError.set(null);
            const disconnect = r.data.disconnectLikely
              ? ' Admin may disconnect while the coordinator rolls.'
              : '';
            this.flash.set(
              `Requested ${target.label}.${disconnect}`.trim()
            );
            this.reload();
          });
      });
  }
}

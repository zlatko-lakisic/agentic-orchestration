import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import {
  HostMetrics,
  PingResponse,
  SessionResponse,
  TopologyResponse,
} from '@/app/core/ao-api/types';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

/** Fuse Analytics dashboard shell: page header + mat-card grid. */
@Component({
  selector: 'ao-overview-page',
  imports: [
    RouterLink,
    StatusChip,
    ErrorState,
    MatButtonModule,
    MatIconModule,
    MatCard,
    MatCardContent,
    MatDivider,
    DecimalPipe,
  ],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Overview
          </div>
          <div class="text-neutral-500">
            Topology, host metrics, and what needs attention
          </div>
        </div>
        <div class="flex-auto"></div>
        <button
          matButton="outlined"
          type="button"
          (click)="reload()"
        >
          <mat-icon svgIcon="refresh-cw" />
          Refresh
        </button>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (c of topology()?.components || []; track c.id) {
          <mat-card
            class="overflow-hidden"
            appearance="outlined"
          >
            <div class="flex flex-col gap-y-2 p-6">
              <div class="flex items-center justify-between gap-2">
                <div class="truncate text-lg font-medium tracking-tight">
                  {{ c.label }}
                </div>
                <ao-status-chip [status]="c.status" />
              </div>
              <div class="font-mono text-xs text-neutral-500">
                @if (c.port) {
                  :{{ c.port }}
                }
                @if (c.nodePort) {
                  · NodePort {{ c.nodePort }}
                }
                @if (!c.port && !c.nodePort) {
                  —
                }
              </div>
              <div class="text-sm text-neutral-500 break-all">
                {{ c.fact || c.detail || '—' }}
              </div>
            </div>
          </mat-card>
        }
      </div>

      @if (topology()?.reachGuard; as rg) {
        <mat-card
          class="border-amber-500/40"
          appearance="outlined"
        >
          <mat-card-content class="flex items-start gap-x-3 py-4">
            <mat-icon
              class="text-amber-500"
              svgIcon="octagon-alert"
            />
            <div class="text-sm">{{ rg.message }}</div>
          </mat-card-content>
        </mat-card>
      }

      <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <mat-card appearance="outlined">
          <div class="flex flex-col gap-y-2 p-6 pb-4">
            <div class="text-lg font-medium tracking-tight">Web process</div>
            <div class="text-4xl font-semibold tabular-nums">
              {{ ping()?.service || '—' }}
            </div>
            <div class="text-sm text-neutral-500">
              pid {{ ping()?.pid ?? '—' }} ·
              <span class="font-mono">{{ ping()?.instance || '—' }}</span>
            </div>
          </div>
          <mat-divider />
          <mat-card-content class="grid gap-3 py-4 font-mono text-xs">
            <div class="flex justify-between gap-4">
              <span class="text-neutral-500">user</span>
              <span>{{ session()?.userName || '—' }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-neutral-500">session</span>
              <span class="truncate">{{ session()?.sessionId || '—' }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <div class="flex flex-col gap-y-2 p-6 pb-4">
            <div class="text-lg font-medium tracking-tight">Host metrics</div>
            @if (metrics(); as m) {
              <div class="text-4xl font-semibold tabular-nums">
                {{ m.cpu?.percent ?? '—'
                }}<span class="text-2xl text-neutral-500">%</span>
              </div>
              <div class="text-sm text-neutral-500">
                CPU · scope {{ m.scope || '—' }}
              </div>
            } @else {
              <div class="text-sm text-neutral-500">Metrics unavailable</div>
            }
          </div>
          @if (metrics(); as m) {
            <mat-divider />
            <mat-card-content class="grid gap-3 py-4 font-mono text-xs">
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">memory</span>
                <span
                  >{{
                    m.memory?.usedPercent ?? m.memory?.percent ?? '—'
                  }}%</span
                >
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">load</span>
                <span>{{ (m.loadAvg || []).join(' · ') || '—' }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-neutral-500">uptime</span>
                <span>{{ m.uptimeSec | number: '1.0-0' }}s</span>
              </div>
            </mat-card-content>
          }
        </mat-card>
      </div>

      <mat-card appearance="outlined">
        <div class="flex items-center justify-between gap-x-4 p-6 pb-0">
          <div class="text-xl font-semibold sm:text-2xl">Needs attention</div>
        </div>
        <mat-card-content class="flex flex-col gap-y-2 py-6">
          @for (a of topology()?.attention || []; track a.message) {
            <div
              class="flex items-start gap-x-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
            >
              <ao-status-chip
                [status]="a.severity === 'warning' ? 'degraded' : 'info'"
              />
              <div class="min-w-0 flex-auto">
                <div class="text-sm">{{ a.message }}</div>
                @if (a.href) {
                  <a
                    class="mt-1 inline-block text-xs text-primary-600 hover:underline"
                    [routerLink]="a.href"
                    >Open</a
                  >
                }
              </div>
            </div>
          } @empty {
            <div class="text-sm text-neutral-500">Nothing flagged</div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class OverviewPage implements OnInit {
  private api = inject(AoApi);
  readonly topology = signal<TopologyResponse | null>(null);
  readonly ping = signal<PingResponse | null>(null);
  readonly session = signal<SessionResponse | null>(null);
  readonly metrics = signal<HostMetrics | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.error.set(null);
    this.api.topology().subscribe((r) => {
      if (r.ok) this.topology.set(r.data);
      else this.error.set(r.message);
    });
    this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
    this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
    this.api.hostMetrics().subscribe((r) => r.ok && this.metrics.set(r.data));
  }
}

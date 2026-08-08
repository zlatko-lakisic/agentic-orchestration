import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { HostMetrics, PingResponse, SessionResponse, TopologyResponse } from '@/app/core/ao-api/types';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-overview-page',
  imports: [RouterLink, StatusChip, ErrorState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Overview</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Topology, host metrics, and what needs attention
        </p>
      </header>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      <section class="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        @for (c of topology()?.components || []; track c.id) {
          <div class="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-medium">{{ c.label }}</div>
              <ao-status-chip [status]="c.status" />
            </div>
            <div class="mt-2 font-mono text-xs text-neutral-400">
              @if (c.port) { :{{ c.port }} }
              @if (c.nodePort) { · NodePort {{ c.nodePort }} }
            </div>
            <div class="mt-2 text-xs text-neutral-500 break-all">{{ c.fact || c.detail || '—' }}</div>
          </div>
        }
      </section>

      @if (topology()?.reachGuard; as rg) {
        <div class="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {{ rg.message }}
        </div>
      }

      <section class="mb-8 grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-neutral-800 p-4">
          <h2 class="mb-3 text-md font-medium">Web process</h2>
          <dl class="space-y-2 font-mono text-xs">
            <div class="flex justify-between gap-4"><dt class="text-neutral-500">service</dt><dd>{{ ping()?.service || '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-neutral-500">pid</dt><dd>{{ ping()?.pid || '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-neutral-500">instance</dt><dd class="truncate">{{ ping()?.instance || '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-neutral-500">user</dt><dd>{{ session()?.userName || '—' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-neutral-500">session</dt><dd class="truncate">{{ session()?.sessionId || '—' }}</dd></div>
          </dl>
        </div>
        <div class="rounded-lg border border-neutral-800 p-4">
          <h2 class="mb-3 text-md font-medium">Host metrics</h2>
          @if (metrics()) {
            <dl class="space-y-2 font-mono text-xs">
              <div class="flex justify-between gap-4"><dt class="text-neutral-500">scope</dt><dd>{{ metrics()?.scope || '—' }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-neutral-500">cpu</dt><dd>{{ metrics()?.cpu?.percent ?? '—' }}%</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-neutral-500">memory</dt><dd>{{ metrics()?.memory?.usedPercent ?? metrics()?.memory?.percent ?? '—' }}%</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-neutral-500">load</dt><dd>{{ (metrics()?.loadAvg || []).join(' · ') || '—' }}</dd></div>
            </dl>
          } @else {
            <p class="text-sm text-neutral-500">Metrics unavailable</p>
          }
        </div>
      </section>

      <section>
        <h2 class="mb-3 text-md font-medium">Needs attention</h2>
        <ul class="space-y-2">
          @for (a of topology()?.attention || []; track a.message) {
            <li class="flex items-start gap-3 rounded-md border border-neutral-800 px-3 py-2 text-sm">
              <ao-status-chip [status]="a.severity === 'warning' ? 'degraded' : 'info'" />
              <div>
                <div>{{ a.message }}</div>
                @if (a.href) {
                  <a class="mt-1 inline-block text-xs text-primary-400 hover:underline" [routerLink]="a.href">Open</a>
                }
              </div>
            </li>
          } @empty {
            <li class="text-sm text-neutral-500">Nothing flagged</li>
          }
        </ul>
      </section>
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
    this.api.topology().subscribe((r) => {
      if (r.ok) this.topology.set(r.data);
      else this.error.set(r.message);
    });
    this.api.ping().subscribe((r) => r.ok && this.ping.set(r.data));
    this.api.session().subscribe((r) => r.ok && this.session.set(r.data));
    this.api.hostMetrics().subscribe((r) => r.ok && this.metrics.set(r.data));
  }
}

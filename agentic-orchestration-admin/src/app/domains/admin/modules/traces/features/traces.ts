import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AoApi } from '@/app/core/ao-api/ao-api';
import {
  RunTraceEvent,
  RunTraceResponse,
  TraceListItem,
} from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

type SequenceLane = { id: string; label: string };
type SequenceMessage = {
  from: string;
  to: string;
  kind: string;
  label: string;
  note?: string;
};

@Component({
  selector: 'ao-traces-page',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    RouterLink,
    EmptyState,
    ErrorState,
    StatusChip,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">Traces</div>
          <div class="text-neutral-500">
            Request sequence by
            <code class="text-primary-600 dark:text-primary-400">run_id</code>
            — planner, agents, MCP, skills
          </div>
        </div>
        <mat-form-field appearance="outline" class="w-full sm:w-96" subscriptSizing="dynamic">
          <mat-label>Open run_id</mat-label>
          <input
            matInput
            [ngModel]="lookupId()"
            (ngModelChange)="lookupId.set($event)"
            (keydown.enter)="openId(lookupId())"
            placeholder="paste run_id"
          />
          <button matIconButton matSuffix type="button" (click)="openId(lookupId())">
            <mat-icon svgIcon="search" />
          </button>
        </mat-form-field>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (detail(); as d) {
        <section
          class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
        >
          <header
            class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div class="min-w-0">
              <div class="truncate font-mono text-sm font-medium tracking-tight sm:text-md">
                {{ d.runId }}
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span>{{ d.eventCount || 0 }} events</span>
                @if (outcomeChip(); as chip) {
                  <ao-status-chip [status]="chip.status" [label]="chip.label" />
                }
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a
                matButton
                class="!rounded-lg !border !border-neutral-200 !shadow-none dark:!border-neutral-700"
                routerLink="/runs"
                [queryParams]="{ id: d.runId }"
              >
                Runs detail
              </a>
              <a
                matButton
                class="!rounded-lg !border !border-neutral-200 !shadow-none dark:!border-neutral-700"
                routerLink="/overview"
                [queryParams]="{ runId: d.runId }"
              >
                Filtered logs
              </a>
              <button
                matIconButton
                type="button"
                class="!text-neutral-500"
                title="Close"
                (click)="clearDetail()"
              >
                <mat-icon svgIcon="x" />
              </button>
            </div>
          </header>

          <div
            class="border-b border-neutral-200 bg-neutral-50/80 px-5 py-5 dark:border-neutral-800 dark:bg-neutral-950/50"
          >
            <div class="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Participants
            </div>
            <div class="mb-5 flex flex-wrap gap-2">
              @for (lane of lanes(); track lane.id) {
                <span
                  class="inline-flex items-center rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-primary-700 uppercase shadow-sm dark:border-primary-900/50 dark:bg-neutral-900 dark:text-primary-300"
                >
                  {{ lane.label }}
                </span>
              }
            </div>

            <div class="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Sequence
            </div>
            @if (messages().length) {
              <ol class="space-y-3">
                @for (msg of messages(); track $index) {
                  <li
                    class="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="rounded-lg bg-neutral-100 px-2 py-1 font-mono text-2xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        {{ laneLabel(msg.from) }}
                      </span>
                      <mat-icon
                        class="!size-4 !text-primary-500"
                        svgIcon="arrow-right"
                      />
                      <span
                        class="rounded-lg bg-neutral-100 px-2 py-1 font-mono text-2xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        {{ laneLabel(msg.to) }}
                      </span>
                      <ao-status-chip [status]="kindStatus(msg.kind)" [label]="msg.kind" />
                    </div>
                    <div class="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                      {{ msg.label }}
                    </div>
                    @if (msg.note) {
                      <div
                        class="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
                      >
                        {{ msg.note }}
                      </div>
                    }
                  </li>
                }
              </ol>
            } @else {
              <div class="text-sm text-neutral-500">No sequence events for this run.</div>
            }
          </div>

          @if (d.events?.length) {
            <div class="px-5 py-5">
              <div class="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Event log
              </div>
              <ol class="space-y-2">
                @for (ev of d.events; track $index) {
                  <li
                    class="flex flex-wrap items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/50"
                  >
                    <span class="shrink-0 font-mono text-2xs text-neutral-500">
                      {{ formatTs(ev) }}
                    </span>
                    <ao-status-chip [status]="kindStatus(ev.kind)" [label]="ev.kind || null" />
                    <span class="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                      {{ ev.actor || '—' }}
                    </span>
                    @if (ev.message) {
                      <span class="min-w-0 flex-1 text-xs text-neutral-500">{{ ev.message }}</span>
                    }
                  </li>
                }
              </ol>
            </div>
          }
        </section>
      }

      @if (!dataSource.data.length && !error() && !detail()) {
        <ao-empty-state
          message="No run traces yet. Complete a dynamic/chat run to populate __orchestrator_run_traces__."
        />
      } @else if (dataSource.data.length) {
        <section
          class="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div
            class="border-b border-neutral-200 px-5 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:border-neutral-800"
          >
            Recent runs
          </div>
          <table mat-table [dataSource]="dataSource" class="w-full">
            <ng-container matColumnDef="runId">
              <th mat-header-cell *matHeaderCellDef>run_id</th>
              <td mat-cell *matCellDef="let r">
                <button
                  class="font-mono text-sm text-primary-700 underline-offset-2 hover:underline dark:text-primary-400"
                  type="button"
                  (click)="openId(r.runId)"
                >
                  {{ r.runId }}
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="events">
              <th mat-header-cell *matHeaderCellDef>Events</th>
              <td mat-cell *matCellDef="let r" class="tabular-nums">{{ r.eventCount ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="last">
              <th mat-header-cell *matHeaderCellDef>Last</th>
              <td mat-cell *matCellDef="let r" class="text-sm">
                <div class="flex flex-wrap items-center gap-2">
                  @if (r.lastKind) {
                    <ao-status-chip [status]="kindStatus(r.lastKind)" [label]="r.lastKind" />
                  }
                  @if (r.lastMessage) {
                    <span class="text-neutral-500">{{ r.lastMessage }}</span>
                  }
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="updated">
              <th mat-header-cell *matHeaderCellDef>Updated</th>
              <td mat-cell *matCellDef="let r" class="font-mono text-sm text-neutral-500">
                {{ r.updatedAt || '—' }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
              class="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5"
              (click)="openId(row.runId)"
            ></tr>
          </table>
        </section>
      }
    </div>
  `,
})
export class TracesPage implements OnInit {
  private api = inject(AoApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly detail = signal<RunTraceResponse | null>(null);
  readonly lookupId = signal('');
  readonly columns = ['runId', 'events', 'last', 'updated'];
  readonly dataSource = new MatTableDataSource<TraceListItem>([]);

  readonly lanes = computed(() => this.buildLanes(this.detail()?.events || []));
  readonly messages = computed(() => this.buildMessages(this.detail()?.events || []));
  readonly outcomeChip = computed(() => {
    const events = this.detail()?.events || [];
    const last = events[events.length - 1];
    if (!last) return null;
    return { status: this.kindStatus(last.kind), label: String(last.kind || 'event') };
  });

  ngOnInit() {
    this.api.traces(80).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.dataSource.data = r.data.runs || [];
    });
    const q =
      String(this.route.snapshot.queryParamMap.get('runId') || '').trim() ||
      String(this.route.snapshot.queryParamMap.get('id') || '').trim();
    if (q) this.openId(q);
  }

  openId(id: string) {
    const rid = String(id || '').trim();
    if (!rid) return;
    this.lookupId.set(rid);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { runId: rid },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.api.runTrace(rid).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.detail.set(r.data);
    });
  }

  clearDetail() {
    this.detail.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { runId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  formatTs(ev: RunTraceEvent): string {
    const t = Number(ev.ts);
    if (!Number.isFinite(t)) return '—';
    return new Date(t * 1000).toISOString();
  }

  kindStatus(kind: string | null | undefined): string {
    const k = String(kind || '').toLowerCase();
    if (k === 'run_end' || k === 'step_end' || k === 'select') return 'succeeded';
    if (k === 'run_error' || k === 'step_fail') return 'failed';
    if (k === 'plan' || k === 'request_start') return 'info';
    if (k === 'step_start') return 'running';
    return 'unset';
  }

  laneLabel(id: string): string {
    const lane = this.lanes().find((l) => l.id === id);
    return lane?.label || id;
  }

  private laneId(actor: string): string {
    const a = String(actor || 'orchestrator').trim() || 'orchestrator';
    return a.replace(/[^a-zA-Z0-9:_-]+/g, '_').slice(0, 48);
  }

  private buildLanes(events: RunTraceEvent[]): SequenceLane[] {
    const order: string[] = ['client', 'orchestrator'];
    const seen = new Set(order);
    for (const ev of events) {
      const actor = this.laneId(String(ev.actor || 'orchestrator'));
      if (!seen.has(actor)) {
        seen.add(actor);
        order.push(actor);
      }
      const detail = ev.detail && typeof ev.detail === 'object' ? ev.detail : {};
      const agents = Array.isArray((detail as { agents?: unknown }).agents)
        ? ((detail as { agents: unknown[] }).agents as unknown[])
        : [];
      for (const ag of agents.slice(0, 6)) {
        const id = this.laneId(`agent:${ag}`);
        if (!seen.has(id)) {
          seen.add(id);
          order.push(id);
        }
      }
      if (
        Array.isArray((detail as { mcps?: unknown }).mcps) &&
        (detail as { mcps: unknown[] }).mcps.length &&
        !seen.has('mcp')
      ) {
        seen.add('mcp');
        order.push('mcp');
      }
      if (
        Array.isArray((detail as { skills?: unknown }).skills) &&
        (detail as { skills: unknown[] }).skills.length &&
        !seen.has('skills')
      ) {
        seen.add('skills');
        order.push('skills');
      }
    }
    return order.map((id) => ({
      id,
      label: id.replace(/^agent:/, '').replace(/_/g, ' '),
    }));
  }

  private buildMessages(events: RunTraceEvent[]): SequenceMessage[] {
    const out: SequenceMessage[] = [];
    let prev = 'client';
    const known = new Set(this.buildLanes(events).map((l) => l.id));
    for (const ev of events) {
      const actor = this.laneId(String(ev.actor || 'orchestrator'));
      const kind = String(ev.kind || 'event');
      const msg = String(ev.message || kind).replace(/\s+/g, ' ').trim().slice(0, 120);
      const detail = ev.detail && typeof ev.detail === 'object' ? ev.detail : {};
      if (kind === 'request_start') {
        out.push({
          from: 'client',
          to: known.has(actor) ? actor : 'orchestrator',
          kind,
          label: msg || 'request',
        });
        prev = known.has(actor) ? actor : 'orchestrator';
      } else if (kind === 'plan') {
        out.push({
          from: prev,
          to: actor,
          kind,
          label: 'plan',
          note: msg || undefined,
        });
        const agents = Array.isArray((detail as { agents?: unknown }).agents)
          ? ((detail as { agents: unknown[] }).agents as unknown[])
          : [];
        for (const ag of agents.slice(0, 6)) {
          const aid = this.laneId(`agent:${ag}`);
          out.push({ from: actor, to: aid, kind: 'select', label: `select ${ag}` });
        }
        prev = actor;
      } else if (kind === 'run_end' || kind === 'run_error') {
        out.push({
          from: actor,
          to: 'client',
          kind,
          label: msg || kind,
        });
        prev = 'client';
      } else {
        out.push({
          from: prev,
          to: known.has(actor) ? actor : prev,
          kind,
          label: msg || kind,
        });
        prev = known.has(actor) ? actor : prev;
      }
    }
    return out;
  }
}

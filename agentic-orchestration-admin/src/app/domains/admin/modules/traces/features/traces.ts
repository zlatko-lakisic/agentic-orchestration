import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
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

declare global {
  interface Window {
    mermaid?: {
      initialize: (cfg: Record<string, unknown>) => void;
      run: (opts: { nodes: HTMLElement[] }) => Promise<void>;
    };
  }
}

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
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-height: 0;
      }

      :host ::ng-deep .ao-mermaid-host svg {
        max-width: 100%;
        height: auto;
      }

      :host ::ng-deep .ao-mermaid-host .actor > rect,
      :host ::ng-deep .ao-mermaid-host rect.actor {
        rx: 10;
        ry: 10;
      }
    `,
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
              Sequence
            </div>
            <div
              #mermaidHost
              class="ao-mermaid-host overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <pre class="mermaid whitespace-pre">{{ d.mermaid || '' }}</pre>
            </div>
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
  @ViewChild('mermaidHost') mermaidHost?: ElementRef<HTMLElement>;

  readonly error = signal<string | null>(null);
  readonly detail = signal<RunTraceResponse | null>(null);
  readonly lookupId = signal('');
  readonly columns = ['runId', 'events', 'last', 'updated'];
  readonly dataSource = new MatTableDataSource<TraceListItem>([]);
  private mermaidReady = false;

  readonly outcomeChip = computed(() => {
    const events = this.detail()?.events || [];
    const last = events[events.length - 1];
    if (!last) return null;
    return { status: this.kindStatus(last.kind), label: String(last.kind || 'event') };
  });

  constructor() {
    afterNextRender(() => this.renderMermaid());
  }

  ngOnInit() {
    this.ensureMermaid();
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
      queueMicrotask(() => this.renderMermaid());
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
    if (k === 'run_end' || k === 'step_end') return 'succeeded';
    if (k === 'run_error' || k === 'step_fail') return 'failed';
    if (k === 'plan' || k === 'request_start') return 'info';
    if (k === 'step_start') return 'running';
    return 'unset';
  }

  private cssVar(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  private fuseMermaidTheme(): Record<string, unknown> {
    const dark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    const primary = this.cssVar('--color-primary-500', dark ? '#3b82f6' : '#2563eb');
    const primarySoft = this.cssVar('--color-primary-900', dark ? '#1e3a8a' : '#1e40af');
    const surface = dark ? '#0a0a0a' : '#ffffff';
    const panel = dark ? '#171717' : '#f5f5f5';
    const actor = dark ? '#262626' : '#ffffff';
    const text = dark ? '#f5f5f5' : '#171717';
    const muted = dark ? '#a3a3a3' : '#525252';
    const line = dark ? '#737373' : '#a3a3a3';
    return {
      startOnLoad: false,
      theme: dark ? 'dark' : 'base',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: dark,
        background: surface,
        primaryColor: actor,
        primaryTextColor: text,
        primaryBorderColor: primary,
        secondaryColor: panel,
        tertiaryColor: panel,
        secondaryTextColor: text,
        tertiaryTextColor: muted,
        lineColor: primary,
        textColor: text,
        mainBkg: actor,
        nodeBorder: primary,
        clusterBkg: panel,
        titleColor: text,
        actorBkg: actor,
        actorBorder: primary,
        actorTextColor: text,
        actorLineColor: line,
        signalColor: primary,
        signalTextColor: text,
        labelBoxBkgColor: panel,
        labelBoxBorderColor: line,
        labelTextColor: muted,
        loopTextColor: muted,
        noteBkgColor: primarySoft,
        noteTextColor: text,
        noteBorderColor: primary,
        activationBkgColor: panel,
        activationBorderColor: primary,
        sequenceNumberColor: text,
      },
      sequence: {
        actorMargin: 28,
        mirrorActors: true,
        bottomMarginAdj: 8,
        messageMargin: 40,
        noteMargin: 10,
        useMaxWidth: true,
      },
    };
  }

  private ensureMermaid() {
    if (typeof document === 'undefined') return;
    if (window.mermaid) {
      this.initMermaid();
      return;
    }
    const existing = document.querySelector('script[data-ao-mermaid]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.async = true;
    s.dataset['aoMermaid'] = '1';
    s.onload = () => {
      this.initMermaid();
      this.renderMermaid();
    };
    document.head.appendChild(s);
  }

  private initMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize(this.fuseMermaidTheme());
    this.mermaidReady = true;
  }

  private async renderMermaid() {
    const host = this.mermaidHost?.nativeElement;
    const d = this.detail();
    if (!host || !d?.mermaid) return;
    if (!window.mermaid) {
      this.ensureMermaid();
      return;
    }
    this.initMermaid();
    const pre = host.querySelector('.mermaid');
    if (!pre) return;
    // Mermaid mutates the node; rebuild a clean source node each render.
    const next = document.createElement('pre');
    next.className = 'mermaid whitespace-pre';
    next.textContent = d.mermaid;
    pre.replaceWith(next);
    try {
      await window.mermaid.run({ nodes: [next] });
    } catch {
      /* keep raw mermaid text */
    }
  }
}

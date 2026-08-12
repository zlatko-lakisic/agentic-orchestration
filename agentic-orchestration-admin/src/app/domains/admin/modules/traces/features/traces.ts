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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import {
  applyTopologyStylesToMermaidSvg,
  enrichMermaidWithTopologyStyles,
  themeForTraceActor,
} from '@/app/domains/admin/modules/traces/data/trace-topology-theme';

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
    MatButtonToggleModule,
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
        /* Do not force max-width — Mermaid useMaxWidth:false needs natural width to avoid clipping. */
        height: auto;
        display: block;
        min-width: max-content;
      }

      :host ::ng-deep .ao-mermaid-host .actor > rect,
      :host ::ng-deep .ao-mermaid-host rect.actor {
        rx: 8;
        ry: 8;
      }
    `,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">Traces</div>
          <div class="text-neutral-500">
            Run boundaries and recorded spans by
            <code class="text-primary-600 dark:text-primary-400">run_id</code>.
            Model/tool/MCP/QA call spans are not instrumented yet.
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
            class="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div class="min-w-0 space-y-1">
              <div class="truncate font-mono text-sm font-medium tracking-tight sm:text-md">
                {{ d.runId }}
              </div>
              <div class="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span>{{ d.eventCount || 0 }} events</span>
                @if (formatDuration(d.durationMs); as dur) {
                  <span>· {{ dur }}</span>
                }
                @if (runMode(d); as mode) {
                  <span>· {{ mode }}</span>
                }
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

          @if (d.instrumentation; as inst) {
            <div
              class="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <div class="font-medium">{{ inst.summary }}</div>
              @if ((inst.missing || []).length) {
                <div class="mt-1 text-xs opacity-90">
                  Not in this run:
                  {{ (inst.missing || []).join(', ') }}.
                  Never instrumented:
                  {{ (inst.notInstrumented || []).join(', ') || '—' }}.
                </div>
              }
            </div>
          }

          <div class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Sequence
              </div>
              <mat-button-toggle-group
                [value]="viewMode()"
                (change)="onViewMode($event.value)"
                class="!h-8"
                hideSingleSelectionIndicator
              >
                <mat-button-toggle value="diagram">Diagram</mat-button-toggle>
                <mat-button-toggle value="table">Table</mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            @if (viewMode() === 'diagram') {
              <div
                #mermaidHost
                class="ao-mermaid-host overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <pre class="mermaid whitespace-pre">{{ d.mermaid || '' }}</pre>
              </div>
              <div
                class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-neutral-500"
              >
                @for (item of actorLegend(d); track item.label) {
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class="inline-block h-2.5 w-2.5 rounded-sm"
                      [style.background]="item.accent"
                    ></span>
                    {{ item.label }}
                  </span>
                }
              </div>
            } @else {
              <div
                class="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"
              >
                <table mat-table [dataSource]="eventRows" class="w-full">
                  <ng-container matColumnDef="ts">
                    <th mat-header-cell *matHeaderCellDef>Time</th>
                    <td mat-cell *matCellDef="let ev" class="font-mono text-2xs text-neutral-500">
                      {{ formatTs(ev) }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="kind">
                    <th mat-header-cell *matHeaderCellDef>Kind</th>
                    <td mat-cell *matCellDef="let ev">
                      <ao-status-chip [status]="kindStatus(ev.kind)" [label]="ev.kind || null" />
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actor">
                    <th mat-header-cell *matHeaderCellDef>Actor</th>
                    <td mat-cell *matCellDef="let ev" class="text-sm">{{ ev.actor || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="message">
                    <th mat-header-cell *matHeaderCellDef>Message</th>
                    <td mat-cell *matCellDef="let ev" class="max-w-xl truncate text-sm text-neutral-500">
                      {{ ev.message || '—' }}
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="eventColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: eventColumns"></tr>
                </table>
              </div>
            }
          </div>

          @if (d.events?.length && viewMode() === 'diagram') {
            <div class="px-5 py-4">
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
                    <span
                      class="inline-flex items-center gap-1.5 rounded-lg border bg-white py-0.5 pr-2 pl-1 text-2xs font-medium text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                      [style.border-color]="actorAccent(ev.actor)"
                    >
                      <span
                        class="inline-block h-3.5 w-1 shrink-0 rounded-sm"
                        [style.background]="actorAccent(ev.actor)"
                      ></span>
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
          message="No run traces yet. Complete a chat or engine run to populate __orchestrator_run_traces__."
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
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef>Duration</th>
              <td mat-cell *matCellDef="let r" class="tabular-nums text-sm text-neutral-500">
                {{ formatDuration(r.durationMs) || '—' }}
              </td>
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
  readonly viewMode = signal<'diagram' | 'table'>('diagram');
  readonly columns = ['runId', 'events', 'duration', 'last', 'updated'];
  readonly eventColumns = ['ts', 'kind', 'actor', 'message'];
  readonly dataSource = new MatTableDataSource<TraceListItem>([]);
  readonly eventRows = new MatTableDataSource<RunTraceEvent>([]);

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
      this.eventRows.data = r.data.events || [];
      queueMicrotask(() => this.renderMermaid());
    });
  }

  clearDetail() {
    this.detail.set(null);
    this.eventRows.data = [];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { runId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onViewMode(mode: 'diagram' | 'table') {
    this.viewMode.set(mode);
    if (mode === 'diagram') {
      queueMicrotask(() => this.renderMermaid());
    }
  }

  formatTs(ev: RunTraceEvent): string {
    const t = Number(ev.ts);
    if (!Number.isFinite(t)) return '—';
    return new Date(t * 1000).toISOString();
  }

  formatDuration(ms: number | null | undefined): string | null {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(ms >= 10_000 ? 1 : 2)}s`;
  }

  runMode(d: RunTraceResponse): string | null {
    for (const ev of d.events || []) {
      const mode = ev.detail?.['mode'];
      if (typeof mode === 'string' && mode.trim()) return mode.trim();
    }
    return null;
  }

  kindStatus(kind: string | null | undefined): string {
    const k = String(kind || '').toLowerCase();
    if (k === 'run_end' || k === 'step_end' || k === 'agent_end') return 'succeeded';
    if (k === 'run_error' || k === 'step_fail') return 'failed';
    if (k === 'plan' || k === 'request_start') return 'info';
    if (k === 'step_start' || k === 'agent_start') return 'running';
    return 'unset';
  }

  actorAccent(actor: string | null | undefined): string {
    return themeForTraceActor(String(actor || '')).accent;
  }

  actorLegend(d: RunTraceResponse): { label: string; accent: string }[] {
    const seen = new Set<string>();
    const out: { label: string; accent: string }[] = [];
    const add = (raw: string) => {
      const a = String(raw || '').trim();
      if (!a || seen.has(a)) return;
      seen.add(a);
      const theme = themeForTraceActor(a);
      out.push({ label: `${a} · ${theme.aspect}`, accent: theme.accent });
    };
    add('client');
    for (const ev of d.events || []) add(String(ev.actor || ''));
    return out;
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
    const surface = dark ? '#0a0a0a' : '#fafafa';
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
        mirrorActors: false,
        bottomMarginAdj: 4,
        messageMargin: 28,
        noteMargin: 8,
        useMaxWidth: false,
        diagramMarginX: 16,
        diagramMarginY: 12,
        width: 160,
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
  }

  private async renderMermaid() {
    if (this.viewMode() !== 'diagram') return;
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
    const next = document.createElement('pre');
    next.className = 'mermaid whitespace-pre';
    next.textContent = enrichMermaidWithTopologyStyles(d.mermaid);
    pre.replaceWith(next);
    try {
      await window.mermaid.run({ nodes: [next] });
      const svg = host.querySelector('svg');
      if (svg instanceof SVGSVGElement) {
        applyTopologyStylesToMermaidSvg(svg);
        // Ensure viewBox / width allow horizontal scroll instead of clipping
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts.every(Number.isFinite)) {
            svg.removeAttribute('width');
            svg.style.width = `${parts[2]}px`;
            svg.style.maxWidth = 'none';
          }
        }
      }
    } catch {
      /* keep raw mermaid text */
    }
  }
}

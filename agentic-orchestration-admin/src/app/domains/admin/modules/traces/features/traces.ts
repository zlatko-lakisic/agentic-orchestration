import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import {
  RunTraceEvent,
  RunTraceResponse,
  TraceListItem,
  TracesListResponse,
} from '@/app/core/ao-api/types';
import { AoClock } from '@/app/core/ao-time/ao-time';
import { AoAbsoluteTimePipe, AoTimeAgoPipe } from '@/app/core/ao-time/ao-time-ago.pipe';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
import {
  applyTopologyStylesToMermaidSvg,
  isAoDarkScheme,
  svgSafeColor,
  themeForTraceActor,
  topologyPanelCanvas,
  topologyPanelMuted,
  topologyPanelSurface,
  topologyPanelText,
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
    NgClass,
    NgTemplateOutlet,
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
    LoadingState,
    StatusChip,
    AoTimeAgoPipe,
    AoAbsoluteTimePipe,
  ],
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-height: 0;
      }

      :host ::ng-deep .ao-mermaid-host {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }

      /* Keep SVG at natural diagram width so the host scrolls when wider than the card. */
      :host ::ng-deep .ao-mermaid-host .mermaid {
        display: block;
        width: max-content;
        max-width: none;
        min-width: 100%;
        margin-inline: auto;
      }

      :host ::ng-deep .ao-mermaid-host svg {
        display: block;
        height: auto;
        max-width: none;
        width: auto;
        margin-inline: auto;
      }

      :host ::ng-deep .ao-mermaid-host .actor > rect,
      :host ::ng-deep .ao-mermaid-host rect.actor {
        rx: 8;
        ry: 8;
      }

      /* Colspanned detail cell must respect table width or the SVG expands the row. */
      :host ::ng-deep tr.ao-trace-detail-row > td {
        padding: 0 !important;
        border-bottom-width: 0;
        max-width: 0;
      }

      .ao-trace-expand {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 280ms ease;
      }

      .ao-trace-expand--open {
        grid-template-rows: 1fr;
      }

      .ao-trace-expand__inner {
        overflow: hidden;
        min-height: 0;
        min-width: 0;
      }

      /* Grow vertically for Mermaid; keep horizontal scroll on the diagram host. */
      .ao-trace-expand--open .ao-trace-expand__inner {
        overflow: visible;
        min-height: auto;
      }

      .ao-trace-sequence {
        min-width: 0;
        max-width: 100%;
      }
    `,
  ],
  template: `
    <div class="mx-auto flex w-full min-w-0 max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">Traces</div>
          <div class="text-neutral-500">
            Run boundaries, crew decisions, tool/MCP/QA and model spans by
            <code class="text-primary-600 dark:text-primary-400">run_id</code>.
            Times use your browser timezone.
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

      <div class="flex flex-wrap items-end gap-3">
        <mat-form-field appearance="outline" class="w-40" subscriptSizing="dynamic">
          <mat-label>Client</mat-label>
          <input
            matInput
            [ngModel]="filterClient()"
            (ngModelChange)="filterClient.set($event)"
            placeholder="app / user"
          />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-40" subscriptSizing="dynamic">
          <mat-label>Client IP</mat-label>
          <input
            matInput
            [ngModel]="filterClientIp()"
            (ngModelChange)="filterClientIp.set($event)"
            placeholder="ip substring"
          />
        </mat-form-field>
        <label class="mb-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            [ngModel]="filterCrewOnly()"
            (ngModelChange)="filterCrewOnly.set($event)"
          />
          Crew only
        </label>
        <button matButton="tonal" type="button" class="mb-2" (click)="reloadList()">
          Refresh
        </button>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (detail(); as d) {
        @if (detailOutsideFiltered()) {
          <section
            class="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
          >
            <ng-container *ngTemplateOutlet="traceDetailTpl; context: { $implicit: d }" />
          </section>
        }
      }

      @if (live.feedLoading('traces') && !allRuns().length) {
        <ao-loading-state
          title="Loading traces"
          message="Connecting to the live traces feed…"
        />
      } @else if (!allRuns().length && !error()) {
        <ao-empty-state
          message="No run traces yet. Complete a chat or engine run to populate __orchestrator_run_traces__."
        />
      } @else if (!filteredRuns().length && allRuns().length) {
        <ao-empty-state message="No traces match the current filters." />
      } @else if (filteredRuns().length) {
        <section
          class="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div
            class="border-b border-neutral-200 px-5 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:border-neutral-800"
          >
            Runs
            <span class="ml-2 font-normal normal-case tracking-normal text-neutral-400">
              {{ filteredRuns().length
              }}@if (filteredRuns().length !== allRuns().length) {
                of {{ allRuns().length }}
              }
            </span>
          </div>
          <table mat-table [dataSource]="dataSource" multiTemplateDataRows class="w-full">
            <ng-container matColumnDef="runId">
              <th mat-header-cell *matHeaderCellDef>run_id</th>
              <td mat-cell *matCellDef="let r">
                <button
                  class="font-mono text-sm text-primary-700 underline-offset-2 hover:underline dark:text-primary-400"
                  type="button"
                  (click)="toggleRow(r); $event.stopPropagation()"
                >
                  {{ r.runId }}
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="client">
              <th mat-header-cell *matHeaderCellDef>Client</th>
              <td mat-cell *matCellDef="let r" class="text-sm">
                <div>{{ r.appId || r.userName || r.userId || '—' }}</div>
                @if (r.appId && (r.userName || r.userId)) {
                  <div class="text-2xs text-neutral-500">{{ r.userName || r.userId }}</div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="clientIp">
              <th mat-header-cell *matHeaderCellDef>IP</th>
              <td mat-cell *matCellDef="let r" class="font-mono text-sm text-neutral-500">
                {{ r.clientIp || '—' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="started">
              <th mat-header-cell *matHeaderCellDef>Started</th>
              <td
                mat-cell
                *matCellDef="let r"
                class="text-sm text-neutral-500"
                [attr.title]="(r.startedAt || r.updatedAt) | aoAbsoluteTime"
              >
                {{ (r.startedAt || r.updatedAt) | aoTimeAgo: clock.nowMs() }}
              </td>
            </ng-container>
            <ng-container matColumnDef="tokens">
              <th mat-header-cell *matHeaderCellDef>Tokens</th>
              <td mat-cell *matCellDef="let r" class="tabular-nums text-sm">
                {{ r.totalTokens ?? '—' }}
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
              <td
                mat-cell
                *matCellDef="let r"
                class="text-sm text-neutral-500"
                [attr.title]="r.updatedAt | aoAbsoluteTime"
              >
                {{ r.updatedAt | aoTimeAgo: clock.nowMs() }}
              </td>
            </ng-container>

            <ng-container matColumnDef="expandedDetail">
              <td mat-cell *matCellDef="let r" [attr.colspan]="columns.length">
                <div
                  class="ao-trace-expand"
                  [class.ao-trace-expand--open]="
                    detail()?.runId === r.runId && expandOpen()
                  "
                  (click)="$event.stopPropagation()"
                >
                  <div class="ao-trace-expand__inner">
                    @if (detail(); as d) {
                      @if (d.runId === r.runId) {
                        <div
                          class="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          <ng-container
                            *ngTemplateOutlet="traceDetailTpl; context: { $implicit: d }"
                          />
                        </div>
                      }
                    }
                  </div>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns; trackBy: trackByRunId"
              class="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5"
              [attr.id]="'trace-row-' + row.runId"
              [ngClass]="
                detail()?.runId === row.runId ? 'bg-neutral-50 dark:bg-white/5' : ''
              "
              (click)="toggleRow(row)"
            ></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: ['expandedDetail']; when: isExpandedRow; trackBy: trackByRunId"
              class="ao-trace-detail-row"
            ></tr>
          </table>
        </section>
      }
    </div>

    <ng-template #traceDetailTpl let-d>
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
            @if (d.appId) {
              <span>· app {{ d.appId }}</span>
            }
            @if (d.userName || d.userId) {
              <span>· {{ d.userName || d.userId }}</span>
            }
            @if (d.clientIp) {
              <span>· {{ d.clientIp }}</span>
            }
            @if (d.totalTokens != null) {
              <span>· {{ d.totalTokens }} tok</span>
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
            (click)="$event.stopPropagation()"
          >
            Runs detail
          </a>
          <a
            matButton
            class="!rounded-lg !border !border-neutral-200 !shadow-none dark:!border-neutral-700"
            routerLink="/overview"
            [queryParams]="{ runId: d.runId }"
            (click)="$event.stopPropagation()"
          >
            Filtered logs
          </a>
          <button
            matIconButton
            type="button"
            class="!text-neutral-500"
            title="Close"
            (click)="clearDetail(); $event.stopPropagation()"
          >
            <mat-icon svgIcon="x" />
          </button>
        </div>
      </header>

      @if (d.instrumentation; as inst) {
        <div
          class="border-b px-5 py-3 text-sm"
          [class]="
            (inst.notInstrumented || []).length
              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300'
          "
        >
          <div class="font-medium">{{ inst.summary }}</div>
          @if ((inst.notInstrumented || []).length) {
            <div class="mt-1 text-xs opacity-90">
              Platform not yet emitting:
              {{ (inst.notInstrumented || []).join(', ') }}.
            </div>
          } @else if ((inst.missing || []).length) {
            <div class="mt-1 text-xs opacity-80">
              Not hit on this path (instrumented when those steps run):
              {{ (inst.missing || []).join(', ') }}.
            </div>
          }
        </div>
      }

      <div class="ao-trace-sequence border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Sequence
          </div>
          <div class="flex flex-wrap items-center gap-2" (click)="$event.stopPropagation()">
            <mat-button-toggle-group
              [value]="depthMode()"
              (change)="onDepthMode($event.value)"
              class="!h-8"
              hideSingleSelectionIndicator
            >
              <mat-button-toggle value="all">All</mat-button-toggle>
              <mat-button-toggle value="boundary">Boundary</mat-button-toggle>
              <mat-button-toggle value="decisions">Decisions</mat-button-toggle>
              <mat-button-toggle value="crew">Crew</mat-button-toggle>
              <mat-button-toggle value="tools">Tools</mat-button-toggle>
            </mat-button-toggle-group>
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
        </div>

        @if (viewMode() === 'diagram') {
          <div
            #mermaidHost
            class="ao-mermaid-host max-w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950"
          ></div>
          <div
            class="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs text-neutral-500"
          >
            @for (item of actorLegend(d); track item.label) {
              <span
                class="inline-flex items-center gap-1.5 rounded-lg border bg-white py-0.5 pr-2 pl-1 dark:bg-neutral-900"
                [style.border-color]="item.accent"
              >
                <span
                  class="inline-block h-3.5 w-1 shrink-0 rounded-sm"
                  [style.background]="item.accent"
                ></span>
                <mat-icon
                  class="!h-3.5 !w-3.5 !text-[14px]"
                  [svgIcon]="item.icon"
                  [style.color]="item.accent"
                />
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
                <td
                  mat-cell
                  *matCellDef="let ev"
                  class="font-mono text-2xs text-neutral-500"
                  [attr.title]="ev.ts | aoAbsoluteTime"
                >
                  {{ ev.ts | aoTimeAgo: clock.nowMs() }}
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
                <span
                  class="shrink-0 font-mono text-2xs text-neutral-500"
                  [attr.title]="ev.ts | aoAbsoluteTime"
                >
                  {{ ev.ts | aoTimeAgo: clock.nowMs() }}
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
                  <mat-icon
                    class="!h-3.5 !w-3.5 !text-[14px]"
                    [svgIcon]="actorIcon(ev.actor)"
                    [style.color]="actorAccent(ev.actor)"
                  />
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
    </ng-template>
  `,
})
export class TracesPage implements OnInit, OnDestroy {
  private api = inject(AoApi);
  readonly live = inject(AoLiveWs);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private injector = inject(Injector);
  private iconRegistry = inject(MatIconRegistry);
  readonly clock = inject(AoClock);
  private readonly mermaidHost = viewChild<ElementRef<HTMLElement>>('mermaidHost');
  private mermaidGen = 0;
  /** Preserve horizontal scroll across live-feed MatTable remounts / Mermaid rebuilds. */
  private mermaidScrollLeft = 0;
  private lastMermaidSource = '';
  private scrollBoundHost: HTMLElement | null = null;
  private readonly onMermaidScroll = () => {
    const host = this.mermaidHost()?.nativeElement;
    if (host) this.mermaidScrollLeft = host.scrollLeft;
  };
  private iconCache = new Map<string, Promise<SVGElement | null>>();
  private openedFromQuery = false;

  readonly error = signal<string | null>(null);
  readonly detail = signal<RunTraceResponse | null>(null);
  readonly lookupId = signal('');
  readonly filterClient = signal('');
  readonly filterClientIp = signal('');
  readonly filterCrewOnly = signal(false);
  /** Full unfiltered list from the live feed. */
  readonly allRuns = signal<TraceListItem[]>([]);
  readonly viewMode = signal<'diagram' | 'table'>('diagram');
  readonly depthMode = signal<'all' | 'boundary' | 'decisions' | 'crew' | 'tools'>('all');
  readonly columns = [
    'runId',
    'client',
    'clientIp',
    'started',
    'tokens',
    'events',
    'duration',
    'last',
    'updated',
  ];
  readonly eventColumns = ['ts', 'kind', 'actor', 'message'];
  readonly dataSource = new MatTableDataSource<TraceListItem>([]);
  readonly eventRows = new MatTableDataSource<RunTraceEvent>([]);

  /** Client / IP / crew filters apply locally over the full feed. */
  readonly filteredRuns = computed(() => {
    const clientQ = this.filterClient().trim().toLowerCase();
    const ipQ = this.filterClientIp().trim().toLowerCase();
    const crewOnly = this.filterCrewOnly();
    return (this.allRuns() || []).filter((item) => {
      if (clientQ) {
        const blob = [item.appId, item.userName, item.userId, item.runId]
          .map((x) => String(x || ''))
          .join(' ')
          .toLowerCase();
        if (!blob.includes(clientQ)) return false;
      }
      if (ipQ && !String(item.clientIp || '').toLowerCase().includes(ipQ)) return false;
      if (crewOnly && !(item.hasPlan || item.hasDecision || item.hasSteps)) return false;
      return true;
    });
  });

  /** Detail open for a run not in the current filtered table (lookup / filter miss). */
  readonly detailOutsideFiltered = computed(() => {
    const d = this.detail();
    if (!d?.runId) return false;
    return !this.filteredRuns().some((r) => r.runId === d.runId);
  });

  readonly outcomeChip = computed(() => {
    const events = this.detail()?.events || [];
    const last = events[events.length - 1];
    if (!last) return null;
    return { status: this.kindStatus(last.kind), label: String(last.kind || 'event') };
  });

  isExpandedRow = (_: number, row: TraceListItem) => this.detail()?.runId === row.runId;

  trackByRunId = (_: number, row: TraceListItem) => String(row?.runId || '');

  /** Drives CSS expand after the detail row mounts. */
  readonly expandOpen = signal(false);

  constructor() {
    afterNextRender(() => this.scheduleMermaidRender());
    effect(() => {
      const err =
        this.live.feedErrors()['traces'] || this.live.feedErrors()['_'];
      if (err) this.error.set(err);
      const snap = this.live.feeds()['traces'] as TracesListResponse | undefined;
      if (!snap) return;
      this.allRuns.set(snap.runs || []);
      if (!this.openedFromQuery) {
        const q =
          String(this.route.snapshot.queryParamMap.get('runId') || '').trim() ||
          String(this.route.snapshot.queryParamMap.get('id') || '').trim();
        if (q) {
          this.openedFromQuery = true;
          this.openId(q);
        }
      }
    });
    effect(() => {
      this.dataSource.data = this.filteredRuns();
      // Live feed refreshes may remount MatTable expand cells. Only rebuild Mermaid
      // if the SVG was lost; otherwise keep the diagram and restore scroll.
      if (this.detail()?.runId && this.viewMode() === 'diagram') {
        this.expandOpen.set(true);
        afterNextRender(
          () => {
            const host = this.mermaidHost()?.nativeElement;
            if (!host) return;
            if (!host.querySelector('svg')) {
              void this.renderMermaid();
              return;
            }
            this.bindMermaidScroll(host);
            this.restoreMermaidScroll(host);
          },
          { injector: this.injector },
        );
      }
    });
  }

  ngOnInit() {
    this.ensureMermaid();
    this.live.acquire({
      feeds: ['traces'],
      feedIntervalMs: 4000,
      feedParams: this.listParams(),
    });
  }

  ngOnDestroy() {
    this.unbindMermaidScroll();
    this.live.release();
  }

  private listParams() {
    // Always fetch the broad list; Client / IP / Crew filter in the UI.
    return { limit: 500 };
  }

  reloadList() {
    this.live.setFeedParams(this.listParams());
  }

  private bindMermaidScroll(host: HTMLElement) {
    if (this.scrollBoundHost === host) return;
    this.unbindMermaidScroll();
    this.scrollBoundHost = host;
    host.addEventListener('scroll', this.onMermaidScroll, { passive: true });
  }

  private unbindMermaidScroll() {
    this.scrollBoundHost?.removeEventListener('scroll', this.onMermaidScroll);
    this.scrollBoundHost = null;
  }

  private restoreMermaidScroll(host: HTMLElement) {
    const left = this.mermaidScrollLeft;
    host.scrollLeft = left;
    requestAnimationFrame(() => {
      host.scrollLeft = left;
    });
  }

  private async renderMermaid() {
    if (this.viewMode() !== 'diagram') return;
    const host = this.mermaidHost()?.nativeElement;
    const d = this.detail();
    if (!host || !d?.mermaid) return;
    if (!window.mermaid) {
      this.ensureMermaid();
      return;
    }
    const source = String(d.mermaid || '').trim();
    this.bindMermaidScroll(host);
    // Same diagram already painted — keep scroll, skip expensive Mermaid rebuild.
    if (source === this.lastMermaidSource && host.querySelector('svg')) {
      this.restoreMermaidScroll(host);
      return;
    }
    this.mermaidScrollLeft = host.scrollLeft || this.mermaidScrollLeft;
    const gen = ++this.mermaidGen;
    this.initMermaid();
    // Always rebuild from source — Mermaid mutates the node and won't re-run stale DOM.
    host.replaceChildren();
    const next = document.createElement('pre');
    next.className = 'mermaid whitespace-pre';
    next.textContent = source;
    host.appendChild(next);
    try {
      await window.mermaid.run({ nodes: [next] });
      if (gen !== this.mermaidGen) return;
      const svg = host.querySelector('svg');
      if (svg instanceof SVGSVGElement) {
        try {
          await applyTopologyStylesToMermaidSvg(svg, (icon) => this.loadTopologyIcon(icon));
        } catch {
          /* diagram still visible without topology polish */
        }
        if (gen !== this.mermaidGen) return;
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts.every(Number.isFinite)) {
            const w = Math.max(1, Math.ceil(parts[2]));
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.style.width = `${w}px`;
            svg.style.height = 'auto';
            svg.style.maxWidth = 'none';
            svg.style.minWidth = `${w}px`;
          }
        }
      }
      this.lastMermaidSource = source;
      this.bindMermaidScroll(host);
      this.restoreMermaidScroll(host);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Mermaid render failed';
      host.replaceChildren();
      const fail = document.createElement('div');
      fail.className = 'p-4 text-sm text-red-400';
      fail.textContent = msg;
      host.appendChild(fail);
      this.lastMermaidSource = '';
    }
  }

  toggleRow(row: TraceListItem) {
    const rid = String(row?.runId || '').trim();
    if (!rid) return;
    if (this.detail()?.runId === rid) {
      this.clearDetail();
      return;
    }
    this.openId(rid);
  }

  openId(id: string) {
    const rid = String(id || '').trim();
    if (!rid) return;
    this.lookupId.set(rid);
    const alreadyOpen = this.detail()?.runId === rid && this.expandOpen();
    if (!alreadyOpen) {
      this.expandOpen.set(false);
      this.mermaidScrollLeft = 0;
      this.lastMermaidSource = '';
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { runId: rid },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.api.runTrace(rid, this.depthMode()).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.detail.set(r.data);
      this.eventRows.data = r.data.events || [];
      afterNextRender(() => {
        requestAnimationFrame(() => {
          this.expandOpen.set(true);
          // Mermaid needs a laid-out, non-clipped host — render after expand opens.
          window.setTimeout(() => this.scheduleMermaidRender(), 50);
        });
        document
          .getElementById(`trace-row-${rid}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, { injector: this.injector });
    });
  }

  clearDetail() {
    const closingId = this.detail()?.runId || null;
    this.expandOpen.set(false);
    this.mermaidScrollLeft = 0;
    this.lastMermaidSource = '';
    this.unbindMermaidScroll();
    // Allow collapse animation before removing the detail row.
    window.setTimeout(() => {
      if (this.detail()?.runId !== closingId) return;
      this.detail.set(null);
      this.eventRows.data = [];
    }, 280);
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
      this.scheduleMermaidRender();
    }
  }

  onDepthMode(mode: 'all' | 'boundary' | 'decisions' | 'crew' | 'tools') {
    this.depthMode.set(mode);
    const rid = this.detail()?.runId || this.lookupId();
    if (rid) this.openId(rid);
  }

  /** afterNextRender so #mermaidHost exists after Diagram↔Table toggles. */
  private scheduleMermaidRender() {
    afterNextRender(
      () => {
        void this.renderMermaid();
      },
      { injector: this.injector }
    );
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

  actorIcon(actor: string | null | undefined): string {
    return themeForTraceActor(String(actor || '')).icon;
  }

  actorLegend(d: RunTraceResponse): { label: string; accent: string; icon: string }[] {
    const seen = new Set<string>();
    const out: { label: string; accent: string; icon: string }[] = [];
    const add = (raw: string) => {
      const a = String(raw || '').trim();
      if (!a || seen.has(a)) return;
      seen.add(a);
      const theme = themeForTraceActor(a);
      out.push({ label: `${a} · ${theme.aspect}`, accent: theme.accent, icon: theme.icon });
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
    const dark = isAoDarkScheme();
    // Never pass CSS `light-dark()` tokens into Mermaid — SVG fill becomes black.
    const primary = svgSafeColor(
      this.cssVar('--color-primary-500', ''),
      dark ? '#3b82f6' : '#2563eb'
    );
    const primarySoft = svgSafeColor(
      this.cssVar('--color-primary-900', ''),
      dark ? '#1e3a8a' : '#1e40af'
    );
    const surface = topologyPanelSurface();
    const panel = topologyPanelCanvas();
    const text = topologyPanelText();
    const muted = topologyPanelMuted();
    const line = dark ? '#737373' : '#a3a3a3';
    return {
      startOnLoad: false,
      theme: dark ? 'dark' : 'base',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: dark,
        background: panel,
        primaryColor: surface,
        primaryTextColor: text,
        primaryBorderColor: primary,
        secondaryColor: surface,
        tertiaryColor: surface,
        secondaryTextColor: text,
        tertiaryTextColor: muted,
        lineColor: primary,
        textColor: text,
        mainBkg: surface,
        nodeBorder: primary,
        clusterBkg: surface,
        titleColor: text,
        actorBkg: surface,
        actorBorder: primary,
        actorTextColor: text,
        actorLineColor: line,
        signalColor: primary,
        signalTextColor: text,
        labelBoxBkgColor: surface,
        labelBoxBorderColor: line,
        labelTextColor: muted,
        loopTextColor: muted,
        noteBkgColor: primarySoft,
        noteTextColor: text,
        noteBorderColor: primary,
        activationBkgColor: surface,
        activationBorderColor: primary,
        sequenceNumberColor: text,
      },
      sequence: {
        actorMargin: 36,
        mirrorActors: false,
        bottomMarginAdj: 4,
        messageMargin: 28,
        noteMargin: 8,
        useMaxWidth: false,
        diagramMarginX: 24,
        diagramMarginY: 16,
        width: 176,
        height: 56,
        boxMargin: 8,
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
      this.scheduleMermaidRender();
    };
    document.head.appendChild(s);
  }

  private initMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize(this.fuseMermaidTheme());
  }

  private loadTopologyIcon(name: string): Promise<SVGElement | null> {
    const key = String(name || '').trim();
    if (!key) return Promise.resolve(null);
    let p = this.iconCache.get(key);
    if (!p) {
      p = firstValueFrom(this.iconRegistry.getNamedSvgIcon(key))
        .then((el) => el)
        .catch(() => null);
      this.iconCache.set(key, p);
    }
    return p;
  }
}

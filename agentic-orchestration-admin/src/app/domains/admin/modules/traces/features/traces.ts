import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  afterNextRender,
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
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 lg:px-8 lg:pt-8">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">Traces</div>
          <div class="text-neutral-500">
            Request sequence by <code>run_id</code> — planner, agents, MCP, skills
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
        <div class="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-mono text-sm">run_id {{ d.runId }} · {{ d.eventCount || 0 }} events</div>
            <div class="flex gap-2">
              <a matButton routerLink="/runs" [queryParams]="{ id: d.runId }">Runs detail</a>
              <a
                matButton
                routerLink="/overview"
                [queryParams]="{ runId: d.runId }"
                >Filtered logs</a
              >
              <button matButton type="button" (click)="clearDetail()">Close</button>
            </div>
          </div>
          <div
            #mermaidHost
            class="overflow-x-auto rounded-lg bg-white p-4 dark:bg-neutral-950"
          >
            <pre class="mermaid whitespace-pre">{{ d.mermaid || '' }}</pre>
          </div>
          @if (d.events?.length) {
            <div class="text-sm font-medium">Event log</div>
            <ol class="space-y-2 font-mono text-xs">
              @for (ev of d.events; track $index) {
                <li class="rounded border border-neutral-100 p-2 dark:border-neutral-800">
                  <span class="text-neutral-500">{{ formatTs(ev) }}</span>
                  · <strong>{{ ev.kind }}</strong>
                  · {{ ev.actor }}
                  @if (ev.message) {
                    — {{ ev.message }}
                  }
                </li>
              }
            </ol>
          }
        </div>
      }

      @if (!dataSource.data.length && !error() && !detail()) {
        <ao-empty-state
          message="No run traces yet. Complete a dynamic/chat run to populate __orchestrator_run_traces__."
        />
      } @else if (dataSource.data.length) {
        <table mat-table [dataSource]="dataSource" class="w-full">
          <ng-container matColumnDef="runId">
            <th mat-header-cell *matHeaderCellDef>run_id</th>
            <td mat-cell *matCellDef="let r">
              <button
                class="font-mono text-sm underline-offset-2 hover:underline"
                type="button"
                (click)="openId(r.runId)"
              >
                {{ r.runId }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="events">
            <th mat-header-cell *matHeaderCellDef>Events</th>
            <td mat-cell *matCellDef="let r">{{ r.eventCount ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="last">
            <th mat-header-cell *matHeaderCellDef>Last</th>
            <td mat-cell *matCellDef="let r" class="text-sm">
              {{ r.lastKind || '—' }}
              @if (r.lastMessage) {
                — {{ r.lastMessage }}
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="updated">
            <th mat-header-cell *matHeaderCellDef>Updated</th>
            <td mat-cell *matCellDef="let r" class="font-mono text-sm">
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

  private ensureMermaid() {
    if (typeof document === 'undefined') return;
    if (window.mermaid) return;
    const existing = document.querySelector('script[data-ao-mermaid]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.async = true;
    s.dataset['aoMermaid'] = '1';
    s.onload = () => {
      window.mermaid?.initialize({ startOnLoad: false, theme: 'neutral' });
      this.renderMermaid();
    };
    document.head.appendChild(s);
  }

  private async renderMermaid() {
    const host = this.mermaidHost?.nativeElement;
    const d = this.detail();
    if (!host || !d?.mermaid || !window.mermaid) return;
    const pre = host.querySelector('.mermaid');
    if (!pre) return;
    pre.textContent = d.mermaid;
    pre.removeAttribute('data-processed');
    try {
      await window.mermaid.run({ nodes: [pre as HTMLElement] });
    } catch {
      /* keep raw mermaid text */
    }
  }
}

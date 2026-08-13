import {
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AoClock } from '@/app/core/ao-time/ao-time';
import {
  AoAbsoluteTimePipe,
  AoTimeAgoPipe,
} from '@/app/core/ao-time/ao-time-ago.pipe';
import { AdminRun, RunDetail, RunsListResponse } from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';

@Component({
  selector: 'ao-runs-page',
  imports: [
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    EmptyState,
    ErrorState,
    LoadingState,
    AoTimeAgoPipe,
    AoAbsoluteTimePipe,
  ],
  template: `
    <div class="mx-auto flex h-full w-full max-w-7xl flex-auto flex-col overflow-hidden">
      <mat-sidenav-container class="h-full flex-auto">
        <mat-sidenav
          class="w-full border-none bg-white sm:w-lg dark:bg-neutral-900"
          mode="side"
          position="end"
          [opened]="!!detail()"
        >
          @if (detail(); as d) {
            <div class="flex flex-col gap-3 p-6">
              <div class="flex items-center justify-between gap-2">
                <div class="truncate font-mono text-lg font-medium">{{ d.id }}</div>
                <div class="flex shrink-0 items-center gap-1">
                  <button
                    matIconButton
                    type="button"
                    title="Copy correlation id"
                    (click)="copyId(d)"
                  >
                    <mat-icon svgIcon="copy" />
                  </button>
                  <button matIconButton type="button" (click)="closeDetail()">
                    <mat-icon svgIcon="x" />
                  </button>
                </div>
              </div>
              <div class="text-sm text-neutral-500">
                scope {{ d.scope }} · updated
                <span [attr.title]="d.updatedAt | aoAbsoluteTime">{{
                  d.updatedAt | aoTimeAgo: clock.nowMs()
                }}</span>
                @if (d.outcome) {
                  ·
                  <span [class.text-red-600]="d.ok === false" [class.text-emerald-700]="d.ok === true">
                    {{ d.outcome }}
                  </span>
                }
              </div>
              @if (correlationId(d); as cid) {
                <div class="font-mono text-xs text-neutral-500">run_id {{ cid }}</div>
              }
              @if (d.error) {
                <pre
                  class="overflow-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                  >{{ d.error }}</pre
                >
              }
              @if (d.lastGoal) {
                <p class="text-sm">{{ d.lastGoal }}</p>
              }
              @if (d.stepsDetail?.length) {
                <div class="text-sm font-medium">Steps</div>
                <ul class="space-y-2 text-sm">
                  @for (s of d.stepsDetail; track s.id) {
                    <li class="font-mono">
                      <div>
                        {{ s.id }} · exit {{ s.exitCode ?? '—' }}
                        @if (s.ok === false) {
                          <span class="text-red-600"> failed</span>
                        }
                      </div>
                      @if (s.error) {
                        <div class="mt-0.5 whitespace-pre-wrap text-xs text-red-700 dark:text-red-300">
                          {{ s.error }}
                        </div>
                      }
                    </li>
                  }
                </ul>
              }
              @if (d.k8sJobs?.length) {
                <div class="text-sm font-medium">Kubernetes jobs</div>
                <ul class="space-y-1 font-mono text-xs">
                  @for (j of d.k8sJobs; track j.job_name || $index) {
                    <li>
                      {{ j.job_name || '—' }}
                      @if (j.pod_name) {
                        · pod {{ j.pod_name }}
                      }
                      ·
                      {{ j.succeeded ? 'ok' : j.failed ? 'failed' : '—' }}
                      @if (j.message) {
                        — {{ j.message }}
                      }
                    </li>
                  }
                </ul>
              }
              <div class="flex flex-wrap gap-2 pt-1">
                <a
                  matButton
                  class="border border-neutral-200 dark:border-neutral-700"
                  [routerLink]="['/overview']"
                  [queryParams]="{ runId: correlationId(d) || d.id }"
                >
                  Open filtered logs
                </a>
                <a
                  matButton
                  class="border border-neutral-200 dark:border-neutral-700"
                  [routerLink]="['/traces']"
                  [queryParams]="{ runId: correlationId(d) || d.id }"
                >
                  Open sequence trace
                </a>
              </div>
              @if (d.lastAnswerExcerpt) {
                <pre class="overflow-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">{{
                  d.lastAnswerExcerpt
                }}</pre>
              }
              @if (copyFlash()) {
                <div class="text-xs text-emerald-700">Copied</div>
              }
            </div>
          }
        </mat-sidenav>
        <mat-sidenav-content class="flex flex-col gap-4 p-6 lg:px-8 lg:pt-8">
          <div>
            <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
              Runs
            </div>
            <div class="text-neutral-500">
              Session and run-store history visible from this web process
            </div>
            @if (scopeNote()) {
              <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {{ scopeNote() }}
              </p>
            }
          </div>

          @if (error()) {
            <ao-error-state [message]="error()!" />
          }

          @if (live.feedLoading('runs')) {
            <ao-loading-state
              title="Loading runs"
              message="Connecting to the live runs feed…"
            />
          } @else if (!dataSource.data.length && !error()) {
            <ao-empty-state message="No runs visible from this process yet." />
          } @else {
            <table mat-table [dataSource]="dataSource" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Id</th>
                <td mat-cell *matCellDef="let r">
                  <button
                    class="font-mono text-sm text-left underline-offset-2 hover:underline"
                    type="button"
                    (click)="open(r)"
                  >
                    {{ r.id }}
                  </button>
                </td>
              </ng-container>
              <ng-container matColumnDef="scope">
                <th mat-header-cell *matHeaderCellDef>Scope</th>
                <td mat-cell *matCellDef="let r">{{ r.scope }}</td>
              </ng-container>
              <ng-container matColumnDef="outcome">
                <th mat-header-cell *matHeaderCellDef>Outcome</th>
                <td
                  mat-cell
                  *matCellDef="let r"
                  [class.text-red-600]="r.ok === false"
                  [class.text-emerald-700]="r.ok === true"
                >
                  {{ r.outcome || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>Updated</th>
                <td
                  mat-cell
                  *matCellDef="let r"
                  class="whitespace-nowrap text-sm"
                  [attr.title]="r.updatedAt | aoAbsoluteTime"
                >
                  {{ r.updatedAt | aoTimeAgo: clock.nowMs() }}
                </td>
              </ng-container>
              <ng-container matColumnDef="mode">
                <th mat-header-cell *matHeaderCellDef>Mode</th>
                <td mat-cell *matCellDef="let r">{{ r.mode || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="steps">
                <th mat-header-cell *matHeaderCellDef>Steps</th>
                <td mat-cell *matCellDef="let r">{{ r.steps ?? '—' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
                class="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5"
                (click)="open(row)"
              ></tr>
            </table>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export class RunsPage implements OnInit, OnDestroy {
  private api = inject(AoApi);
  readonly live = inject(AoLiveWs);
  readonly clock = inject(AoClock);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly error = signal<string | null>(null);
  readonly scopeNote = signal<string | null>(null);
  readonly detail = signal<RunDetail | null>(null);
  readonly copyFlash = signal(false);
  readonly columns = ['id', 'scope', 'outcome', 'updated', 'mode', 'steps'];
  readonly dataSource = new MatTableDataSource<AdminRun>([]);
  private openedFromQuery = false;

  constructor() {
    effect(() => {
      const err = this.live.feedErrors()['runs'] || this.live.feedErrors()['_'];
      if (err) this.error.set(err);
      const snap = this.live.feeds()['runs'] as RunsListResponse | undefined;
      if (!snap) return;
      this.error.set(null);
      this.scopeNote.set(snap.scopeNote || null);
      this.dataSource.data = snap.runs || [];
      if (!this.openedFromQuery) {
        const qid = String(
          this.route.snapshot.queryParamMap.get('id') || '',
        ).trim();
        if (!qid) {
          this.openedFromQuery = true;
          return;
        }
        this.openedFromQuery = true;
        const row = this.dataSource.data.find((x) => x.id === qid);
        if (row) this.open(row);
        else
          this.api.runDetail(qid).subscribe((d) => {
            if (d.ok) this.detail.set(d.data);
          });
      }
    });
  }

  ngOnInit() {
    this.live.acquire({
      feeds: ['runs'],
      feedIntervalMs: 4000,
      feedParams: { limit: 80 },
    });
  }

  ngOnDestroy() {
    this.live.release();
  }

  correlationId(d: RunDetail | AdminRun): string | null {
    return (d.lastRunId || (d.scope === 'run_store' ? d.id : null) || null) as string | null;
  }

  open(row: AdminRun) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: row.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.api.runDetail(row.id).subscribe((r) => {
      if (r.ok) this.detail.set(r.data);
      else this.detail.set({ ...row });
    });
  }

  closeDetail() {
    this.detail.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  async copyId(d: RunDetail) {
    const text = this.correlationId(d) || d.id;
    try {
      await navigator.clipboard.writeText(text);
      this.copyFlash.set(true);
      setTimeout(() => this.copyFlash.set(false), 1500);
    } catch {
      /* ignore */
    }
  }
}

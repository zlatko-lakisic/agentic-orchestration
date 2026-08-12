import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import {
  ApiUsageRollupRow,
  LlmUsageResponse,
  LlmUsageRollupRow,
} from '@/app/core/ao-api/types';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-llm-usage-page',
  imports: [MatTableModule, MatButtonModule, RouterLink, EmptyState, ErrorState],
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">Token usage</div>
          <div class="text-neutral-500">
            LLM token rollups by user, IP, and app — correlated with API request volume
            (Access ledger stays separate).
          </div>
        </div>
        <div class="flex gap-2">
          <a matButton routerLink="/traces">Traces</a>
          <a matButton routerLink="/access">Access</a>
          <button matButton="tonal" type="button" (click)="reload()">Refresh</button>
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (data(); as d) {
        @if (d.llm?.grandTotal; as g) {
          <div
            class="grid gap-3 sm:grid-cols-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div>
              <div class="text-2xs uppercase text-neutral-500">Calls</div>
              <div class="text-xl tabular-nums font-semibold">{{ g.calls }}</div>
            </div>
            <div>
              <div class="text-2xs uppercase text-neutral-500">Prompt</div>
              <div class="text-xl tabular-nums font-semibold">{{ g.promptTokens }}</div>
            </div>
            <div>
              <div class="text-2xs uppercase text-neutral-500">Completion</div>
              <div class="text-xl tabular-nums font-semibold">{{ g.completionTokens }}</div>
            </div>
            <div>
              <div class="text-2xs uppercase text-neutral-500">Total tokens</div>
              <div class="text-xl tabular-nums font-semibold">{{ g.totalTokens }}</div>
            </div>
          </div>
        }

        <div class="grid gap-4 lg:grid-cols-2">
          @for (block of llmBlocks(d); track block.title) {
            <section
              class="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div
                class="border-b border-neutral-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800"
              >
                LLM · {{ block.title }}
              </div>
              @if (block.rows.length) {
                <table mat-table [dataSource]="block.rows" class="w-full">
                  <ng-container matColumnDef="key">
                    <th mat-header-cell *matHeaderCellDef>Key</th>
                    <td mat-cell *matCellDef="let r" class="font-mono text-sm">{{ r.key }}</td>
                  </ng-container>
                  <ng-container matColumnDef="calls">
                    <th mat-header-cell *matHeaderCellDef>Calls</th>
                    <td mat-cell *matCellDef="let r" class="tabular-nums">{{ r.calls }}</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>Tokens</th>
                    <td mat-cell *matCellDef="let r" class="tabular-nums">{{ r.totalTokens ?? 0 }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="llmCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: llmCols"></tr>
                </table>
              } @else {
                <div class="p-4 text-sm text-neutral-500">No rows yet.</div>
              }
            </section>
          }
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          @for (block of apiBlocks(d); track block.title) {
            <section
              class="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div
                class="border-b border-neutral-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800"
              >
                API requests · {{ block.title }}
              </div>
              @if (block.rows.length) {
                <table mat-table [dataSource]="block.rows" class="w-full">
                  <ng-container matColumnDef="key">
                    <th mat-header-cell *matHeaderCellDef>Key</th>
                    <td mat-cell *matCellDef="let r" class="font-mono text-sm">{{ r.key }}</td>
                  </ng-container>
                  <ng-container matColumnDef="calls">
                    <th mat-header-cell *matHeaderCellDef>Calls</th>
                    <td mat-cell *matCellDef="let r" class="tabular-nums">{{ r.calls }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="apiCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: apiCols"></tr>
                </table>
              } @else {
                <div class="p-4 text-sm text-neutral-500">No rows yet.</div>
              }
            </section>
          }
        </div>
      } @else if (!error()) {
        <ao-empty-state message="Loading token usage…" />
      }
    </div>
  `,
})
export class LlmUsagePage implements OnInit {
  private api = inject(AoApi);
  readonly error = signal<string | null>(null);
  readonly data = signal<LlmUsageResponse | null>(null);
  readonly llmCols = ['key', 'calls', 'total'];
  readonly apiCols = ['key', 'calls'];

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.llmUsage(200).subscribe((r) => {
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.data.set(r.data);
    });
  }

  llmBlocks(d: LlmUsageResponse): { title: string; rows: LlmUsageRollupRow[] }[] {
    return [
      { title: 'User ID', rows: d.llm?.byUserId || [] },
      { title: 'Client IP', rows: d.llm?.byClientIp || [] },
      { title: 'App ID', rows: d.llm?.byAppId || [] },
      { title: 'Token ID', rows: d.llm?.byTokenId || [] },
    ];
  }

  apiBlocks(d: LlmUsageResponse): { title: string; rows: ApiUsageRollupRow[] }[] {
    return [
      { title: 'App ID', rows: d.api?.byAppId || [] },
      { title: 'Client IP', rows: d.api?.byClientIp || [] },
      { title: 'Token ID', rows: d.api?.byTokenId || [] },
    ];
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { TopologyNodeDetail } from '../data/topology.types';

export type NodeDetailDialogData = {
  nodeId: string;
  offlineBanner?: string | null;
};

@Component({
  selector: 'ao-node-detail-dialog',
  imports: [MatDialogModule, MatButtonModule, MatTabsModule, RouterLink],
  template: `
    <h2 mat-dialog-title>{{ detail()?.node?.label || data.nodeId }}</h2>
    <mat-dialog-content class="min-w-[320px] max-w-lg">
      @if (data.offlineBanner) {
        <div
          class="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          {{ data.offlineBanner }}
        </div>
      }
      @if (loading()) {
        <p class="text-sm text-neutral-500">Loading…</p>
      } @else if (error(); as err) {
        <p class="text-sm text-red-600">{{ err }}</p>
      } @else if (detail(); as d) {
        <mat-tab-group>
          <mat-tab label="Health">
            <div class="flex flex-col gap-2 py-3 text-sm">
              <div>
                Status:
                <strong>{{ d.node.status }}</strong>
                @if (!d.probe?.instrumented) {
                  <span class="text-neutral-500"> · not instrumented</span>
                }
              </div>
              @if (d.probe && d.probe.statusReason) {
                <div class="text-neutral-500">{{ d.probe.statusReason }}</div>
              }
              <div class="text-neutral-500">
                Last probe: {{ d.probe?.lastProbeAt || '—' }}
              </div>
              @if (d.members) {
                <div>
                  Cluster members: {{ d.members.count }}
                  <span class="text-neutral-500"> — {{ d.members.note }}</span>
                </div>
              }
            </div>
          </mat-tab>
          <mat-tab label="Traffic">
            <div class="flex flex-col gap-2 py-3 text-sm">
              <div class="text-neutral-500">
                Edge metrics are not instrumented in Phase 1 — every link reports
                <em>no data</em>.
              </div>
              <div>Inbound: {{ d.inbound.length }}</div>
              <div>Outbound: {{ d.outbound.length }}</div>
              <ul class="font-mono text-xs">
                @for (e of d.outbound; track e.id) {
                  <li>{{ e.id }} · {{ e.kind }}</li>
                }
              </ul>
            </div>
          </mat-tab>
          <mat-tab label="Config">
            <div class="flex flex-col gap-2 py-3 text-sm">
              @if (d.configKeys?.length) {
                <ul class="font-mono text-xs">
                  @for (k of d.configKeys; track k) {
                    <li>{{ k }}</li>
                  }
                </ul>
                <a matButton routerLink="/settings" [mat-dialog-close]="true">
                  Open All settings
                </a>
              } @else {
                <span class="text-neutral-500">No linked config keys</span>
              }
            </div>
          </mat-tab>
          <mat-tab label="Logs">
            <div class="flex flex-col gap-2 py-3 text-sm">
              <div>
                Log source:
                <code>{{ d.logSource || 'web' }}</code>
              </div>
              <a matButton routerLink="/overview" [mat-dialog-close]="true">
                Open Overview logs
              </a>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
})
export class NodeDetailDialog implements OnInit {
  readonly data = inject<NodeDetailDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<NodeDetailDialog>);
  private readonly api = inject(AoApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<TopologyNodeDetail | null>(null);

  ngOnInit() {
    this.api.topologyNode(this.data.nodeId).subscribe((r) => {
      this.loading.set(false);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.detail.set(r.data);
    });
  }
}

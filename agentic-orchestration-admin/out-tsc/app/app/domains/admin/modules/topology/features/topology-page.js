import { __decorate } from "tslib";
import { Component, HostListener, computed, inject, signal, } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { LoadingState } from '@/app/domains/admin/shared/loading-state/loading-state';
import { TopologyStore } from '../data/topology.store';
import { TopologyCanvas } from '../ui/topology-canvas';
import { TopologyTable } from '../ui/topology-table';
import { TopologyLegend } from '../ui/topology-legend';
import { NodeDetailDialog, } from '../ui/node-detail-dialog';
import { EdgeDetailDialog } from '../ui/edge-detail-dialog';
import { ClusterDialog } from '../ui/cluster-dialog';
/** Full-screen focus mode always shows the canvas, even on a narrow/table layout. */
export function topologyShowsTable(tableMode, forceTable, focusMode) {
    if (focusMode)
        return false;
    return tableMode || forceTable;
}
/** Format topology `generatedAt` with the runtime locale (medium date + short time). */
export function formatTopologyGeneratedAt(raw) {
    const s = String(raw || '').trim();
    if (!s)
        return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime()))
        return s;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}
let TopologyPage = class TopologyPage {
    store = inject(TopologyStore);
    live = inject(AoLiveWs);
    dialog = inject(MatDialog);
    forceTable = signal(typeof window !== 'undefined' ? window.innerWidth <= 1023 : false);
    dialogOpen = signal(false);
    focusMode = signal(false);
    useTable = computed(() => topologyShowsTable(this.store.tableMode(), this.forceTable(), this.focusMode()));
    hoverTimer = null;
    previousOverflow = '';
    a11ySummary = computed(() => {
        const n = this.store.displayNodes().length;
        const bad = this.store.unhealthyCount();
        const notes = this.store.notes().join('. ');
        return `Topology with ${n} nodes, ${bad} unhealthy. ${notes}`;
    });
    /** Locale-friendly stamp next to Live (not raw ISO). */
    generatedAtLabel = computed(() => formatTopologyGeneratedAt(this.store.generatedAt()));
    ngOnInit() {
        this.store.start();
    }
    ngOnDestroy() {
        this.store.stop();
        if (this.hoverTimer)
            clearTimeout(this.hoverTimer);
        this.setFocusMode(false);
    }
    onResize() {
        this.forceTable.set(window.innerWidth <= 1023);
    }
    onEscape() {
        if (this.dialogOpen() || !this.focusMode())
            return;
        this.setFocusMode(false);
    }
    toggleFocusMode() {
        this.setFocusMode(!this.focusMode());
    }
    setFocusMode(on) {
        this.focusMode.set(on);
        if (typeof document === 'undefined')
            return;
        if (on) {
            this.previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = this.previousOverflow;
        }
    }
    onHover(id) {
        if (this.hoverTimer)
            clearTimeout(this.hoverTimer);
        if (id == null) {
            this.store.setHover(null);
            return;
        }
        this.hoverTimer = setTimeout(() => this.store.setHover(id), 60);
    }
    openNode(n) {
        // Catalog / sidecar clusters: show per-app Reach overlay members.
        if (n.kind === 'catalog' ||
            (n.kind === 'mcp-sidecar' && (n.appMembers?.length || n.count != null))) {
            this.dialogOpen.set(true);
            const ref = this.dialog.open(ClusterDialog, {
                data: { node: n },
                autoFocus: 'first-heading',
            });
            ref.afterClosed().subscribe(() => this.dialogOpen.set(false));
            return;
        }
        const stillThere = this.store.displayNodes().some((x) => x.id === n.id);
        this.dialogOpen.set(true);
        const ref = this.dialog.open(NodeDetailDialog, {
            data: {
                nodeId: n.id,
                offlineBanner: stillThere
                    ? null
                    : `This component went offline at ${new Date().toLocaleTimeString()}`,
            },
            autoFocus: 'first-heading',
        });
        ref.afterClosed().subscribe(() => this.dialogOpen.set(false));
    }
    openEdge(e) {
        this.dialogOpen.set(true);
        const ref = this.dialog.open(EdgeDetailDialog, {
            data: { edge: e },
            autoFocus: 'first-heading',
        });
        ref.afterClosed().subscribe(() => this.dialogOpen.set(false));
    }
};
__decorate([
    HostListener('window:resize')
], TopologyPage.prototype, "onResize", null);
__decorate([
    HostListener('document:keydown.escape')
], TopologyPage.prototype, "onEscape", null);
TopologyPage = __decorate([
    Component({
        selector: 'ao-topology-page',
        providers: [TopologyStore],
        imports: [
            MatButtonModule,
            MatButtonToggleModule,
            MatDialogModule,
            MatIconModule,
            MatSlideToggleModule,
            MatMenuModule,
            MatTooltipModule,
            ErrorState,
            LoadingState,
            TopologyCanvas,
            TopologyTable,
            TopologyLegend,
        ],
        template: `
    <div
      class="mx-auto flex h-full w-full max-w-[1600px] flex-auto flex-col gap-3 p-4 sm:p-6 lg:px-8 lg:pt-8"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Topology
          </div>
          <div class="text-neutral-500">
            Live deployment graph — what is present now, not a docs diagram
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            [class.bg-emerald-100]="live.connected() && !store.paused() && !store.snapshotOnly()"
            [class.text-emerald-800]="live.connected() && !store.paused() && !store.snapshotOnly()"
            [class.bg-amber-100]="store.snapshotOnly() || store.paused()"
            [class.text-amber-900]="store.snapshotOnly() || store.paused()"
            [class.dark:bg-emerald-950]="live.connected() && !store.paused() && !store.snapshotOnly()"
            [class.dark:text-emerald-200]="live.connected() && !store.paused() && !store.snapshotOnly()"
          >
            @if (store.paused()) {
              Paused
            } @else if (store.snapshotOnly()) {
              Not live — snapshot
              {{ generatedAtLabel() || '' }}
            } @else if (live.connected()) {
              Live · {{ generatedAtLabel() || '…' }}
            } @else {
              Reconnecting…
            }
          </span>
          <button matButton="outlined" type="button" (click)="store.togglePause()">
            {{ store.paused() ? 'Resume' : 'Pause' }}
          </button>
          <button matButton="outlined" type="button" (click)="store.resync()">
            <mat-icon svgIcon="refresh-cw" />
            Refresh
          </button>
          <button
            matButton="outlined"
            type="button"
            [attr.aria-pressed]="focusMode()"
            [matTooltip]="
              focusMode() ? 'Exit full screen (Esc)' : 'Expand diagram to full screen'
            "
            (click)="toggleFocusMode()"
          >
            <mat-icon [svgIcon]="focusMode() ? 'minimize-2' : 'maximize-2'" />
            {{ focusMode() ? 'Exit full screen' : 'Full screen' }}
          </button>
          <ao-topology-legend />
        </div>
      </div>

      @if (store.notes().length) {
        <div
          class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        >
          @for (n of store.notes(); track n) {
            <div>{{ n }}</div>
          }
        </div>
      }

      <div class="flex flex-wrap items-center gap-3">
        <mat-button-toggle-group
          [value]="store.bandFilter()"
          (change)="store.bandFilter.set($event.value)"
          aria-label="Band filter"
        >
          <mat-button-toggle value="all">All bands</mat-button-toggle>
          <mat-button-toggle value="application">App</mat-button-toggle>
          <mat-button-toggle value="reach">Reach</mat-button-toggle>
          <mat-button-toggle value="ao">AO</mat-button-toggle>
        </mat-button-toggle-group>
        <mat-slide-toggle
          [checked]="store.onlyUnhealthy()"
          (change)="store.onlyUnhealthy.set($event.checked)"
        >
          Only unhealthy
        </mat-slide-toggle>
        <mat-slide-toggle
          [checked]="store.showNotDeployed()"
          (change)="store.showNotDeployed.set($event.checked)"
        >
          Show not deployed
        </mat-slide-toggle>
        <mat-slide-toggle
          [checked]="store.tableMode() || forceTable()"
          (change)="store.tableMode.set($event.checked)"
        >
          Table view
        </mat-slide-toggle>
        <span class="text-sm text-neutral-500">
          {{ store.unhealthyCount() }} unhealthy ·
          {{ store.displayNodes().length }} nodes
        </span>
      </div>

      @if (store.lastError(); as err) {
        <ao-error-state [message]="err" />
      }

      @if (store.loading()) {
        <ao-loading-state
          title="Loading topology"
          message="Connecting to the live topology feed…"
        />
      } @else if (useTable()) {
        @if (forceTable() && !store.tableMode()) {
          <p class="text-sm text-neutral-500">
            Diagram needs a wider screen — showing table view.
          </p>
        }
        <ao-topology-table
          [nodes]="store.displayNodes()"
          [edges]="store.displayEdges()"
          (nodeClick)="openNode($event)"
          (edgeClick)="openEdge($event)"
        />
      } @else {
        <ao-topology-canvas
          class="min-h-[520px] flex-auto"
          [layout]="store.layout()"
          [nodes]="store.displayNodes()"
          [edges]="store.displayEdges()"
          [closure]="store.hoverClosure()"
          [expandedAppId]="store.expandedAppId()"
          [expandedK8sId]="store.expandedK8sId()"
          [blurred]="dialogOpen()"
          [summary]="a11ySummary()"
          [focusMode]="focusMode()"
          (hover)="onHover($event)"
          (nodeClick)="openNode($event)"
          (edgeClick)="openEdge($event)"
          (expandApp)="store.toggleAppExpanded($event)"
          (expandK8s)="store.toggleK8sExpanded($event)"
          (toggleFocus)="toggleFocusMode()"
        />
      }
    </div>
  `,
    })
], TopologyPage);
export { TopologyPage };

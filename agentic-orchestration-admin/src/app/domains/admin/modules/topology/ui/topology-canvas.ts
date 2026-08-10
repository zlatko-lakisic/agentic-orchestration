import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  LayoutResult,
  PositionedEdge,
  PositionedNode,
} from '../data/topology.types';
import { themeForKind } from '../data/topology.theme';

type AppGroupFrame = {
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ExpandGroupFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function boundsOf(
  list: PositionedNode[],
  pad: number
): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of list) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

@Component({
  selector: 'ao-topology-canvas',
  imports: [MatIconModule],
  template: `
    <div
      class="topology-canvas-wrap relative h-full w-full overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
      [class.topology-blur]="blurred()"
    >
      <svg
        class="topology-svg block min-w-full"
        role="img"
        [attr.width]="layout().width"
        [attr.height]="layout().height"
        [attr.viewBox]="'0 0 ' + layout().width + ' ' + layout().height"
        [class.path-highlight]="!!closure()"
      >
        <title>Live deployment topology</title>
        <desc>{{ summary() }}</desc>

        <defs>
          <marker
            id="topo-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" class="fill-neutral-400 dark:fill-neutral-500" />
          </marker>
        </defs>

        @for (b of layout().bands; track b.id) {
          <rect
            [attr.x]="12"
            [attr.y]="b.y"
            [attr.width]="layout().width - 24"
            [attr.height]="b.height"
            rx="10"
            class="band-rect"
            [attr.data-band]="b.id"
          />
          @if (b.id === 'reach') {
            <text
              [attr.x]="28"
              [attr.y]="b.y + 18"
              class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
            >
              2 ·
            </text>
            <foreignObject
              [attr.x]="48"
              [attr.y]="b.y + 6"
              width="14"
              height="14"
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                class="ao-band-mark"
                role="img"
                aria-label="AO"
              ></div>
            </foreignObject>
            <text
              [attr.x]="66"
              [attr.y]="b.y + 18"
              class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
            >
              Reach
            </text>
          } @else if (b.id === 'ao') {
            <text
              [attr.x]="28"
              [attr.y]="b.y + 18"
              class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
            >
              3 ·
            </text>
            <foreignObject
              [attr.x]="48"
              [attr.y]="b.y + 6"
              width="14"
              height="14"
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                class="ao-band-mark"
                role="img"
                aria-label="AO"
              ></div>
            </foreignObject>
            <text
              [attr.x]="66"
              [attr.y]="b.y + 18"
              class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
            >
              Agentic Orchestration
            </text>
          } @else {
            <text
              [attr.x]="28"
              [attr.y]="b.y + 18"
              class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
            >
              {{ b.label }}
            </text>
          }
        }

        @for (f of familyFrames(); track f.id) {
          <rect
            [attr.x]="f.x"
            [attr.y]="f.y"
            [attr.width]="f.width"
            [attr.height]="f.height"
            rx="14"
            class="app-family-frame"
            [attr.data-family]="f.id"
          />
          <text
            [attr.x]="f.x + 14"
            [attr.y]="f.y + 16"
            class="app-family-label fill-neutral-500 text-[10px] font-medium tracking-wide uppercase"
            [attr.data-family]="f.id"
          >
            {{ f.label }}
          </text>
        }

        @for (g of appFrames(); track g.appId) {
          <rect
            [attr.x]="g.x"
            [attr.y]="g.y"
            [attr.width]="g.width"
            [attr.height]="g.height"
            rx="12"
            class="app-group-frame"
            [class.app-group-frame-active]="g.appId === expandedAppId()"
            [class.app-group-frame-dim]="
              !!expandedAppId() && g.appId !== expandedAppId()
            "
          />
        }

        @for (g of k8sFrames(); track g.id) {
          <rect
            [attr.x]="g.x"
            [attr.y]="g.y"
            [attr.width]="g.width"
            [attr.height]="g.height"
            rx="12"
            class="expand-group-frame"
            [class.expand-group-frame-active]="expandedK8sId() === g.id"
          />
        }

        @for (e of edges(); track e.id) {
          <path
            [attr.d]="e.pathD"
            class="topo-edge"
            [attr.data-kind]="e.kind"
            [class.dimmed]="isDimmedEdge(e.id)"
            [class.highlighted]="isHighlightedEdge(e.id)"
            [class.flow]="isHighlightedEdge(e.id)"
            marker-end="url(#topo-arrow)"
            (click)="edgeClick.emit(e)"
          />
        }

        @for (n of nodes(); track n.id) {
          <g
            class="topo-node"
            [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
            [class.dimmed]="isDimmedNode(n.id)"
            [class.highlighted]="isHighlightedNode(n.id)"
            [class.app-panel-dim]="isAppPanelDimmed(n)"
            [class.app-panel-expanded]="isAppPanelExpanded(n)"
            [class.expand-panel]="isExpandPanel(n)"
            [class.expand-panel-open]="isExpandPanelOpen(n)"
            [attr.data-status]="n.displayStatus"
            [attr.data-band]="n.band"
            [attr.data-kind]="n.kind"
            tabindex="0"
            role="button"
            [attr.aria-label]="ariaLabel(n)"
            (mouseenter)="hover.emit(n.id)"
            (mouseleave)="hover.emit(null)"
            (focus)="hover.emit(n.id)"
            (blur)="hover.emit(null)"
            (click)="nodeClick.emit(n)"
            (keydown.enter)="nodeClick.emit(n)"
          >
            <rect
              [attr.width]="n.width"
              [attr.height]="n.height"
              rx="8"
              class="node-fill"
              [attr.stroke]="accent(n)"
            />
            <rect
              x="0"
              y="0"
              width="4"
              [attr.height]="n.height"
              rx="2"
              [attr.fill]="accent(n)"
            />
            <foreignObject x="12" y="14" width="22" height="22">
              <div xmlns="http://www.w3.org/1999/xhtml" class="node-icon">
                <mat-icon
                  [svgIcon]="icon(n)"
                  [style.color]="accent(n)"
                ></mat-icon>
              </div>
            </foreignObject>
            <text
              [attr.x]="38"
              y="22"
              class="fill-neutral-900 text-[12px] font-medium dark:fill-neutral-100"
            >
              {{ truncate(n.label, labelMax(n)) }}
            </text>
            <text
              [attr.x]="38"
              y="38"
              class="text-[10px]"
            >
              <tspan [attr.fill]="statusGlyphColor(n.displayStatus)">{{
                statusGlyph(n.displayStatus)
              }}</tspan>
              <tspan fill="#737373">
                {{ truncate(n.sublabel || n.displayStatus, labelMax(n)) }}</tspan
              >
            </text>
            @if (n.kind === 'app' && n.appId) {
              <foreignObject
                [attr.x]="n.width - 36"
                y="10"
                width="28"
                height="32"
              >
                <button
                  xmlns="http://www.w3.org/1999/xhtml"
                  type="button"
                  class="app-expand-btn"
                  [attr.aria-expanded]="n.appId === expandedAppId()"
                  [attr.aria-label]="
                    (n.appId === expandedAppId() ? 'Collapse ' : 'Expand ') +
                    n.label
                  "
                  (click)="onExpandClick($event, n.appId!)"
                >
                  <mat-icon
                    [svgIcon]="
                      n.appId === expandedAppId()
                        ? 'chevron-down'
                        : 'chevron-right'
                    "
                  ></mat-icon>
                </button>
              </foreignObject>
            }
            @if (n.id === 'platform/k3s' && n.expandable) {
              <foreignObject
                [attr.x]="n.width - 36"
                y="10"
                width="28"
                height="32"
              >
                <button
                  xmlns="http://www.w3.org/1999/xhtml"
                  type="button"
                  class="k8s-expand-btn"
                  [attr.aria-expanded]="expandedK8sId() === n.id"
                  [attr.aria-label]="
                    (expandedK8sId() === n.id ? 'Collapse ' : 'Expand ') +
                    n.label
                  "
                  (click)="onExpandK8sClick($event, n.id)"
                >
                  <mat-icon
                    [svgIcon]="
                      expandedK8sId() === n.id
                        ? 'chevron-down'
                        : 'chevron-right'
                    "
                  ></mat-icon>
                </button>
              </foreignObject>
            }
          </g>
        }
      </svg>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 420px;
    }
    .topology-blur {
      filter: blur(3px) saturate(0.85);
      opacity: 0.72;
      transition: filter 150ms ease, opacity 150ms ease;
    }
    .band-rect[data-band='application'] {
      fill: color-mix(in oklab, #0d9488 8%, transparent);
      stroke: color-mix(in oklab, #0d9488 28%, transparent);
    }
    .app-family-frame {
      fill: transparent;
      stroke-width: 1.35;
      stroke-dasharray: 6 5;
      pointer-events: none;
    }
    .app-family-frame[data-family='reach'] {
      stroke: color-mix(in oklab, #0f766e 42%, transparent);
      fill: color-mix(in oklab, #0f766e 4%, transparent);
    }
    .app-family-frame[data-family='web-api'] {
      stroke: color-mix(in oklab, #0284c7 42%, transparent);
      fill: color-mix(in oklab, #0284c7 4%, transparent);
    }
    .app-family-label[data-family='reach'] {
      fill: #0f766e;
    }
    .app-family-label[data-family='web-api'] {
      fill: #0284c7;
    }
    :host-context(.dark) .app-family-label[data-family='reach'],
    .dark .app-family-label[data-family='reach'] {
      fill: #5eead4;
    }
    :host-context(.dark) .app-family-label[data-family='web-api'],
    .dark .app-family-label[data-family='web-api'] {
      fill: #7dd3fc;
    }
    .app-group-frame {
      fill: color-mix(in oklab, #0f766e 6%, transparent);
      stroke: color-mix(in oklab, #0f766e 32%, transparent);
      stroke-width: 1.25;
      stroke-dasharray: 5 4;
      pointer-events: none;
      transition: opacity 160ms ease, fill 160ms ease;
    }
    .app-group-frame-active {
      fill: color-mix(in oklab, #0f766e 12%, transparent);
      stroke: color-mix(in oklab, #0f766e 55%, transparent);
      stroke-dasharray: none;
    }
    .app-group-frame-dim {
      opacity: 0.28;
      filter: grayscale(0.85);
    }
    .expand-group-frame {
      fill: color-mix(in oklab, #3b6ea5 6%, transparent);
      stroke: color-mix(in oklab, #3b6ea5 34%, transparent);
      stroke-width: 1.25;
      stroke-dasharray: 5 4;
      pointer-events: none;
      transition: opacity 160ms ease, fill 160ms ease;
    }
    .expand-group-frame-active {
      fill: color-mix(in oklab, #3b6ea5 12%, transparent);
      stroke: color-mix(in oklab, #3b6ea5 58%, transparent);
      stroke-dasharray: none;
    }
    .topo-node.app-panel-dim {
      opacity: 0.32;
      filter: grayscale(0.9);
    }
    .topo-node.app-panel-expanded,
    .topo-node.expand-panel-open {
      opacity: 1;
      filter: none;
    }
    .app-expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 32px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: color-mix(in oklab, #0f766e 12%, transparent);
      color: #0f766e;
      cursor: pointer;
    }
    .app-expand-btn:hover {
      background: color-mix(in oklab, #0f766e 22%, transparent);
    }
    .app-expand-btn mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .k8s-expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 32px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: color-mix(in oklab, #3b6ea5 14%, transparent);
      color: #3b6ea5;
      cursor: pointer;
    }
    .k8s-expand-btn:hover {
      background: color-mix(in oklab, #3b6ea5 26%, transparent);
    }
    .k8s-expand-btn mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .band-rect[data-band='reach'] {
      fill: color-mix(in oklab, #2563eb 8%, transparent);
      stroke: color-mix(in oklab, #2563eb 28%, transparent);
    }
    .band-rect[data-band='ao'] {
      fill: color-mix(in oklab, #dc2626 7%, transparent);
      stroke: color-mix(in oklab, #dc2626 24%, transparent);
    }
    .topo-edge {
      fill: none;
      stroke: var(--mat-sys-outline);
      stroke-width: 1.6;
      stroke-dasharray: 7 5;
      stroke-linecap: square;
      stroke-linejoin: miter;
      opacity: 0.7;
      cursor: pointer;
      pointer-events: stroke;
    }
    .topo-edge[data-kind='stream'] {
      stroke-dasharray: 10 6;
    }
    .topo-edge[data-kind='reverse-tunnel'] {
      stroke-dasharray: 3 4;
    }
    .topo-edge[data-kind='advertisement'] {
      stroke-dasharray: 1 5;
      opacity: 0.45;
    }
    .topo-edge[data-kind='bypass'] {
      stroke-dasharray: 9 5;
    }
    .topo-edge.flow,
    .path-highlight .topo-edge.highlighted {
      stroke: var(--mat-sys-primary);
      stroke-width: 2.1;
      opacity: 1;
      animation: topo-dash-flow 1.1s linear infinite;
    }
    @keyframes topo-dash-flow {
      to {
        stroke-dashoffset: -24;
      }
    }
    .topo-node {
      cursor: pointer;
      transition: opacity 120ms ease;
    }
    .topo-node:focus {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
    .node-fill {
      fill: var(--mat-sys-surface);
      stroke-width: 1.5;
    }
    .node-icon {
      display: flex;
      width: 22px;
      height: 22px;
      align-items: center;
      justify-content: center;
    }
    .node-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .topo-node[data-status='failed'] .node-fill {
      stroke-width: 2.25;
    }
    .topo-node[data-status='degraded'] .node-fill {
      stroke-width: 2;
    }
    .ao-band-mark {
      display: block;
      width: 14px;
      height: 14px;
      background-color: #3b6ea5;
      -webkit-mask: url('/admin/images/logo/ao-mark-small.svg') center / contain
        no-repeat;
      mask: url('/admin/images/logo/ao-mark-small.svg') center / contain no-repeat;
    }
    :host-context(.dark) .ao-band-mark,
    .dark .ao-band-mark {
      background-color: #e6eaf0;
    }
    .topo-node[data-status='unknown'] .node-fill {
      stroke-dasharray: 4 3;
    }
    .topo-node[data-status='offline'] .node-fill {
      fill: transparent;
      stroke-dasharray: 3 3;
      opacity: 0.55;
    }
    .topo-node[data-status='starting'] .node-fill {
      opacity: 0.7;
    }
    .path-highlight .dimmed {
      opacity: 0.18;
    }
    .path-highlight .highlighted {
      opacity: 1;
    }
    @media (prefers-reduced-motion: reduce) {
      .topo-edge.flow,
      .path-highlight .topo-edge.highlighted {
        animation: none;
      }
      .topology-blur {
        transition: none;
        filter: none;
        opacity: 0.65;
      }
    }
  `,
})
export class TopologyCanvas {
  readonly layout = input.required<LayoutResult>();
  readonly nodes = input.required<PositionedNode[]>();
  readonly edges = input.required<PositionedEdge[]>();
  readonly closure = input<{ nodes: Set<string>; edges: Set<string> } | null>(
    null
  );
  readonly expandedAppId = input<string | null>(null);
  readonly expandedK8sId = input<string | null>(null);
  readonly blurred = input(false);
  readonly summary = input('Deployment topology diagram');

  readonly hover = output<string | null>();
  readonly nodeClick = output<PositionedNode>();
  readonly edgeClick = output<PositionedEdge>();
  readonly expandApp = output<string>();
  readonly expandK8s = output<string>();

  /** Reach apps vs Web API frames inside the Application band. */
  readonly familyFrames = computed(
    () => this.layout().applicationFamilies || []
  );

  /** Bounding frames for each app panel (and expanded children when open). */
  readonly appFrames = computed(() => {
    const byApp = new Map<string, PositionedNode[]>();
    for (const n of this.nodes()) {
      if (n.band !== 'application' || !n.appId) continue;
      const list = byApp.get(n.appId) || [];
      list.push(n);
      byApp.set(n.appId, list);
    }
    const frames: AppGroupFrame[] = [];
    const pad = 8;
    for (const [appId, list] of byApp) {
      if (!list.length) continue;
      frames.push({ appId, ...boundsOf(list, pad) });
    }
    return frames;
  });

  /** Bounding frame for expandable Kubernetes platform + node/pod/service children. */
  readonly k8sFrames = computed(() => {
    const list = this.nodes().filter(
      (n) =>
        n.id === 'platform/k3s' ||
        n.kind === 'k8s-workload' ||
        n.kind === 'k8s-node' ||
        n.kind === 'k8s-pod' ||
        n.kind === 'k8s-service' ||
        n.parent === 'platform/k3s' ||
        String(n.parent || '').startsWith('k8s/node/')
    );
    if (!list.some((n) => n.id === 'platform/k3s' && n.expandable)) return [];
    const frames: ExpandGroupFrame[] = [
      { id: 'platform/k3s', ...boundsOf(list, 8) },
    ];
    // Per-node group frames so pods read as "inside" the node.
    const byNode = new Map<string, PositionedNode[]>();
    for (const n of list) {
      if (n.kind === 'k8s-node') {
        const arr = byNode.get(n.id) || [];
        arr.push(n);
        byNode.set(n.id, arr);
      } else if (n.kind === 'k8s-pod' && n.parent) {
        const arr = byNode.get(n.parent) || [];
        arr.push(n);
        byNode.set(n.parent, arr);
      }
    }
    for (const [id, members] of byNode) {
      if (members.length < 2) continue;
      frames.push({ id, ...boundsOf(members, 6) });
    }
    return frames;
  });

  isDimmedEdge(id: string): boolean {
    const c = this.closure();
    return !!c && !c.edges.has(id);
  }

  isHighlightedEdge(id: string): boolean {
    const c = this.closure();
    return !!c && c.edges.has(id);
  }

  isDimmedNode(id: string): boolean {
    const c = this.closure();
    return !!c && !c.nodes.has(id);
  }

  isHighlightedNode(id: string): boolean {
    const c = this.closure();
    return !!c && c.nodes.has(id);
  }

  isAppPanelDimmed(n: PositionedNode): boolean {
    const expanded = this.expandedAppId();
    if (!expanded || n.band !== 'application' || !n.appId) return false;
    return n.appId !== expanded;
  }

  isAppPanelExpanded(n: PositionedNode): boolean {
    const expanded = this.expandedAppId();
    return Boolean(expanded && n.appId === expanded);
  }

  isExpandPanel(n: PositionedNode): boolean {
    return (
      n.kind === 'app' ||
      Boolean(n.expandable && (n.kind === 'platform' || n.id === 'platform/k3s'))
    );
  }

  isExpandPanelOpen(n: PositionedNode): boolean {
    if (n.kind === 'app') return this.isAppPanelExpanded(n);
    if (n.id === 'platform/k3s' || n.kind === 'platform') {
      return this.expandedK8sId() === n.id;
    }
    if (n.kind === 'k8s-workload') {
      return this.expandedK8sId() === 'platform/k3s' || this.expandedK8sId() === n.parent;
    }
    return false;
  }

  onExpandClick(ev: Event, appId: string) {
    ev.preventDefault();
    ev.stopPropagation();
    this.expandApp.emit(appId);
  }

  onExpandK8sClick(ev: Event, nodeId: string) {
    ev.preventDefault();
    ev.stopPropagation();
    this.expandK8s.emit(nodeId);
  }

  accent(n: PositionedNode): string {
    return themeForKind(n.kind, n.band).accent;
  }

  icon(n: PositionedNode): string {
    return themeForKind(n.kind, n.band).icon;
  }

  labelMax(n: PositionedNode): number {
    if (this.isExpandPanel(n)) return 14;
    if (n.kind === 'k8s-workload') return 16;
    return 14;
  }

  ariaLabel(n: PositionedNode): string {
    const owners =
      n.ownedByApps?.length ? ` owned by ${n.ownedByApps.join(', ')}` : '';
    const expand =
      n.kind === 'app'
        ? n.appId === this.expandedAppId()
          ? ' expanded'
          : ' collapsed'
        : n.id === 'platform/k3s' && n.expandable
          ? this.expandedK8sId() === n.id
            ? ' expanded'
            : ' collapsed'
          : '';
    return `${n.label} ${n.displayStatus}${expand}${owners}`;
  }

  truncate(s: string, max: number): string {
    const t = String(s || '');
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  statusGlyph(status: string): string {
    return String(status || '').toLowerCase() === 'healthy' ? '✓' : '✕';
  }

  statusGlyphColor(status: string): string {
    return String(status || '').toLowerCase() === 'healthy' ? '#16a34a' : '#dc2626';
  }
}

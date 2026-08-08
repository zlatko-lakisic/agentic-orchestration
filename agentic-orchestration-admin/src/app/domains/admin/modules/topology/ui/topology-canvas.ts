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
          <text
            [attr.x]="28"
            [attr.y]="b.y + 18"
            class="band-label fill-neutral-500 text-[11px] font-medium tracking-wide uppercase"
          >
            {{ b.label }}
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
              class="fill-neutral-500 text-[10px]"
            >
              {{ statusGlyph(n.displayStatus) }}
              {{ truncate(n.sublabel || n.displayStatus, labelMax(n)) }}
            </text>
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
    .app-group-frame {
      fill: color-mix(in oklab, #0f766e 6%, transparent);
      stroke: color-mix(in oklab, #0f766e 32%, transparent);
      stroke-width: 1.25;
      stroke-dasharray: 5 4;
      pointer-events: none;
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
  readonly blurred = input(false);
  readonly summary = input('Deployment topology diagram');

  readonly hover = output<string | null>();
  readonly nodeClick = output<PositionedNode>();
  readonly edgeClick = output<PositionedEdge>();

  /** Bounding frames grouping each appId's header + three components. */
  readonly appFrames = computed(() => {
    const byApp = new Map<string, PositionedNode[]>();
    for (const n of this.nodes()) {
      if (n.band !== 'application' || !n.appId) continue;
      const list = byApp.get(n.appId) || [];
      list.push(n);
      byApp.set(n.appId, list);
    }
    const frames: AppGroupFrame[] = [];
    const pad = 10;
    for (const [appId, list] of byApp) {
      if (!list.length) continue;
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
      frames.push({
        appId,
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      });
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

  accent(n: PositionedNode): string {
    return themeForKind(n.kind, n.band).accent;
  }

  icon(n: PositionedNode): string {
    return themeForKind(n.kind, n.band).icon;
  }

  labelMax(n: PositionedNode): number {
    return n.kind === 'app' ? 28 : 14;
  }

  ariaLabel(n: PositionedNode): string {
    const owners =
      n.ownedByApps?.length ? ` owned by ${n.ownedByApps.join(', ')}` : '';
    return `${n.label} ${n.displayStatus}${owners}`;
  }

  truncate(s: string, max: number): string {
    const t = String(s || '');
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  statusGlyph(status: string): string {
    switch (String(status || '').toLowerCase()) {
      case 'healthy':
        return '●';
      case 'degraded':
        return '▲';
      case 'failed':
        return '✖';
      case 'starting':
        return '◐';
      case 'draining':
        return '◌';
      case 'offline':
        return '○';
      default:
        return '?';
    }
  }
}

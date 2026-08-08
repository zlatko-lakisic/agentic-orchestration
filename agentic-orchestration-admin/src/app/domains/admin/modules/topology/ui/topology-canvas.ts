import {
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  LayoutResult,
  PositionedEdge,
  PositionedNode,
} from '../data/topology.types';

@Component({
  selector: 'ao-topology-canvas',
  imports: [],
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
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
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

        @for (e of edges(); track e.id) {
          <path
            [attr.d]="e.pathD"
            class="topo-edge"
            [attr.data-kind]="e.kind"
            [class.dimmed]="isDimmedEdge(e.id)"
            [class.highlighted]="isHighlightedEdge(e.id)"
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
            tabindex="0"
            role="button"
            [attr.aria-label]="n.label + ' ' + n.displayStatus"
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
            />
            <text
              [attr.x]="n.width / 2"
              y="20"
              text-anchor="middle"
              class="fill-neutral-900 text-[12px] font-medium dark:fill-neutral-100"
            >
              {{ n.label }}
            </text>
            <text
              [attr.x]="n.width / 2"
              y="36"
              text-anchor="middle"
              class="fill-neutral-500 text-[10px]"
            >
              {{ statusGlyph(n.displayStatus) }}
              {{ n.sublabel || n.displayStatus }}
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
      fill: color-mix(in oklab, var(--mat-sys-surface-container) 88%, transparent);
      stroke: color-mix(in oklab, var(--mat-sys-outline-variant) 60%, transparent);
    }
    .band-rect[data-band='reach'] {
      fill: color-mix(in oklab, var(--mat-sys-secondary-container) 35%, transparent);
      stroke: color-mix(in oklab, var(--mat-sys-secondary) 25%, transparent);
    }
    .band-rect[data-band='ao'] {
      fill: color-mix(in oklab, var(--mat-sys-primary-container) 30%, transparent);
      stroke: color-mix(in oklab, var(--mat-sys-primary) 22%, transparent);
    }
    .topo-edge {
      fill: none;
      stroke: var(--mat-sys-outline);
      stroke-width: 1.5;
      stroke-dasharray: 6 4;
      opacity: 0.75;
      cursor: pointer;
      pointer-events: stroke;
    }
    .topo-edge[data-kind='stream'] {
      stroke-dasharray: 10 6;
    }
    .topo-edge[data-kind='reverse-tunnel'] {
      stroke-dasharray: 3 3;
    }
    .topo-edge[data-kind='advertisement'] {
      stroke-dasharray: 1 4;
      opacity: 0.45;
    }
    .topo-edge[data-kind='bypass'] {
      stroke-dasharray: 8 4;
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
      stroke: var(--mat-sys-outline-variant);
      stroke-width: 1.25;
    }
    .topo-node[data-status='failed'] .node-fill {
      stroke: var(--mat-sys-error);
      stroke-width: 2;
    }
    .topo-node[data-status='degraded'] .node-fill {
      stroke: #d97706;
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
      opacity: 0.22;
    }
    .path-highlight .highlighted {
      opacity: 1;
    }
    .path-highlight .topo-edge.highlighted {
      stroke: var(--mat-sys-primary);
      stroke-width: 2;
    }
    @media (prefers-reduced-motion: reduce) {
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

  readonly width = computed(() => this.layout().width);

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

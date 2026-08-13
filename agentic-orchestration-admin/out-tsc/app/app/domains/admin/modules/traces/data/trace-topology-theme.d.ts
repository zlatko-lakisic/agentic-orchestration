import { TopologyKindTheme } from '@/app/domains/admin/modules/topology/data/topology.theme';
/** Fuse uses `scheme-dark` / `scheme-light` on <html>, not Tailwind's `.dark`. */
export declare function isAoDarkScheme(): boolean;
/**
 * SVG/Canvas paints cannot use CSS `light-dark()` (what `--mat-sys-*` stores).
 * Always return a concrete hex that matches Topology node cards.
 */
export declare function topologyPanelSurface(): string;
export declare function topologyPanelText(): string;
export declare function topologyPanelMuted(): string;
export declare function topologyPanelCanvas(): string;
/** True if a string is safe to use as an SVG fill/stroke. */
export declare function isSvgPaintColor(value: string): boolean;
/** Prefer hex tokens; never pass unresolved CSS functions into Mermaid/SVG. */
export declare function svgSafeColor(value: string, fallback: string): string;
/** Map sequence-diagram participant labels to Topology node kinds (shared accents). */
export declare function topologyKindForTraceActor(actor: string): string;
export declare function themeForTraceActor(actor: string): TopologyKindTheme;
/** Short display label for Mermaid participant boxes (avoid cut-off). */
export declare function shortTraceActorLabel(actor: string): string;
export type TraceIconLoader = (iconName: string) => Promise<SVGElement | null>;
/**
 * Restyle Mermaid sequence actor boxes to match Topology nodes:
 * mat-sys surface fill, accent stroke, left accent bar, icon, accent lifeline.
 */
export declare function applyTopologyStylesToMermaidSvg(svg: SVGSVGElement, loadIcon?: TraceIconLoader): Promise<void>;

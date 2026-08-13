import { LayoutResult, PositionedNode, TopologyAppGroup, TopologyBand, TopologyEdge, TopologyNode, TopologyNodeKind } from './topology.types';
/**
 * Hard floor for every route vertex. Left-gutter detours used to run at
 * `MARGIN/2 - 8` (or negative farLeft), which clipped through the canvas
 * edge beside SessionBridge / Engine. Never draw left of the node column.
 */
export declare const MIN_ROUTE_X = 32;
export declare const MIN_ROUTE_Y = 12;
/** Resolve Application-band family (Reach framework vs Web API bypass). */
export declare function resolveAppGroup(node: Pick<TopologyNode, 'band' | 'kind' | 'appGroup'>): TopologyAppGroup | null;
export type LayoutTopologyOpts = {
    showNotDeployed?: boolean;
    /** When set, only that appId's child components are laid out (others stay minimized panels). */
    expandedAppId?: string | null;
    /** When set to `platform/k3s`, show nested k8s workload children. */
    expandedK8sId?: string | null;
};
type Pt = {
    x: number;
    y: number;
};
type Side = 'top' | 'bottom' | 'left' | 'right';
export declare function displayStatus(n: TopologyNode): string;
type OrthoSeg = {
    a: Pt;
    b: Pt;
};
/** True when two orthogonal segments run parallel and share a stretch (not a 90° cross). */
export declare function segsCollinearOverlap(s1: OrthoSeg, s2: OrthoSeg, sep?: number): boolean;
/** True when two edge paths share a parallel stretch (90° crossings are fine). */
export declare function pathsCollinearOverlap(a: Pt[], b: Pt[], sep?: number): boolean;
/** Parse SVG path into route points (M/L vertices and Q endpoints; skips Q controls). */
export declare function pathPoints(pathD: string): Pt[];
/**
 * True when an edge path crosses any card other than its endpoints
 * (with the same clearance the router uses).
 */
export declare function edgePathHitsOtherNodes(pathD: string, fromId: string, toId: string, allNodes: PositionedNode[], clearance?: number): boolean;
export type RouteEdgeOpts = {
    reserved?: OrthoSeg[];
    /** Lateral offset along the attach side (fans multiple edges off one port). */
    fromPortOffset?: number;
    toPortOffset?: number;
};
/**
 * Orthogonal route between exterior stubs. Never travels along a card edge:
 * the full path is always [sideCenter → stubOut → …manhattan… → stubIn → sideCenter].
 * Prefers the shortest obstacle-free elbow; detours around intervening panels.
 * Avoids parallel overlap with already-routed edges (90° crossings are allowed).
 */
export declare function routeEdgeOrthogonalPoints(from: PositionedNode, to: PositionedNode, kind: string, allNodes: PositionedNode[], canvasWidth: number, opts?: RouteEdgeOpts): Pt[];
export declare function routeEdgeOrthogonal(from: PositionedNode, to: PositionedNode, kind: string, allNodes: PositionedNode[], canvasWidth: number, opts?: RouteEdgeOpts): string;
/** Parse path endpoints for tests. */
export declare function pathEndpoints(pathD: string): {
    start: Pt;
    end: Pt;
} | null;
export declare function isSideCenter(node: PositionedNode, p: Pt, tol?: number): Side | null;
export declare function layoutTopology(nodes: TopologyNode[], edges: TopologyEdge[], opts?: LayoutTopologyOpts): LayoutResult;
/** Transitive closure for path highlight. */
export declare function pathClosure(nodeId: string, edges: TopologyEdge[]): {
    nodes: Set<string>;
    edges: Set<string>;
};
export declare function slotForKind(kind: TopologyNodeKind): {
    band: TopologyBand;
    rank: number;
    lane: number;
    order: number;
};
/** Test helper: axis-aligned bounding boxes of nodes must not overlap. */
export declare function nodesOverlap(a: PositionedNode, b: PositionedNode): boolean;
export {};

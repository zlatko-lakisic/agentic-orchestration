import { LayoutResult, PositionedEdge, PositionedNode } from '../data/topology.types';
import { statusGlyphColor, statusIcon } from '../data/topology.status';
type AppGroupFrame = {
    appId: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare class TopologyCanvas {
    readonly layout: import("@angular/core").InputSignal<LayoutResult>;
    readonly nodes: import("@angular/core").InputSignal<PositionedNode[]>;
    readonly edges: import("@angular/core").InputSignal<PositionedEdge[]>;
    readonly closure: import("@angular/core").InputSignal<{
        nodes: Set<string>;
        edges: Set<string>;
    } | null>;
    readonly expandedAppId: import("@angular/core").InputSignal<string | null>;
    readonly expandedK8sId: import("@angular/core").InputSignal<string | null>;
    readonly blurred: import("@angular/core").InputSignal<boolean>;
    readonly summary: import("@angular/core").InputSignal<string>;
    readonly focusMode: import("@angular/core").InputSignal<boolean>;
    readonly hover: import("@angular/core").OutputEmitterRef<string | null>;
    readonly nodeClick: import("@angular/core").OutputEmitterRef<PositionedNode>;
    readonly edgeClick: import("@angular/core").OutputEmitterRef<PositionedEdge>;
    readonly expandApp: import("@angular/core").OutputEmitterRef<string>;
    readonly expandK8s: import("@angular/core").OutputEmitterRef<string>;
    readonly toggleFocus: import("@angular/core").OutputEmitterRef<void>;
    onToggleFocus(ev: Event): void;
    /** Reach apps vs Web API frames inside the Application band. */
    readonly familyFrames: import("@angular/core").Signal<{
        id: import("../data/topology.types").TopologyAppGroup;
        label: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[]>;
    /** Bounding frames for each app panel (and expanded children when open). */
    readonly appFrames: import("@angular/core").Signal<AppGroupFrame[]>;
    /** Labeled Kubernetes containment frames from layout (cluster / node / services). */
    readonly k8sGroupFrames: import("@angular/core").Signal<{
        id: string;
        role: "cluster" | "node" | "services";
        label: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[]>;
    isDimmedEdge(id: string): boolean;
    isHighlightedEdge(id: string): boolean;
    isDimmedNode(id: string): boolean;
    isHighlightedNode(id: string): boolean;
    isAppPanelDimmed(n: PositionedNode): boolean;
    isAppPanelExpanded(n: PositionedNode): boolean;
    isExpandPanel(n: PositionedNode): boolean;
    isExpandPanelOpen(n: PositionedNode): boolean;
    onExpandClick(ev: Event, appId: string): void;
    onExpandK8sClick(ev: Event, nodeId: string): void;
    accent(n: PositionedNode): string;
    icon(n: PositionedNode): string;
    labelMax(n: PositionedNode): number;
    sublabelMax(n: PositionedNode): number;
    ariaLabel(n: PositionedNode): string;
    truncate(s: string, max: number): string;
    /** Full label (+ sublabel) for native SVG hover tooltip when text is truncated. */
    nodeHoverTitle(n: PositionedNode): string;
    readonly statusIcon: typeof statusIcon;
    readonly statusGlyphColor: typeof statusGlyphColor;
}
export {};

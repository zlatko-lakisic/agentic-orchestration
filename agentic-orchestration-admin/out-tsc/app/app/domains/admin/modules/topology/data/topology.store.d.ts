import { LayoutResult, PositionedNode, TopologyEdge, TopologyNode, TopologyNodeDetail } from './topology.types';
export declare class TopologyStore {
    private readonly api;
    private readonly live;
    private liveSub;
    readonly seq: import("@angular/core").WritableSignal<number>;
    readonly generatedAt: import("@angular/core").WritableSignal<string | null>;
    readonly notes: import("@angular/core").WritableSignal<string[]>;
    readonly capabilities: import("@angular/core").WritableSignal<import("./topology.types").TopologyCapabilities | null | undefined>;
    /** Structure only — health patches must not write here. */
    readonly structureNodes: import("@angular/core").WritableSignal<TopologyNode[]>;
    readonly structureEdges: import("@angular/core").WritableSignal<TopologyEdge[]>;
    /** id → status overlay; never triggers layoutTopology. */
    readonly healthById: import("@angular/core").WritableSignal<Record<string, {
        status: string;
        statusReason?: string;
    }>>;
    readonly liveMode: import("@angular/core").WritableSignal<boolean>;
    readonly paused: import("@angular/core").WritableSignal<boolean>;
    readonly showNotDeployed: import("@angular/core").WritableSignal<boolean>;
    readonly onlyUnhealthy: import("@angular/core").WritableSignal<boolean>;
    readonly bandFilter: import("@angular/core").WritableSignal<"application" | "reach" | "ao" | "all">;
    readonly tableMode: import("@angular/core").WritableSignal<boolean>;
    readonly hoverNodeId: import("@angular/core").WritableSignal<string | null>;
    /** Application accordion: which appId panel is expanded (null = all minimized). */
    readonly expandedAppId: import("@angular/core").WritableSignal<string | null>;
    /** Kubernetes accordion: expand platform/k3s to show in-cluster workloads. */
    readonly expandedK8sId: import("@angular/core").WritableSignal<string | null>;
    readonly snapshotOnly: import("@angular/core").WritableSignal<boolean>;
    readonly lastError: import("@angular/core").WritableSignal<string | null>;
    readonly loading: import("@angular/core").WritableSignal<boolean>;
    private grace;
    private _layoutRuns;
    layoutRunCount(): number;
    /** Geometry only — depends on structure + filters, not healthById. */
    readonly layout: import("@angular/core").Signal<LayoutResult>;
    /** Positioned nodes with live health merged for rendering. */
    readonly displayNodes: import("@angular/core").Signal<PositionedNode[]>;
    readonly displayEdges: import("@angular/core").Signal<import("./topology.types").PositionedEdge[]>;
    readonly hoverClosure: import("@angular/core").Signal<{
        nodes: Set<string>;
        edges: Set<string>;
    } | null>;
    readonly unhealthyCount: import("@angular/core").Signal<number>;
    readonly nodes: import("@angular/core").Signal<TopologyNode[]>;
    readonly edges: import("@angular/core").Signal<TopologyEdge[]>;
    start(): void;
    stop(): void;
    togglePause(): void;
    resync(): void;
    setHover(id: string | null): void;
    /** Expand one Application panel (or collapse if already expanded). */
    toggleAppExpanded(appId: string): void;
    collapseApps(): void;
    /** Expand Kubernetes platform node to reveal in-cluster workloads. */
    toggleK8sExpanded(nodeId?: string): void;
    collapseK8s(): void;
    loadNodeDetail(id: string): import("rxjs").Observable<import("@/app/core/ao-api/ao-api").ApiResult<TopologyNodeDetail>>;
    /** Test helper: health patch must not increment layout runs. */
    applyHealthForTest(patches: Array<{
        id: string;
        status: string;
        statusReason?: string;
    }>): {
        layoutRunsBefore: number;
        layoutRunsAfter: number;
    };
    private onLiveEvent;
    private applySnapshot;
    private applyDelta;
    private pruneExpandedApp;
    private pruneExpandedK8s;
    private patchHealth;
    private mergeGrace;
}
export type { TopologyNodeDetail };

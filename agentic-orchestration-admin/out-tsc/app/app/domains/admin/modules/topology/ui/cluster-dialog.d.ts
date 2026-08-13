import { TopologyNode } from '../data/topology.types';
export declare class ClusterDialog {
    readonly data: {
        node: TopologyNode;
    };
    readonly wikiPage = "Topology-dashboard";
    readonly wikiHelp: import("../data/topology.help").TopologyHelp;
    readonly appMembers: import("@angular/core").Signal<import("../data/topology.types").TopologyAppMembers[]>;
    breakdownEntries(b: Record<string, number>): [string, number][];
    memberKindLabel(): string;
    memberNoun(count: number): string;
    catalogLink(): string;
}

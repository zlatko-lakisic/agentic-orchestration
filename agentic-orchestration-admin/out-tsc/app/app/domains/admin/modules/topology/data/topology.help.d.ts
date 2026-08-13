import { TopologyEdge, TopologyNode } from './topology.types';
/** Wiki page hosting per-component stubs (HTML anchors match `wikiKey`). */
export declare const TOPOLOGY_WIKI_PAGE = "Topology-dashboard";
export type TopologyHelp = {
    /** Anchor id on the wiki page (no `#`). */
    wikiKey: string;
    /** One-sentence hover tooltip. */
    blurb: string;
};
export declare function helpForNode(node: Pick<TopologyNode, 'id' | 'kind'> | null | undefined): TopologyHelp;
export declare function helpForEdge(edge: Pick<TopologyEdge, 'id' | 'kind'> | null | undefined): TopologyHelp;
export declare function topologyWikiUrl(wikiKey: string): string;

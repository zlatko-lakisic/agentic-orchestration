import { statusGlyphColor, statusIcon } from '../data/topology.status';
import { PositionedEdge, PositionedNode } from '../data/topology.types';
export declare class TopologyTable {
    readonly nodes: import("@angular/core").InputSignal<PositionedNode[]>;
    readonly edges: import("@angular/core").InputSignal<PositionedEdge[]>;
    readonly nodeClick: import("@angular/core").OutputEmitterRef<PositionedNode>;
    readonly edgeClick: import("@angular/core").OutputEmitterRef<PositionedEdge>;
    readonly nodeCols: string[];
    readonly edgeCols: string[];
    readonly statusIcon: typeof statusIcon;
    readonly statusGlyphColor: typeof statusGlyphColor;
}

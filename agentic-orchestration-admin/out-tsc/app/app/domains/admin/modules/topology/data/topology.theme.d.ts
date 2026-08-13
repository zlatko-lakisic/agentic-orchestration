import { TopologyBand, TopologyNodeKind } from './topology.types';
export type TopologyKindTheme = {
    /** CSS color for accent (stroke / icon). */
    accent: string;
    /** Lucide svgIcon name. */
    icon: string;
    /** Short theme label for legend. */
    aspect: string;
};
export declare function themeForKind(kind: TopologyNodeKind | string, band?: TopologyBand): TopologyKindTheme;
export declare function themeForBand(band: TopologyBand): TopologyKindTheme;
export declare const KIND_THEMES: Record<string, TopologyKindTheme>;

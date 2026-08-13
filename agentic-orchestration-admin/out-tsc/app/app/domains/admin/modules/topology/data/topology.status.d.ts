/** Canvas / legend marks for TopologyNodeStatus. Colour is secondary to the glyph. */
export type StatusMark = {
    id: string;
    label: string;
    /** Lucide svgIcon name. */
    icon: string;
    /** Compact unicode for table / tests. */
    glyph: string;
    color: string;
};
/**
 * Topology never shows `unknown`. Idle / present-but-unprobed → healthy;
 * disabled / unset / not deployed → offline.
 */
export declare function visibleNodeStatus(status: string | null | undefined, deployed?: boolean | undefined): string;
/** Legend order. */
export declare const STATUS_MARK_LIST: StatusMark[];
export declare function statusMark(status: string | null | undefined): StatusMark;
export declare function statusGlyph(status: string | null | undefined): string;
export declare function statusGlyphColor(status: string | null | undefined): string;
export declare function statusIcon(status: string | null | undefined): string;

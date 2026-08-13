/**
 * Fuse admin layout (domains/admin/layout/layout.ts) without BuilderKit banner.
 * Assistant control opens AO search (same Fuse sparkles toolbar slot).
 */
export declare class AdminLayout {
    private media;
    private router;
    private live;
    private commandPalette;
    protected isMobile: import("@angular/core").Signal<boolean>;
    private url;
    /** Compact graphs live in the top bar on every page except Overview. */
    protected showHostUtilization: import("@angular/core").Signal<boolean>;
    constructor();
    openPalette(): void;
}

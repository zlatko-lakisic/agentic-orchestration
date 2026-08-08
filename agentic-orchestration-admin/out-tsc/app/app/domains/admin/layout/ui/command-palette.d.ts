type PaletteHit = {
    kind: 'nav' | 'config';
    label: string;
    detail: string;
    route: string;
    flash?: string;
};
/**
 * Fuse Assistant overlay chrome (layout/ui/assistant.ts) used for search.
 */
export declare class CommandPalette {
    private router;
    private config;
    readonly visible: import("@angular/core").WritableSignal<boolean>;
    readonly query: import("@angular/core").WritableSignal<string>;
    readonly hits: import("@angular/core").Signal<PaletteHit[]>;
    onKey(ev: KeyboardEvent): void;
    open(): void;
    close(): void;
    go(hit: PaletteHit): void;
    private flattenNav;
    private routeForGroup;
}
export {};

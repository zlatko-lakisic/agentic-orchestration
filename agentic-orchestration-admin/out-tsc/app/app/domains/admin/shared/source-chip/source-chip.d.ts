/** Fuse Orders-style status pill for config provenance. */
export declare class SourceChip {
    readonly source: import("@angular/core").InputSignal<string | null | undefined>;
    readonly sourceFile: import("@angular/core").InputSignal<string | null | undefined>;
    protected label(): string;
    protected classes(): Record<string, boolean>;
}

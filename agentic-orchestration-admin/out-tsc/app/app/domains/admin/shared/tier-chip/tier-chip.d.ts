/** Fuse Orders-style status pill for apply tier. */
export declare class TierChip {
    readonly tier: import("@angular/core").InputSignal<string | null | undefined>;
    protected text(): string;
    protected classes(): Record<string, boolean>;
}

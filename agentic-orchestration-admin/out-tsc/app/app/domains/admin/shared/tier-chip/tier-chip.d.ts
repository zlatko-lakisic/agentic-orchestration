/**
 * Apply-tier display: soft text for live/next-run; amber chip only for restart/redeploy.
 */
export declare class TierChip {
    readonly tier: import("@angular/core").InputSignal<string | null | undefined>;
    protected readonly key: import("@angular/core").Signal<string>;
    protected loud(): boolean;
    protected text(): string;
}

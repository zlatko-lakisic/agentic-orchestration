/**
 * Fuse Orders status pill (apps/orders/features/orders.ts).
 */
export declare class StatusChip {
    readonly status: import("@angular/core").InputSignal<string | null | undefined>;
    readonly label: import("@angular/core").InputSignal<string | null>;
    protected text(): string;
    protected classes(): Record<string, boolean>;
}

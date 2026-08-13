import { OnDestroy } from '@angular/core';
/** App-wide 1 Hz clock for live “ago” labels. */
export declare class AoClock implements OnDestroy {
    readonly nowMs: import("@angular/core").WritableSignal<number>;
    private readonly timer;
    ngOnDestroy(): void;
}
export declare function toEpochMs(value: unknown): number | null;
/**
 * Relative time up to 6 hours (ceil to second / minute / hour), then absolute local date.
 */
export declare function formatTimeAgo(value: unknown, nowMs?: number): string;
export declare function formatAbsoluteLocal(value: unknown): string;

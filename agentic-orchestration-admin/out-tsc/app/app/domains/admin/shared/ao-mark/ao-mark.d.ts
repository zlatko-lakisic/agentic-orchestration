/**
 * Brand mark for Agentic Orchestration (letter-A + orchestration arrow).
 * Uses CSS mask so tint follows theme / explicit steel.
 * @see assets/brand/BRAND.md
 */
export declare class AoMark {
    /** xs ≈14px (topology bands), sm ≈18px (inline labels), md ≈32px (sidebar). */
    readonly size: import("@angular/core").InputSignal<"xs" | "sm" | "md">;
    /** steel = brand #3B6EA5 (flips on dark); on-dark = #E6EAF0; current = inherit. */
    readonly tint: import("@angular/core").InputSignal<"steel" | "on-dark" | "current">;
    readonly label: import("@angular/core").InputSignal<string>;
}

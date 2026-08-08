/** Fuse-style empty content block (icon + title + description). */
export declare class EmptyState {
    readonly title: import("@angular/core").InputSignal<string>;
    readonly message: import("@angular/core").InputSignal<string>;
    readonly icon: import("@angular/core").InputSignal<string>;
    readonly actionLabel: import("@angular/core").InputSignal<string | null>;
    readonly actionRoute: import("@angular/core").InputSignal<string | null>;
}

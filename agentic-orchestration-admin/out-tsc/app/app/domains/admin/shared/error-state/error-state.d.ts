/** Fuse mat-card surface for error reporting. */
export declare class ErrorState {
    readonly title: import("@angular/core").InputSignal<string>;
    readonly message: import("@angular/core").InputSignal<string>;
    readonly remedy: import("@angular/core").InputSignal<string | null>;
    readonly detail: import("@angular/core").InputSignal<string | null>;
    protected open: import("@angular/core").WritableSignal<boolean>;
}

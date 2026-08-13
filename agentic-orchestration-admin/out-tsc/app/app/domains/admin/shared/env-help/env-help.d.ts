/**
 * Question-mark control next to an env key: hover shows definition,
 * click opens the Configuration wiki anchor for that variable.
 */
export declare class EnvHelp {
    readonly key: import("@angular/core").InputSignal<string>;
    readonly help: import("@angular/core").InputSignal<string | null | undefined>;
    readonly wikiUrl: import("@angular/core").InputSignal<string | null | undefined>;
    readonly wikiPage: import("@angular/core").InputSignal<string | null | undefined>;
    protected readonly href: import("@angular/core").Signal<string>;
    protected readonly tooltip: import("@angular/core").Signal<string>;
}

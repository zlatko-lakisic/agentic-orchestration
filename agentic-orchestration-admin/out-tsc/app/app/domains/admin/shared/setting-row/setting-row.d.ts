/** Fuse Settings row density — shows effective value (incl. defaults). */
export declare class SettingRow {
    readonly key: import("@angular/core").InputSignal<string>;
    readonly label: import("@angular/core").InputSignal<string>;
    readonly value: import("@angular/core").InputSignal<string | number | boolean | null | undefined>;
    readonly displayValue: import("@angular/core").InputSignal<string | null | undefined>;
    readonly help: import("@angular/core").InputSignal<string | null | undefined>;
    readonly wikiUrl: import("@angular/core").InputSignal<string | null | undefined>;
    readonly source: import("@angular/core").InputSignal<string | null | undefined>;
    readonly sourceFile: import("@angular/core").InputSignal<string | null | undefined>;
    readonly tier: import("@angular/core").InputSignal<string | null | undefined>;
    readonly secret: import("@angular/core").InputSignal<boolean>;
    readonly set: import("@angular/core").InputSignal<boolean>;
    readonly pathExists: import("@angular/core").InputSignal<boolean | null | undefined>;
    readonly flashId: import("@angular/core").InputSignal<string | null>;
    protected display(): string;
    protected showDefaultHint(): boolean;
}

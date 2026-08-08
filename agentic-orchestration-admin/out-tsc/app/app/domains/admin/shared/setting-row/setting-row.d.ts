/** Fuse Settings row density (notifications/account). */
export declare class SettingRow {
    readonly key: import("@angular/core").InputSignal<string>;
    readonly label: import("@angular/core").InputSignal<string>;
    readonly value: import("@angular/core").InputSignal<string | number | boolean | null | undefined>;
    readonly displayValue: import("@angular/core").InputSignal<string | null | undefined>;
    readonly help: import("@angular/core").InputSignal<string | null | undefined>;
    readonly source: import("@angular/core").InputSignal<string | null | undefined>;
    readonly sourceFile: import("@angular/core").InputSignal<string | null | undefined>;
    readonly tier: import("@angular/core").InputSignal<string | null | undefined>;
    readonly secret: import("@angular/core").InputSignal<boolean>;
    readonly set: import("@angular/core").InputSignal<boolean>;
    readonly flashId: import("@angular/core").InputSignal<string | null>;
    protected display(): string;
}

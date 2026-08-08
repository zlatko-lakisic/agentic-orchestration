import { Scheme } from '@/app/core/theming';
export declare class SchemeSwitcher {
    private theming;
    protected scheme: import("@angular/core").Signal<Scheme>;
    protected schemes: {
        label: string;
        value: Scheme;
    }[];
    updateScheme(scheme: Scheme): void;
}

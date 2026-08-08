import { IsActiveMatchOptions, NavigationEnd } from '@angular/router';
import { NavigationItem } from '@/app/domains/admin/layout/data/navigation';
export declare class Navigation {
    private router;
    protected navigation: import("@angular/core").WritableSignal<NavigationItem[]>;
    protected navigationEnd: import("@angular/core").Signal<NavigationEnd | undefined>;
    constructor();
    /**
     * Expand all parent routes of the active route.
     * @param items
     */
    expandActiveRoute(items: NavigationItem[]): NavigationItem[];
    /**
     * Convert simple exact option to full IsActiveMatchOptions.
     * @param options
     */
    isActiveOption(options: {
        exact: boolean;
    } | IsActiveMatchOptions): IsActiveMatchOptions;
}

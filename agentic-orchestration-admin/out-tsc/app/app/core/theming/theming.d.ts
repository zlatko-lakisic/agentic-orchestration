import { Scheme, Colors, Theme } from './models/theming';
export declare class Theming {
    private document;
    private isServer;
    private localStorage;
    private media;
    private themeConfig;
    private prefersDarkMode;
    colors: import("@angular/core").WritableSignal<Colors>;
    scheme: import("@angular/core").WritableSignal<Scheme>;
    theme: import("@angular/core").Signal<Theme>;
    isDark: import("@angular/core").Signal<boolean | import("@angular/core").Signal<boolean>>;
    isLight: import("@angular/core").Signal<boolean>;
    private rootEl;
    private themeStyleEl;
    constructor();
    /**
     * Generates a theme using the provided theming configuration and
     * applies it to the DOM by injecting CSS variables into a
     * style element.
     */
    private generateTheme;
}

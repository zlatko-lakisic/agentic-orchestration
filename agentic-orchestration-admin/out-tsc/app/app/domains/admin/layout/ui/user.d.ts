import { OnInit } from '@angular/core';
import { Scheme } from '@/app/core/theming';
/** Fuse layout/ui/user.ts — session-backed identity instead of demo avatar. */
export declare class User implements OnInit {
    private theming;
    private api;
    private userName;
    private session;
    protected scheme: import("@angular/core").Signal<Scheme>;
    protected schemes: {
        label: string;
        value: Scheme;
    }[];
    protected displayName: import("@angular/core").Signal<string>;
    protected sessionId: import("@angular/core").Signal<string | null>;
    protected initial: import("@angular/core").Signal<string>;
    ngOnInit(): void;
    updateScheme(scheme: Scheme): void;
}

import { OnInit } from '@angular/core';
/** Fuse admin sidebar structure with AO branding + environment identity. */
export declare class AdminSidebar implements OnInit {
    private api;
    readonly hostname: import("@angular/core").WritableSignal<string | null>;
    readonly profile: import("@angular/core").WritableSignal<string | null>;
    readonly userName: import("@angular/core").WritableSignal<string | null>;
    ngOnInit(): void;
}

import { OnInit } from '@angular/core';
import { TopologyComponent } from '@/app/core/ao-api/types';
export declare class ComponentDetailPage implements OnInit {
    private route;
    private api;
    private clipboard;
    readonly id: import("@angular/core").WritableSignal<string>;
    readonly tab: import("@angular/core").WritableSignal<string>;
    readonly topo: import("@angular/core").WritableSignal<TopologyComponent | null>;
    readonly probeResult: import("@angular/core").WritableSignal<string | null>;
    readonly tabs: {
        id: string;
        label: string;
    }[];
    readonly title: import("@angular/core").Signal<string>;
    readonly kind: import("@angular/core").Signal<string>;
    readonly status: import("@angular/core").Signal<string>;
    readonly fact: import("@angular/core").Signal<string>;
    readonly endpoint: import("@angular/core").Signal<string | null>;
    readonly notes: import("@angular/core").Signal<string>;
    settingsGroups(): string[];
    ngOnInit(): void;
    copyEndpoint(): void;
    canProbe(): boolean;
    testConnection(): void;
}

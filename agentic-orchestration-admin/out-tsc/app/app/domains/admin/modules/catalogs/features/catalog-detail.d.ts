import { OnInit } from '@angular/core';
import { CatalogEntry } from '@/app/core/ao-api/types';
/** Fuse Order detail drawer pattern. */
export declare class CatalogDetailPage implements OnInit {
    private api;
    private route;
    private router;
    readonly kind: import("@angular/core").WritableSignal<string>;
    readonly entry: import("@angular/core").WritableSignal<(CatalogEntry & {
        availabilityTrace?: {
            step: string;
            result: string;
            detail?: string;
        }[];
        file?: string;
    }) | null>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    ngOnInit(): void;
    close(): void;
}

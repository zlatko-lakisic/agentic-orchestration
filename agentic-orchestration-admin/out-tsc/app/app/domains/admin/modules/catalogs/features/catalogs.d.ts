import { OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { CatalogEntry } from '@/app/core/ao-api/types';
/** Fuse Orders list pattern: header + search + mat-table + end detail drawer. */
export declare class CatalogsPage implements OnInit {
    private api;
    private route;
    private router;
    private media;
    readonly kinds: {
        id: string;
        label: string;
    }[];
    readonly kind: import("@angular/core").WritableSignal<string>;
    readonly entries: import("@angular/core").WritableSignal<CatalogEntry[]>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly search: import("@angular/core").WritableSignal<string>;
    readonly columns: string[];
    readonly dataSource: MatTableDataSource<CatalogEntry>;
    private url;
    protected isMobile: import("@angular/core").Signal<boolean>;
    protected detailOpen: import("@angular/core").Signal<boolean>;
    ngOnInit(): void;
    load(kind: string): void;
    onSearch(value: string): void;
    private applyFilter;
    closeDetail(): void;
    fixRoute(key: string): string;
}

import { OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { StorageEntry } from '@/app/core/ao-api/types';
export declare class DataPage implements OnInit {
    private api;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly columns: string[];
    readonly dataSource: MatTableDataSource<StorageEntry>;
    ngOnInit(): void;
    formatBytes(n?: number | null): string;
}

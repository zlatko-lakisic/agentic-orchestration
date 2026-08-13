import { OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { StorageEntry } from '@/app/core/ao-api/types';
export declare class DataPage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly columns: string[];
    readonly dataSource: MatTableDataSource<StorageEntry>;
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    formatBytes(n?: number | null): string;
    visibilityLabel(r: StorageEntry): string;
}

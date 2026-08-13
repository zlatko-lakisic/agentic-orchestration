import { OnInit } from '@angular/core';
import { MtlsClient } from '@/app/core/ao-api/types';
export declare class AccessMtlsClients implements OnInit {
    private readonly api;
    private readonly dialog;
    readonly columns: string[];
    readonly clients: import("@angular/core").WritableSignal<MtlsClient[]>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly busyKey: import("@angular/core").WritableSignal<string | null>;
    ngOnInit(): void;
    rowKey(c: MtlsClient): string;
    reload(): void;
    openMintEnroll(): void;
    revoke(c: MtlsClient): void;
    unrevoke(c: MtlsClient): void;
    revokeByCn(): void;
}

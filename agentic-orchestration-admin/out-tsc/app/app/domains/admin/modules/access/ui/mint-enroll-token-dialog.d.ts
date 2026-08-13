import { MatDialogRef } from '@angular/material/dialog';
import { MtlsEnrollToken } from '@/app/core/ao-api/types';
export declare class MintEnrollTokenDialog {
    private readonly api;
    private readonly clipboard;
    readonly ref: MatDialogRef<any, any>;
    clientName: string;
    ttlSeconds: number;
    readonly busy: import("@angular/core").WritableSignal<boolean>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly minted: import("@angular/core").WritableSignal<MtlsEnrollToken | null>;
    readonly copied: import("@angular/core").WritableSignal<boolean>;
    mint(): void;
    copySecret(): void;
}

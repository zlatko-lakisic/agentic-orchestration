import { Observable } from 'rxjs';
export type WebAuthState = {
    assigned: boolean;
    appId: string;
    token: string | null;
    tokenId?: string | null;
    prefix?: string | null;
    assignedAt?: string | null;
    hint?: string;
};
export declare class WebAuth {
    private readonly http;
    private readonly tokenSignal;
    private readonly assignedSignal;
    private readonly readySignal;
    readonly token: import("@angular/core").Signal<string | null>;
    readonly assigned: import("@angular/core").Signal<boolean>;
    readonly ready: import("@angular/core").Signal<boolean>;
    bearer(): string | null;
    refresh(): Observable<WebAuthState>;
    refreshOnce(): Promise<void>;
    /** After minting ao-web, keep the SPA in sync without waiting for another fetch. */
    adoptMinted(token: string | null | undefined, assignedToWeb?: boolean): void;
    clear(): void;
    private apply;
    private readStored;
}

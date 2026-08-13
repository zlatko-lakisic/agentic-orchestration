import { ApiAccessToken } from '@/app/core/ao-api/types';
export type MintTokenDialogResult = ApiAccessToken | null;
type MintKind = 'client' | 'admin' | 'chat';
export declare class MintTokenDialog {
    private readonly api;
    private readonly webAuth;
    private readonly clipboard;
    private readonly ref;
    readonly data: {
        preferWebUi?: boolean;
        preferChatUi?: boolean;
    } | null;
    kind: MintKind;
    appId: string;
    label: string;
    expiresAt: string;
    readonly busy: import("@angular/core").WritableSignal<boolean>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly minted: import("@angular/core").WritableSignal<ApiAccessToken | null>;
    readonly copied: import("@angular/core").WritableSignal<boolean>;
    mint(): void;
    copySecret(): void;
    closeDone(): void;
}
export {};

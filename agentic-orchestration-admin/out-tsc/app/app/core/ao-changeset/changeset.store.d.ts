import { AoApplyTier, AoSource } from '@/app/core/ao-api/types';
export interface ChangeSetEntry {
    key: string;
    from: string | null;
    to: string | null;
    plane?: string;
    applyTier: AoApplyTier | string;
    source?: AoSource | string;
}
export declare class ChangeSetStore {
    private localStorage;
    readonly entries: import("@angular/core").WritableSignal<ChangeSetEntry[]>;
    readonly count: import("@angular/core").Signal<number>;
    readonly hasPending: import("@angular/core").Signal<boolean>;
    private restore;
    private persist;
    upsert(entry: ChangeSetEntry): void;
    remove(key: string): void;
    clear(): void;
    /** Phase 0: export local change set as a text diff artefact. */
    exportDiff(): string;
}

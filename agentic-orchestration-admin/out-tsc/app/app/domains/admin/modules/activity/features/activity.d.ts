import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { ChangeSetStore } from '@/app/core/ao-changeset/changeset.store';
type TimelineItem = {
    id: string;
    ts: string;
    kind: string;
    message: string;
    href?: string;
};
export declare class ActivityPage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    protected changeset: ChangeSetStore;
    private clipboard;
    readonly fingerprint: import("@angular/core").WritableSignal<string | null>;
    readonly timeline: import("@angular/core").WritableSignal<TimelineItem[]>;
    private lastFp;
    private lastAttention;
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    private push;
    copyDiff(): void;
}
export {};

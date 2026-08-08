import { OnInit } from '@angular/core';
interface AttentionNote {
    id: string;
    title: string;
    description: string;
    time: Date;
    href?: string;
    severity: string;
}
export declare class Notifications implements OnInit {
    private api;
    private generatedAt;
    protected open: import("@angular/core").WritableSignal<boolean>;
    protected notes: import("@angular/core").WritableSignal<AttentionNote[]>;
    protected unreadCount: import("@angular/core").Signal<number>;
    ngOnInit(): void;
    reload(): void;
    toggle(force?: boolean | null): void;
    timeAgo(time: Date): string;
}
export {};

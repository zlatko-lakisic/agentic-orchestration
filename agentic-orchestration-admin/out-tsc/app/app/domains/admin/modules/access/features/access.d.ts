import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AccessPosture } from '@/app/core/ao-api/types';
import { SettingsSection } from '@/app/domains/admin/shared/config-settings/config-settings-table';
export declare class AccessPage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    readonly posture: import("@angular/core").Signal<AccessPosture | null>;
    readonly error: import("@angular/core").Signal<string | null>;
    readonly sections: SettingsSection[];
    ngOnInit(): void;
    ngOnDestroy(): void;
}

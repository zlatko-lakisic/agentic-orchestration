import { OnInit } from '@angular/core';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { SettingsSection } from '@/app/domains/admin/shared/config-settings/config-settings-table';
export declare class ConfigSettingsPage implements OnInit {
    protected config: EffectiveConfigStore;
    private route;
    readonly groups: import("@angular/core").InputSignal<string[] | null>;
    readonly sections: import("@angular/core").InputSignal<SettingsSection[]>;
    readonly sectionTitle: import("@angular/core").InputSignal<string>;
    readonly sectionDescription: import("@angular/core").InputSignal<string | null>;
    readonly conditionalKubernetes: import("@angular/core").InputSignal<boolean>;
    readonly component: import("@angular/core").InputSignal<string | null>;
    readonly resolvedGroups: import("@angular/core").Signal<string[]>;
    ngOnInit(): void;
}

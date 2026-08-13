import { __decorate } from "tslib";
import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { ConfigSettingsTable, } from '@/app/domains/admin/shared/config-settings/config-settings-table';
let ConfigSettingsPage = class ConfigSettingsPage {
    config = inject(EffectiveConfigStore);
    route = inject(ActivatedRoute);
    groups = input(null);
    sections = input([]);
    sectionTitle = input('Settings');
    sectionDescription = input(null);
    conditionalKubernetes = input(false);
    component = input(null);
    resolvedGroups = computed(() => {
        const fromInput = this.groups();
        if (fromInput?.length)
            return fromInput;
        const data = this.route.snapshot.data;
        return data['groups'] || [];
    });
    ngOnInit() {
        this.config.load();
    }
};
ConfigSettingsPage = __decorate([
    Component({
        selector: 'ao-config-settings-page',
        imports: [ConfigSettingsTable],
        template: `
    <ao-config-settings-table
      [groups]="resolvedGroups()"
      [sections]="sections()"
      [title]="sectionTitle()"
      [description]="sectionDescription()"
      [conditionalKubernetes]="conditionalKubernetes()"
      [component]="component()"
    />
  `,
    })
], ConfigSettingsPage);
export { ConfigSettingsPage };

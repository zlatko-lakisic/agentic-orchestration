import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
let PlannerPage = class PlannerPage {
};
PlannerPage = __decorate([
    Component({
        selector: 'ao-planner-page',
        imports: [ConfigSettingsPage],
        template: `
    <ao-config-settings-page
      [groups]="['planner']"
      sectionTitle="Planner & defaults"
      sectionDescription="Effective values with source and apply tier"
    />
  `,
    })
], PlannerPage);
export { PlannerPage };

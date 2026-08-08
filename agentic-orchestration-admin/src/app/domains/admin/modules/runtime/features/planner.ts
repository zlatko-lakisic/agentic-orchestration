import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';

@Component({
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
export class PlannerPage {}

import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';

@Component({
  selector: 'ao-execution-page',
  imports: [ConfigSettingsPage],
  template: `
    <ao-config-settings-page
      [groups]="['execution']"
      sectionTitle="Execution"
      sectionDescription="Backend, workers, and run orchestration"
    />
  `,
})
export class ExecutionPage {}

import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
let DeploymentsPage = class DeploymentsPage {
};
DeploymentsPage = __decorate([
    Component({
        selector: 'ao-deployments-page',
        imports: [ConfigSettingsPage],
        template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-col gap-y-0.5">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Deployments
        </div>
        <div class="text-neutral-500">
          Edge profiles, env merge, and rollout related settings
        </div>
      </div>
      <ao-config-settings-page
        [groups]="['deployments']"
        sectionTitle="Profiles & edge"
        sectionDescription="Effective values with source and apply tier"
      />
    </div>
  `,
    })
], DeploymentsPage);
export { DeploymentsPage };

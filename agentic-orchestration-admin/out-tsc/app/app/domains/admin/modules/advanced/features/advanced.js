import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
let AdvancedPage = class AdvancedPage {
};
AdvancedPage = __decorate([
    Component({
        selector: 'ao-advanced-page',
        imports: [ConfigSettingsPage],
        template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-col gap-y-0.5">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Advanced
        </div>
        <div class="text-neutral-500">
          Escape hatches and less-common environment knobs
        </div>
      </div>
      <ao-config-settings-page
        [groups]="['advanced']"
        sectionTitle="Advanced"
        sectionDescription="Effective values with source and apply tier"
      />
    </div>
  `,
    })
], AdvancedPage);
export { AdvancedPage };

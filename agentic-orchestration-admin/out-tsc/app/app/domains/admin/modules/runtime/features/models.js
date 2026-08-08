import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
let ModelsPage = class ModelsPage {
};
ModelsPage = __decorate([
    Component({
        selector: 'ao-models-page',
        imports: [ConfigSettingsPage],
        template: `
    <ao-config-settings-page
      [groups]="['models']"
      sectionTitle="Models & hardware"
      sectionDescription="Ollama, Hugging Face, VRAM, and resident models"
    />
  `,
    })
], ModelsPage);
export { ModelsPage };

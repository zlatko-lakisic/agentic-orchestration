import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
let IntegrationsPage = class IntegrationsPage {
    config = inject(EffectiveConfigStore);
    route = inject(ActivatedRoute);
    ngOnInit() {
        this.config.load();
        const flash = this.route.snapshot.queryParamMap.get('flash');
        if (flash) {
            setTimeout(() => document.getElementById(flash)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            }), 350);
        }
    }
};
IntegrationsPage = __decorate([
    Component({
        selector: 'ao-integrations-page',
        imports: [ConfigSettingsPage, MatCard, MatIcon, StatusChip],
        template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-col gap-y-0.5">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Integrations
        </div>
        <div class="text-neutral-500">
          OpenClaw, Reach, speech, Home Assistant, and search MCPs
        </div>
      </div>

      <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <mat-card
          class="overflow-hidden"
          appearance="outlined"
        >
          <div class="flex flex-col gap-y-2 p-6">
            <div class="flex items-center justify-between gap-2">
              <div class="truncate text-lg font-medium tracking-tight">
                OpenClaw bridge
              </div>
              <ao-status-chip status="available" />
            </div>
            <div class="font-mono text-xs text-neutral-500">
              POST /api/v1/orchestrate on web :30487
            </div>
            <div class="text-sm text-neutral-500">
              Auth: AGENTIC_ORCHESTRATE_API_KEY
            </div>
          </div>
        </mat-card>

        <mat-card
          class="overflow-hidden"
          appearance="outlined"
        >
          <div class="flex flex-col gap-y-2 p-6">
            <div class="flex items-center justify-between gap-2">
              <div class="truncate text-lg font-medium tracking-tight">
                AO Reach / KnowBuddy
              </div>
              <ao-status-chip status="info" label="engine" />
            </div>
            <div class="font-mono text-xs text-neutral-500">
              Engine https://&lt;host&gt;:8765 (NodePort 30765)
            </div>
            <div class="flex items-start gap-x-2 text-sm text-neutral-500">
              <mat-icon
                class="mt-0.5 size-4 text-primary-600"
                svgIcon="circle-alert"
              />
              Do not point Reach at web :30487
            </div>
          </div>
        </mat-card>
      </div>

      <ao-config-settings-page
        [groups]="['integrations']"
        sectionTitle="Integration settings"
        sectionDescription="Effective values with source and apply tier"
      />
    </div>
  `,
    })
], IntegrationsPage);
export { IntegrationsPage };

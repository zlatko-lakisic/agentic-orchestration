import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';

@Component({
  selector: 'ao-integrations-page',
  imports: [ConfigSettingsPage, MatCard, MatCardContent, MatIcon],
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
        <mat-card appearance="outlined">
          <mat-card-content class="flex flex-col gap-y-2 py-5">
            <div class="flex items-center gap-x-2">
              <mat-icon
                class="text-primary-600"
                svgIcon="plug"
              />
              <div class="text-lg font-medium tracking-tight">
                OpenClaw bridge
              </div>
            </div>
            <div class="font-mono text-xs text-neutral-500">
              POST /api/v1/orchestrate on web :30487
            </div>
            <div class="text-sm text-neutral-500">
              Auth: AGENTIC_ORCHESTRATE_API_KEY
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card
          appearance="outlined"
          [class.border-red-600]="!!reachError()"
        >
          <mat-card-content class="flex flex-col gap-y-2 py-5">
            <div class="flex items-center gap-x-2">
              <mat-icon
                class="text-primary-600"
                svgIcon="antenna"
              />
              <div class="text-lg font-medium tracking-tight">
                AO Reach / KnowBuddy
              </div>
            </div>
            <div class="font-mono text-xs text-neutral-500">
              Engine https://&lt;host&gt;:8765 (NodePort 30765)
            </div>
            @if (reachError()) {
              <div class="text-sm text-red-600">{{ reachError() }}</div>
            } @else {
              <div class="text-sm text-emerald-600">
                Do not point Reach at web :30487
              </div>
            }
          </mat-card-content>
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
export class IntegrationsPage implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);
  readonly rows = computed(() => this.config.entriesForGroup(['integrations']));
  readonly reachError = signal<string | null>(null);

  ngOnInit() {
    this.config.load();
    const flash = this.route.snapshot.queryParamMap.get('flash');
    if (flash) {
      setTimeout(
        () =>
          document.getElementById(flash)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          }),
        350
      );
    }
  }
}

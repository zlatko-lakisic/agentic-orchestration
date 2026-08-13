import { __decorate } from "tslib";
import { NgClass } from '@angular/common';
import { Component, computed, inject, } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AccessApiTokens } from '@/app/domains/admin/modules/access/ui/access-api-tokens';
import { AccessAppPrefs } from '@/app/domains/admin/modules/access/ui/access-app-prefs';
import { AccessMtlsClients } from '@/app/domains/admin/modules/access/ui/access-mtls-clients';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
let AccessPage = class AccessPage {
    live = inject(AoLiveWs);
    posture = computed(() => {
        const snap = this.live.feeds()['access'];
        return snap?.posture || null;
    });
    error = computed(() => {
        const e = this.live.feedErrors()['access'] || this.live.feedErrors()['_'];
        return e || null;
    });
    sections = [
        { id: 'identity', title: 'Identity' },
        { id: 'secrets', title: 'Secrets' },
        { id: 'deals', title: 'Deals' },
        { id: 'mtls', title: 'mTLS' },
    ];
    ngOnInit() {
        this.live.acquire({ feeds: ['access'], feedIntervalMs: 4000 });
    }
    ngOnDestroy() {
        this.live.release();
    }
};
AccessPage = __decorate([
    Component({
        selector: 'ao-access-page',
        imports: [
            AccessApiTokens,
            AccessAppPrefs,
            AccessMtlsClients,
            ConfigSettingsPage,
            MatCard,
            MatCardHeader,
            MatCardContent,
            NgClass,
            ErrorState,
        ],
        template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Access
        </div>
        <div class="text-neutral-500">
          Posture, API tokens, per-app planning, mTLS clients, identity, secrets, and deals
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      @if (posture(); as p) {
        <mat-card
          appearance="outlined"
          [ngClass]="{
            'border-red-400 dark:border-red-700': p.severity === 'critical',
            'border-amber-400 dark:border-amber-700': p.severity === 'warning',
            'border-green-400 dark:border-green-700': p.severity === 'ok',
          }"
        >
          <mat-card-header>
            <div class="text-lg font-medium tracking-tight">Posture</div>
          </mat-card-header>
          <mat-card-content class="flex flex-col gap-2 pt-2">
            <p class="text-base font-medium">{{ p.verdict }}</p>
            <ul class="list-inside list-disc text-sm text-neutral-600 dark:text-neutral-400">
              @for (d of p.details || []; track d) {
                <li>{{ d }}</li>
              }
            </ul>
          </mat-card-content>
        </mat-card>
      }

      <ao-access-api-tokens />

      <ao-access-app-prefs />

      <ao-access-mtls-clients />

      <ao-config-settings-page
        [groups]="['security']"
        [sections]="sections"
        sectionTitle="Settings"
      />
    </div>
  `,
    })
], AccessPage);
export { AccessPage };

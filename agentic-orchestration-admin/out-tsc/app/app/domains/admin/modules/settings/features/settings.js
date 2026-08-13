import { __decorate } from "tslib";
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { ConfigSettingsTable } from '@/app/domains/admin/shared/config-settings/config-settings-table';
let SettingsPage = class SettingsPage {
    api = inject(AoApi);
    config = inject(EffectiveConfigStore);
    query = signal('');
    modifiedOnly = signal(false);
    restartOnly = signal(false);
    includeInjected = signal(false);
    filteredCount = computed(() => this.applyFilters(this.config.entries()).length);
    ngOnInit() {
        this.config.load();
    }
    onQuery() {
        /* signal updated via ngModel binding helper */
    }
    toggleInjected(checked) {
        this.includeInjected.set(checked);
        this.api.effectiveConfig({ includeInjected: checked }).subscribe((r) => {
            if (r.ok)
                this.config.entries.set(r.data);
        });
    }
    applyFilters(entries) {
        let rows = entries;
        const q = this.query().trim().toLowerCase();
        if (q) {
            rows = rows.filter((e) => e.key.toLowerCase().includes(q) ||
                String(e.label || '')
                    .toLowerCase()
                    .includes(q) ||
                String(e.effective ?? e.value ?? '')
                    .toLowerCase()
                    .includes(q));
        }
        if (this.modifiedOnly()) {
            rows = rows.filter((e) => e.set && e.source !== 'default');
        }
        if (this.restartOnly()) {
            rows = rows.filter((e) => {
                const t = String(e.tier || e.applyTier || '').toLowerCase();
                return t.includes('restart') || t === 'redeploy';
            });
        }
        return rows;
    }
};
SettingsPage = __decorate([
    Component({
        selector: 'ao-settings-page',
        imports: [
            ConfigSettingsTable,
            FormsModule,
            MatButtonModule,
            MatCheckbox,
            MatFormField,
            MatLabel,
            MatInput,
        ],
        template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          All settings
        </div>
        <div class="text-neutral-500">
          Every key with provenance — injected Kubernetes env hidden by default
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <mat-form-field
          appearance="outline"
          class="min-w-64"
          subscriptSizing="dynamic"
        >
          <mat-label>Filter</mat-label>
          <input
            matInput
            [(ngModel)]="query"
            (ngModelChange)="onQuery()"
            placeholder="key or value"
          />
        </mat-form-field>
        <mat-checkbox
          [checked]="modifiedOnly()"
          (change)="modifiedOnly.set($event.checked)"
        >
          Modified from default
        </mat-checkbox>
        <mat-checkbox
          [checked]="restartOnly()"
          (change)="restartOnly.set($event.checked)"
        >
          Requires restart
        </mat-checkbox>
        <mat-checkbox
          [checked]="includeInjected()"
          (change)="toggleInjected($event.checked)"
        >
          Show injected environment
        </mat-checkbox>
      </div>

      <ao-config-settings-table
        [title]="null"
        [groups]="null"
      />

      @if (query() || modifiedOnly() || restartOnly()) {
        <p class="text-sm text-neutral-500">
          Showing {{ filteredCount() }} after client filters (table shows full
          store; use search in command palette for flash-to-row).
        </p>
      }
    </div>
  `,
    })
], SettingsPage);
export { SettingsPage };

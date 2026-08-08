import { __decorate } from "tslib";
import { Component, input } from '@angular/core';
import { SourceChip } from '@/app/domains/admin/shared/source-chip/source-chip';
import { TierChip } from '@/app/domains/admin/shared/tier-chip/tier-chip';
/** Fuse Settings row density (notifications/account). */
let SettingRow = class SettingRow {
    key = input.required();
    label = input.required();
    value = input(null);
    displayValue = input(null);
    help = input(null);
    source = input('unknown');
    sourceFile = input(null);
    tier = input('next-run');
    secret = input(false);
    set = input(false);
    flashId = input(null);
    display() {
        if (this.displayValue() != null && this.displayValue() !== '') {
            return String(this.displayValue());
        }
        const v = this.value();
        if (v === null || v === undefined || v === '')
            return '—';
        return String(v);
    }
};
SettingRow = __decorate([
    Component({
        selector: 'ao-setting-row',
        imports: [SourceChip, TierChip],
        host: {
            class: 'grid grid-cols-1 gap-2 py-4 sm:grid-cols-[minmax(12rem,1.2fr)_minmax(0,1.4fr)_auto] sm:items-start',
            '[attr.id]': 'flashId()',
        },
        template: `
    <div class="min-w-0">
      <div class="font-medium">{{ label() }}</div>
      <div class="mt-0.5 font-mono text-sm text-neutral-500 break-all">
        {{ key() }}
      </div>
      @if (help()) {
        <div class="mt-1 text-sm text-neutral-500">{{ help() }}</div>
      }
    </div>

    <div class="min-w-0">
      @if (secret()) {
        <div class="font-mono text-base text-neutral-500">
          {{ set() ? '••••••' : 'Not set' }}
        </div>
      } @else {
        <div class="font-mono text-base break-all tabular-nums">
          {{ display() }}
        </div>
      }
      @if (sourceFile()) {
        <div class="mt-1 font-mono text-xs text-neutral-500 break-all">
          {{ sourceFile() }}
        </div>
      }
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:justify-end">
      <ao-source-chip
        [source]="source()"
        [sourceFile]="sourceFile()"
      />
      <ao-tier-chip [tier]="tier()" />
    </div>
  `,
    })
], SettingRow);
export { SettingRow };

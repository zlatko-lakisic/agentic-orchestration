import { Component, input } from '@angular/core';
import { SourceChip } from '@/app/domains/admin/shared/source-chip/source-chip';
import { TierChip } from '@/app/domains/admin/shared/tier-chip/tier-chip';

@Component({
  selector: 'ao-setting-row',
  imports: [SourceChip, TierChip],
  host: {
    class:
      'grid grid-cols-1 gap-2 border-b border-neutral-800 py-3 sm:grid-cols-[minmax(12rem,1.2fr)_minmax(0,1.4fr)_auto] sm:items-start',
    '[attr.id]': 'flashId()',
  },
  template: `
    <div class="min-w-0">
      <div class="text-base font-medium">{{ label() }}</div>
      <div class="mt-0.5 font-mono text-xs text-neutral-500 break-all">
        {{ key() }}
      </div>
      @if (help()) {
        <div class="mt-1 text-sm text-neutral-500">{{ help() }}</div>
      }
    </div>

    <div class="min-w-0">
      @if (secret()) {
        <div class="font-mono text-base text-neutral-400">
          {{ set() ? '••••••' : 'Not set' }}
        </div>
      } @else {
        <div class="font-mono text-base break-all tabular-nums">
          {{ display() }}
        </div>
      }
      @if (sourceFile()) {
        <div class="mt-1 font-mono text-2xs text-neutral-600 break-all">
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
      <span
        class="rounded border border-neutral-700 px-1.5 py-0.5 text-2xs text-neutral-500"
        title="Phase 0 is observe-only"
      >
        Read-only
      </span>
    </div>
  `,
})
export class SettingRow {
  readonly key = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | number | boolean | null | undefined>(null);
  readonly displayValue = input<string | null | undefined>(null);
  readonly help = input<string | null | undefined>(null);
  readonly source = input<string | null | undefined>('unknown');
  readonly sourceFile = input<string | null | undefined>(null);
  readonly tier = input<string | null | undefined>('next-run');
  readonly secret = input(false);
  readonly set = input(false);
  readonly flashId = input<string | null>(null);

  protected display(): string {
    if (this.displayValue() != null && this.displayValue() !== '') {
      return String(this.displayValue());
    }
    const v = this.value();
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }
}

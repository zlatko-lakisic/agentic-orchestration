import { Component, input } from '@angular/core';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { SourceChip } from '@/app/domains/admin/shared/source-chip/source-chip';
import { TierChip } from '@/app/domains/admin/shared/tier-chip/tier-chip';

/** Fuse Settings row density — shows effective value (incl. defaults). */
@Component({
  selector: 'ao-setting-row',
  imports: [EnvHelp, SourceChip, TierChip],
  host: {
    class:
      'grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(12rem,1.2fr)_minmax(0,1.4fr)_auto] sm:items-center',
    '[attr.id]': 'flashId()',
  },
  template: `
    <div class="min-w-0">
      <div class="flex items-start gap-1">
        <div class="min-w-0">
          <div class="font-medium leading-tight">{{ label() }}</div>
          <div class="mt-0.5 font-mono text-xs text-neutral-500 break-all">
            {{ key() }}
          </div>
        </div>
        <ao-env-help
          [key]="key()"
          [help]="help()"
          [wikiUrl]="wikiUrl()"
        />
      </div>
    </div>

    <div class="min-w-0">
      @if (secret()) {
        <div class="font-mono text-sm text-neutral-500">
          {{ set() ? '••••••' : 'Not set' }}
        </div>
      } @else {
        <div class="font-mono text-sm break-all tabular-nums">
          {{ display() }}
        </div>
        @if (pathExists() === true) {
          <div class="mt-0.5 text-xs text-green-700 dark:text-green-400">
            path exists
          </div>
        } @else if (pathExists() === false) {
          <div class="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            path missing on this process
          </div>
        }
        @if (showDefaultHint()) {
          <div class="mt-0.5 text-xs text-neutral-500">
            code default · not explicitly set
          </div>
        }
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
export class SettingRow {
  readonly key = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | number | boolean | null | undefined>(null);
  readonly displayValue = input<string | null | undefined>(null);
  readonly help = input<string | null | undefined>(null);
  readonly wikiUrl = input<string | null | undefined>(null);
  readonly source = input<string | null | undefined>('unknown');
  readonly sourceFile = input<string | null | undefined>(null);
  readonly tier = input<string | null | undefined>('next-run');
  readonly secret = input(false);
  readonly set = input(false);
  readonly pathExists = input<boolean | null | undefined>(undefined);
  readonly flashId = input<string | null>(null);

  protected display(): string {
    if (this.displayValue() != null && this.displayValue() !== '') {
      return String(this.displayValue());
    }
    const v = this.value();
    if (v === null || v === undefined || v === '') return 'Not set';
    return String(v);
  }

  protected showDefaultHint(): boolean {
    if (this.secret() || this.set()) return false;
    const s = String(this.source() || '');
    return s === 'default' || s === 'example';
  }
}

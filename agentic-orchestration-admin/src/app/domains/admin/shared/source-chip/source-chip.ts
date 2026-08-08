import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

/** Fuse Orders-style status pill for config provenance. */
@Component({
  selector: 'ao-source-chip',
  imports: [NgClass],
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
      [ngClass]="classes()"
      [title]="tooltip()"
    >
      <span class="leading-relaxed whitespace-nowrap">{{ label() }}</span>
    </span>
  `,
})
export class SourceChip {
  readonly source = input<string | null | undefined>('unknown');
  readonly sourceFile = input<string | null | undefined>(null);

  protected label(): string {
    const s = String(this.source() || 'unknown');
    const map: Record<string, string> = {
      'process-env': 'process env',
      'env.jetson': 'env.jetson ⚠',
      'env.host': 'env.host ⚠',
      'env.nvr': 'env.nvr ⚠',
      tracked: 'tracked ⚠',
      tool_env: 'tool .env',
      web_env: 'web .env',
      example: 'example',
      'k8s-secret': 'k8s secret',
      'yaml-catalog': 'yaml',
      runtime: 'runtime',
      default: 'default',
      unset: 'unset',
      unknown: 'unknown',
    };
    return map[s] ?? s;
  }

  protected tooltip(): string {
    const s = String(this.source() || '');
    if (s === 'env.jetson' || s === 'tracked' || s.startsWith('env.')) {
      return (
        (this.sourceFile() ? `${this.sourceFile()}\n` : '') +
        'Also set in a tracked profile — a local change here is reverted by the next deploy.'
      );
    }
    return this.sourceFile() || '';
  }

  protected classes(): Record<string, boolean> {
    const s = String(this.source() || 'unknown');
    return {
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300':
        s === 'process-env',
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300':
        s === 'env.jetson' ||
        s === 'env.host' ||
        s === 'env.nvr' ||
        s === 'tracked' ||
        s === 'k8s-secret',
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300':
        s === 'yaml-catalog' || s === 'runtime' || s === 'tool_env' || s === 'web_env',
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300':
        s === 'default' || s === 'example' || s === 'unset' || s === 'unknown' || !s,
    };
  }
}

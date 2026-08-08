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
      [title]="sourceFile() || ''"
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
      'env.jetson': 'env.jetson',
      'k8s-secret': 'k8s secret',
      'yaml-catalog': 'yaml',
      runtime: 'runtime',
      default: 'default',
      unknown: 'unknown',
    };
    return map[s] ?? s;
  }

  protected classes(): Record<string, boolean> {
    const s = String(this.source() || 'unknown');
    return {
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300':
        s === 'process-env',
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300':
        s === 'env.jetson' || s === 'k8s-secret',
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300':
        s === 'yaml-catalog' || s === 'runtime',
      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300':
        s === 'default' || s === 'unknown' || !s,
    };
  }
}

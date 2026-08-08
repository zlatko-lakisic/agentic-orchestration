import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

/** Fuse Orders-style status pill for apply tier. */
@Component({
  selector: 'ao-tier-chip',
  imports: [NgClass],
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
      [ngClass]="classes()"
    >
      <span class="leading-relaxed whitespace-nowrap">{{ text() }}</span>
    </span>
  `,
})
export class TierChip {
  readonly tier = input<string | null | undefined>('next-run');

  protected text(): string {
    const key = String(this.tier() || 'next-run').toLowerCase();
    const map: Record<string, string> = {
      live: 'live',
      'next-run': 'next run',
      'next-session': 'next session',
      'restart-web': 'restart web',
      'restart-engine': 'restart engine',
      redeploy: 'redeploy',
      restart: 'restart',
    };
    return map[key] ?? key.replace(/-/g, ' ');
  }

  protected classes(): Record<string, boolean> {
    const key = String(this.tier() || 'next-run').toLowerCase();
    return {
      'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300':
        key === 'live',
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300':
        key === 'next-run' || key === 'next-session',
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300':
        key.startsWith('restart') || key === 'redeploy',
      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300':
        ![
          'live',
          'next-run',
          'next-session',
          'restart-web',
          'restart-engine',
          'redeploy',
          'restart',
        ].includes(key) && !key.startsWith('restart'),
    };
  }
}

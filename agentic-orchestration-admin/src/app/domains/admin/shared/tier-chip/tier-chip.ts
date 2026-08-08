import { Component, computed, input } from '@angular/core';

/**
 * Apply-tier display: soft text for live/next-run; amber chip only for restart/redeploy.
 */
@Component({
  selector: 'ao-tier-chip',
  imports: [],
  host: { class: 'inline-flex' },
  template: `
    @if (loud()) {
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      >
        <span class="leading-relaxed whitespace-nowrap">{{ text() }}</span>
      </span>
    } @else {
      <span class="text-xs text-neutral-500 tabular-nums">{{ text() }}</span>
    }
  `,
})
export class TierChip {
  readonly tier = input<string | null | undefined>('next-run');

  protected readonly key = computed(() =>
    String(this.tier() || 'next-run').toLowerCase().replace(/_/g, '-')
  );

  protected loud(): boolean {
    const key = this.key();
    return key.startsWith('restart') || key === 'redeploy';
  }

  protected text(): string {
    const key = this.key();
    const map: Record<string, string> = {
      live: 'Live',
      'next-run': 'Next run',
      'next-session': 'Next session',
      'restart-web': 'Restart web',
      'restart-engine': 'Restart engine',
      redeploy: 'Redeploy',
      restart: 'Restart',
    };
    return map[key] ?? key.replace(/-/g, ' ');
  }
}

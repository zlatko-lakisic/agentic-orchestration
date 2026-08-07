import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

const META: Record<string, { label: string; icon?: string; class: string }> = {
  live: { label: 'Live', class: 'text-emerald-500' },
  'next-run': { label: 'Next run', class: 'text-sky-500' },
  'next-session': { label: 'Next session', class: 'text-sky-500' },
  'restart-web': {
    label: 'Restart: web',
    icon: 'power',
    class: 'text-amber-400',
  },
  'restart-engine': {
    label: 'Restart: engine',
    icon: 'power',
    class: 'text-amber-400',
  },
  redeploy: {
    label: 'Redeploy',
    icon: 'git-branch',
    class: 'text-amber-400',
  },
};

@Component({
  selector: 'ao-tier-chip',
  imports: [MatIcon],
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-x-1 text-2xs font-medium"
      [class]="meta().class"
    >
      @if (meta().icon) {
        <mat-icon
          class="!size-3"
          [svgIcon]="meta().icon!"
        />
      }
      {{ meta().label }}
    </span>
  `,
})
export class TierChip {
  readonly tier = input<string | null | undefined>('next-run');

  protected meta() {
    const key = String(this.tier() || 'next-run').toLowerCase();
    return META[key] ?? { label: key, class: 'text-neutral-500' };
  }
}

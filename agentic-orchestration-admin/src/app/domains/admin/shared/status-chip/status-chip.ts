import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AoStatus } from '@/app/core/ao-api/types';

const META: Record<
  string,
  { label: string; icon: string; class: string }
> = {
  healthy: {
    label: 'Healthy',
    icon: 'circle-check',
    class: 'text-emerald-500',
  },
  available: {
    label: 'Available',
    icon: 'circle-check',
    class: 'text-emerald-500',
  },
  succeeded: {
    label: 'Succeeded',
    icon: 'circle-check',
    class: 'text-emerald-500',
  },
  degraded: {
    label: 'Degraded',
    icon: 'octagon-alert',
    class: 'text-amber-400',
  },
  warning: {
    label: 'Warning',
    icon: 'octagon-alert',
    class: 'text-amber-400',
  },
  failed: { label: 'Failed', icon: 'circle-x', class: 'text-red-600' },
  blocking: { label: 'Blocking', icon: 'circle-x', class: 'text-red-600' },
  unset: {
    label: 'Not set',
    icon: 'circle-dashed',
    class: 'text-neutral-500',
  },
  planned: {
    label: 'Planned',
    icon: 'circle-dashed',
    class: 'text-neutral-500',
  },
  hidden: {
    label: 'Hidden',
    icon: 'circle-dashed',
    class: 'text-neutral-500',
  },
  running: {
    label: 'Running',
    icon: 'refresh-cw',
    class: 'text-primary-500 animate-pulse',
  },
  reconciling: {
    label: 'Reconciling',
    icon: 'refresh-cw',
    class: 'text-primary-500 animate-pulse',
  },
  info: { label: 'Info', icon: 'circle-alert', class: 'text-sky-500' },
};

@Component({
  selector: 'ao-status-chip',
  imports: [MatIcon],
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-x-1 text-2xs font-medium tracking-tight"
      [class]="meta().class"
    >
      <mat-icon
        class="!size-3.5"
        [svgIcon]="meta().icon"
      />
      <span>{{ label() || meta().label }}</span>
    </span>
  `,
})
export class StatusChip {
  readonly status = input<AoStatus | string | null | undefined>('unset');
  readonly label = input<string | null>(null);

  protected meta() {
    const key = String(this.status() || 'unset').toLowerCase();
    return META[key] ?? META['unset'];
  }
}

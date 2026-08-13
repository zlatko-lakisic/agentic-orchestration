import { __decorate } from "tslib";
import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
/**
 * Fuse Orders status pill (apps/orders/features/orders.ts).
 */
let StatusChip = class StatusChip {
    status = input('unset');
    label = input(null);
    text() {
        return String(this.status() || 'unset').replace(/-/g, ' ');
    }
    classes() {
        const s = String(this.status() || 'unset').toLowerCase();
        return {
            'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300': s === 'healthy' ||
                s === 'available' ||
                s === 'succeeded' ||
                s === 'completed' ||
                s === 'pass' ||
                s === 'passed',
            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300': s === 'degraded' ||
                s === 'warning' ||
                s === 'pending' ||
                s === 'unset' ||
                s === 'planned' ||
                s === 'hidden',
            'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300': s === 'running' || s === 'reconciling' || s === 'info',
            'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300': s === 'failed' || s === 'blocking' || s === 'fail' || s === 'failed',
            'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300': ![
                'healthy',
                'available',
                'succeeded',
                'completed',
                'pass',
                'passed',
                'degraded',
                'warning',
                'pending',
                'unset',
                'planned',
                'hidden',
                'running',
                'reconciling',
                'info',
                'failed',
                'blocking',
                'fail',
            ].includes(s),
        };
    }
};
StatusChip = __decorate([
    Component({
        selector: 'ao-status-chip',
        imports: [NgClass],
        host: { class: 'inline-flex' },
        template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
      [ngClass]="classes()"
    >
      <span class="leading-relaxed whitespace-nowrap">{{
        label() || text()
      }}</span>
    </span>
  `,
    })
], StatusChip);
export { StatusChip };

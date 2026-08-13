import { __decorate } from "tslib";
import { Component, computed, input } from '@angular/core';
/**
 * Apply-tier display: soft text for live/next-run; amber chip only for restart/redeploy.
 */
let TierChip = class TierChip {
    tier = input('next-run');
    key = computed(() => String(this.tier() || 'next-run').toLowerCase().replace(/_/g, '-'));
    loud() {
        const key = this.key();
        return key.startsWith('restart') || key === 'redeploy';
    }
    text() {
        const key = this.key();
        const map = {
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
};
TierChip = __decorate([
    Component({
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
], TierChip);
export { TierChip };

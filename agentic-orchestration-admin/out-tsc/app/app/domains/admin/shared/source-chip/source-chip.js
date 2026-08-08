import { __decorate } from "tslib";
import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
/** Fuse Orders-style status pill for config provenance. */
let SourceChip = class SourceChip {
    source = input('unknown');
    sourceFile = input(null);
    label() {
        const s = String(this.source() || 'unknown');
        const map = {
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
    classes() {
        const s = String(this.source() || 'unknown');
        return {
            'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300': s === 'process-env',
            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300': s === 'env.jetson' || s === 'k8s-secret',
            'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300': s === 'yaml-catalog' || s === 'runtime',
            'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300': s === 'default' || s === 'unknown' || !s,
        };
    }
};
SourceChip = __decorate([
    Component({
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
], SourceChip);
export { SourceChip };

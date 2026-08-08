import { Component, input } from '@angular/core';

const LABELS: Record<string, string> = {
  'process-env': 'process env',
  'env.jetson': 'env.jetson',
  'k8s-secret': 'k8s secret',
  'yaml-catalog': 'yaml catalog',
  runtime: 'runtime',
  default: 'default',
  unknown: 'unknown',
};

@Component({
  selector: 'ao-source-chip',
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-2xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
      [title]="sourceFile() || ''"
    >
      {{ label() }}
    </span>
  `,
})
export class SourceChip {
  readonly source = input<string | null | undefined>('unknown');
  readonly sourceFile = input<string | null | undefined>(null);

  protected label(): string {
    const s = String(this.source() || 'unknown');
    return LABELS[s] ?? s;
  }
}

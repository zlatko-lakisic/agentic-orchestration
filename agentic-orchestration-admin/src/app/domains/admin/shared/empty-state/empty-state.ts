import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ao-empty-state',
  imports: [MatIcon, RouterLink],
  template: `
    <div
      class="flex flex-col items-start gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 px-5 py-8 dark:border-neutral-700 dark:bg-neutral-950/40"
    >
      <mat-icon
        class="size-6 text-neutral-500"
        [svgIcon]="icon()"
      />
      <div>
        <div class="text-md font-semibold">{{ title() }}</div>
        <div class="mt-1 max-w-xl text-sm text-neutral-500">
          {{ message() }}
        </div>
      </div>
      @if (actionLabel() && actionRoute()) {
        <a
          class="text-sm text-primary-600 underline-offset-2 hover:underline"
          [routerLink]="actionRoute()"
        >
          {{ actionLabel() }}
        </a>
      }
    </div>
  `,
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('');
  readonly icon = input('circle-dashed');
  readonly actionLabel = input<string | null>(null);
  readonly actionRoute = input<string | null>(null);
}

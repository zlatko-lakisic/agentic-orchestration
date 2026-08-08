import { Component, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Fuse-style empty content block (icon + title + description). */
@Component({
  selector: 'ao-empty-state',
  imports: [MatIcon, MatButton, RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center gap-y-3 px-6 py-12 text-center">
      <div
        class="flex size-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
      >
        <mat-icon
          class="size-6 text-neutral-500"
          [svgIcon]="icon()"
        />
      </div>
      <div class="text-lg font-medium">{{ title() }}</div>
      <div class="max-w-md text-sm text-neutral-500">{{ message() }}</div>
      @if (actionLabel() && actionRoute()) {
        <a
          matButton="filled"
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

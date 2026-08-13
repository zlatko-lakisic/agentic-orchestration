import { Component, input } from '@angular/core';

/** Fuse-style loading block shown until the first live WebSocket snapshot arrives. */
@Component({
  selector: 'ao-loading-state',
  template: `
    <div
      class="flex flex-col items-center justify-center gap-y-4 px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <div class="relative size-12" aria-hidden="true">
        <span
          class="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700"
        ></span>
        <span
          class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-neutral-700 dark:border-t-neutral-200"
        ></span>
        <span
          class="absolute inset-2 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800"
        ></span>
      </div>
      <div class="text-lg font-medium">{{ title() }}</div>
      <div class="max-w-md text-sm text-neutral-500">{{ message() }}</div>
    </div>
  `,
})
export class LoadingState {
  readonly title = input('Loading');
  readonly message = input('Connecting to live updates…');
}

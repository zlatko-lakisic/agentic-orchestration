import { Component, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'ao-error-state',
  imports: [MatIcon, MatButton],
  template: `
    <div
      class="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/60 px-5 py-5 dark:border-red-900/50 dark:bg-red-950/20"
    >
      <div class="flex items-start gap-3">
        <mat-icon
          class="size-5 text-red-600"
          svgIcon="circle-x"
        />
        <div class="min-w-0 flex-auto">
          <div class="text-md font-semibold text-red-600">{{ title() }}</div>
          <div class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {{ message() }}
          </div>
          @if (remedy()) {
            <div class="mt-2 text-sm text-neutral-500">{{ remedy() }}</div>
          }
        </div>
      </div>

      @if (detail()) {
        <button
          matButton
          class="self-start"
          type="button"
          (click)="open.set(!open())"
        >
          {{ open() ? 'Hide detail' : 'Show detail' }}
        </button>
        @if (open()) {
          <pre
            class="max-h-40 overflow-auto rounded bg-neutral-100 p-3 font-mono text-xs text-neutral-600 dark:bg-neutral-950 dark:text-neutral-400"
            >{{ detail() }}</pre
          >
        }
      }
    </div>
  `,
})
export class ErrorState {
  readonly title = input('Request failed');
  readonly message = input('');
  readonly remedy = input<string | null>(null);
  readonly detail = input<string | null>(null);
  protected open = signal(false);
}

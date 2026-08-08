import { Component, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

/** Fuse mat-card surface for error reporting. */
@Component({
  selector: 'ao-error-state',
  imports: [MatIcon, MatButton, MatCard, MatCardContent],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content class="flex flex-col gap-3 py-5">
        <div class="flex items-start gap-x-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950"
          >
            <mat-icon
              class="size-5 text-red-600"
              svgIcon="circle-x"
            />
          </div>
          <div class="min-w-0 flex-auto">
            <div class="text-lg font-medium">{{ title() }}</div>
            <div class="mt-1 text-sm text-neutral-500">{{ message() }}</div>
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
              class="max-h-40 overflow-auto rounded-lg bg-neutral-100 p-3 font-mono text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              >{{ detail() }}</pre
            >
          }
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ErrorState {
  readonly title = input('Request failed');
  readonly message = input('');
  readonly remedy = input<string | null>(null);
  readonly detail = input<string | null>(null);
  protected open = signal(false);
}

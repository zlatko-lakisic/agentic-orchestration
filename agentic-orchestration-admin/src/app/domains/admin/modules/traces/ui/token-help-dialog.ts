import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export type TokenHelpDialogData = {
  title: string;
  body: string;
};

/** Full token-help text when the Mermaid ``?`` hover tooltip truncates. */
@Component({
  selector: 'ao-token-help-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="min-w-[320px] max-w-2xl">
      <pre
        class="m-0 max-h-[min(70vh,32rem)] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >{{ data.body }}</pre
      >
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
})
export class TokenHelpDialog {
  readonly data = inject<TokenHelpDialogData>(MAT_DIALOG_DATA);
}

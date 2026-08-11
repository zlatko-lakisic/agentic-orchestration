import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  canSubmitConfirm,
  type ControlConfirmSpec,
} from '../data/control.model';

@Component({
  selector: 'ao-control-confirm-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="flex min-w-[320px] max-w-lg flex-col gap-3">
      <p class="text-sm text-neutral-600 dark:text-neutral-300">
        {{ data.body }}
      </p>
      @if (data.phrase) {
        <p class="text-sm text-neutral-500">
          Type <code class="font-mono">{{ data.phrase }}</code> to confirm.
        </p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ data.phrase }}</mat-label>
          <input
            matInput
            [(ngModel)]="typed"
            name="confirm"
            autocomplete="off"
          />
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Cancel</button>
      <button
        matButton="filled"
        type="button"
        [disabled]="!canSubmit()"
        [class.bg-red-700]="data.danger"
        (click)="confirm()"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ControlConfirmDialog {
  readonly data = inject<ControlConfirmSpec>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ControlConfirmDialog, boolean>);
  typed = '';

  canSubmit() {
    return canSubmitConfirm(this.data.phrase, this.typed);
  }

  confirm() {
    if (!this.canSubmit()) return;
    this.ref.close(true);
  }
}

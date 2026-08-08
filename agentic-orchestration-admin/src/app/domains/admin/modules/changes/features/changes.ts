import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ChangeSetStore } from '@/app/core/ao-changeset/changeset.store';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

@Component({
  selector: 'ao-changes-page',
  imports: [
    EmptyState,
    MatCard,
    MatCardContent,
    MatButton,
    MatIcon,
    StatusChip,
  ],
  template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Change set
          </div>
          <div class="text-neutral-500">
            Phase 0 keeps a local draft only. Export a diff; apply by hand.
          </div>
        </div>
        <div class="flex-auto"></div>
        <ao-status-chip
          status="pending"
          label="write api off"
        />
        <button
          matButton="outlined"
          type="button"
          [disabled]="!store.entries().length"
          (click)="copy()"
        >
          <mat-icon svgIcon="clipboard" />
          Copy diff
        </button>
      </div>

      @if (!store.entries().length) {
        <mat-card appearance="outlined">
          <mat-card-content>
            <ao-empty-state
              message="No pending local edits. Editing + apply land in Phase 1."
            />
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card appearance="outlined">
          <mat-card-content class="py-4">
            <pre
              class="overflow-auto rounded-lg bg-neutral-100 p-4 font-mono text-xs dark:bg-neutral-900"
              >{{ exportText() }}</pre
            >
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class ChangesPage {
  protected store = inject(ChangeSetStore);

  exportText() {
    return this.store.exportDiff();
  }

  copy() {
    void navigator.clipboard?.writeText(this.exportText());
  }
}

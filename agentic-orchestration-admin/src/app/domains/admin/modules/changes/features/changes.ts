import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChangeSetStore } from '@/app/core/ao-changeset/changeset.store';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';

@Component({
  selector: 'ao-changes-page',
  imports: [FormsModule, EmptyState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Change set</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Phase 0 keeps a local draft only. Export a diff; apply by hand to .env / env.jetson / k8s Secret.
        </p>
      </header>
      @if (!store.entries().length) {
        <ao-empty-state message="No pending local edits. Editing + apply land in Phase 1." />
      } @else {
        <pre class="overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs">{{ exportText() }}</pre>
      }
      <div class="mt-6 rounded-lg border border-neutral-800 p-4 text-sm text-neutral-400">
        Write API status: <span class="font-mono text-amber-400">disabled (Phase 0)</span>
      </div>
    </div>
  `,
})
export class ChangesPage {
  protected store = inject(ChangeSetStore);
  exportText() {
    return this.store.exportDiff();
  }
}

import { Component } from '@angular/core';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';

@Component({
  selector: 'ao-audit-page',
  imports: [EmptyState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Audit</h1>
        <p class="mt-1 text-sm text-neutral-500">Admin action log arrives with Phase 1 write API</p>
      </header>
      <ao-empty-state message="No audit log yet — Phase 0 is read-only and does not mutate config." />
    </div>
  `,
})
export class AuditPage {}

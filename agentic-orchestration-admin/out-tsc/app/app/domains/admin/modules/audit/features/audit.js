import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
let AuditPage = class AuditPage {
};
AuditPage = __decorate([
    Component({
        selector: 'ao-audit-page',
        imports: [EmptyState, MatCard, MatCardContent],
        template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex flex-col gap-y-0.5">
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Audit
        </div>
        <div class="text-neutral-500">
          Admin action log arrives with the Phase 1 write API
        </div>
      </div>
      <mat-card appearance="outlined">
        <mat-card-content class="py-6">
          <ao-empty-state
            message="No audit log yet — Phase 0 is read-only and does not mutate config."
          />
        </mat-card-content>
      </mat-card>
    </div>
  `,
    })
], AuditPage);
export { AuditPage };

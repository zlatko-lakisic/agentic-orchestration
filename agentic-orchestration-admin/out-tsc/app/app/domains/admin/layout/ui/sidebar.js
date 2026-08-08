import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Navigation } from '@/app/domains/admin/layout/ui/navigation';
import { User } from '@/app/domains/admin/layout/ui/user';
/** Fuse admin sidebar structure with AO branding. */
let AdminSidebar = class AdminSidebar {
};
AdminSidebar = __decorate([
    Component({
        selector: 'admin-sidebar',
        imports: [Navigation, User, MatButton, MatIcon],
        host: {
            class: 'flex w-full flex-auto flex-col',
        },
        template: `
    <div class="relative flex items-center gap-x-2.5 pt-5 pr-4 pb-0 pl-6">
      <img
        src="images/logo/logo.svg"
        class="size-8"
        alt="AO logo"
      />

      <div class="flex flex-col">
        <div
          class="text-on-surface text-lg leading-none font-bold tracking-wider"
        >
          AO
        </div>
        <div class="font-mono text-2xs leading-3 font-medium tracking-tighter">
          Admin
        </div>
      </div>
    </div>

    <navigation class="mt-8 mb-4 flex-auto" />

    <div class="flex-auto"></div>

    <div
      class="m-4 mb-2 rounded-lg border border-neutral-900/5 bg-neutral-900/5 p-4 dark:border-neutral-50/5 dark:bg-neutral-50/5"
    >
      <div class="font-semibold">Open chat UI</div>
      <div class="mt-1 text-sm">
        Operator chat stays on the web root. Reach / KnowBuddy uses the engine
        port, not this Admin surface.
      </div>
      <a
        matButton="filled"
        class="small mt-4 w-full"
        href="/"
      >
        Open chat
        <mat-icon
          svgIcon="move-right"
          iconPositionEnd
        />
      </a>
    </div>

    <div class="p-2">
      <user />
    </div>
  `,
    })
], AdminSidebar);
export { AdminSidebar };

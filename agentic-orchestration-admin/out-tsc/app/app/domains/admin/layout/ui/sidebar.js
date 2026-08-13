import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { Navigation } from '@/app/domains/admin/layout/ui/navigation';
import { User } from '@/app/domains/admin/layout/ui/user';
import { AoMark } from '@/app/domains/admin/shared/ao-mark/ao-mark';
/** Fuse admin sidebar structure with AO branding + environment identity. */
let AdminSidebar = class AdminSidebar {
    api = inject(AoApi);
    hostname = signal(null);
    profile = signal(null);
    userName = signal(null);
    ngOnInit() {
        this.api.topology().subscribe((r) => {
            if (!r.ok)
                return;
            this.hostname.set(r.data.hostname || null);
            this.profile.set(r.data.environment || null);
        });
        this.api.session().subscribe((r) => {
            if (r.ok)
                this.userName.set(r.data.userName || null);
        });
    }
};
AdminSidebar = __decorate([
    Component({
        selector: 'admin-sidebar',
        imports: [Navigation, User, MatButton, MatIcon, AoMark],
        host: {
            class: 'flex w-full flex-auto flex-col',
        },
        template: `
    <div class="relative flex items-center gap-x-2.5 pt-5 pr-4 pb-0 pl-6">
      <ao-mark size="md" tint="steel" />

      <div class="flex min-w-0 flex-col">
        <div
          class="text-sm leading-tight font-bold tracking-tight text-[#3B6EA5] dark:text-[#E6EAF0]"
        >
          Agentic Orchestration
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
        Operator chat stays on the web root. Reach clients use the engine
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

    <div
      class="mx-4 mb-2 border-l-4 px-3 py-2 text-xs"
      [class.border-teal-500]="profile() === 'jetson'"
      [class.border-violet-500]="profile() === 'nvr'"
      [class.border-amber-500]="profile() === 'host'"
      [class.border-neutral-400]="
        profile() !== 'jetson' && profile() !== 'nvr' && profile() !== 'host'
      "
    >
      <div class="font-mono font-medium">
        {{ hostname() || 'unknown-host' }} · {{ profile() || 'local' }}
      </div>
      @if (userName()) {
        <div class="text-neutral-500">{{ userName() }}</div>
      }
    </div>

    <div class="p-2">
      <user />
    </div>
  `,
    })
], AdminSidebar);
export { AdminSidebar };

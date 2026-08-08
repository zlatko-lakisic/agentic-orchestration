import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Navigation } from '@/app/domains/admin/layout/ui/navigation';
import { User } from '@/app/domains/admin/layout/ui/user';

@Component({
  selector: 'admin-sidebar',
  imports: [Navigation, User, MatIcon],
  host: {
    class: 'flex w-full flex-auto flex-col',
  },
  template: `
    <!-- Header — Fuse logo block with AO branding -->
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
          Control Plane
        </div>
      </div>
    </div>

    <navigation class="mt-8 mb-4 flex-auto" />

    <div class="flex-auto"></div>

    <!-- Ops note (replaces Fuse trial CTA) -->
    <div
      class="m-4 mb-2 rounded-lg border border-neutral-900/5 bg-neutral-900/5 p-4 dark:border-neutral-50/5 dark:bg-neutral-50/5"
    >
      <div class="flex items-start gap-x-2">
        <mat-icon
          class="mt-0.5 size-4 text-amber-500"
          svgIcon="circle-alert"
        />
        <div>
          <div class="font-semibold">Reach / KnowBuddy</div>
          <div class="mt-1 text-sm text-neutral-500">
            Engine
            <span class="font-mono text-neutral-700 dark:text-neutral-300"
              >:8765</span
            >
            — never web
            <span class="font-mono text-amber-600 dark:text-amber-400"
              >:30487</span
            >. Chat stays at
            <a
              class="font-mono text-primary-600 hover:underline"
              href="/"
              >/</a
            >.
          </div>
        </div>
      </div>
    </div>

    <div class="p-2">
      <user />
    </div>
  `,
})
export class AdminSidebar {}

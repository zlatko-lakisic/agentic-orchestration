import { Component } from '@angular/core';
import { Navigation } from '@/app/domains/admin/layout/ui/navigation';

@Component({
  selector: 'admin-sidebar',
  imports: [Navigation],
  host: {
    class: 'flex w-full flex-auto flex-col',
  },
  template: `
    <div class="relative flex items-center gap-x-2.5 px-6 pt-5 pb-0">
      <div
        class="flex size-8 items-center justify-center rounded-md bg-primary-600 text-sm font-bold text-white"
      >
        AO
      </div>
      <div class="flex flex-col">
        <div class="text-on-surface text-lg leading-none font-bold tracking-wider">
          AO Admin
        </div>
        <div class="font-mono text-2xs leading-3 font-medium tracking-tighter text-neutral-500">
          Control Plane · Phase 0
        </div>
      </div>
    </div>

    <navigation class="mt-8 mb-4 flex-auto" />

    <div class="m-4 rounded-lg border border-neutral-800 p-3 text-xs text-neutral-500">
      Chat UI stays at
      <a class="font-mono text-primary-400 hover:underline" href="/">/</a>.
      Reach uses engine
      <span class="font-mono text-neutral-300">:8765</span>, never
      <span class="font-mono text-amber-400">:30487</span>.
    </div>
  `,
})
export class AdminSidebar {}

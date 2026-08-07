import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Media } from '@/app/core/media';
import { SchemeSwitcher } from '@/app/domains/admin/layout/ui/scheme-switcher';
import { AdminSidebar } from '@/app/domains/admin/layout/ui/sidebar';
import { CommandPalette } from '@/app/domains/admin/layout/ui/command-palette';

@Component({
  selector: 'admin-layout',
  imports: [
    MatIconModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    AdminSidebar,
    SchemeSwitcher,
    CommandPalette,
  ],
  template: `
    <mat-sidenav-container class="min-h-dvh bg-neutral-100 scheme-dark:bg-neutral-950">
      <mat-sidenav
        class="w-70 border-r border-neutral-200 bg-white scheme-dark:border-neutral-800 scheme-dark:bg-neutral-900"
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        [disableClose]="!isMobile()"
        fixedInViewport
        #sidenav="matSidenav"
      >
        <admin-sidebar />
      </mat-sidenav>

      <mat-sidenav-content class="flex flex-col lg:h-dvh lg:overflow-hidden">
        <div
          class="flex items-center gap-3 border-b border-neutral-200 px-4 py-2.5 scheme-dark:border-neutral-800"
        >
          <button matIconButton type="button" (click)="sidenav.toggle()" aria-label="Toggle navigation">
            <mat-icon svgIcon="panel-left" />
          </button>
          <div class="mx-1 h-5 border-l border-neutral-300 scheme-dark:border-neutral-700"></div>
          <button
            type="button"
            class="rounded-md border border-neutral-300 px-2.5 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-100 scheme-dark:border-neutral-700 scheme-dark:hover:bg-neutral-800"
            (click)="palette.open()"
          >
            ⌘K Search
          </button>
          <div class="flex-auto"></div>
          <span
            class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 scheme-dark:text-amber-400"
          >
            Read-only — no admin write API
          </span>
          <a
            routerLink="/overview"
            class="text-xs text-neutral-500 hover:text-neutral-900 scheme-dark:hover:text-white"
            href="/"
            (click)="$event.preventDefault(); openChat()"
          >
            Open chat
          </a>
          <scheme-switcher />
        </div>

        <div class="flex flex-col lg:min-h-0 lg:flex-auto lg:overflow-auto">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
    <ao-command-palette #palette />
  `,
})
export class AdminLayout {
  private media = inject(Media);
  protected isMobile = computed(() => this.media.match(`(max-width: 1023px)`)());

  openChat() {
    window.location.href = '/';
  }
}

import { Component, computed, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterOutlet } from '@angular/router';
import { Media } from '@/app/core/media';
import { CommandPalette } from '@/app/domains/admin/layout/ui/command-palette';
import { Notifications } from '@/app/domains/admin/layout/ui/notifications';
import { SchemeSwitcher } from '@/app/domains/admin/layout/ui/scheme-switcher';
import { Shortcuts } from '@/app/domains/admin/layout/ui/shortcuts';
import { AdminSidebar } from '@/app/domains/admin/layout/ui/sidebar';

@Component({
  selector: 'admin-layout',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    AdminSidebar,
    SchemeSwitcher,
    Notifications,
    Shortcuts,
    MatDivider,
    CommandPalette,
  ],
  template: `
    <mat-sidenav-container>
      <mat-sidenav
        class="w-70 border-r border-neutral-200 scheme-dark dark:border-neutral-800 dark:bg-neutral-900"
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        [disableClose]="!isMobile()"
        fixedInViewport
        #sidenav="matSidenav"
      >
        <admin-sidebar />
      </mat-sidenav>

      <mat-sidenav-content class="flex flex-col lg:h-dvh lg:overflow-hidden">
        <!-- Toolbar (Fuse pattern; AO badges instead of BuilderKit banner) -->
        <div class="flex items-center border-b px-4 py-2.5">
          <button
            matIconButton
            type="button"
            (click)="sidenav.toggle()"
            aria-label="Toggle navigation"
          >
            <mat-icon svgIcon="panel-left" />
          </button>

          <div class="mx-3 h-5 border-l"></div>

          <shortcuts />

          <div class="flex-auto"></div>

          <div class="flex items-center gap-x-2">
            <span
              class="hidden rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 sm:inline dark:text-amber-400"
            >
              Read-only
            </span>
            <button
              matButton
              type="button"
              class="small hidden sm:inline-flex"
              (click)="openChat()"
            >
              Open chat
            </button>
            <scheme-switcher />
            <notifications />
            <mat-divider
              vertical
              class="mx-1 h-5"
            />
            <button
              matIconButton
              type="button"
              matTooltip="Search (⌘K)"
              (click)="openPalette()"
            >
              <mat-icon
                class="text-primary-600"
                svgIcon="search"
              />
            </button>
          </div>
        </div>

        <div class="flex flex-col lg:min-h-0 lg:flex-auto lg:overflow-auto">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
    <ao-command-palette #commandPalette />
  `,
})
export class AdminLayout {
  private media = inject(Media);
  private commandPalette = viewChild.required(CommandPalette);
  protected isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );

  openChat() {
    window.location.href = '/';
  }

  openPalette() {
    this.commandPalette().open();
  }
}

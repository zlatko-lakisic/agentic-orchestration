import { __decorate } from "tslib";
import { Component, computed, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent, } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterOutlet } from '@angular/router';
import { Media } from '@/app/core/media';
import { CommandPalette } from '@/app/domains/admin/layout/ui/command-palette';
import { Notifications } from '@/app/domains/admin/layout/ui/notifications';
import { SchemeSwitcher } from '@/app/domains/admin/layout/ui/scheme-switcher';
import { Shortcuts } from '@/app/domains/admin/layout/ui/shortcuts';
import { AdminSidebar } from '@/app/domains/admin/layout/ui/sidebar';
/**
 * Fuse admin layout (domains/admin/layout/layout.ts) without BuilderKit banner.
 * Assistant control opens AO search (same Fuse sparkles toolbar slot).
 */
let AdminLayout = class AdminLayout {
    media = inject(Media);
    commandPalette = viewChild.required(CommandPalette);
    isMobile = computed(() => this.media.match(`(max-width: 1023px)`)());
    openPalette() {
        this.commandPalette().open();
    }
};
AdminLayout = __decorate([
    Component({
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
        <div class="flex items-center border-b px-4 py-2.5">
          <button
            matIconButton
            type="button"
            (click)="sidenav.toggle()"
          >
            <mat-icon svgIcon="panel-left" />
          </button>

          <div class="mx-3 h-5 border-l"></div>

          <shortcuts />

          <div class="flex-auto"></div>

          <div class="flex items-center gap-x-2">
            <scheme-switcher />
            <notifications />
            <mat-divider
              vertical
              class="mx-1 h-5"
            />
            <button
              matIconButton
              type="button"
              matTooltip="Search"
              (click)="openPalette()"
            >
              <mat-icon
                class="text-primary-600"
                svgIcon="sparkles"
              />
            </button>
          </div>
        </div>

        <div class="flex flex-col lg:min-h-0 lg:flex-auto lg:overflow-auto">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
    <ao-command-palette />
  `,
    })
], AdminLayout);
export { AdminLayout };

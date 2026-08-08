import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { MatFormField } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, } from '@angular/router';
/** Fuse Settings layout pattern for Runtime tabs. */
let RuntimeLayout = class RuntimeLayout {
    router = inject(Router);
    links = [
        {
            id: 'planner',
            label: 'Planner & defaults',
            route: '/runtime/planner',
        },
        {
            id: 'execution',
            label: 'Execution',
            route: '/runtime/execution',
        },
        {
            id: 'models',
            label: 'Models & hardware',
            route: '/runtime/models',
        },
    ];
};
RuntimeLayout = __decorate([
    Component({
        selector: 'ao-runtime-layout',
        imports: [
            RouterOutlet,
            MatTabNav,
            MatTabLink,
            MatTabNavPanel,
            RouterLink,
            RouterLinkActive,
            MatFormField,
            MatSelect,
            MatOption,
        ],
        template: `
    <div
      class="@container mx-auto flex w-full max-w-5xl flex-auto flex-col gap-4 p-6 sm:gap-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Runtime
          </div>
          <div class="text-neutral-500">
            Planner, execution backend, and model / hardware settings
          </div>
        </div>
      </div>

      <nav
        class="mb-2 hidden sm:flex"
        mat-tab-nav-bar
        [mat-stretch-tabs]="false"
        [tabPanel]="tabPanel"
        ngSkipHydration
      >
        @for (link of links; track link.id) {
          <a
            mat-tab-link
            routerLinkActive
            [routerLink]="link.route"
            [active]="rla.isActive"
            #rla="routerLinkActive"
          >
            {{ link.label }}
          </a>
        }
      </nav>

      <mat-form-field class="mb-2 w-full sm:hidden">
        <mat-select
          [value]="router.url.split('?')[0]"
          (selectionChange)="router.navigateByUrl($event.value)"
        >
          @for (link of links; track link.id) {
            <mat-option [value]="link.route">{{ link.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-tab-nav-panel #tabPanel>
        <router-outlet />
      </mat-tab-nav-panel>
    </div>
  `,
    })
], RuntimeLayout);
export { RuntimeLayout };

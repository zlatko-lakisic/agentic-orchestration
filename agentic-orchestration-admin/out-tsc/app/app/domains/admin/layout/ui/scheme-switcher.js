import { __decorate } from "tslib";
import { Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Theming } from '@/app/core/theming';
let SchemeSwitcher = class SchemeSwitcher {
    // Dependencies
    theming = inject(Theming);
    // State
    scheme = computed(() => this.theming.scheme());
    schemes = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'System', value: 'system' },
    ];
    updateScheme(scheme) {
        this.theming.scheme.set(scheme);
    }
};
SchemeSwitcher = __decorate([
    Component({
        selector: 'scheme-switcher',
        imports: [
            MatIcon,
            MatIconButton,
            MatMenu,
            MatMenuItem,
            MatPseudoCheckbox,
            MatMenuTrigger,
        ],
        template: `
    <button
      matIconButton
      [matMenuTriggerFor]="schemeMenu"
    >
      <mat-icon svgIcon="sun-moon" />
    </button>
    <mat-menu #schemeMenu>
      @for (item of schemes; track item.value) {
        <button
          mat-menu-item
          (click)="updateScheme(item.value)"
        >
          <span class="flex items-center gap-x-1">
            <span class="flex-auto">{{ item.label }}</span>
            <mat-pseudo-checkbox
              appearance="minimal"
              [state]="scheme() === item.value ? 'checked' : 'unchecked'"
            />
          </span>
        </button>
      }
    </mat-menu>
  `,
    })
], SchemeSwitcher);
export { SchemeSwitcher };

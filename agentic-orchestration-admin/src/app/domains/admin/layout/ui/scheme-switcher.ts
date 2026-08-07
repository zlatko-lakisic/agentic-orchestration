import { Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Scheme, Theming } from '@/app/core/theming';

@Component({
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
export class SchemeSwitcher {
  // Dependencies
  private theming = inject(Theming);

  // State
  protected scheme = computed(() => this.theming.scheme());
  protected schemes: { label: string; value: Scheme }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  updateScheme(scheme: Scheme) {
    this.theming.scheme.set(scheme);
  }
}

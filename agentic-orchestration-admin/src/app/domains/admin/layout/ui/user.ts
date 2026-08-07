import { Component, computed, inject } from '@angular/core';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Scheme, Theming } from '@/app/core/theming';

@Component({
  selector: 'user',
  imports: [
    MatDivider,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatPseudoCheckbox,
    MatMenuTrigger,
    RouterLink,
  ],
  template: `
    <button
      class="flex w-full cursor-pointer items-center gap-x-3 rounded-xl p-2 text-left hover:bg-neutral-700/10 dark:hover:bg-neutral-300/10"
      [matMenuTriggerFor]="userMenu"
    >
      <img
        class="size-9 rounded-lg object-cover grayscale"
        src="/images/photos/brian-hughes.jpg"
        alt="User avatar"
      />
      <div class="flex min-w-0 flex-auto flex-col select-none">
        <div class="truncate font-medium">Brian Hughes</div>
        <div class="text-on-surface-variant truncate text-sm">
          brian&#64;example.com
        </div>
      </div>
      <mat-icon
        class="size-4"
        svgIcon="ellipsis-vertical"
      />
    </button>

    <mat-menu
      class="min-w-60"
      xPosition="before"
      yPosition="above"
      #userMenu="matMenu"
    >
      <button
        class="py-2 [&>span]:flex [&>span]:items-center"
        mat-menu-item
      >
        <img
          class="size-9 rounded-lg object-cover"
          src="/images/photos/brian-hughes.jpg"
          alt="User avatar"
        />
        <div class="ml-3 flex min-w-0 flex-auto flex-col select-none">
          <div class="truncate font-medium">Brian Hughes</div>
          <div class="text-on-surface-variant truncate text-xs">
            brian&#64;example.com
          </div>
        </div>
      </button>
      <mat-divider />
      <button mat-menu-item>
        <mat-icon svgIcon="sparkles" />
        Upgrade to Pro
      </button>
      <mat-divider />
      <button mat-menu-item>
        <mat-icon svgIcon="user-round" />
        Account
      </button>
      <button mat-menu-item>
        <mat-icon svgIcon="wallet" />
        Billing
      </button>
      <button mat-menu-item>
        <mat-icon svgIcon="bell" />
        Notifications
      </button>
      <mat-divider />
      <button
        mat-menu-item
        [matMenuTriggerFor]="appearanceMenu"
      >
        <mat-icon svgIcon="sun-moon" />
        Appearance
      </button>
      <mat-divider />
      <button
        mat-menu-item
        routerLink="/auth/sign-in"
      >
        <mat-icon svgIcon="log-out" />
        Sign out
      </button>
    </mat-menu>

    <mat-menu #appearanceMenu="matMenu">
      @for (item of schemes; track item.value) {
        <button
          mat-menu-item
          (click)="updateScheme(item.value)"
        >
          <mat-pseudo-checkbox
            appearance="minimal"
            class="mr-2"
            [state]="scheme() === item.value ? 'checked' : 'unchecked'"
          />
          <span>{{ item.label }}</span>
        </button>
      }
    </mat-menu>
  `,
})
export class User {
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

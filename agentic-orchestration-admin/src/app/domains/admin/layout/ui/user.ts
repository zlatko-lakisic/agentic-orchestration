import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { Scheme, Theming } from '@/app/core/theming';

/** Fuse layout/ui/user.ts — session-backed identity instead of demo avatar. */
@Component({
  selector: 'user',
  imports: [
    MatDivider,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatPseudoCheckbox,
    MatMenuTrigger,
  ],
  template: `
    <button
      class="flex w-full cursor-pointer items-center gap-x-3 rounded-xl p-2 text-left hover:bg-neutral-700/10 dark:hover:bg-neutral-300/10"
      [matMenuTriggerFor]="userMenu"
      type="button"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-600 uppercase dark:bg-neutral-700 dark:text-neutral-200"
      >
        {{ initial() }}
      </div>
      <div class="flex min-w-0 flex-auto flex-col select-none">
        <div class="truncate font-medium">{{ displayName() }}</div>
        <div class="text-on-surface-variant truncate text-sm">
          {{ sessionId() || 'session' }}
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
        type="button"
        disabled
      >
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-600 uppercase dark:bg-neutral-700 dark:text-neutral-200"
        >
          {{ initial() }}
        </div>
        <div class="ml-3 flex min-w-0 flex-auto flex-col select-none">
          <div class="truncate font-medium">{{ displayName() }}</div>
          <div class="text-on-surface-variant truncate text-xs">
            {{ sessionId() || '—' }}
          </div>
        </div>
      </button>
      <mat-divider />
      <a
        mat-menu-item
        href="/"
      >
        <mat-icon svgIcon="message-square" />
        Open chat
      </a>
      <mat-divider />
      <button
        mat-menu-item
        type="button"
        [matMenuTriggerFor]="appearanceMenu"
      >
        <mat-icon svgIcon="sun-moon" />
        Appearance
      </button>
    </mat-menu>

    <mat-menu #appearanceMenu="matMenu">
      @for (item of schemes; track item.value) {
        <button
          mat-menu-item
          type="button"
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
export class User implements OnInit {
  private theming = inject(Theming);
  private api = inject(AoApi);

  private userName = signal<string | null>(null);
  private session = signal<string | null>(null);

  protected scheme = computed(() => this.theming.scheme());
  protected schemes: { label: string; value: Scheme }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  protected displayName = computed(() => this.userName() || 'Operator');
  protected sessionId = computed(() => this.session());
  protected initial = computed(
    () => this.displayName().trim().charAt(0).toUpperCase() || 'O'
  );

  ngOnInit() {
    this.api.session().subscribe((r) => {
      if (!r.ok) return;
      this.userName.set(r.data.userName ?? null);
      this.session.set(r.data.sessionId ?? null);
    });
  }

  updateScheme(scheme: Scheme) {
    this.theming.scheme.set(scheme);
  }
}

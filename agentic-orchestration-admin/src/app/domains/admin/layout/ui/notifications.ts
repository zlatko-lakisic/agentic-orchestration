import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { formatDistance, sub } from 'date-fns';

@Component({
  selector: 'notifications',
  imports: [
    MatIconButton,
    MatIcon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButton,
    MatDivider,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
  ],
  template: `
    <button
      matIconButton
      cdkOverlayOrigin
      (click)="toggle()"
      #trigger="cdkOverlayOrigin"
    >
      <mat-icon svgIcon="bell" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayBackdropClass]="'transparent'.split(' ')"
      (detach)="toggle(false)"
      (backdropClick)="toggle(false)"
    >
      <div
        class="z-10 flex max-h-120 w-full max-w-xs flex-col overflow-y-auto rounded-lg bg-white shadow-(--mat-sys-level2) dark:bg-neutral-800"
      >
        <!-- Header -->
        <div class="flex flex-col bg-neutral-100 dark:bg-neutral-800">
          <div class="flex items-center p-4 pb-0 pl-6">
            <div class="flex items-center gap-x-3">
              <mat-icon
                class="size-4.5"
                svgIcon="bell"
              />
              <div class="text-xl font-semibold tracking-tighter">
                Notifications
              </div>
            </div>
            <div class="flex-auto"></div>
            <button
              matIconButton
              [matMenuTriggerFor]="notificationsMenu"
            >
              <mat-icon svgIcon="ellipsis-vertical" />
            </button>
            <mat-menu #notificationsMenu="matMenu">
              <button mat-menu-item>
                <mat-icon svgIcon="check-check" />
                Mark all as read
              </button>
              <button mat-menu-item>
                <mat-icon svgIcon="settings" />
                Notification settings
              </button>
            </mat-menu>
          </div>

          <!-- Filters -->
          <div class="flex items-center gap-x-2 px-6 pt-3 pb-4">
            @for (filter of filters; track filter.value) {
              <button
                [matButton]="
                  currentFilter().value === filter.value ? 'filled' : 'text'
                "
                class="small"
                (click)="currentFilter.set(filter)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
          <mat-divider />
        </div>

        <!-- List -->
        <div class="flex flex-col">
          @for (
            notification of notifications;
            track notification.id;
            let last = $last
          ) {
            <div class="flex gap-x-2 py-3 pr-4 pl-6">
              <div class="flex-auto">
                @if (notification.title) {
                  <div class="font-semibold">{{ notification.title }}</div>
                }
                <div class="line-clamp-2">{{ notification.description }}</div>
                <div class="mt-1 text-xs text-neutral-500">
                  {{ timeAgo(notification.time) }}
                </div>
              </div>
              <button
                matIconButton
                [matMenuTriggerFor]="notificationActions"
              >
                <mat-icon svgIcon="ellipsis-vertical" />
              </button>
              <mat-menu #notificationActions="matMenu">
                <button mat-menu-item>
                  <mat-icon svgIcon="list-check" />
                  Mark as read
                </button>
                <button mat-menu-item>
                  <mat-icon svgIcon="trash" />
                  Delete
                </button>
              </mat-menu>
            </div>

            @if (!last) {
              <mat-divider
                class="[--mat-divider-color:var(--color-neutral-200)] dark:[--mat-divider-color:var(--color-neutral-700)]"
              />
            }
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class Notifications {
  // State
  private now = new Date();
  protected open = signal(false);
  protected filters = [
    {
      value: 'all',
      label: 'All',
    },
    {
      value: 'system',
      label: 'System',
    },
    {
      value: 'archive',
      label: 'Archive',
    },
  ];
  protected currentFilter = signal<{ value: string; label: string }>({
    value: 'all',
    label: 'All',
  });

  // Data
  protected notifications = [
    {
      id: '4q7Z8REBhn9kLBZMJE6p6',
      title: 'Daily challenges',
      description: 'Your submission has been accepted',
      time: sub(this.now, { minutes: 25 }), // 25 minutes ago
      read: false,
      type: 'system',
    },
    {
      id: 'eeeihQ6qGUtFFp7UkPqPJ',
      title: null,
      description:
        'Leo Gill added you to "Top Secret Project" group and assigned you as a "Project Manager"',
      time: sub(this.now, { minutes: 50 }), // 50 minutes ago
      read: true,
      type: 'archive',
    },
    {
      id: 'X6f4gm4J7BfjwPTtttWze',
      title: 'Mailbox',
      description: 'You have 15 unread mails across 3 mailboxes',
      time: sub(this.now, { hours: 3 }), // 3 hours ago
      read: false,
      type: 'system',
    },
    {
      id: '99zrJ4pjchkmaB9V3npXZ',
      title: 'Cron jobs',
      description: 'Your Container is ready to publish',
      time: sub(this.now, { hours: 5 }), // 5 hours ago
      read: false,
      type: 'system',
    },
    {
      id: 'FjFRcXm9xtaVeqVtdV7MV',
      title: null,
      description: 'Roger Murray accepted your friend request',
      time: sub(this.now, { hours: 7 }), // 7 hours ago
      read: true,
      type: 'archive',
    },
    {
      id: 'PSSIjTGLtmHGRentSxFYj',
      title: null,
      description: 'Sophie Stone sent you a direct message',
      time: sub(this.now, { hours: 9 }), // 9 hours ago
      read: true,
      type: 'system',
    },
    {
      id: 'ltJWASIsKGO8cckmL4Pih',
      title: 'Mailbox',
      description: 'You have 3 new mails',
      time: sub(this.now, { days: 1 }), // 1 day ago
      read: true,
      type: 'system',
    },
    {
      id: 'vM0pgpCTOSDuLYzcGX1YW',
      title: 'Daily challenges',
      description:
        'Your submission has been accepted and you are ready to sign-up for the final assigment which will be ready in 2 days',
      time: sub(this.now, { days: 3 }), // 3 days ago
      read: true,
      type: 'system',
    },
    {
      id: '3SCmoGzdD2jLaehkuSVf5',
      title: 'Cron jobs',
      description: 'Your Container is ready to download',
      time: sub(this.now, { days: 4 }), // 4 days ago
      read: true,
      type: 'system',
    },
  ];

  toggle(force: boolean | null = null) {
    this.open.update((value) => {
      if (force === null) {
        return !value;
      }

      return force;
    });
  }

  timeAgo(time: Date) {
    return formatDistance(time, this.now, { addSuffix: true });
  }
}

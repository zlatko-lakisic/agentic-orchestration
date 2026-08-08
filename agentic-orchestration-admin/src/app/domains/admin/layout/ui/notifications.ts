import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { formatDistanceToNow } from 'date-fns';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { TopologyAttention } from '@/app/core/ao-api/types';

interface AttentionNote {
  id: string;
  title: string;
  description: string;
  time: Date;
  href?: string;
  severity: string;
}

@Component({
  selector: 'notifications',
  imports: [
    MatIconButton,
    MatIcon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButton,
    MatDivider,
    RouterLink,
  ],
  template: `
    <button
      matIconButton
      cdkOverlayOrigin
      (click)="toggle()"
      #trigger="cdkOverlayOrigin"
      [attr.aria-label]="'Attention items'"
    >
      <mat-icon
        [svgIcon]="unreadCount() ? 'bell-ring' : 'bell'"
        [class.text-amber-600]="unreadCount() > 0"
      />
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
        <div class="flex flex-col bg-neutral-100 dark:bg-neutral-800">
          <div class="flex items-center p-4 pb-3 pl-6">
            <div class="flex items-center gap-x-3">
              <mat-icon
                class="size-4.5"
                svgIcon="bell"
              />
              <div class="text-xl font-semibold tracking-tighter">
                Attention
              </div>
            </div>
            <div class="flex-auto"></div>
            <button
              matIconButton
              type="button"
              (click)="reload()"
            >
              <mat-icon svgIcon="refresh-cw" />
            </button>
          </div>
          <mat-divider />
        </div>

        <div class="flex flex-col">
          @for (
            note of notes();
            track note.id;
            let last = $last
          ) {
            <div class="flex gap-x-2 py-3 pr-4 pl-6">
              <div class="flex-auto">
                <div class="font-semibold">{{ note.title }}</div>
                <div class="line-clamp-3 text-sm text-neutral-600 dark:text-neutral-300">
                  {{ note.description }}
                </div>
                <div class="mt-1 text-xs text-neutral-500">
                  {{ timeAgo(note.time) }}
                </div>
                @if (note.href) {
                  <a
                    matButton
                    class="mt-1"
                    [routerLink]="note.href"
                    (click)="toggle(false)"
                  >
                    Open
                  </a>
                }
              </div>
            </div>
            @if (!last) {
              <mat-divider
                class="[--mat-divider-color:var(--color-neutral-200)] dark:[--mat-divider-color:var(--color-neutral-700)]"
              />
            }
          } @empty {
            <div class="px-6 py-8 text-sm text-neutral-500">
              Nothing needs attention right now.
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class Notifications implements OnInit {
  private api = inject(AoApi);
  private generatedAt = signal<Date>(new Date());

  protected open = signal(false);
  protected notes = signal<AttentionNote[]>([]);
  protected unreadCount = computed(() => this.notes().length);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.topology().subscribe((r) => {
      if (!r.ok) {
        this.notes.set([]);
        return;
      }
      const at = r.data.generatedAt
        ? new Date(r.data.generatedAt)
        : new Date();
      this.generatedAt.set(at);
      const attention = (r.data.attention || []) as TopologyAttention[];
      this.notes.set(
        attention.map((a, i) => ({
          id: `${i}-${a.message || 'item'}`,
          title:
            a.severity === 'warning'
              ? 'Warning'
              : a.severity === 'info'
                ? 'Info'
                : 'Attention',
          description: String(a.message || 'Attention item'),
          time: at,
          href: a.href || undefined,
          severity: String(a.severity || 'info'),
        }))
      );
    });
  }

  toggle(force: boolean | null = null) {
    this.open.update((value) => {
      if (force === null) return !value;
      return force;
    });
    if (this.open()) this.reload();
  }

  timeAgo(time: Date) {
    return formatDistanceToNow(time, { addSuffix: true });
  }
}

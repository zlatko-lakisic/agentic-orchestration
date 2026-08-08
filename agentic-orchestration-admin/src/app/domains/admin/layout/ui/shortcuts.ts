import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LocalStorage } from '@/app/core/local-storage';
import { Media } from '@/app/core/media';
import {
  NAVIGATION,
  NavigationItem,
} from '@/app/domains/admin/layout/data/navigation';

const STORAGE_KEY = 'shortcuts';
const DEFAULT_SHORTCUTS = ['overview', 'catalogs', 'runtime/planner'];

@Component({
  selector: 'shortcuts',
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuTrigger,
    MatTooltip,
    MatDivider,
    RouterLink,
    MatBadge,
  ],
  host: {
    class: 'flex items-center',
  },
  template: `
    <!-- Bookmarks -->
    @for (item of visibleBookmarks(); track item.id) {
      <button
        class="hidden sm:inline-flex"
        matIconButton
        [routerLink]="item.route"
        [matTooltip]="item.label"
      >
        <mat-icon [svgIcon]="item.icon ?? 'circle'" />
      </button>
    }

    <button
      matIconButton
      [matMenuTriggerFor]="shortcutsMenu"
      (menuOpened)="focusSearch()"
      (menuClosed)="search.set('')"
      [matBadge]="badgeLabel()"
      [matBadgeHidden]="!badgeCount()"
      #trigger="matMenuTrigger"
    >
      <mat-icon
        class="text-amber-500"
        svgIcon="star"
      />
    </button>
    <mat-menu
      class="min-w-60"
      #shortcutsMenu="matMenu"
    >
      <!-- Search -->
      <div class="flex items-center gap-x-3 px-4">
        <mat-icon
          class="size-4 text-neutral-500"
          svgIcon="search"
        />
        <input
          class="border-0 bg-transparent py-2 outline-none"
          type="text"
          placeholder="Search for an app or page"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
          #searchInput
        />
      </div>
      <mat-divider />

      <!-- List -->
      <div class="flex max-h-100 flex-col overflow-y-auto">
        @for (item of filteredItems(); track item.id) {
          @if (item.id === firstUnbookmarkedId()) {
            <mat-divider />
          }

          <div class="flex items-center gap-x-1 px-1">
            <button
              class="flex flex-auto items-center gap-x-3 rounded-lg px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              [routerLink]="item.route"
              (click)="trigger.closeMenu()"
            >
              <mat-icon
                class="size-4"
                [svgIcon]="item.icon ?? 'circle'"
              />
              <span class="flex-auto">{{ item.label }}</span>
            </button>
            <button
              matIconButton
              (click)="$event.stopPropagation(); toggleBookmark(item.id)"
            >
              <mat-icon
                class="size-4"
                [class]="
                  isBookmarked(item.id) ? 'text-amber-500' : 'text-neutral-400'
                "
                svgIcon="star"
              />
            </button>
          </div>
        }

        @if (!filteredItems().length) {
          <div class="px-4 py-6 text-center text-neutral-500">
            No results found
          </div>
        }
      </div>
    </mat-menu>
  `,
})
export class Shortcuts {
  // Dependencies
  private localStorage = inject(LocalStorage);
  private media = inject(Media);

  // State
  protected search = signal('');
  protected bookmarks = signal<string[]>(this.restoreBookmarks());
  protected items = NAVIGATION.flatMap((group) => group.children ?? []).filter(
    (item) => !!item.route
  );
  protected bookmarkedItems = computed(() =>
    this.bookmarks()
      .map((id) => this.items.find((item) => item.id === id))
      .filter((item): item is NavigationItem => !!item)
  );
  protected visibleBookmarks = computed(() =>
    this.bookmarkedItems().slice(0, 5)
  );
  protected overflowCount = computed(
    () => this.bookmarkedItems().length - this.visibleBookmarks().length
  );
  protected isMobile = computed(() => this.media.match(`(max-width: 639px)`)());
  protected badgeCount = computed(() =>
    this.isMobile() ? this.bookmarkedItems().length : this.overflowCount()
  );
  protected badgeLabel = computed(() =>
    this.isMobile() ? `${this.badgeCount()}` : `+${this.badgeCount()}`
  );
  protected filteredItems = computed(() => {
    const search = this.search().trim().toLowerCase();

    // Filter by the search term
    if (search) {
      return this.items.filter((item) =>
        item.label.toLowerCase().includes(search)
      );
    }

    // Otherwise, pin the bookmarked items to the top
    return [
      ...this.bookmarkedItems(),
      ...this.items.filter((item) => !this.isBookmarked(item.id)),
    ];
  });
  protected firstUnbookmarkedId = computed(() => {
    if (this.search().trim() || !this.bookmarkedItems().length) {
      return null;
    }

    return this.items.find((item) => !this.isBookmarked(item.id))?.id ?? null;
  });

  // DOM
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Reads the stored bookmarks, falling back to the defaults.
   */
  private restoreBookmarks(): string[] {
    const stored = this.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_SHORTCUTS;
    }

    try {
      return JSON.parse(stored) as string[];
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  }

  isBookmarked(id: string) {
    return this.bookmarks().includes(id);
  }

  toggleBookmark(id: string) {
    this.bookmarks.update((bookmarks) =>
      bookmarks.includes(id)
        ? bookmarks.filter((bookmark) => bookmark !== id)
        : [...bookmarks, id]
    );

    this.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookmarks()));
  }

  focusSearch() {
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }
}

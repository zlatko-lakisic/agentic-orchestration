import { NavigationItem } from '@/app/domains/admin/layout/data/navigation';
export declare class Shortcuts {
    private localStorage;
    private media;
    protected search: import("@angular/core").WritableSignal<string>;
    protected bookmarks: import("@angular/core").WritableSignal<string[]>;
    protected items: NavigationItem[];
    protected bookmarkedItems: import("@angular/core").Signal<NavigationItem[]>;
    protected visibleBookmarks: import("@angular/core").Signal<NavigationItem[]>;
    protected overflowCount: import("@angular/core").Signal<number>;
    protected isMobile: import("@angular/core").Signal<boolean>;
    protected badgeCount: import("@angular/core").Signal<number>;
    protected badgeLabel: import("@angular/core").Signal<string>;
    protected filteredItems: import("@angular/core").Signal<NavigationItem[]>;
    protected firstUnbookmarkedId: import("@angular/core").Signal<string | null>;
    private searchInput;
    /**
     * Reads the stored bookmarks, falling back to the defaults.
     */
    private restoreBookmarks;
    isBookmarked(id: string): boolean;
    toggleBookmark(id: string): void;
    focusSearch(): void;
}

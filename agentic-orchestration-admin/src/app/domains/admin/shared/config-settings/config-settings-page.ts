import { Component, OnInit, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDivider } from '@angular/material/divider';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { SettingRow } from '@/app/domains/admin/shared/setting-row/setting-row';

/**
 * Fuse Settings body pattern: section title + description + rows
 * (see extras/settings/features/account|notifications).
 */
@Component({
  selector: 'ao-config-settings-page',
  imports: [SettingRow, EmptyState, MatDivider],
  template: `
    <div class="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
      <div class="col-span-full">
        <div class="text-lg font-medium">{{ sectionTitle() }}</div>
        @if (sectionDescription()) {
          <div class="text-neutral-500">{{ sectionDescription() }}</div>
        }
      </div>

      @if (config.loading()) {
        <div class="col-span-full text-sm text-neutral-500">
          Loading configuration…
        </div>
      } @else if (rows().length === 0) {
        <div class="col-span-full">
          <ao-empty-state
            message="No settings in this group (or admin config API unavailable)."
          />
        </div>
      } @else {
        <div class="col-span-full flex flex-col">
          @for (e of rows(); track e.key; let last = $last) {
            <ao-setting-row
              [key]="e.key"
              [label]="e.label || e.key"
              [value]="e.value"
              [secret]="!!e.secret"
              [set]="!!e.set"
              [source]="e.source"
              [sourceFile]="e.sourceFile || e.sourcePath || null"
              [tier]="e.tier || e.applyTier || 'restart'"
              [flashId]="e.key"
            />
            @if (!last) {
              <mat-divider />
            }
          }
        </div>
      }
    </div>
  `,
})
export class ConfigSettingsPage implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);

  /** When set, override route data.groups */
  readonly groups = input<string[] | null>(null);
  readonly sectionTitle = input('Settings');
  readonly sectionDescription = input<string | null>(null);

  private resolvedGroups = computed(() => {
    const fromInput = this.groups();
    if (fromInput?.length) return fromInput;
    const data = this.route.snapshot.data;
    return (data['groups'] as string[]) || [];
  });

  readonly rows = computed(() =>
    this.config.entriesForGroup(this.resolvedGroups())
  );

  ngOnInit() {
    this.config.load();
    const flash = this.route.snapshot.queryParamMap.get('flash');
    if (flash) {
      setTimeout(
        () =>
          document.getElementById(flash)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          }),
        350
      );
    }
  }
}

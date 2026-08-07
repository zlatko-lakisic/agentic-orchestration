import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { SettingRow } from '@/app/domains/admin/shared/setting-row/setting-row';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';

@Component({
  selector: 'ao-models-page',
  imports: [SettingRow, EmptyState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Models & hardware</h1>
        <p class="mt-1 text-sm text-neutral-500">Effective values with source and apply tier</p>
      </header>
      @if (config.loading()) {
        <p class="text-sm text-neutral-500">Loading configuration…</p>
      } @else if (rows().length === 0) {
        <ao-empty-state message="No settings in this group (or admin config API unavailable)." />
      } @else {
        <div>
          @for (e of rows(); track e.key) {
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
          }
        </div>
      }
    </div>
  `,
})
export class ModelsPage implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);
  private groups = ["models"];
  readonly rows = computed(() => this.config.entriesForGroup(this.groups));

  ngOnInit() {
    this.config.load();
    const flash = this.route.snapshot.queryParamMap.get('flash');
    if (flash) {
      setTimeout(() => document.getElementById(flash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    }
  }
}

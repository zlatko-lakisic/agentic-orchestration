import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { SettingRow } from '@/app/domains/admin/shared/setting-row/setting-row';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';

@Component({
  selector: 'ao-integrations-page',
  imports: [SettingRow, EmptyState],
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header class="mb-6 border-b border-neutral-800 pb-4">
        <h1 class="text-lg font-semibold">Integrations</h1>
        <p class="mt-1 text-sm text-neutral-500">
          OpenClaw, Reach, speech, Home Assistant, search MCPs
        </p>
      </header>

      <div class="mb-6 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-neutral-800 p-4">
          <div class="text-sm font-medium">OpenClaw / Orchestrate bridge</div>
          <div class="mt-2 font-mono text-xs text-neutral-400">
            POST /api/v1/orchestrate on web :30487
          </div>
          <div class="mt-2 text-xs text-neutral-500">Auth: AGENTIC_ORCHESTRATE_API_KEY</div>
        </div>
        <div
          class="rounded-lg border border-neutral-800 p-4"
          [class.border-red-600]="!!reachError()"
        >
          <div class="text-sm font-medium">AO Reach / KnowBuddy</div>
          <div class="mt-2 font-mono text-xs text-neutral-300">
            Engine https://&lt;host&gt;:8765 (NodePort 30765)
          </div>
          @if (reachError()) {
            <div class="mt-2 text-xs text-red-400">{{ reachError() }}</div>
          } @else {
            <div class="mt-2 text-xs text-emerald-500">Do not point Reach at web :30487</div>
          }
        </div>
      </div>

      @if (rows().length === 0) {
        <ao-empty-state message="No integration settings loaded." />
      } @else {
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
      }
    </div>
  `,
})
export class IntegrationsPage implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);
  readonly rows = computed(() => this.config.entriesForGroup(['integrations']));
  readonly reachError = signal<string | null>(null);

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

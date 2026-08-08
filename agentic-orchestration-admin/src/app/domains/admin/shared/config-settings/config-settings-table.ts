import { Component, OnInit, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { EffectiveConfigEntry } from '@/app/core/ao-api/types';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { EmptyState } from '@/app/domains/admin/shared/empty-state/empty-state';
import { SourceChip } from '@/app/domains/admin/shared/source-chip/source-chip';
import { TierChip } from '@/app/domains/admin/shared/tier-chip/tier-chip';

export type SettingsSection = {
  id: string;
  title: string;
  description?: string;
};

/**
 * Compact settings table with optional expansion sections.
 */
@Component({
  selector: 'ao-config-settings-table',
  imports: [
    EmptyState,
    SourceChip,
    TierChip,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
  ],
  template: `
    @if (title()) {
      <div class="mb-4">
        <div class="text-lg font-medium">{{ title() }}</div>
        @if (description()) {
          <div class="text-neutral-500">{{ description() }}</div>
        }
      </div>
    }

    @if (config.loading()) {
      <div class="text-sm text-neutral-500">Loading configuration…</div>
    } @else if (filtered().length === 0) {
      <ao-empty-state
        message="No settings in this view (or admin config API unavailable)."
      />
    } @else if (sections().length) {
      <mat-accordion multi>
        @for (sec of sections(); track sec.id) {
          @if (rowsForSection(sec.id).length) {
            <mat-expansion-panel [expanded]="true">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ sec.title }}</mat-panel-title>
              </mat-expansion-panel-header>
              @if (sec.description) {
                <p class="mb-3 text-sm text-neutral-500">{{ sec.description }}</p>
              }
              <table
                mat-table
                [dataSource]="rowsForSection(sec.id)"
                class="w-full"
              >
                <ng-container matColumnDef="setting">
                  <th mat-header-cell *matHeaderCellDef>Setting</th>
                  <td mat-cell *matCellDef="let e" [attr.id]="e.key">
                    <div class="font-medium leading-tight">{{ e.label || e.key }}</div>
                    <div class="font-mono text-xs text-neutral-500 break-all">
                      {{ e.key }}
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="value">
                  <th mat-header-cell *matHeaderCellDef>Value</th>
                  <td mat-cell *matCellDef="let e" class="font-mono text-sm">
                    @if (e.secret) {
                      {{ e.set ? '••••••' : 'Not set' }}
                    } @else {
                      {{ display(e) }}
                      @if (!e.set && (e.source === 'default' || e.source === 'example')) {
                        <div class="text-xs text-neutral-500">code default</div>
                      }
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="source">
                  <th mat-header-cell *matHeaderCellDef>Source</th>
                  <td mat-cell *matCellDef="let e">
                    <ao-source-chip
                      [source]="e.source"
                      [sourceFile]="e.sourceFile || e.sourcePath"
                    />
                  </td>
                </ng-container>
                <ng-container matColumnDef="applies">
                  <th mat-header-cell *matHeaderCellDef>Applies</th>
                  <td mat-cell *matCellDef="let e">
                    <ao-tier-chip [tier]="e.tier || e.applyTier" />
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="h-10"></tr>
              </table>
            </mat-expansion-panel>
          }
        }
      </mat-accordion>
      @if (ungrouped().length) {
        <div class="mt-4">
          <div class="mb-2 text-sm font-medium text-neutral-500">Other</div>
          <table mat-table [dataSource]="ungrouped()" class="w-full">
            <ng-container matColumnDef="setting">
              <th mat-header-cell *matHeaderCellDef>Setting</th>
              <td mat-cell *matCellDef="let e" [attr.id]="e.key">
                <div class="font-medium leading-tight">{{ e.label || e.key }}</div>
                <div class="font-mono text-xs text-neutral-500 break-all">
                  {{ e.key }}
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let e" class="font-mono text-sm">
                @if (e.secret) {
                  {{ e.set ? '••••••' : 'Not set' }}
                } @else {
                  {{ display(e) }}
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let e">
                <ao-source-chip
                  [source]="e.source"
                  [sourceFile]="e.sourceFile || e.sourcePath"
                />
              </td>
            </ng-container>
            <ng-container matColumnDef="applies">
              <th mat-header-cell *matHeaderCellDef>Applies</th>
              <td mat-cell *matCellDef="let e">
                <ao-tier-chip [tier]="e.tier || e.applyTier" />
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="h-10"></tr>
          </table>
        </div>
      }
    } @else {
      <table mat-table [dataSource]="filtered()" class="w-full">
        <ng-container matColumnDef="setting">
          <th mat-header-cell *matHeaderCellDef>Setting</th>
          <td mat-cell *matCellDef="let e" [attr.id]="e.key">
            <div class="font-medium leading-tight">{{ e.label || e.key }}</div>
            <div class="font-mono text-xs text-neutral-500 break-all">
              {{ e.key }}
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="value">
          <th mat-header-cell *matHeaderCellDef>Value</th>
          <td mat-cell *matCellDef="let e" class="font-mono text-sm">
            @if (e.secret) {
              {{ e.set ? '••••••' : 'Not set' }}
            } @else {
              {{ display(e) }}
              @if (!e.set && (e.source === 'default' || e.source === 'example')) {
                <div class="text-xs text-neutral-500">code default</div>
              }
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="source">
          <th mat-header-cell *matHeaderCellDef>Source</th>
          <td mat-cell *matCellDef="let e">
            <ao-source-chip
              [source]="e.source"
              [sourceFile]="e.sourceFile || e.sourcePath"
            />
          </td>
        </ng-container>
        <ng-container matColumnDef="applies">
          <th mat-header-cell *matHeaderCellDef>Applies</th>
          <td mat-cell *matCellDef="let e">
            <ao-tier-chip [tier]="e.tier || e.applyTier" />
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols" class="h-10"></tr>
      </table>
    }
  `,
})
export class ConfigSettingsTable implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);

  readonly groups = input<string[] | null>(null);
  readonly component = input<string | null>(null);
  readonly sections = input<SettingsSection[]>([]);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  /** When true, hide kubernetes section unless execution backend is kubernetes. */
  readonly conditionalKubernetes = input(false);

  readonly cols = ['setting', 'value', 'source', 'applies'];

  private resolvedGroups = computed(() => {
    const fromInput = this.groups();
    if (fromInput?.length) return fromInput;
    const data = this.route.snapshot.data;
    return (data['groups'] as string[]) || [];
  });

  readonly filtered = computed(() => {
    let rows = this.resolvedGroups().length
      ? this.config.entriesForGroup(this.resolvedGroups())
      : this.config.entries();
    const comp = this.component();
    if (comp) {
      rows = rows.filter((e) => e.component === comp);
    }
    if (this.conditionalKubernetes()) {
      const backend = this.config.byKey().get('AGENTIC_EXECUTION_BACKEND');
      const isK8s = String(backend?.effective ?? backend?.value ?? '') === 'kubernetes';
      if (!isK8s) {
        rows = rows.filter((e) => e.section !== 'kubernetes');
      }
    }
    return rows;
  });

  readonly ungrouped = computed(() => {
    const sectionIds = new Set(this.sections().map((s) => s.id));
    if (!sectionIds.size) return [];
    return this.filtered().filter((e) => !e.section || !sectionIds.has(e.section));
  });

  rowsForSection(id: string): EffectiveConfigEntry[] {
    return this.filtered().filter((e) => e.section === id);
  }

  display(e: EffectiveConfigEntry): string {
    const v = e.effective ?? e.value;
    if (v === null || v === undefined || v === '') return 'Not set';
    return String(v);
  }

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

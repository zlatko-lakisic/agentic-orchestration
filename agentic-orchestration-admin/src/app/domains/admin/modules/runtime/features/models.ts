import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'ao-models-page',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatFormFieldModule,
    MatInputModule,
    ConfigSettingsPage,
    ErrorState,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">Ollama model pulls</div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-3 pt-2">
          <p class="text-sm text-neutral-500">
            Pull models into the configured Ollama runtime (container or host daemon).
          </p>
          @if (error()) {
            <ao-error-state [message]="error()!" />
          }
          @if (flash()) {
            <p class="text-sm text-teal-700 dark:text-teal-300">{{ flash() }}</p>
          }
          <div class="flex flex-wrap items-end gap-3">
            <mat-form-field appearance="outline" class="min-w-[18rem] flex-1">
              <mat-label>Model tag</mat-label>
              <input
                matInput
                [(ngModel)]="modelTag"
                placeholder="llava:7b"
                [disabled]="pulling()"
              />
            </mat-form-field>
            <button matButton="filled" type="button" [disabled]="pulling()" (click)="pull()">
              {{ pulling() ? 'Pulling…' : 'Pull model' }}
            </button>
            <button matButton="outlined" type="button" [disabled]="loading()" (click)="reloadTags()">
              Refresh list
            </button>
          </div>
          <p class="text-xs text-neutral-500">
            @if (base()) {
              Ollama base: <code>{{ base() }}</code>
            }
          </p>
          @if (models().length) {
            <div class="max-h-72 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table class="w-full text-sm">
                <thead class="border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th class="px-3 py-2 text-left">Model</th>
                    <th class="px-3 py-2 text-left">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of models(); track (m.name || m.model || 'model')) {
                    <tr class="border-b border-neutral-100 dark:border-neutral-900">
                      <td class="px-3 py-2 font-mono">{{ m.name || m.model }}</td>
                      <td class="px-3 py-2 text-neutral-500">
                        {{ m.modified_at ? (m.modified_at | date: 'medium') : '—' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-sm text-neutral-500">No models reported by Ollama yet.</p>
          }
        </mat-card-content>
      </mat-card>

      <ao-config-settings-page
        [groups]="['models']"
        sectionTitle="Models & hardware"
        sectionDescription="Ollama, Hugging Face, VRAM, and resident models"
      />
    </div>
  `,
})
export class ModelsPage {
  private readonly api = inject(AoApi);

  readonly loading = signal(false);
  readonly pulling = signal(false);
  readonly error = signal<string | null>(null);
  readonly flash = signal<string | null>(null);
  readonly base = signal<string | null>(null);
  readonly models = signal<Array<{ name?: string; model?: string; modified_at?: string }>>([]);

  modelTag = '';

  constructor() {
    this.reloadTags();
  }

  reloadTags() {
    this.loading.set(true);
    this.api.ollamaTags().subscribe((r) => {
      this.loading.set(false);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.error.set(null);
      this.base.set(r.data.base || null);
      const models = Array.isArray(r.data.models) ? r.data.models : [];
      this.models.set(models);
    });
  }

  pull() {
    const model = this.modelTag.trim();
    if (!model) {
      this.error.set('Model tag is required');
      return;
    }
    this.pulling.set(true);
    this.flash.set(null);
    this.error.set(null);
    this.api.ollamaPull({ model }).subscribe((r) => {
      this.pulling.set(false);
      if (!r.ok) {
        this.error.set(r.message);
        return;
      }
      this.flash.set(`Pulled ${model}`);
      this.reloadTags();
    });
  }
}

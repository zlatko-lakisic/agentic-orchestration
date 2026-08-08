import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { SourceChip } from '@/app/domains/admin/shared/source-chip/source-chip';

@Component({
  selector: 'ao-deploy-page',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    ConfigSettingsPage,
    EnvHelp,
    SourceChip,
  ],
  template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Deploy
        </div>
        <div class="text-neutral-500">
          Profile, tracked env, endpoints, and rollout path
        </div>
      </div>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">Active profile</div>
        </mat-card-header>
        <mat-card-content class="pt-2">
          <div class="text-2xl font-semibold tracking-tight">
            {{ platform() || 'local' }}
          </div>
          <p class="mt-2 text-sm text-neutral-500">
            Rollout: push to github → on device
            <code>git pull origin main</code> →
            <code>bash agentic-orchestration-tool/scripts/jetson-deploy.sh</code>
          </p>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="flex w-full items-center justify-between">
            <div class="font-medium">Endpoints</div>
          </div>
        </mat-card-header>
        <mat-card-content class="pt-2">
          <table mat-table [dataSource]="endpoints()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let e">{{ e.name }}</td>
            </ng-container>
            <ng-container matColumnDef="url">
              <th mat-header-cell *matHeaderCellDef>URL</th>
              <td mat-cell *matCellDef="let e" class="font-mono text-sm">
                {{ e.url }}
              </td>
            </ng-container>
            <ng-container matColumnDef="copy">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let e">
                <button matIconButton type="button" (click)="copy(e.url)">
                  <mat-icon svgIcon="copy" />
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['name', 'url', 'copy']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['name', 'url', 'copy']"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="font-medium">Tracked profile keys (env.jetson / env.*)</div>
        </mat-card-header>
        <mat-card-content class="flex flex-col gap-2 pt-2">
          @for (e of tracked(); track e.key) {
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2 dark:border-neutral-800">
              <div class="flex min-w-0 items-start gap-1">
                <div class="min-w-0">
                  <div class="font-medium">{{ e.label || e.key }}</div>
                  <div class="font-mono text-xs text-neutral-500">
                    {{ e.key }}
                  </div>
                </div>
                <ao-env-help
                  [key]="e.key"
                  [help]="e.help || e.description"
                  [wikiUrl]="e.wikiUrl"
                  [wikiPage]="e.wikiPage"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm">{{ e.effective ?? e.value }}</span>
                <ao-source-chip
                  [source]="e.source"
                  [sourceFile]="e.sourceFile"
                />
              </div>
            </div>
          } @empty {
            <p class="text-sm text-neutral-500">No tracked overrides loaded.</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <div class="flex w-full items-center justify-between gap-2">
            <div class="font-medium">Compare to profile</div>
            <button
              matButton="outlined"
              type="button"
              (click)="showDrift.set(!showDrift())"
            >
              {{ showDrift() ? 'Hide' : 'Show' }} differences
            </button>
          </div>
        </mat-card-header>
        <mat-card-content class="pt-2">
          <p class="text-sm text-neutral-500">
            {{ drift().length }} of {{ configuredCount() }} configured keys
            differ from their code default. Read-only — apply changes through
            the deploy path above.
          </p>
          @if (showDrift()) {
            <div class="mt-3 flex flex-col gap-2">
              @for (e of drift(); track e.key) {
                <div
                  class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2 dark:border-neutral-800"
                >
                  <div class="flex items-center gap-1">
                    <div class="font-mono text-xs">{{ e.key }}</div>
                    <ao-env-help
                      [key]="e.key"
                      [help]="e.help || e.description"
                      [wikiUrl]="e.wikiUrl"
                      [wikiPage]="e.wikiPage"
                    />
                  </div>
                  <div class="font-mono text-sm">
                    <span class="text-neutral-500 line-through">{{
                      e.default
                    }}</span>
                    <span class="mx-2 text-neutral-400">→</span>
                    <span>{{ e.effective ?? e.value }}</span>
                  </div>
                </div>
              } @empty {
                <p class="text-sm text-neutral-500">
                  No configured key overrides a code default.
                </p>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>

      <ao-config-settings-page
        [groups]="['deployments']"
        sectionTitle="Deploy settings"
      />
    </div>
  `,
})
export class DeployPage implements OnInit {
  private api = inject(AoApi);
  private config = inject(EffectiveConfigStore);
  private clipboard = inject(Clipboard);

  readonly platform = computed(() => {
    const e = this.config.byKey().get('AGENTIC_EDGE_PLATFORM');
    return String(e?.effective ?? e?.value ?? '');
  });

  readonly showDrift = signal(false);

  readonly configuredCount = computed(
    () => this.config.entries().filter((e) => e.set).length
  );

  readonly drift = computed(() =>
    this.config
      .entries()
      .filter(
        (e) =>
          e.set &&
          !e.secret &&
          e.default != null &&
          String(e.effective ?? e.value ?? '') !== String(e.default)
      )
      .sort((a, b) => a.key.localeCompare(b.key))
  );

  readonly tracked = computed(() =>
    this.config
      .entries()
      .filter((e) => {
        const s = String(e.source || '');
        return (
          s === 'env.jetson' ||
          s === 'env.host' ||
          s === 'env.nvr' ||
          s === 'tracked'
        );
      })
      .slice(0, 40)
  );

  readonly endpoints = signal([
    { name: 'Web / Admin', url: 'http://<host>:30487/' },
    { name: 'Engine (Reach)', url: 'https://<host>:8765/' },
    { name: 'Engine NodePort', url: 'https://<host>:30765/' },
  ]);

  ngOnInit() {
    this.config.load();
    this.api.topology().subscribe((r) => {
      if (!r.ok) return;
      const host = typeof window !== 'undefined' ? window.location.hostname : '<host>';
      const ports = r.data.ports || {};
      this.endpoints.set([
        {
          name: 'Web / Admin',
          url: `http://${host}:${ports['webNodePort'] || 30487}/`,
        },
        {
          name: 'Engine (Reach)',
          url: `https://${host}:${ports['engine'] || 8765}/`,
        },
        {
          name: 'Engine NodePort',
          url: `https://${host}:${ports['engineNodePort'] || 30765}/`,
        },
      ]);
    });
  }

  copy(text: string) {
    this.clipboard.copy(text);
  }
}

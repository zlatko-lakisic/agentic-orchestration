import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { Clipboard } from '@angular/cdk/clipboard';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { TopologyComponent } from '@/app/core/ao-api/types';
import { AoMark } from '@/app/domains/admin/shared/ao-mark/ao-mark';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';

@Component({
  selector: 'ao-component-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    ConfigSettingsPage,
    StatusChip,
    AoMark,
  ],
  template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <a routerLink="/components" class="text-sm text-neutral-500"
            >← Components</a
          >
          <div
            class="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tighter sm:text-2xl"
          >
            @if (id() === 'reach') {
              <ao-mark size="sm" tint="steel" />
              <span class="text-[#3B6EA5] dark:text-[#E6EAF0]">Reach</span>
              <span>clients</span>
            } @else {
              {{ title() }}
            }
          </div>
          <div class="mt-1 flex items-center gap-2">
            <ao-status-chip [status]="status()" [label]="status()" />
            <span class="text-sm text-neutral-500">{{ fact() }}</span>
          </div>
        </div>
        @if (endpoint()) {
          <button matButton="tonal" type="button" (click)="copyEndpoint()">
            <mat-icon svgIcon="copy" />
            Copy endpoint
          </button>
        }
      </div>

      <nav mat-tab-nav-bar [tabPanel]="panel">
        @for (t of tabs; track t.id) {
          <a
            mat-tab-link
            (click)="tab.set(t.id)"
            [active]="tab() === t.id"
            >{{ t.label }}</a
          >
        }
      </nav>
      <mat-tab-nav-panel #panel>
        @if (tab() === 'status') {
          <div class="flex flex-col gap-2 py-4 text-sm">
            <div><span class="text-neutral-500">Kind:</span> {{ kind() }}</div>
            @if (endpoint()) {
              <div class="font-mono break-all">{{ endpoint() }}</div>
            }
            <button
              matButton="tonal"
              type="button"
              class="w-fit"
              (click)="testConnection()"
              [disabled]="!canProbe()"
            >
              Test connection
            </button>
            @if (probeResult()) {
              <div class="text-neutral-600 dark:text-neutral-400">
                {{ probeResult() }}
              </div>
            }
          </div>
        }
        @if (tab() === 'settings') {
          <ao-config-settings-page
            [component]="id()"
            [groups]="settingsGroups()"
            sectionTitle="Component settings"
            [conditionalKubernetes]="id() === 'execution'"
          />
        }
        @if (tab() === 'logs') {
          <p class="py-4 text-sm text-neutral-500">
            Live logs for this source are on Overview (expand Live logs and
            filter by source). Per-component stream filter lands with Activity.
          </p>
          <a matButton routerLink="/overview">Open Overview logs</a>
        }
        @if (tab() === 'notes') {
          <div class="prose dark:prose-invert max-w-none py-4 text-sm">
            <p>{{ notes() }}</p>
            @if (id() === 'reach' || id() === 'engine') {
              <p class="font-medium text-amber-800 dark:text-amber-300">
                Do not point Reach clients at web :30487 — use engine :8765
                (NodePort 30765).
              </p>
            }
            @if (id() === 'execution') {
              <p>
                Deploy path: push to github → on device
                <code>git pull</code> →
                <code>jetson-deploy.sh</code>.
              </p>
            }
          </div>
        }
      </mat-tab-nav-panel>
    </div>
  `,
})
export class ComponentDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AoApi);
  private clipboard = inject(Clipboard);

  readonly id = signal('web');
  readonly tab = signal('status');
  readonly topo = signal<TopologyComponent | null>(null);
  readonly probeResult = signal<string | null>(null);

  readonly tabs = [
    { id: 'status', label: 'Status' },
    { id: 'settings', label: 'Settings' },
    { id: 'logs', label: 'Logs' },
    { id: 'notes', label: 'Notes' },
  ];

  readonly title = computed(() => {
    const map: Record<string, string> = {
      web: 'Web / Coordinator',
      engine: 'Engine',
      execution: 'Execution backend',
      ollama: 'Ollama',
      mcp: 'MCP servers',
      speech: 'Speech',
      openclaw: 'OpenClaw bridge',
      reach: 'Reach clients',
    };
    return map[this.id()] || this.id();
  });

  readonly kind = computed(() => this.id());
  readonly status = computed(() => String(this.topo()?.status || 'info'));
  readonly fact = computed(() => this.topo()?.fact || '');
  readonly endpoint = computed(() => {
    const t = this.topo();
    if (t?.urlHint) return t.urlHint;
    if (this.id() === 'reach') return 'https://<host>:8765';
    if (this.id() === 'openclaw') return 'http://<host>:30487/api/v1/orchestrate';
    return null;
  });

  readonly notes = computed(() => {
    const map: Record<string, string> = {
      web: 'Serves chat UI and Admin. Host metrics and live logs are sampled here.',
      engine: 'Python FastAPI daemon for Reach clients (/api/v1/*) and mTLS enroll.',
      execution: 'Where crew steps run (in-process, subprocess, or Kubernetes).',
      ollama: 'Local LLM runtime used by planner and agents on edge.',
      mcp: 'Browse Capabilities → MCP servers for per-entry gates.',
      speech: 'Optional STT/TTS advertise endpoints.',
      openclaw: 'Bridge posts goals to the web orchestrate API.',
      reach: 'Mobile/client Remote URL must target the engine, not Admin.',
    };
    return map[this.id()] || '';
  });

  settingsGroups(): string[] {
    const id = this.id();
    if (id === 'execution') return ['execution'];
    if (id === 'engine') return ['engine', 'security'];
    if (id === 'ollama') return ['models'];
    if (id === 'web') return ['deployments', 'security'];
    if (id === 'speech' || id === 'mcp' || id === 'openclaw')
      return ['integrations'];
    return ['advanced'];
  }

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      this.id.set(pm.get('id') || 'web');
      this.probeResult.set(null);
      this.api.topology().subscribe((r) => {
        if (!r.ok) return;
        const match = r.data.components?.find((c) => c.id === this.id());
        this.topo.set(match || null);
      });
    });
  }

  copyEndpoint() {
    const e = this.endpoint();
    if (e) this.clipboard.copy(e);
  }

  canProbe(): boolean {
    return this.id() === 'engine' || this.id() === 'ollama' || this.id() === 'web';
  }

  testConnection() {
    this.probeResult.set('Probing…');
    if (this.id() === 'web') {
      this.api.ping().subscribe((r) => {
        this.probeResult.set(
          r.ok ? `OK — ${r.data.service} pid ${r.data.pid}` : r.message
        );
      });
      return;
    }
    if (this.id() === 'engine') {
      this.api.topology().subscribe((r) => {
        if (!r.ok) {
          this.probeResult.set(r.message);
          return;
        }
        const eng = r.data.components?.find((c) => c.id === 'engine');
        this.probeResult.set(
          eng?.status === 'healthy'
            ? `OK — ${eng.fact}`
            : `Not healthy — ${eng?.fact || eng?.status}`
        );
      });
      return;
    }
    if (this.id() === 'ollama') {
      this.api.topology().subscribe((r) => {
        const o = r.ok
          ? r.data.components?.find((c) => c.id === 'ollama')
          : null;
        this.probeResult.set(
          o ? `${o.status}: ${o.fact}` : r.ok ? 'No ollama component' : r.message
        );
      });
    }
  }
}

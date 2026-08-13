import { __decorate } from "tslib";
import { Component, effect, inject, signal, } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AoMark } from '@/app/domains/admin/shared/ao-mark/ao-mark';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';
import { StatusChip } from '@/app/domains/admin/shared/status-chip/status-chip';
const CATALOG = [
    {
        id: 'web',
        label: 'Web / Coordinator',
        kind: 'service',
        notes: 'Admin + chat UI on NodePort 30487. Not the Reach remote URL.',
    },
    {
        id: 'engine',
        label: 'Engine',
        kind: 'service',
        notes: 'Reach client Remote URL: https://<host>:8765 (NodePort 30765).',
    },
    {
        id: 'execution',
        label: 'Execution backend',
        kind: 'runtime',
        notes: 'inprocess / subprocess / kubernetes — stdio MCPs are unsupported under kubernetes unless explicitly allowed.',
    },
    {
        id: 'ollama',
        label: 'Ollama',
        kind: 'model',
        notes: 'Local model runtime; keepalive models are resident on this host.',
    },
    {
        id: 'mcp',
        label: 'MCP servers',
        kind: 'integration',
        notes: 'Catalogued MCP providers — see Capabilities for gate reasons.',
    },
    {
        id: 'speech',
        label: 'Speech',
        kind: 'integration',
        notes: 'STT/TTS advertise URLs when speech is enabled.',
    },
    {
        id: 'openclaw',
        label: 'OpenClaw bridge',
        kind: 'integration',
        notes: 'POST /api/v1/orchestrate on web :30487 with AGENTIC_ORCHESTRATE_API_KEY.',
    },
    {
        id: 'reach',
        label: 'Reach clients',
        kind: 'client',
        notes: 'Must use engine :8765 / NodePort 30765 — never web :30487.',
        brandReach: true,
    },
];
let ComponentsPage = class ComponentsPage {
    live = inject(AoLiveWs);
    error = signal(null);
    topology = signal(null);
    catalog = CATALOG;
    constructor() {
        effect(() => {
            const err = this.live.feedErrors()['topology'] || this.live.feedErrors()['_'];
            if (err)
                this.error.set(err);
            const snap = this.live.feeds()['topology'];
            if (!snap)
                return;
            this.error.set(null);
            this.topology.set(snap);
        });
    }
    ngOnInit() {
        this.live.acquire({ feeds: ['topology'], feedIntervalMs: 5000 });
    }
    ngOnDestroy() {
        this.live.release();
    }
    component(id) {
        return this.topology()?.components?.find((c) => c.id === id);
    }
    statusFor(id) {
        return String(this.component(id)?.status || 'info');
    }
    factFor(id) {
        const c = this.component(id);
        if (c?.fact)
            return c.fact;
        if (id === 'reach') {
            return this.topology()?.reachGuard?.message || 'Engine :8765';
        }
        if (id === 'openclaw')
            return 'Web orchestrate API';
        return c?.urlHint || '—';
    }
};
ComponentsPage = __decorate([
    Component({
        selector: 'ao-components-page',
        imports: [
            RouterLink,
            MatCard,
            MatCardHeader,
            MatCardContent,
            MatButtonModule,
            MatIconModule,
            StatusChip,
            ErrorState,
            AoMark,
        ],
        template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-4 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Components
        </div>
        <div class="text-neutral-500">
          Status, endpoints, and settings owned by each running piece
        </div>
      </div>

      @if (error()) {
        <ao-error-state [message]="error()!" />
      }

      <div class="grid gap-4 sm:grid-cols-2">
        @for (c of catalog; track c.id) {
          <mat-card appearance="outlined">
            <mat-card-header>
              <div class="flex w-full items-center justify-between gap-2">
                @if (c.brandReach) {
                  <div class="flex items-center gap-1.5 font-medium">
                    <ao-mark size="sm" tint="steel" />
                    <span class="text-[#3B6EA5] dark:text-[#E6EAF0]">Reach</span>
                    <span>clients</span>
                  </div>
                } @else {
                  <div class="font-medium">{{ c.label }}</div>
                }
                <ao-status-chip
                  [status]="statusFor(c.id)"
                  [label]="statusFor(c.id)"
                />
              </div>
            </mat-card-header>
            <mat-card-content class="flex flex-col gap-2 pt-2">
              <div class="text-sm text-neutral-500">{{ factFor(c.id) }}</div>
              <div class="text-sm">{{ c.notes }}</div>
              <a matButton="tonal" [routerLink]="['/components', c.id]">
                Open
                <mat-icon svgIcon="chevron-right" iconPositionEnd />
              </a>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `,
    })
], ComponentsPage);
export { ComponentsPage };

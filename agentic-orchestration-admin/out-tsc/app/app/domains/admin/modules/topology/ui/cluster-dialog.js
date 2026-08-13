import { __decorate } from "tslib";
import { Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { helpForNode, TOPOLOGY_WIKI_PAGE } from '../data/topology.help';
let ClusterDialog = class ClusterDialog {
    data = inject(MAT_DIALOG_DATA);
    wikiPage = TOPOLOGY_WIKI_PAGE;
    wikiHelp = helpForNode(this.data.node);
    appMembers = computed(() => this.data.node.appMembers || []);
    breakdownEntries(b) {
        return Object.entries(b);
    }
    memberKindLabel() {
        const id = this.data.node.id;
        if (id.includes('mcp') || id.includes('sidecar'))
            return 'MCPs';
        if (id.includes('skill'))
            return 'skills';
        return 'agents';
    }
    memberNoun(count) {
        const kind = this.memberKindLabel();
        if (kind === 'MCPs')
            return count === 1 ? 'MCP' : 'MCPs';
        if (kind === 'skills')
            return count === 1 ? 'skill' : 'skills';
        return count === 1 ? 'agent' : 'agents';
    }
    catalogLink() {
        const id = this.data.node.id;
        if (id.includes('mcp'))
            return '/capabilities/mcp';
        if (id.includes('skill'))
            return '/capabilities/skills';
        return '/capabilities/agents';
    }
};
ClusterDialog = __decorate([
    Component({
        selector: 'ao-cluster-dialog',
        imports: [MatDialogModule, MatButtonModule, RouterLink, EnvHelp],
        template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <span class="flex-auto">{{ data.node.label }} cluster</span>
      <ao-env-help
        [key]="wikiHelp.wikiKey"
        [help]="wikiHelp.blurb"
        [wikiPage]="wikiPage"
      />
    </h2>
    <mat-dialog-content class="max-w-lg text-sm">
      <div>Stock catalog: {{ data.node.count ?? 0 }}</div>

      @if (appMembers().length) {
        <div class="mt-4">
          <div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Reach session overlays by app
          </div>
          <div class="flex flex-col gap-2">
            @for (group of appMembers(); track group.appId) {
              <div
                class="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
              >
                <div class="flex items-baseline justify-between gap-2">
                  <span class="font-medium text-teal-800 dark:text-teal-200">{{
                    group.appId
                  }}</span>
                  <span class="text-xs text-neutral-500">
                    {{ group.instanceCount }}
                    instance{{ group.instanceCount === 1 ? '' : 's' }} ·
                    {{ group.ids.length }}
                    {{ memberNoun(group.ids.length) }}
                  </span>
                </div>
                <ul class="mt-1.5 space-y-0.5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  @if (group.overlayIds?.length || group.allowedIds?.length) {
                    @if (group.overlayIds?.length) {
                      <li class="pt-0.5 text-[10px] font-sans uppercase tracking-wide text-neutral-500">
                        Client overlays
                      </li>
                      @for (id of group.overlayIds; track id) {
                        <li>{{ id }}</li>
                      }
                    }
                    @if (group.allowedIds?.length) {
                      <li class="pt-1 text-[10px] font-sans uppercase tracking-wide text-neutral-500">
                        Stock allowlist
                      </li>
                      @for (id of group.allowedIds; track id) {
                        <li>{{ id }}</li>
                      }
                    }
                  } @else {
                    @for (id of group.ids; track id) {
                      <li>{{ id }}</li>
                    }
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      } @else {
        <p class="mt-3 text-neutral-500">
          No Reach apps are advertising {{ memberKindLabel() }} on active session
          overlays right now.
        </p>
      }

      @if (data.node.breakdown; as b) {
        <ul class="mt-3 text-neutral-500">
          @for (entry of breakdownEntries(b); track entry[0]) {
            <li>{{ entry[0] }}: {{ entry[1] }}</li>
          }
        </ul>
      }
      <p class="mt-3 text-neutral-500">
        Stock catalog providers stay on Capabilities. Lists above are live Reach
        <code>client.*</code> overlays plus any stock agents allowlisted on the
        session (<code>allowedAgentProviderIds</code>).
      </p>
      <a
        matButton
        class="mt-2"
        [routerLink]="catalogLink()"
        [mat-dialog-close]="true"
      >
        Open Capabilities
      </a>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
    })
], ClusterDialog);
export { ClusterDialog };

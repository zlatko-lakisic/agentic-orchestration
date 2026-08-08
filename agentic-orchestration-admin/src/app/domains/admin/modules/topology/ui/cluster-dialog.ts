import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EnvHelp } from '@/app/domains/admin/shared/env-help/env-help';
import { helpForNode, TOPOLOGY_WIKI_PAGE } from '../data/topology.help';
import { TopologyNode } from '../data/topology.types';

@Component({
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
    <mat-dialog-content class="text-sm">
      <div>Count: {{ data.node.count ?? 0 }}</div>
      @if (ownerLabel(); as owners) {
        <div
          class="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100"
        >
          <span class="text-xs uppercase tracking-wide text-teal-700 dark:text-teal-300"
            >Owned by app</span
          >
          <div class="mt-0.5 font-medium">{{ owners }}</div>
        </div>
      }
      @if (data.node.breakdown; as b) {
        <ul class="mt-2 text-neutral-500">
          @for (entry of breakdownEntries(b); track entry[0]) {
            <li>{{ entry[0] }}: {{ entry[1] }}</li>
          }
        </ul>
      }
      <p class="mt-3 text-neutral-500">
        Members are not expanded on the canvas. Open Capabilities for the full
        catalog list.
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
export class ClusterDialog {
  readonly data = inject<{ node: TopologyNode }>(MAT_DIALOG_DATA);
  readonly wikiPage = TOPOLOGY_WIKI_PAGE;
  readonly wikiHelp = helpForNode(this.data.node);

  breakdownEntries(b: Record<string, number>) {
    return Object.entries(b);
  }

  ownerLabel(): string | null {
    const apps = this.data.node.ownedByApps || [];
    return apps.length ? apps.join(', ') : null;
  }

  catalogLink(): string {
    const id = this.data.node.id;
    if (id.includes('mcp')) return '/capabilities/mcp';
    if (id.includes('skill')) return '/capabilities/skills';
    return '/capabilities/agents';
  }
}

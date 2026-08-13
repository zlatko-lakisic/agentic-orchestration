import { __decorate } from "tslib";
import { Component, computed, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { wikiUrlForKey } from '@/app/domains/admin/shared/env-help/env-wiki';
/**
 * Question-mark control next to an env key: hover shows definition,
 * click opens the Configuration wiki anchor for that variable.
 */
let EnvHelp = class EnvHelp {
    key = input.required();
    help = input(null);
    wikiUrl = input(null);
    wikiPage = input(null);
    href = computed(() => {
        const fromApi = (this.wikiUrl() || '').trim();
        if (fromApi)
            return fromApi;
        return wikiUrlForKey(this.key(), this.wikiPage() || undefined);
    });
    tooltip = computed(() => {
        const h = (this.help() || '').trim();
        if (h)
            return h;
        return `${this.key()} — open wiki documentation`;
    });
};
EnvHelp = __decorate([
    Component({
        selector: 'ao-env-help',
        imports: [MatIcon, MatIconButton, MatTooltip],
        host: {
            class: 'inline-flex shrink-0 align-middle',
        },
        template: `
    <a
      matIconButton
      type="button"
      [href]="href()"
      target="_blank"
      rel="noopener noreferrer"
      [matTooltip]="tooltip()"
      matTooltipShowDelay="150"
      matTooltipClass="ao-env-help-tooltip"
      [attr.aria-label]="'Documentation for ' + key()"
      class="!h-7 !w-7"
      (click)="$event.stopPropagation()"
    >
      <mat-icon
        class="icon-size-4 text-neutral-400"
        [svgIcon]="'circle-question-mark'"
      />
    </a>
  `,
    })
], EnvHelp);
export { EnvHelp };

import { Component, input } from '@angular/core';

/**
 * Brand mark for Agentic Orchestration (letter-A + orchestration arrow).
 * Uses CSS mask so tint follows theme / explicit steel.
 * @see assets/brand/BRAND.md
 */
@Component({
  selector: 'ao-mark',
  template: `
    <span
      class="ao-mark"
      [class.ao-mark--xs]="size() === 'xs'"
      [class.ao-mark--sm]="size() === 'sm'"
      [class.ao-mark--md]="size() === 'md'"
      [class.ao-mark--steel]="tint() === 'steel'"
      [class.ao-mark--on-dark]="tint() === 'on-dark'"
      [class.ao-mark--current]="tint() === 'current'"
      role="img"
      [attr.aria-label]="label()"
    ></span>
  `,
  styles: `
    .ao-mark {
      display: inline-block;
      flex-shrink: 0;
      vertical-align: -0.15em;
      -webkit-mask: url('/admin/images/logo/ao-mark-small.svg') center / contain
        no-repeat;
      mask: url('/admin/images/logo/ao-mark-small.svg') center / contain no-repeat;
    }
    .ao-mark--xs {
      width: 14px;
      height: 14px;
    }
    .ao-mark--sm {
      width: 18px;
      height: 18px;
    }
    .ao-mark--md {
      width: 32px;
      height: 32px;
      -webkit-mask-image: url('/admin/images/logo/ao-mark.svg');
      mask-image: url('/admin/images/logo/ao-mark.svg');
    }
    .ao-mark--steel {
      background-color: #3b6ea5;
    }
    .ao-mark--on-dark {
      background-color: #e6eaf0;
    }
    .ao-mark--current {
      background-color: currentColor;
    }
    :host-context(.dark) .ao-mark--steel {
      background-color: #e6eaf0;
    }
  `,
})
export class AoMark {
  /** xs ≈14px (topology bands), sm ≈18px (inline labels), md ≈32px (sidebar). */
  readonly size = input<'xs' | 'sm' | 'md'>('sm');
  /** steel = brand #3B6EA5 (flips on dark); on-dark = #E6EAF0; current = inherit. */
  readonly tint = input<'steel' | 'on-dark' | 'current'>('steel');
  readonly label = input('Agentic Orchestration');
}

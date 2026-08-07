import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'error-404',
  imports: [MatButton, RouterLink],
  template: `
    <div
      class="flex flex-auto flex-col items-center justify-center p-6 text-center sm:p-10"
    >
      <div class="text-lg font-semibold text-primary-600">404</div>
      <div class="mt-2 text-4xl font-bold md:text-[64px]/24">
        Page not found
      </div>
      <div class="mt-2 font-medium text-neutral-500 md:mt-0 md:text-lg">
        Sorry, we couldn’t find the page you’re looking for.
      </div>

      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <a
          matButton="filled"
          routerLink="/admin"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  `,
})
export default class Error404 {}

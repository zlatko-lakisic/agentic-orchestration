import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WebAuth } from '@/app/core/ao-api/web-auth';
import { ErrorState } from '@/app/domains/admin/shared/error-state/error-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorState],
  host: {
    // Ensure root component fills the entire viewport
    class: 'flex min-h-full w-full flex-auto flex-col',
  },
  template: `
    @if (webAuth.blocked(); as hint) {
      <!-- The server refused the token bootstrap: nothing in Admin can load. -->
      <main
        class="mx-auto flex w-full max-w-2xl flex-auto flex-col justify-center p-6"
        role="alert"
      >
        <ao-error-state
          title="Admin is not available from this location"
          message="The server did not release the Admin access token to this browser."
          [remedy]="hint"
        />
      </main>
    } @else {
      <router-outlet />
    }
  `,
})
export class App {
  protected readonly webAuth = inject(WebAuth);
}

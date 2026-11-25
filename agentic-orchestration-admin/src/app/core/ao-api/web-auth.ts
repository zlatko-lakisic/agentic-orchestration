import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';

export type WebAuthState = {
  assigned: boolean;
  appId: string;
  token: string | null;
  tokenId?: string | null;
  prefix?: string | null;
  assignedAt?: string | null;
  hint?: string;
  /** Machine-readable refusal, e.g. `web_auth_untrusted_source`. */
  error?: string;
};

/** The server refuses to hand the ao-web token to this browser's network source. */
export const WEB_AUTH_UNTRUSTED_SOURCE = 'web_auth_untrusted_source';

/** Key used by older builds that persisted the token; removed on startup. */
const LEGACY_STORAGE_KEY = 'ao-web-auth-token';

const UNTRUSTED_SOURCE_FALLBACK_HINT =
  'The server refused to give this browser the Admin token because the request ' +
  'did not come from a trusted source. Open Admin from the server host or through ' +
  'the configured auth proxy, or ask the operator to allow this source.';

@Injectable({ providedIn: 'root' })
export class WebAuth {
  private readonly http = inject(HttpClient);
  // The bearer token lives in memory only: it is re-fetched on every boot, and
  // anything in localStorage outlives a logout on a shared browser.
  private readonly tokenSignal = signal<string | null>(null);
  private readonly assignedSignal = signal(false);
  private readonly readySignal = signal(false);
  private readonly blockedSignal = signal<string | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly assigned = this.assignedSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  /**
   * Non-null when the server refused the token bootstrap for this source: the
   * text is the operator hint to show instead of the app.
   */
  readonly blocked = this.blockedSignal.asReadonly();

  constructor() {
    this.dropLegacyStoredToken();
  }

  bearer(): string | null {
    return this.tokenSignal();
  }

  refresh(): Observable<WebAuthState> {
    return this.http.get<WebAuthState>('/api/v1/admin/web-auth').pipe(
      tap((state) => this.apply(state)),
      catchError((err: unknown) => {
        const refusal = this.untrustedSourceRefusal(err);
        if (refusal) {
          this.tokenSignal.set(null);
          this.assignedSignal.set(Boolean(refusal.assigned));
          this.blockedSignal.set(
            String(refusal.hint || '').trim() || UNTRUSTED_SOURCE_FALLBACK_HINT,
          );
          this.readySignal.set(true);
          return of(refusal);
        }
        // Transient failure: keep whatever token is already in memory.
        this.readySignal.set(true);
        return of({
          assigned: false,
          appId: 'ao-web',
          token: null,
          hint: 'Failed to load web-auth',
        });
      })
    );
  }

  async refreshOnce(): Promise<void> {
    await firstValueFrom(this.refresh());
  }

  /** After minting ao-web, keep the SPA in sync without waiting for another fetch. */
  adoptMinted(token: string | null | undefined, assignedToWeb?: boolean) {
    if (!token || !assignedToWeb) return;
    this.tokenSignal.set(token);
    this.assignedSignal.set(true);
    this.blockedSignal.set(null);
    this.readySignal.set(true);
  }

  /** Forget the token (call on logout). */
  clear() {
    this.tokenSignal.set(null);
    this.assignedSignal.set(false);
    this.dropLegacyStoredToken();
  }

  private apply(state: WebAuthState) {
    this.assignedSignal.set(Boolean(state.assigned));
    this.blockedSignal.set(null);
    this.tokenSignal.set(state.assigned && state.token ? state.token : null);
    this.readySignal.set(true);
  }

  private untrustedSourceRefusal(err: unknown): WebAuthState | null {
    if (!(err instanceof HttpErrorResponse) || err.status !== 403) return null;
    const body = err.error as Partial<WebAuthState> | null | undefined;
    if (!body || typeof body !== 'object') return null;
    if (body.error !== WEB_AUTH_UNTRUSTED_SOURCE) return null;
    return {
      assigned: Boolean(body.assigned),
      appId: String(body.appId || 'ao-web'),
      token: null,
      hint: typeof body.hint === 'string' ? body.hint : undefined,
      error: WEB_AUTH_UNTRUSTED_SOURCE,
    };
  }

  private dropLegacyStoredToken() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode, blocked site data) */
    }
  }
}

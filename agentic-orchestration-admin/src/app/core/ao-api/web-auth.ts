import { HttpClient } from '@angular/common/http';
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
};

const STORAGE_KEY = 'ao-web-auth-token';

@Injectable({ providedIn: 'root' })
export class WebAuth {
  private readonly http = inject(HttpClient);
  private readonly tokenSignal = signal<string | null>(this.readStored());
  private readonly assignedSignal = signal(false);
  private readonly readySignal = signal(false);

  readonly token = this.tokenSignal.asReadonly();
  readonly assigned = this.assignedSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  bearer(): string | null {
    return this.tokenSignal();
  }

  refresh(): Observable<WebAuthState> {
    return this.http.get<WebAuthState>('/api/v1/admin/web-auth').pipe(
      tap((state) => this.apply(state)),
      catchError(() => {
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
    this.readySignal.set(true);
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  }

  clear() {
    this.tokenSignal.set(null);
    this.assignedSignal.set(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private apply(state: WebAuthState) {
    this.assignedSignal.set(Boolean(state.assigned));
    if (state.assigned && state.token) {
      this.tokenSignal.set(state.token);
      try {
        localStorage.setItem(STORAGE_KEY, state.token);
      } catch {
        /* ignore */
      }
    } else {
      this.tokenSignal.set(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    this.readySignal.set(true);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}

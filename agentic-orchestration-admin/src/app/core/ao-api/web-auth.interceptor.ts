import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { WebAuth } from './web-auth';

const WEB_AUTH_PATH = '/api/v1/admin/web-auth';

/**
 * True for API calls on this app's own origin that should carry the ao-web
 * token. Absolute URLs to any other origin never get it, whatever their path.
 */
export function needsBearer(url: string, origin = currentOrigin()): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, origin || 'http://localhost');
  } catch {
    return false;
  }
  // Scheme-qualified or protocol-relative URLs must match this origin exactly.
  const absolute = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
  if (absolute && (!origin || parsed.origin !== origin)) return false;
  const path = parsed.pathname;
  if (path === '/api/ping' || path.endsWith('/api/ping')) return false;
  if (path === WEB_AUTH_PATH || path.endsWith(WEB_AUTH_PATH)) return false;
  return path.startsWith('/api/');
}

function currentOrigin(): string {
  return typeof location !== 'undefined' ? location.origin : '';
}

function withBearer<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attach the assigned ao-web Bearer token to same-origin Admin / operator API
 * calls. On a 401 the token is re-fetched once and, if it changed (rotated or
 * newly assigned), the request is replayed with the new one.
 */
export const webAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const webAuth = inject(WebAuth);
  if (!needsBearer(req.url) || req.headers.has('Authorization')) {
    return next(req);
  }
  const token = webAuth.bearer();
  return next(token ? withBearer(req, token) : req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      return webAuth.refresh().pipe(
        switchMap(() => {
          const fresh = webAuth.bearer();
          if (!fresh || fresh === token) return throwError(() => err);
          return next(withBearer(req, fresh));
        })
      );
    })
  );
};

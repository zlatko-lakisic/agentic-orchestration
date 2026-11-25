import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebAuth } from './web-auth';
import { needsBearer, webAuthInterceptor } from './web-auth.interceptor';

const WEB_AUTH = '/api/v1/admin/web-auth';
const LEGACY_KEY = 'ao-web-auth-token';

describe('WebAuth', () => {
  let http: HttpTestingController;
  let auth: WebAuth;

  beforeEach(() => {
    localStorage.setItem(LEGACY_KEY, 'ao_left_by_an_older_build');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([webAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(WebAuth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('never restores or persists the token in localStorage', () => {
    // The token an older build stored is discarded, not adopted.
    expect(auth.bearer()).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();

    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush({ assigned: true, appId: 'ao-web', token: 'ao_1' });
    expect(auth.bearer()).toBe('ao_1');
    expect(auth.assigned()).toBe(true);
    expect(localStorage.length).toBe(0);

    auth.adoptMinted('ao_2', true);
    expect(auth.bearer()).toBe('ao_2');
    expect(localStorage.length).toBe(0);
  });

  it('clear() forgets the token (logout)', () => {
    auth.adoptMinted('ao_1', true);
    auth.clear();
    expect(auth.bearer()).toBeNull();
    expect(auth.assigned()).toBe(false);
  });

  it('blocks with the server hint when the source is untrusted', () => {
    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush(
      {
        assigned: true,
        token: null,
        error: 'web_auth_untrusted_source',
        hint: 'Set AGENTIC_WEB_TRUSTED_PROXIES.',
      },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(auth.blocked()).toBe('Set AGENTIC_WEB_TRUSTED_PROXIES.');
    expect(auth.bearer()).toBeNull();
    expect(auth.ready()).toBe(true);

    // A later successful bootstrap lifts the block.
    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush({ assigned: true, appId: 'ao-web', token: 'ao_1' });
    expect(auth.blocked()).toBeNull();
    expect(auth.bearer()).toBe('ao_1');
  });

  it('falls back to a built-in hint when the refusal carries none', () => {
    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush(
      { assigned: false, token: null, error: 'web_auth_untrusted_source' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(auth.blocked()).toMatch(/trusted source/i);
  });

  it('does not block, or drop the token, on an unrelated failure', () => {
    auth.adoptMinted('ao_1', true);
    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush('boom', { status: 502, statusText: 'Bad Gateway' });
    expect(auth.blocked()).toBeNull();
    expect(auth.bearer()).toBe('ao_1');

    auth.refresh().subscribe();
    http.expectOne(WEB_AUTH).flush(
      { error: 'something_else' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(auth.blocked()).toBeNull();
  });
});

describe('webAuthInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: WebAuth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([webAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(WebAuth);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth.adoptMinted('ao_1', true);
  });

  afterEach(() => http.verify());

  it('attaches the bearer to same-origin API calls only', () => {
    client.get('/api/v1/admin/runs').subscribe();
    expect(
      http.expectOne('/api/v1/admin/runs').request.headers.get('Authorization')
    ).toBe('Bearer ao_1');

    client.get('https://evil.example/api/v1/admin/runs').subscribe();
    expect(
      http
        .expectOne('https://evil.example/api/v1/admin/runs')
        .request.headers.has('Authorization')
    ).toBe(false);

    client.get('/api/ping').subscribe();
    expect(http.expectOne('/api/ping').request.headers.has('Authorization')).toBe(
      false
    );
  });

  it('needsBearer compares origins, not just paths', () => {
    const origin = 'https://admin.example';
    expect(needsBearer('/api/v1/admin/runs', origin)).toBe(true);
    expect(needsBearer('https://admin.example/api/v1/x', origin)).toBe(true);
    expect(needsBearer('https://admin.example:8443/api/v1/x', origin)).toBe(false);
    expect(needsBearer('http://admin.example/api/v1/x', origin)).toBe(false);
    expect(needsBearer('//evil.example/api/v1/x', origin)).toBe(false);
    expect(needsBearer('https://evil.example/api/v1/x', origin)).toBe(false);
    expect(needsBearer('/api/v1/admin/web-auth', origin)).toBe(false);
    expect(needsBearer('/assets/logo.svg', origin)).toBe(false);
    // Without a known origin, an absolute URL is never trusted.
    expect(needsBearer('https://anything.example/api/v1/x', '')).toBe(false);
  });

  it('on 401 refreshes the token once and replays with the new one', () => {
    let body: unknown;
    client.get('/api/v1/admin/runs').subscribe((r) => (body = r));
    http
      .expectOne('/api/v1/admin/runs')
      .flush('nope', { status: 401, statusText: 'Unauthorized' });
    http.expectOne(WEB_AUTH).flush({ assigned: true, appId: 'ao-web', token: 'ao_2' });
    const retry = http.expectOne('/api/v1/admin/runs');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer ao_2');
    retry.flush({ ok: 1 });
    expect(body).toEqual({ ok: 1 });
  });

  it('on 401 with an unchanged token surfaces the error without looping', () => {
    let status = 0;
    client.get('/api/v1/admin/runs').subscribe({
      error: (e: { status: number }) => (status = e.status),
    });
    http
      .expectOne('/api/v1/admin/runs')
      .flush('nope', { status: 401, statusText: 'Unauthorized' });
    http.expectOne(WEB_AUTH).flush({ assigned: true, appId: 'ao-web', token: 'ao_1' });
    http.expectNone('/api/v1/admin/runs');
    expect(status).toBe(401);
  });
});

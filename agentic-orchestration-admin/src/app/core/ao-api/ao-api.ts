import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  AccessPosture,
  AgentProvider,
  ApiAccessToken,
  ApiAccessTokenUsage,
  MtlsClient,
  CatalogEntry,
  CatalogListResponse,
  ConfigFingerprint,
  EffectiveConfigEntry,
  EffectiveConfigResponse,
  HostMetrics,
  PingResponse,
  RunDetail,
  RunsListResponse,
  SessionResponse,
  StorageResponse,
  SupportBundle,
  TopologyResponse,
} from './types';
import type {
  TopologyGraph,
  TopologyNodeDetail,
} from '@/app/domains/admin/modules/topology/data/topology.types';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; missing: boolean };

@Injectable({ providedIn: 'root' })
export class AoApi {
  private http = inject(HttpClient);

  private toResult<T>(err: HttpErrorResponse): ApiResult<T> {
    const status = err.status || 0;
    const message =
      (err.error && (err.error.error || err.error.message)) ||
      err.message ||
      `Request failed (${status || 'network'})`;
    return {
      ok: false as const,
      status,
      message: String(message),
      missing: status === 404,
    };
  }

  private get<T>(path: string): Observable<ApiResult<T>> {
    return this.http.get<T>(path, { observe: 'response' }).pipe(
      map((res) => ({ ok: true as const, data: res.body as T })),
      catchError((err: HttpErrorResponse) => of(this.toResult<T>(err)))
    );
  }

  private post<T>(path: string, body: unknown): Observable<ApiResult<T>> {
    return this.http.post<T>(path, body, { observe: 'response' }).pipe(
      map((res) => ({ ok: true as const, data: res.body as T })),
      catchError((err: HttpErrorResponse) => of(this.toResult<T>(err)))
    );
  }

  private delete<T>(path: string): Observable<ApiResult<T>> {
    return this.http.delete<T>(path, { observe: 'response' }).pipe(
      map((res) => ({ ok: true as const, data: res.body as T })),
      catchError((err: HttpErrorResponse) => of(this.toResult<T>(err)))
    );
  }

  ping() {
    return this.get<PingResponse>('/api/ping');
  }

  session() {
    return this.get<SessionResponse>('/api/session');
  }

  hostMetrics() {
    return this.get<HostMetrics>('/api/host-metrics');
  }

  agentProviders() {
    return this.get<{ providers: AgentProvider[] }>('/api/agent-providers').pipe(
      map((r) => {
        if (!r.ok) return r;
        return { ok: true as const, data: (r.data.providers ?? []) as AgentProvider[] };
      })
    );
  }

  effectiveConfig(opts?: { includeInjected?: boolean }) {
    const q = opts?.includeInjected ? '?includeInjected=1' : '';
    return this.get<EffectiveConfigResponse>(
      `/api/v1/admin/config/effective${q}`
    ).pipe(
      map((r) => (r.ok ? { ok: true as const, data: normalizeEffective(r.data) } : r))
    );
  }

  fingerprint() {
    return this.get<ConfigFingerprint>('/api/v1/admin/config/fingerprint');
  }

  catalogs(kind: string) {
    return this.get<CatalogListResponse>(`/api/v1/admin/catalogs/${kind}`).pipe(
      map((r) => {
        if (!r.ok) return r;
        const items = r.data.items ?? r.data.entries ?? r.data.providers ?? [];
        return { ok: true as const, data: items as CatalogEntry[] };
      })
    );
  }

  catalogDetail(kind: string, id: string) {
    return this.get<CatalogEntry>(
      `/api/v1/admin/catalogs/${kind}/${encodeURIComponent(id)}`
    );
  }

  topology() {
    return this.get<TopologyResponse>('/api/v1/admin/health/topology');
  }

  topologyGraph() {
    return this.get<TopologyGraph>('/api/v1/admin/topology/graph');
  }

  topologyNode(id: string) {
    return this.get<TopologyNodeDetail>(
      `/api/v1/admin/topology/node/${encodeURIComponent(id)}`
    );
  }

  storage() {
    return this.get<StorageResponse>('/api/v1/admin/storage');
  }

  accessPosture() {
    return this.get<AccessPosture>('/api/v1/admin/access/posture');
  }

  runs(limit = 50) {
    return this.get<RunsListResponse>(`/api/v1/admin/runs?limit=${limit}`);
  }

  runDetail(id: string) {
    return this.get<RunDetail>(
      `/api/v1/admin/runs/${encodeURIComponent(id)}`
    );
  }

  supportBundle() {
    return this.get<SupportBundle>('/api/v1/admin/support-bundle');
  }

  listApiTokens() {
    return this.get<{ tokens: ApiAccessToken[] }>('/api/v1/admin/tokens').pipe(
      map((r) => {
        if (!r.ok) return r;
        return { ok: true as const, data: r.data.tokens ?? [] };
      })
    );
  }

  mintApiToken(body: { appId: string; label?: string; expiresAt?: string | null }) {
    return this.post<ApiAccessToken>('/api/v1/admin/tokens', body);
  }

  revokeApiToken(id: string) {
    return this.delete<ApiAccessToken>(
      `/api/v1/admin/tokens/${encodeURIComponent(id)}`
    );
  }

  apiTokenUsage(id: string, limit = 100) {
    return this.get<{ tokenId: string; usage: ApiAccessTokenUsage[] }>(
      `/api/v1/admin/tokens/${encodeURIComponent(id)}/usage?limit=${limit}`
    ).pipe(
      map((r) => {
        if (!r.ok) return r;
        return { ok: true as const, data: r.data.usage ?? [] };
      })
    );
  }

  listMtlsClients() {
    return this.get<{ clients: MtlsClient[] }>('/api/v1/admin/mtls/clients').pipe(
      map((r) => {
        if (!r.ok) return r;
        return { ok: true as const, data: r.data.clients ?? [] };
      })
    );
  }

  revokeMtlsClient(body: { serial?: string | null; subject?: string | null; reason?: string }) {
    return this.post<{ ok: boolean; revoked: MtlsClient }>(
      '/api/v1/admin/mtls/clients/revoke',
      body
    );
  }

  unrevokeMtlsClient(body: { serial?: string | null; subject?: string | null }) {
    return this.post<{ ok: boolean; unrevoked: boolean }>(
      '/api/v1/admin/mtls/clients/unrevoke',
      body
    );
  }
}

function normalizeEffective(raw: EffectiveConfigResponse): EffectiveConfigEntry[] {
  if (Array.isArray(raw.entries)) {
    return raw.entries.map(normalizeEntry);
  }
  if (raw.entries && typeof raw.entries === 'object') {
    return Object.values(raw.entries as Record<string, EffectiveConfigEntry>).map(
      normalizeEntry
    );
  }
  if (raw.keys && typeof raw.keys === 'object') {
    return Object.entries(raw.keys).map(([key, entry]) =>
      normalizeEntry({ ...entry, key: entry.key || key })
    );
  }
  return [];
}

/** Map backend plane names to UI source chips. */
export function normalizeSource(
  source: string | null | undefined,
  sourcePath?: string | null
): string {
  const s = String(source || 'unset');
  if (s === 'process') return 'process-env';
  if (s === 'tracked') {
    if (sourcePath && sourcePath.includes('env.jetson')) return 'env.jetson';
    if (sourcePath && sourcePath.includes('env.nvr')) return 'env.nvr';
    if (sourcePath && sourcePath.includes('env.host')) return 'env.host';
    return 'tracked';
  }
  return s;
}

function normalizeEntry(entry: EffectiveConfigEntry): EffectiveConfigEntry {
  const effective =
    entry.effective !== undefined && entry.effective !== null
      ? entry.effective
      : entry.value ?? null;
  return {
    ...entry,
    label: entry.label || entry.key,
    effective,
    value: effective,
    applyTier: entry.applyTier || entry.tier || 'restart',
    tier: entry.tier || entry.applyTier || 'restart',
    source: normalizeSource(entry.source, entry.sourcePath || entry.sourceFile),
    sourceFile: entry.sourceFile || entry.sourcePath || null,
  };
}

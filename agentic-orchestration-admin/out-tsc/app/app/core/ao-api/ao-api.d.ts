import { Observable } from 'rxjs';
import { AgentProvider, CatalogEntry, ConfigFingerprint, EffectiveConfigEntry, HostMetrics, PingResponse, SessionResponse, StorageResponse, TopologyResponse } from './types';
export type ApiResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    status: number;
    message: string;
    missing: boolean;
};
export declare class AoApi {
    private http;
    private get;
    ping(): Observable<ApiResult<PingResponse>>;
    session(): Observable<ApiResult<SessionResponse>>;
    hostMetrics(): Observable<ApiResult<HostMetrics>>;
    agentProviders(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: AgentProvider[];
    }>;
    effectiveConfig(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: EffectiveConfigEntry[];
    }>;
    fingerprint(): Observable<ApiResult<ConfigFingerprint>>;
    catalogs(kind: string): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: CatalogEntry[];
    }>;
    catalogDetail(kind: string, id: string): Observable<ApiResult<CatalogEntry>>;
    topology(): Observable<ApiResult<TopologyResponse>>;
    storage(): Observable<ApiResult<StorageResponse>>;
}

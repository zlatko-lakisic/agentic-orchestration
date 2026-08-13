import { Observable } from 'rxjs';
import { AccessPosture, AgentProvider, ApiAccessToken, ApiAccessTokenUsage, AppPlanningPrefs, ControlRestartResult, MtlsClient, MtlsEnrollToken, CatalogEntry, ConfigFingerprint, EffectiveConfigEntry, HostMetrics, PingResponse, RunDetail, RunsListResponse, RunTraceResponse, SessionResponse, StorageResponse, SupportBundle, TopologyResponse, TracesListResponse, LlmUsageResponse } from './types';
import type { TopologyGraph, TopologyNodeDetail } from '@/app/domains/admin/modules/topology/data/topology.types';
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
    private toResult;
    private get;
    private post;
    private put;
    private delete;
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
    effectiveConfig(opts?: {
        includeInjected?: boolean;
    }): Observable<{
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
    topologyGraph(): Observable<ApiResult<TopologyGraph>>;
    topologyNode(id: string): Observable<ApiResult<TopologyNodeDetail>>;
    storage(): Observable<ApiResult<StorageResponse>>;
    accessPosture(): Observable<ApiResult<AccessPosture>>;
    runs(limit?: number): Observable<ApiResult<RunsListResponse>>;
    runDetail(id: string): Observable<ApiResult<RunDetail>>;
    traces(limit?: number, opts?: {
        client?: string;
        clientIp?: string;
        crewOnly?: boolean;
    }): Observable<ApiResult<TracesListResponse>>;
    runTrace(id: string, depth?: string): Observable<ApiResult<RunTraceResponse>>;
    llmUsage(limit?: number): Observable<ApiResult<LlmUsageResponse>>;
    supportBundle(): Observable<ApiResult<SupportBundle>>;
    listApiTokens(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: ApiAccessToken[];
    }>;
    mintApiToken(body: {
        appId: string;
        label?: string;
        expiresAt?: string | null;
        assignToWeb?: boolean;
        assignToChat?: boolean;
    }): Observable<ApiResult<ApiAccessToken>>;
    revokeApiToken(id: string): Observable<ApiResult<ApiAccessToken>>;
    apiTokenUsage(id: string, limit?: number): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: ApiAccessTokenUsage[];
    }>;
    listAppPrefs(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: AppPlanningPrefs[];
    }>;
    setAppPrefs(appId: string, body: {
        dynamicPlanning?: boolean;
        defaultRunMode?: 'dynamic' | 'dynamic-iterative' | null;
        allowedAgentProviderIds?: string[];
    }): Observable<ApiResult<AppPlanningPrefs>>;
    listMtlsClients(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: MtlsClient[];
    }>;
    revokeMtlsClient(body: {
        serial?: string | null;
        subject?: string | null;
        reason?: string;
    }): Observable<ApiResult<{
        ok: boolean;
        revoked: MtlsClient;
    }>>;
    unrevokeMtlsClient(body: {
        serial?: string | null;
        subject?: string | null;
    }): Observable<ApiResult<{
        ok: boolean;
        unrevoked: boolean;
    }>>;
    mintMtlsEnrollToken(body: {
        clientName?: string;
        ttlSeconds?: number;
        maxUses?: number;
    }): Observable<ApiResult<MtlsEnrollToken>>;
    controlStatus(): Observable<{
        ok: false;
        status: number;
        message: string;
        missing: boolean;
    } | {
        ok: true;
        data: {
            targets: import("./types").ControlTarget[];
            generatedAt?: string;
            hostname?: string | null;
            kubernetes?: {
                available?: boolean;
                namespace?: string | null;
                error?: string | null;
            };
            hostControl?: {
                available?: boolean;
                dir?: string | null;
                armed?: boolean;
                mode?: string | null;
                reboot?: boolean;
                ollama?: boolean;
                sysrq?: boolean;
                reason?: string | null;
                installedAt?: string | null;
            };
            lastAction?: ControlRestartResult | null;
        };
    }>;
    controlRestart(body: {
        target: string;
        confirm?: string;
    }): Observable<ApiResult<ControlRestartResult>>;
}
/** Map backend plane names to UI source chips. */
export declare function normalizeSource(source: string | null | undefined, sourcePath?: string | null): string;

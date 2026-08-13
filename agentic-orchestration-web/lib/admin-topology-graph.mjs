/**
 * Live Topology graph builder (Admin).
 *
 * Produces the three-band deployment graph consumed by GET /api/v1/admin/topology/graph
 * and the topology_* WebSocket channel. Probe RTT feeds metrics ingestion.
 *
 * Catalog loading is injected via ctx.buildCatalogs to avoid a circular import with admin-api.
 */

import { ingestTopologySample } from "./admin-topology-metrics.mjs";
import { probeK8sTopology } from "./admin-k8s.mjs";
import {
  probeCatalogLoad,
  probeEngineEndpoint,
  probeExecutionBackend,
  probeModelBackends,
  probeOllama,
  probePlannerFromEngine,
  probeSpeechStt,
  probeSpeechTts,
  probeStorageGpu,
  sealTopologyGraphStatuses,
} from "./admin-topology-probes.mjs";
import {
  CHAT_UI_APP_ID,
  WEB_UI_APP_ID,
  getChatAssignment,
  getWebAssignment,
  isFirstPartyUiAppId,
  listClientIpsForAppId,
  summarizeWebApiApps,
} from "./api-tokens.mjs";

let _seq = 1;

function nextSeq() {
  _seq += 1;
  return _seq;
}

function truthy(v) {
  return ["1", "true", "yes", "on"].includes(String(v || "").trim().toLowerCase());
}

function node(partial) {
  return {
    status: "healthy",
    statusReason: "",
    instrumented: false,
    deployed: true,
    sublabel: "",
    ...partial,
  };
}

function edge(partial) {
  return {
    kind: "request",
    protocol: "https",
    instrumented: false,
    status: "idle",
    ...partial,
  };
}

function catalogBreakdown(entries) {
  const breakdown = { available: 0, gated: 0, excluded: 0, failed: 0 };
  for (const e of entries || []) {
    const s = String(e.availability || e.status || "available").toLowerCase();
    if (s === "gated" || s === "unavailable") breakdown.gated += 1;
    else if (s === "excluded" || s === "disabled") breakdown.excluded += 1;
    else if (s === "failed" || s === "error") breakdown.failed += 1;
    else breakdown.available += 1;
  }
  return breakdown;
}

function uniqueSorted(values) {
  return [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))].sort();
}

/** Group Reach sessions by required appId for Application-band visibility. */
function groupSessionsByAppId(sessionList) {
  const byApp = new Map();
  for (const s of sessionList || []) {
    const appId = String(s.appId || s.app_id || "").trim().toLowerCase() || "unknown";
    if (!byApp.has(appId)) {
      byApp.set(appId, {
        appId,
        sessions: [],
        agentCount: 0,
        mcpCount: 0,
        skillCount: 0,
        tunnelMcpCount: 0,
        agentIds: [],
        mcpIds: [],
        skillIds: [],
        allowedAgentProviderIds: [],
        sessionEnvKeys: [],
        clientIps: [],
      });
    }
    const g = byApp.get(appId);
    g.sessions.push(s);
    g.agentCount += Number(s.agentCount || 0);
    g.mcpCount += Number(s.mcpCount || 0);
    g.skillCount += Number(s.skillCount || 0);
    g.tunnelMcpCount += Number(s.tunnelMcpCount || 0);
    for (const id of s.agentIds || []) g.agentIds.push(id);
    for (const id of s.mcpIds || []) g.mcpIds.push(id);
    for (const id of s.skillIds || []) g.skillIds.push(id);
    for (const id of s.allowedAgentProviderIds || s.allowed_agent_provider_ids || []) {
      g.allowedAgentProviderIds.push(id);
    }
    for (const key of s.sessionEnvKeys || s.session_env_keys || []) {
      g.sessionEnvKeys.push(key);
    }
    const ip = String(s.clientIp || s.client_ip || "").trim();
    if (ip) g.clientIps.push(ip);
  }
  for (const g of byApp.values()) {
    g.agentIds = uniqueSorted(g.agentIds);
    g.mcpIds = uniqueSorted(g.mcpIds);
    g.skillIds = uniqueSorted(g.skillIds);
    g.allowedAgentProviderIds = uniqueSorted(g.allowedAgentProviderIds);
    g.sessionEnvKeys = uniqueSorted(g.sessionEnvKeys);
    g.clientIps = uniqueSorted(g.clientIps);
    g.clientIpCount = g.clientIps.length;
    g.instanceCount = g.sessions.length;
  }
  return [...byApp.values()].sort((a, b) => a.appId.localeCompare(b.appId));
}

/**
 * Per-app overlay member ids for catalog / sidecar modals.
 * Agents include packed ``client.*`` overlays plus stock allowlist ids from Reach.
 * @param {'agents'|'mcps'|'skills'} field
 */
function appMembersFor(appGroups, field) {
  const key =
    field === "agents" ? "agentIds" : field === "mcps" ? "mcpIds" : "skillIds";
  const out = [];
  for (const g of appGroups || []) {
    const overlayIds = uniqueSorted(g[key] || []);
    const allowedIds =
      field === "agents" ? uniqueSorted(g.allowedAgentProviderIds || []) : [];
    const ids = uniqueSorted([...overlayIds, ...allowedIds]);
    if (!ids.length) continue;
    const row = {
      appId: g.appId,
      instanceCount: g.instanceCount || g.sessions?.length || 0,
      ids,
    };
    if (field === "agents") {
      if (overlayIds.length) row.overlayIds = overlayIds;
      if (allowedIds.length) row.allowedIds = allowedIds;
    }
    out.push(row);
  }
  return out;
}

function setAppMembers(nodes, id, members) {
  const n = (nodes || []).find((x) => x.id === id);
  if (!n) return;
  if (members && members.length) n.appMembers = members;
  else delete n.appMembers;
}

/**
 * Probe engine /health and /api/v1/admin/reach-sessions using the same host candidates
 * as the legacy topology probe.
 */
export async function probeEngineForGraph({
  fetchJson,
  engineScheme,
  enginePort,
  configuredHost,
}) {
  const tlsInsecure = engineScheme === "https";
  const candidates = [];
  const push = (host) => {
    if (!host || candidates.includes(host)) return;
    candidates.push(host);
  };
  push("agentic-engine");
  push("agentic-engine.agentic-orchestration.svc");
  push("host.k3s.internal");
  if (configuredHost && configuredHost !== "0.0.0.0") push(configuredHost);
  push("127.0.0.1");

  let health = { ok: false, error: "no probe candidates" };
  let sessions = { ok: false, sessions: [], count: 0 };
  let probeHost = null;
  let engineLatencyMs = null;

  for (const host of candidates) {
    const t0 = Date.now();
    const result = await fetchJson(
      `${engineScheme}://${host}:${enginePort}/health`,
      2000,
      tlsInsecure,
    );
    const elapsed = Date.now() - t0;
    if (result.ok) {
      health = { ...result, probeHost: host };
      probeHost = host;
      engineLatencyMs = elapsed;
      break;
    }
    health = { ...result, probeHost: host };
    engineLatencyMs = elapsed;
  }

  if (probeHost) {
    const sess = await fetchJson(
      `${engineScheme}://${probeHost}:${enginePort}/api/v1/admin/reach-sessions`,
      2000,
      tlsInsecure,
    );
    if (sess.ok && sess.json) {
      sessions = {
        ok: true,
        ...sess.json,
        sessions: Array.isArray(sess.json.sessions) ? sess.json.sessions : [],
        count: Number(sess.json.count || 0),
      };
    }
  }

  return { health, sessions, probeHost, engineLatencyMs };
}

/**
 * @param {object} ctx
 * @param {string} ctx.toolRoot
 * @param {string} ctx.webRoot
 * @param {string} ctx.webInstanceId
 * @param {number} ctx.webPid
 * @param {Function} ctx.fetchJson
 * @param {Function} [ctx.probeEngineForGraphFn]
 */
export async function buildTopologyGraph(ctx) {
  const {
    toolRoot,
    webRoot,
    webInstanceId,
    webPid,
    fetchJson,
    buildCatalogs,
    probeEngineForGraphFn = probeEngineForGraph,
  } = ctx;

  if (typeof buildCatalogs !== "function") {
    throw new Error("buildTopologyGraph requires ctx.buildCatalogs");
  }

  const webPort = Number(process.env.AGENTIC_WEB_PORT || 3847);
  const enginePort = Number(process.env.AGENTIC_SERVE_PORT || 8765);
  const engineHost = String(process.env.AGENTIC_SERVE_HOST || "127.0.0.1");
  const engineTls = Boolean(
    process.env.AGENTIC_SERVE_TLS_CERTFILE && process.env.AGENTIC_SERVE_TLS_KEYFILE,
  );
  const engineScheme = engineTls ? "https" : "http";
  const overlaysOnEnv = truthy(process.env.AGENTIC_SERVE_SESSION_OVERLAY);
  const tunnelOnEnv = truthy(process.env.AGENTIC_SERVE_MCP_TUNNEL);
  const speechOn = truthy(process.env.AGENTIC_SPEECH_ENABLED);
  const engineDisabled = process.env.AGENTIC_JETSON_ENABLE_ENGINE === "0";
  const backend = String(process.env.AGENTIC_EXECUTION_BACKEND || "inprocess");
  const warmPool = truthy(process.env.AGENTIC_K8S_WARM_POOL_ENABLED);
  const ollamaConfigured = Boolean(
    process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE,
  );
  const remoteConfigured = Boolean(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
  );

  const {
    health: engineHealth,
    sessions: reachSessions,
    probeHost,
    engineLatencyMs,
  } = await probeEngineForGraphFn({
    fetchJson,
    engineScheme,
    enginePort,
    configuredHost: engineHost,
  });

  const engineOk = Boolean(engineHealth.ok);
  const engineJson = engineHealth.json || {};
  const sessionList = reachSessions.ok ? reachSessions.sessions || [] : [];
  const hasReachClients = sessionList.length > 0;
  // Prefer live engine capability flags when the web pod env is incomplete.
  const overlaysOn =
    overlaysOnEnv || Boolean(reachSessions.sessionOverlayEnabled);
  const tunnelOn = tunnelOnEnv || Boolean(reachSessions.mcpTunnelEnabled);

  const nowIso = () => new Date().toISOString();

  // Parallel HTTP probes (ollama + speech) — independent of engine.
  const [ollamaProbe, sttProbe, ttsProbe] = await Promise.all([
    probeOllama(fetchJson),
    probeSpeechStt(fetchJson, { enabled: speechOn }),
    probeSpeechTts(fetchJson, { enabled: speechOn }),
  ]);

  const a = buildCatalogs("agents", { toolRoot }) || {};
  const m = buildCatalogs("mcp", { toolRoot }) || {};
  const s = buildCatalogs("skills", { toolRoot }) || {};
  const agentList = a.entries || a.items || (Array.isArray(a) ? a : []);
  const mcpList = m.entries || m.items || (Array.isArray(m) ? m : []);
  const skillList = s.entries || s.items || (Array.isArray(s) ? s : []);
  const agentsProbe = probeCatalogLoad(a, "agent");
  const mcpProbe = probeCatalogLoad(m, "MCP");
  const skillsProbe = probeCatalogLoad(s, "skill");
  // Prefer engine warm-catalog signal for agents when available.
  if (engineOk && engineJson.catalogs && typeof engineJson.catalogs === "object") {
    const warm = engineJson.catalogs;
    if (warm.ok === false) {
      agentsProbe.ok = false;
      agentsProbe.status = "failed";
      agentsProbe.reason = warm.error || "engine warm agent catalog failed";
    } else if (warm.ok === true && warm.agentProviders != null) {
      agentsProbe.ok = true;
      agentsProbe.status = Number(warm.agentProviders) > 0 ? "healthy" : "degraded";
      agentsProbe.count = Number(warm.agentProviders);
      agentsProbe.reason = `engine warm · ${warm.agentProviders} providers`;
    }
  }

  const plannerProbe = probePlannerFromEngine(engineHealth);
  const backendsProbe = probeModelBackends({
    ollama: ollamaProbe,
    remoteConfigured,
  });
  const storageProbe = probeStorageGpu(engineHealth);

  const nodes = [];
  const edges = [];
  const notes = [];

  const appGroups = groupSessionsByAppId(sessionList);
  const totalTunnels = sessionList.reduce((n, s) => n + (s.tunnelMcpCount || 0), 0);
  const webAssign = getWebAssignment(toolRoot);
  const chatAssign = getChatAssignment(toolRoot);
  const reservedAppIds = new Set([WEB_UI_APP_ID, CHAT_UI_APP_ID]);
  const webApiSummaries = summarizeWebApiApps(toolRoot);
  const webApiById = new Map(webApiSummaries.map((a) => [a.appId, a]));

  function webApiIpHint(appId) {
    const s = webApiById.get(appId);
    if (!s?.clientIpCount) return "";
    return ` · ${s.clientIpCount} IP${s.clientIpCount === 1 ? "" : "s"}`;
  }

  // First-party Web UIs — Application band / Web API family (bypass Reach).
  nodes.push(
    node({
      id: `app/${WEB_UI_APP_ID}`,
      kind: "ao-web",
      band: "application",
      appGroup: "web-api",
      appId: WEB_UI_APP_ID,
      label: WEB_UI_APP_ID,
      sublabel: `Admin · bypass web${webApiIpHint(WEB_UI_APP_ID)}`,
      status: webAssign ? "healthy" : "degraded",
      instrumented: Boolean(webAssign),
      deployed: true,
      clientIpCount: webApiById.get(WEB_UI_APP_ID)?.clientIpCount || 0,
      statusReason: webAssign
        ? "First-party Admin SPA (/admin) → Web UI with ao-web token assigned"
        : "Admin SPA (/admin) served by Web UI; mint ao-web on Access to assign API token",
    }),
  );
  nodes.push(
    node({
      id: `app/${CHAT_UI_APP_ID}`,
      kind: "ao-chat",
      band: "application",
      appGroup: "web-api",
      appId: CHAT_UI_APP_ID,
      label: CHAT_UI_APP_ID,
      sublabel: `Chat · bypass web${webApiIpHint(CHAT_UI_APP_ID)}`,
      status: chatAssign ? "healthy" : "degraded",
      instrumented: Boolean(chatAssign),
      deployed: true,
      clientIpCount: webApiById.get(CHAT_UI_APP_ID)?.clientIpCount || 0,
      statusReason: chatAssign
        ? "First-party chat UI (/) → Web UI with ao-chat token assigned"
        : "Chat UI (/) served by Web UI; mint ao-chat on Access to assign API token",
    }),
  );

  // External minted API clients (KnowBuddy, home-assistant, …) — one node per appId.
  for (const app of webApiSummaries) {
    if (isFirstPartyUiAppId(app.appId)) continue;
    const nTok = app.tokenCount;
    const ipN = app.clientIpCount;
    nodes.push(
      node({
        id: `app/${app.appId}`,
        kind: "web-api-client",
        band: "application",
        appGroup: "web-api",
        appId: app.appId,
        label: app.appId,
        sublabel: [
          app.label || "API token",
          `${nTok} token${nTok === 1 ? "" : "s"}`,
          ipN ? `${ipN} IP${ipN === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: app.recent ? "healthy" : app.lastUsedAt ? "degraded" : "healthy",
        instrumented: Boolean(app.lastUsedAt),
        deployed: true,
        count: nTok,
        clientIpCount: ipN,
        statusReason: app.lastUsedAt
          ? `Last API call ${app.lastUsedAt}${app.lastUsedIp ? ` from ${app.lastUsedIp}` : ""}`
          : "Active Access token(s); no API usage recorded yet",
      }),
    );
  }

  // —— Application + Reach bands (Reach always when engine is up) ——
  if (!engineOk) {
    notes.push(
      "Engine unreachable — Reach band empty; first-party Web UIs (ao-web / ao-chat) still shown",
    );
  } else {
    const openclawHint = sessionList.some((s) =>
      String(s.sessionId || "").toLowerCase().includes("openclaw"),
    );

    if (!hasReachClients) {
      notes.push(
        "No connected Reach clients — Reach apps group hidden until a client registers",
      );
    } else {
      for (const g of appGroups) {
        if (reservedAppIds.has(g.appId)) continue;
        const parentId = `app/${g.appId}`;
        const nInst = g.instanceCount;
        const ipN = g.clientIpCount || 0;
        const ipHint = ipN ? ` · ${ipN} IP${ipN === 1 ? "" : "s"}` : "";
        const ipList = Array.isArray(g.clientIps) ? g.clientIps : [];
        nodes.push(
          node({
            id: parentId,
            kind: "app",
            band: "application",
            appGroup: "reach",
            label: g.appId,
            sublabel: `${nInst} instance${nInst === 1 ? "" : "s"}${ipHint}`,
            status: "healthy",
            instrumented: true,
            deployed: true,
            appId: g.appId,
            instanceCount: nInst,
            count: nInst,
            clientIpCount: ipN,
            clientIps: ipList,
            statusReason: `${nInst} Reach session${nInst === 1 ? "" : "s"} advertising appId=${g.appId}${
              ipList.length ? ` from ${ipList.join(", ")}` : ""
            }`,
          }),
        );
        nodes.push(
          node({
            id: `${parentId}/ui`,
            kind: "ui",
            band: "application",
            appGroup: "reach",
            label: "Client UI",
            sublabel: `${nInst} session${nInst === 1 ? "" : "s"}`,
            status: "healthy",
            instrumented: true,
            deployed: true,
            parent: parentId,
            appId: g.appId,
            ownedByApps: [g.appId],
            statusReason: "Derived from Reach session registry",
          }),
        );
        const stockN = (g.allowedAgentProviderIds || []).length;
        const overlaySublabel =
          stockN > 0
            ? `${g.agentCount} client.* · ${stockN} stock`
            : `${g.agentCount} client.*`;
        nodes.push(
          node({
            id: `${parentId}/overlays`,
            kind: "overlay-source",
            band: "application",
            appGroup: "reach",
            label: "Domain overlays",
            sublabel: overlaySublabel,
            status: g.agentCount > 0 || stockN > 0 ? "healthy" : "offline",
            instrumented: true,
            deployed: g.agentCount > 0 || stockN > 0,
            parent: parentId,
            appId: g.appId,
            ownedByApps: [g.appId],
            statusReason:
              stockN > 0
                ? `client.* overlays plus ${stockN} allowlisted stock agent${stockN === 1 ? "" : "s"}`
                : "Reach client.* overlay agents for this app",
          }),
        );
        nodes.push(
          node({
            id: `${parentId}/local-tools`,
            kind: "local-tools",
            band: "application",
            appGroup: "reach",
            label: "Local tools",
            sublabel: `${g.tunnelMcpCount || g.mcpCount} MCP`,
            status: g.mcpCount > 0 ? "healthy" : "offline",
            instrumented: true,
            deployed: g.mcpCount > 0,
            parent: parentId,
            appId: g.appId,
            ownedByApps: [g.appId],
          }),
        );

        edges.push(
          edge({
            id: `${parentId}/ui->reach/session-bridge`,
            from: `${parentId}/ui`,
            to: "reach/session-bridge",
            kind: "request",
            protocol: "https",
          }),
        );
        edges.push(
          edge({
            id: `${parentId}/overlays->reach/overlay-packer`,
            from: `${parentId}/overlays`,
            to: "reach/overlay-packer",
            kind: "request",
          }),
        );
        edges.push(
          edge({
            id: `${parentId}/local-tools->reach/local-mcp-host`,
            from: `${parentId}/local-tools`,
            to: "reach/local-mcp-host",
            kind: "request",
          }),
        );
      }
    }

    // OpenClaw presence hint when no minted openclaw API token already created a node.
    if (!nodes.some((n) => n.id === "app/openclaw")) {
      nodes.push(
        node({
          id: "app/openclaw",
          kind: "openclaw",
          band: "application",
          appGroup: "web-api",
          appId: "openclaw",
          label: "OpenClaw",
          sublabel: "bypass web",
          status: openclawHint ? "healthy" : "offline",
          instrumented: false,
          deployed: openclawHint,
          statusReason: openclawHint
            ? "Session id suggests OpenClaw"
            : "Not detected from Reach sessions (may use web API only)",
        }),
      );
    }

    // —— Reach band (always when engine reachable) ——
    nodes.push(
      node({
        id: "reach/session-bridge",
        kind: "session-bridge",
        band: "reach",
        label: "SessionBridge",
        sublabel: hasReachClients ? "ao_reach" : "idle",
        status: "healthy",
        instrumented: true,
        deployed: true,
        statusReason: hasReachClients
          ? `${sessionList.length} active Reach session${sessionList.length === 1 ? "" : "s"}`
          : "Engine up · no Reach sessions (idle)",
      }),
    );
    nodes.push(
      node({
        id: "reach/overlay-packer",
        kind: "overlay-packer",
        band: "reach",
        label: "OverlayPacker",
        sublabel: overlaysOn ? "enabled" : "off",
        status: overlaysOn && engineOk ? "healthy" : overlaysOn ? "failed" : "offline",
        instrumented: overlaysOn,
        deployed: overlaysOn,
        statusReason: overlaysOn
          ? engineOk
            ? "session overlay enabled (engine)"
            : "overlay enabled but engine down"
          : "session overlay disabled",
        lastProbeAt: overlaysOn ? nowIso() : undefined,
      }),
    );
    nodes.push(
      node({
        id: "reach/local-mcp-host",
        kind: "local-mcp-host",
        band: "reach",
        label: "LocalMcpHost",
        sublabel: tunnelOn ? "tunnel" : "off",
        status:
          tunnelOn && engineOk
            ? totalTunnels > 0
              ? "healthy"
              : "degraded"
            : tunnelOn
              ? "failed"
              : "offline",
        instrumented: tunnelOn,
        deployed: tunnelOn,
        statusReason: tunnelOn
          ? engineOk
            ? totalTunnels > 0
              ? `${totalTunnels} tunnel MCP(s) across sessions`
              : "MCP tunnel enabled — no active tunnel MCPs yet"
            : "tunnel enabled but engine down"
          : "MCP tunnel disabled",
        lastProbeAt: tunnelOn ? nowIso() : undefined,
      }),
    );
    const speechNegotiated = Boolean(reachSessions.speechEnabled) || speechOn;
    const speechClientOk =
      speechNegotiated &&
      ((sttProbe.configured && sttProbe.ok) || (ttsProbe.configured && ttsProbe.ok));
    const speechClientFailed =
      speechNegotiated &&
      sttProbe.configured &&
      ttsProbe.configured &&
      !sttProbe.ok &&
      !ttsProbe.ok;
    nodes.push(
      node({
        id: "reach/speech-client",
        kind: "speech-client",
        band: "reach",
        label: "SpeechClient",
        sublabel: speechNegotiated ? "STT/TTS" : "off",
        status: speechNegotiated
          ? speechClientFailed
            ? "failed"
            : speechClientOk
              ? "healthy"
              : "degraded"
          : "offline",
        instrumented: speechNegotiated && (sttProbe.configured || ttsProbe.configured),
        deployed: speechNegotiated,
        statusReason: speechNegotiated
          ? `STT ${sttProbe.ok ? "ok" : "down"} · TTS ${ttsProbe.ok ? "ok" : "down"}`
          : "speech not negotiated",
        lastProbeAt: speechNegotiated ? nowIso() : undefined,
      }),
    );
    const mtlsOn = Boolean(reachSessions.mtlsRequired) || Boolean(engineJson.mtls);
    nodes.push(
      node({
        id: "reach/mtls-enroller",
        kind: "mtls-enroller",
        band: "reach",
        label: "MtlsEnroller",
        sublabel: mtlsOn ? "mTLS" : "optional",
        status: mtlsOn && engineOk ? "healthy" : mtlsOn ? "failed" : "offline",
        instrumented: mtlsOn,
        deployed: mtlsOn,
        statusReason: mtlsOn
          ? engineOk
            ? "mTLS material reported by engine /health"
            : "mTLS expected but engine down"
          : "mTLS not required",
        lastProbeAt: mtlsOn ? nowIso() : undefined,
      }),
    );

    edges.push(
      edge({
        id: "reach/session-bridge->reach/overlay-packer",
        from: "reach/session-bridge",
        to: "reach/overlay-packer",
        kind: "request",
      }),
    );
    edges.push(
      edge({
        id: "reach/session-bridge->reach/local-mcp-host",
        from: "reach/session-bridge",
        to: "reach/local-mcp-host",
        kind: "request",
      }),
    );
    if (speechNegotiated) {
      edges.push(
        edge({
          id: "reach/session-bridge->reach/speech-client",
          from: "reach/session-bridge",
          to: "reach/speech-client",
          kind: "request",
        }),
      );
    }
  }

  // —— AO band ——
  const engineStatus = engineOk
    ? "healthy"
    : engineDisabled
      ? "offline"
      : "failed";
  nodes.push(
    node({
      id: "engine",
      kind: "engine",
      band: "ao",
      label: "Engine :8765",
      sublabel: engineOk
        ? `v${engineJson.version || "?"}`
        : engineDisabled
          ? "not deployed"
          : "down",
      status: engineDisabled && !engineOk ? "offline" : engineStatus,
      instrumented: true,
      deployed: !engineDisabled,
      statusReason: engineOk
        ? `reachable via ${probeHost || "engine"}`
        : engineHealth.error || `HTTP ${engineHealth.status || "down"}`,
      lastProbeAt: new Date().toISOString(),
    }),
  );

  const endpointDefs = [
    {
      id: "engine/session-overlay",
      kind: "endpoint",
      label: "session_overlay",
      deployed: overlaysOn,
      detail: "session overlay flag from engine",
    },
    {
      id: "engine/mcp-tunnel",
      kind: "endpoint",
      label: "mcp_tunnel",
      deployed: tunnelOn,
      detail: "MCP tunnel flag from engine",
    },
    {
      id: "engine/direct-agent",
      kind: "endpoint",
      label: "direct_agent",
      deployed: true,
      detail: "direct_agent path via engine serve",
    },
    {
      id: "engine/hello-speech",
      kind: "endpoint",
      label: "hello.speech",
      deployed: speechOn,
      detail: "speech advertisement enabled",
    },
    {
      id: "engine/mtls-enrol",
      kind: "endpoint",
      label: "mTLS enrol",
      deployed: Boolean(engineJson.mtls) || engineTls,
      detail: "mTLS enroll from engine /health",
    },
  ];
  for (const ep of endpointDefs) {
    const epProbe = probeEngineEndpoint({
      engineOk,
      deployed: ep.deployed,
      label: ep.label,
      detail: ep.detail,
    });
    nodes.push(
      node({
        id: ep.id,
        kind: ep.kind,
        band: "ao",
        label: ep.label,
        sublabel: epProbe.sublabel,
        status: epProbe.status,
        instrumented: epProbe.instrumented,
        deployed: ep.deployed,
        parent: "engine",
        statusReason: epProbe.reason,
        lastProbeAt: epProbe.instrumented ? nowIso() : undefined,
      }),
    );
    if (ep.deployed) {
      edges.push(
        edge({
          id: `engine->${ep.id}`,
          from: "engine",
          to: ep.id,
          kind: "request",
        }),
      );
    }
  }

  nodes.push(
    node({
      id: "web-ui",
      kind: "web-ui",
      band: "ao",
      label: "Web UI :30487",
      sublabel: `pid ${webPid}`,
      status: "healthy",
      instrumented: true,
      statusReason: `instance ${webInstanceId}`,
    }),
  );

  nodes.push(
    node({
      id: "planner",
      kind: "planner",
      band: "ao",
      label: "Planner/Runner",
      sublabel: "CrewAI",
      status: plannerProbe.status,
      instrumented: plannerProbe.instrumented,
      statusReason: plannerProbe.reason,
      lastProbeAt: plannerProbe.instrumented ? nowIso() : undefined,
    }),
  );

  const agentBd = catalogBreakdown(agentList);
  nodes.push(
    node({
      id: "catalog/agents",
      kind: "catalog",
      band: "ao",
      label: "Agents",
      sublabel: `${agentsProbe.count ?? agentList.length} providers`,
      status: agentsProbe.status,
      instrumented: agentsProbe.instrumented,
      count: agentsProbe.count ?? agentList.length,
      breakdown: agentBd,
      statusReason: agentsProbe.reason,
      lastProbeAt: agentsProbe.instrumented ? nowIso() : undefined,
    }),
  );
  nodes.push(
    node({
      id: "catalog/mcp",
      kind: "catalog",
      band: "ao",
      label: "MCP servers",
      sublabel: `${mcpProbe.count ?? mcpList.length} providers`,
      status: mcpProbe.status,
      instrumented: mcpProbe.instrumented,
      count: mcpProbe.count ?? mcpList.length,
      breakdown: catalogBreakdown(mcpList),
      statusReason: mcpProbe.reason,
      lastProbeAt: mcpProbe.instrumented ? nowIso() : undefined,
    }),
  );
  nodes.push(
    node({
      id: "catalog/skills",
      kind: "catalog",
      band: "ao",
      label: "Skills",
      sublabel: `${skillsProbe.count ?? skillList.length} skills`,
      status: skillsProbe.status,
      instrumented: skillsProbe.instrumented,
      count: skillsProbe.count ?? skillList.length,
      breakdown: catalogBreakdown(skillList),
      statusReason: skillsProbe.reason,
      lastProbeAt: skillsProbe.instrumented ? nowIso() : undefined,
    }),
  );

  nodes.push(
    node({
      id: "models/backends",
      kind: "model-backend",
      band: "ao",
      label: "Model backends",
      sublabel: "providers",
      status: backendsProbe.status,
      instrumented: backendsProbe.instrumented,
      statusReason: backendsProbe.reason,
      lastProbeAt: backendsProbe.instrumented ? nowIso() : undefined,
    }),
  );
  nodes.push(
    node({
      id: "models/ollama",
      kind: "model-runtime",
      band: "ao",
      label: "Ollama",
      sublabel: ollamaProbe.configured
        ? ollamaProbe.ok
          ? ollamaProbe.modelCount != null
            ? `${ollamaProbe.modelCount} models`
            : "local"
          : "down"
        : "unset",
      status: ollamaProbe.configured
        ? ollamaProbe.ok
          ? "healthy"
          : "failed"
        : "offline",
      instrumented: ollamaProbe.configured,
      deployed: ollamaProbe.configured,
      statusReason: ollamaProbe.reason,
      lastProbeAt: ollamaProbe.configured ? nowIso() : undefined,
    }),
  );
  nodes.push(
    node({
      id: "models/remote",
      kind: "model-runtime",
      band: "ao",
      label: "Remote LLMs",
      sublabel: remoteConfigured ? "keys set" : "unset",
      status: remoteConfigured ? "healthy" : "offline",
      instrumented: false,
      deployed: remoteConfigured,
      statusReason: remoteConfigured
        ? "API keys present — remote providers are not health-probed"
        : "no remote API keys configured",
    }),
  );

  // Live k8s inventory when running in-cluster (pod SA).
  const k8sProbe = await probeK8sTopology();
  const useK8sBand =
    backend === "kubernetes" || warmPool || k8sProbe.reachable;
  const workerWorkloads = (k8sProbe.workloads || []).filter(
    (w) => w.group === "workers",
  );
  const sidecarWorkloads = (k8sProbe.workloads || []).filter(
    (w) => w.group === "sidecars",
  );
  const platformWorkloads = (k8sProbe.workloads || []).filter(
    (w) => w.group === "platform" || w.group === "workers" || w.group === "sidecars",
  );

  if (useK8sBand) {
    const workerPods = k8sProbe.totals?.workers || 0;
    const workerReady = workerWorkloads.reduce((n, w) => n + (w.ready || 0), 0);
    const workerStatus =
      workerWorkloads.find((w) => w.status === "failed")?.status ||
      workerWorkloads.find((w) => w.status === "degraded")?.status ||
      workerWorkloads.find((w) => w.status === "starting")?.status ||
      (workerPods ? "healthy" : "offline");
    nodes.push(
      node({
        id: "workers/cluster",
        kind: "worker",
        band: "ao",
        label: "Workers",
        sublabel: k8sProbe.reachable
          ? `${workerReady}/${workerPods} ready`
          : warmPool
            ? "warm pool"
            : "k8s",
        status: k8sProbe.reachable ? workerStatus : "offline",
        instrumented: k8sProbe.reachable,
        count: workerPods,
        breakdown: {
          ready: workerReady,
          pods: workerPods,
        },
        statusReason: k8sProbe.reachable
          ? workerPods
            ? undefined
            : "no worker pods currently"
          : k8sProbe.note || "k8s not reachable from web process",
        lastProbeAt: k8sProbe.probedAt,
      }),
    );

    const sidecarPods = k8sProbe.totals?.sidecars || 0;
    const sidecarReady = sidecarWorkloads.reduce((n, w) => n + (w.ready || 0), 0);
    const sidecarDeployed = sidecarPods > 0;
    nodes.push(
      node({
        id: "sidecars/cluster",
        kind: "mcp-sidecar",
        band: "ao",
        label: "MCP sidecars",
        sublabel: k8sProbe.reachable
          ? sidecarDeployed
            ? `${sidecarReady}/${sidecarPods} ready`
            : "none"
          : "k8s",
        status: sidecarDeployed
          ? sidecarWorkloads.some((w) => w.status === "failed")
            ? "failed"
            : sidecarWorkloads.some((w) => w.status === "degraded")
              ? "degraded"
              : "healthy"
          : "offline",
        instrumented: k8sProbe.reachable && sidecarDeployed,
        deployed: sidecarDeployed || !k8sProbe.reachable,
        count: sidecarPods,
        statusReason: k8sProbe.reachable
          ? sidecarDeployed
            ? undefined
            : "no MCP gateway pods"
          : k8sProbe.note || "k8s not reachable",
        lastProbeAt: k8sProbe.probedAt,
      }),
    );
  }

  const platformPodCount = platformWorkloads
    .filter((w) => w.deployed)
    .reduce((n, w) => n + w.count, 0);
  const platformReady = platformWorkloads.reduce((n, w) => n + (w.ready || 0), 0);
  const platformStatus =
    platformWorkloads.find((w) => w.deployed && w.status === "failed")?.status ||
    platformWorkloads.find((w) => w.deployed && w.status === "degraded")?.status ||
    platformWorkloads.find((w) => w.deployed && w.status === "starting")?.status ||
    (platformPodCount ? "healthy" : "offline");

  nodes.push(
    node({
      id: "platform/k3s",
      kind: "platform",
      band: "ao",
      label: "Kubernetes",
      sublabel: k8sProbe.reachable
        ? `${platformReady}/${platformPodCount} pods · ${k8sProbe.totals?.nodes || 0} nodes · ${k8sProbe.namespace || "ns"}`
        : process.env.AGENTIC_EDGE_PLATFORM || "local",
      status: k8sProbe.reachable ? platformStatus : "offline",
      instrumented: k8sProbe.reachable,
      expandable:
        k8sProbe.reachable &&
        ((k8sProbe.clusterNodes || []).length > 0 ||
          platformWorkloads.some((w) => w.deployed)),
      clusterKind: "k8s",
      count: platformPodCount,
      breakdown: {
        ready: platformReady,
        workloads: platformWorkloads.filter((w) => w.deployed).length,
        nodes: k8sProbe.totals?.nodes || 0,
        services: k8sProbe.totals?.services || 0,
      },
      statusReason: k8sProbe.reachable
        ? undefined
        : k8sProbe.note || "not in-cluster — expand unavailable",
      lastProbeAt: k8sProbe.probedAt,
      k8s: {
        namespace: k8sProbe.namespace,
        reachable: k8sProbe.reachable,
        probedAt: k8sProbe.probedAt,
      },
    }),
  );

  // Nested cluster topology: nodes → pods, services → pods (network paths).
  if (k8sProbe.reachable) {
    for (const cn of k8sProbe.clusterNodes || []) {
      const addr =
        cn.internalIP || cn.hostIP || cn.externalIP || null;
      nodes.push(
        node({
          id: cn.id,
          kind: "k8s-node",
          band: "ao",
          label: cn.label || cn.name,
          sublabel: addr
            ? `${cn.readyPods || 0}/${cn.count || 0} pods · ${addr}`
            : `${cn.readyPods || 0}/${cn.count || 0} pods`,
          status: cn.status || "offline",
          statusReason: cn.statusReason,
          instrumented: true,
          deployed: true,
          parent: "platform/k3s",
          count: cn.count,
          lastProbeAt: k8sProbe.probedAt,
          addresses: {
            internalIP: cn.internalIP || null,
            hostIP: cn.hostIP || null,
            externalIP: cn.externalIP || null,
          },
          k8sResource: {
            name: cn.name,
            role: "node",
            group: "nodes",
            pods: cn.pods || [],
          },
        }),
      );
      edges.push(
        edge({
          id: `platform/k3s->${cn.id}`,
          from: "platform/k3s",
          to: cn.id,
          kind: "request",
          protocol: "k8s",
          instrumented: false,
          status: "idle",
        }),
      );

      for (const p of cn.pods || []) {
        const podId = `k8s/pod/${p.name}`;
        const wl = p.workloadName ? String(p.workloadName).replace(/^agentic-/, "") : "";
        nodes.push(
          node({
            id: podId,
            kind: "k8s-pod",
            band: "ao",
            label: p.name,
            sublabel: [p.podIP, wl, p.phase].filter(Boolean).join(" · "),
            status: p.ready
              ? "healthy"
              : p.phase === "Pending"
                ? "starting"
                : p.phase === "Failed"
                  ? "failed"
                  : "degraded",
            statusReason: `${p.phase}${p.podIP ? ` · pod ${p.podIP}` : ""}${
              p.hostIP ? ` · host ${p.hostIP}` : ""
            }`,
            instrumented: true,
            deployed: true,
            parent: cn.id,
            lastProbeAt: k8sProbe.probedAt,
            addresses: {
              podIP: p.podIP || null,
              hostIP: p.hostIP || null,
              nodeName: p.nodeName || cn.name,
            },
            k8sResource: {
              name: p.name,
              role: "pod",
              group: "pods",
              workloadName: p.workloadName || null,
              pods: [p],
            },
          }),
        );
        edges.push(
          edge({
            id: `${cn.id}->${podId}`,
            from: cn.id,
            to: podId,
            kind: "request",
            protocol: "k8s",
            instrumented: false,
            status: "idle",
          }),
        );
      }
    }

    for (const svc of k8sProbe.services || []) {
      const svcId = `k8s/svc/${svc.name}`;
      const portHint = svc.ports?.[0]
        ? `:${svc.ports[0].port}`
        : "";
      nodes.push(
        node({
          id: svcId,
          kind: "k8s-service",
          band: "ao",
          label: svc.name.replace(/^agentic-/, ""),
          sublabel: svc.clusterIP
            ? `${svc.clusterIP}${portHint}`
            : `${svc.type}${portHint}`,
          status: (svc.endpointPods || []).length ? "healthy" : "offline",
          statusReason: `${svc.type} · ${(svc.endpointPods || []).length} endpoint(s)`,
          instrumented: true,
          deployed: true,
          parent: "platform/k3s",
          lastProbeAt: k8sProbe.probedAt,
          addresses: {
            clusterIP: svc.clusterIP || null,
          },
          k8sResource: {
            name: svc.name,
            role: "service",
            group: "services",
            ports: svc.ports,
            endpointPods: svc.endpointPods,
          },
        }),
      );
      edges.push(
        edge({
          id: `platform/k3s->${svcId}`,
          from: "platform/k3s",
          to: svcId,
          kind: "request",
          protocol: "k8s",
          instrumented: false,
          status: "idle",
        }),
      );
    }

    for (const path of k8sProbe.networkPaths || []) {
      edges.push(
        edge({
          id: path.id,
          from: path.from,
          to: path.to,
          kind: path.kind || "request",
          protocol: path.protocol || "tcp",
          port: path.port,
          instrumented: true,
          status: "healthy",
        }),
      );
    }

    // Keep workload summaries for logs/detail when node inventory is empty.
    if (!(k8sProbe.clusterNodes || []).length) {
      for (const w of platformWorkloads) {
        if (!w.deployed && w.role !== "worker" && w.role !== "mcp-sidecar") {
          if (!["coordinator", "engine", "broker"].includes(w.role)) continue;
        }
        nodes.push(
          node({
            id: w.id,
            kind: "k8s-workload",
            band: "ao",
            label: w.label,
            sublabel: w.deployed
              ? `${w.ready}/${w.count} ready`
              : "not deployed",
            status: w.deployed ? w.status : "offline",
            statusReason: w.statusReason,
            instrumented: w.instrumented && w.deployed,
            deployed: w.deployed,
            parent: "platform/k3s",
            count: w.count,
            lastProbeAt: k8sProbe.probedAt,
            k8sResource: {
              name: w.name,
              role: w.role,
              group: w.group,
              logSource: w.logSource,
              pods: w.pods,
            },
          }),
        );
        edges.push(
          edge({
            id: `platform/k3s->${w.id}`,
            from: "platform/k3s",
            to: w.id,
            kind: "request",
            protocol: "k8s",
            instrumented: false,
            status: "idle",
          }),
        );
      }
    }
  }

  nodes.push(
    node({
      id: "platform/storage",
      kind: "storage",
      band: "ao",
      label: "PVCs / GPU",
      sublabel: storageProbe.sublabel || "weights",
      status: storageProbe.status,
      instrumented: storageProbe.instrumented,
      statusReason: storageProbe.reason,
      lastProbeAt: storageProbe.instrumented ? nowIso() : undefined,
    }),
  );

  // Speech sidecars when enabled
  if (speechOn) {
    nodes.push(
      node({
        id: "speech/stt",
        kind: "endpoint",
        band: "ao",
        label: "STT :8090",
        sublabel: sttProbe.ok ? "whisper" : "down",
        status: sttProbe.ok ? "healthy" : "failed",
        instrumented: sttProbe.configured,
        deployed: true,
        statusReason: sttProbe.reason,
        lastProbeAt: sttProbe.configured ? nowIso() : undefined,
      }),
    );
    nodes.push(
      node({
        id: "speech/tts",
        kind: "endpoint",
        band: "ao",
        label: "TTS :8091",
        sublabel: ttsProbe.ok ? "piper" : "down",
        status: ttsProbe.ok ? "healthy" : "failed",
        instrumented: ttsProbe.configured,
        deployed: true,
        statusReason: ttsProbe.reason,
        lastProbeAt: ttsProbe.configured ? nowIso() : undefined,
      }),
    );
  }

  // Execution backend — after workers known.
  {
    const workerPodsEarly = k8sProbe.totals?.workers || 0;
    const workerWorkloadsEarly = (k8sProbe.workloads || []).filter(
      (w) => w.group === "workers",
    );
    const workerStatusEarly =
      workerWorkloadsEarly.find((w) => w.status === "failed")?.status ||
      workerWorkloadsEarly.find((w) => w.status === "degraded")?.status ||
      workerWorkloadsEarly.find((w) => w.status === "starting")?.status ||
      (workerPodsEarly ? "healthy" : "offline");
    const execProbe = probeExecutionBackend({
      backend,
      engineOk,
      k8sReachable: k8sProbe.reachable,
      workerStatus: workerStatusEarly,
      workerPods: workerPodsEarly,
    });
    nodes.push(
      node({
        id: "execution",
        kind: "execution-backend",
        band: "ao",
        label: "Backends",
        sublabel: backend,
        status: execProbe.status,
        instrumented: execProbe.instrumented,
        statusReason: execProbe.reason,
        lastProbeAt: execProbe.instrumented ? nowIso() : undefined,
      }),
    );
  }

  // —— AO edges (Reach → Engine whenever engine is up) ——
  if (engineOk) {
    edges.push(
      edge({
        id: "reach/session-bridge->engine",
        from: "reach/session-bridge",
        to: "engine",
        kind: "stream",
        protocol: "wss",
        port: enginePort,
      }),
    );
    if (overlaysOn) {
      edges.push(
        edge({
          id: "reach/overlay-packer->engine/session-overlay",
          from: "reach/overlay-packer",
          to: "engine/session-overlay",
          kind: "request",
        }),
      );
    }
    if (tunnelOn) {
      edges.push(
        edge({
          id: "engine/mcp-tunnel->reach/local-mcp-host",
          from: "engine/mcp-tunnel",
          to: "reach/local-mcp-host",
          kind: "reverse-tunnel",
          protocol: "wss",
        }),
      );
    }
    if (speechOn) {
      edges.push(
        edge({
          id: "engine/hello-speech->speech/stt",
          from: "engine/hello-speech",
          to: "speech/stt",
          kind: "advertisement",
        }),
      );
      edges.push(
        edge({
          id: "reach/speech-client->speech/stt",
          from: "reach/speech-client",
          to: "speech/stt",
          kind: "stream",
          protocol: "http",
        }),
      );
      edges.push(
        edge({
          id: "reach/speech-client->speech/tts",
          from: "reach/speech-client",
          to: "speech/tts",
          kind: "stream",
          protocol: "http",
        }),
      );
    }
  }

  // Bypass paths → Web UI (Web API family; skip Reach / engine)
  for (const n of nodes) {
    if (n.appGroup !== "web-api" || n.deployed === false) continue;
    edges.push(
      edge({
        id: `${n.id}->web-ui`,
        from: n.id,
        to: "web-ui",
        kind: "bypass",
        protocol: "https",
        port: webPort,
      }),
    );
  }

  edges.push(
    edge({ id: "engine->planner", from: "engine", to: "planner", kind: "request" }),
  );
  edges.push(
    edge({ id: "web-ui->planner", from: "web-ui", to: "planner", kind: "request" }),
  );
  edges.push(
    edge({
      id: "planner->catalog/agents",
      from: "planner",
      to: "catalog/agents",
      kind: "request",
    }),
  );
  edges.push(
    edge({
      id: "catalog/agents->models/backends",
      from: "catalog/agents",
      to: "models/backends",
      kind: "request",
    }),
  );
  if (ollamaConfigured) {
    edges.push(
      edge({
        id: "models/backends->models/ollama",
        from: "models/backends",
        to: "models/ollama",
        kind: "request",
      }),
    );
  }
  if (remoteConfigured) {
    edges.push(
      edge({
        id: "models/backends->models/remote",
        from: "models/backends",
        to: "models/remote",
        kind: "request",
      }),
    );
  }
  edges.push(
    edge({
      id: "planner->execution",
      from: "planner",
      to: "execution",
      kind: "request",
    }),
  );
  if (nodes.some((n) => n.id === "workers/cluster")) {
    edges.push(
      edge({
        id: "execution->workers/cluster",
        from: "execution",
        to: "workers/cluster",
        kind: "request",
      }),
    );
  }
  edges.push(
    edge({
      id: "execution->platform/k3s",
      from: "execution",
      to: "platform/k3s",
      kind: "request",
    }),
  );
  edges.push(
    edge({
      id: "platform/k3s->platform/storage",
      from: "platform/k3s",
      to: "platform/storage",
      kind: "request",
    }),
  );

  const nodeProbes = new Set(["engine", "web-ui"]);
  if (k8sProbe.reachable) nodeProbes.add("k8s");
  if (ollamaProbe.configured) nodeProbes.add("ollama");
  if (sttProbe.configured) nodeProbes.add("speech-stt");
  if (ttsProbe.configured) nodeProbes.add("speech-tts");
  if (plannerProbe.instrumented) nodeProbes.add("planner");
  if (agentsProbe.instrumented) nodeProbes.add("catalog-agents");
  if (mcpProbe.instrumented) nodeProbes.add("catalog-mcp");
  if (skillsProbe.instrumented) nodeProbes.add("catalog-skills");
  if (backendsProbe.instrumented) nodeProbes.add("model-backends");
  if (storageProbe.instrumented) nodeProbes.add("storage");
  nodeProbes.add("execution");
  nodeProbes.add("engine-endpoints");
  // Remote LLMs intentionally omitted — no health probe.

  const capabilities = {
    edgeMetrics: [],
    nodeProbes: [...nodeProbes],
    historyWindow: "15m",
    sources: {
      web: { reachable: true, role: "coordinator" },
      engine: {
        reachable: engineOk,
        role: "daemon",
        probeHost: probeHost || null,
        latencyMs: engineLatencyMs,
      },
      k8s: {
        reachable: k8sProbe.reachable,
        role: "cluster",
        note: k8sProbe.note || undefined,
        namespace: k8sProbe.namespace || undefined,
      },
      ollama: ollamaProbe.configured
        ? {
            reachable: ollamaProbe.ok,
            role: "model-runtime",
            base: ollamaProbe.base || null,
            latencyMs: ollamaProbe.latencyMs,
          }
        : { reachable: false, role: "model-runtime", note: "not configured" },
      speech: speechOn
        ? {
            stt: { reachable: sttProbe.ok, base: sttProbe.base || null },
            tts: { reachable: ttsProbe.ok, base: ttsProbe.base || null },
          }
        : { reachable: false, note: "disabled" },
    },
  };

  const seq = nextSeq();
  const graph = {
    seq,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    capabilities,
    notes,
    meta: {
      webRoot,
      toolRoot,
      environment: process.env.AGENTIC_EDGE_PLATFORM || "local",
      hostname: process.env.HOSTNAME || null,
      engineLatencyMs,
      reachSessions: sessionList,
      ports: {
        web: webPort,
        webNodePort: 30487,
        engine: enginePort,
        engineNodePort: 30765,
      },
    },
  };

  // Per-app overlay member lists for catalog / sidecar / planner modals.
  // "Owned by app" stays only on Application injection children (ui / overlays / local-tools).
  const agentMembers = appMembersFor(appGroups, "agents");
  const mcpMembers = appMembersFor(appGroups, "mcps");
  const skillMembers = appMembersFor(appGroups, "skills");
  setAppMembers(nodes, "catalog/agents", agentMembers);
  setAppMembers(nodes, "catalog/mcp", mcpMembers);
  setAppMembers(nodes, "catalog/skills", skillMembers);
  setAppMembers(nodes, "sidecars/cluster", mcpMembers);
  setAppMembers(nodes, "planner", agentMembers);
  setAppMembers(nodes, "engine/direct-agent", agentMembers);
  // Attach each Reach app's agent list onto its Domain overlays node (click detail).
  for (const g of appGroups) {
    if (reservedAppIds.has(g.appId)) continue;
    const row = agentMembers.find((m) => m.appId === g.appId);
    if (row) setAppMembers(nodes, `app/${g.appId}/overlays`, [row]);
  }

  sealTopologyGraphStatuses(graph);
  ingestTopologySample(graph, {
    engineLatencyMs,
    engineOk,
    sessionCount: sessionList.length,
  });

  return graph;
}

/**
 * Detail payload for node modal.
 */
export async function buildTopologyNodeDetail(id, ctx) {
  const graph = await buildTopologyGraph(ctx);
  const n = (graph.nodes || []).find((x) => x.id === id);
  if (!n) return null;

  const inbound = (graph.edges || []).filter((e) => e.to === id);
  const outbound = (graph.edges || []).filter((e) => e.from === id);
  const toolRoot = ctx?.toolRoot;

  const logSource =
    id === "web-ui" || id === "web"
      ? "web"
      : id.startsWith("engine")
        ? "engine"
        : id.startsWith("workers")
          ? "warm-pool"
          : id.startsWith("k8s/workload/") || id.startsWith("k8s/pod/") || id.startsWith("k8s/node/")
            ? n.k8sResource?.logSource || "web"
            : id === "platform/k3s"
              ? "coordinator"
              : "web";

  const configKeys = [];
  if (id === "engine" || id.startsWith("engine/")) {
    configKeys.push(
      "AGENTIC_SERVE_PORT",
      "AGENTIC_SERVE_SESSION_OVERLAY",
      "AGENTIC_SERVE_MCP_TUNNEL",
      "AGENTIC_SPEECH_ENABLED",
    );
  }
  if (id === "execution" || id.startsWith("workers") || id === "platform/k3s" || id.startsWith("k8s/")) {
    configKeys.push("AGENTIC_EXECUTION_BACKEND", "AGENTIC_K8S_WARM_POOL_ENABLED");
  }
  if (id.startsWith("models/")) {
    configKeys.push("OLLAMA_HOST", "OPENAI_API_KEY", "ANTHROPIC_API_KEY");
  }

  const ownedByApps = uniqueSorted(n.ownedByApps || []);
  const appMembers = Array.isArray(n.appMembers) ? n.appMembers : [];
  const webApiAppId =
    n.appGroup === "web-api"
      ? String(n.appId || String(n.id || "").replace(/^app\//, "")).trim()
      : "";
  let clientIps =
    webApiAppId && toolRoot
      ? listClientIpsForAppId(toolRoot, webApiAppId)
      : undefined;
  if ((!clientIps || !clientIps.length) && Array.isArray(n.clientIps) && n.clientIps.length) {
    clientIps = n.clientIps.map((ip) =>
      typeof ip === "string" ? { ip, lastSeenAt: null, count: 1 } : ip,
    );
  }
  if (
    (!clientIps || !clientIps.length) &&
    n.appGroup === "reach" &&
    n.kind === "app" &&
    n.appId
  ) {
    const sessions = (graph.meta?.reachSessions || []).filter(
      (s) => String(s.appId || "").toLowerCase() === String(n.appId).toLowerCase(),
    );
    const byIp = new Map();
    for (const s of sessions) {
      const ip = String(s.clientIp || "").trim();
      if (!ip) continue;
      byIp.set(ip, (byIp.get(ip) || 0) + 1);
    }
    if (byIp.size) {
      clientIps = [...byIp.entries()].map(([ip, count]) => ({
        ip,
        count,
        lastSeenAt: null,
      }));
    }
  }
  const members =
    id === "platform/k3s" && Array.isArray(graph.nodes)
      ? {
          count: (graph.nodes || []).filter(
            (x) => x.parent === "platform/k3s" && x.deployed !== false,
          ).length,
          breakdown: n.breakdown || null,
          note: n.k8s?.namespace
            ? `namespace ${n.k8s.namespace} — expand the Kubernetes node on the canvas`
            : "expand the Kubernetes node on the canvas",
        }
      : Array.isArray(n.k8sResource?.pods)
        ? {
            count: n.k8sResource.pods.length,
            breakdown: {
              ready: n.k8sResource.pods.filter((p) => p.ready).length,
              restarts: n.k8sResource.pods.reduce(
                (s, p) => s + Number(p.restarts || 0),
                0,
              ),
            },
            note: `role ${n.k8sResource.role || "workload"}`,
            pods: n.k8sResource.pods,
          }
        : n.count != null
          ? {
              count: n.count,
              breakdown: n.breakdown || null,
              note:
                n.kind === "app"
                  ? `${n.count} connected Reach instance${n.count === 1 ? "" : "s"}`
                  : appMembers.length
                    ? "Stock catalog size; Reach session overlays listed by app below"
                    : n.statusReason ||
                      "Member list available via Capabilities catalogs",
            }
          : null;

  return {
    id: n.id,
    node: n,
    inbound,
    outbound,
    logSource,
    configKeys,
    ownedByApps: ownedByApps.length ? ownedByApps : undefined,
    appMembers: appMembers.length ? appMembers : undefined,
    clientIps: clientIps && clientIps.length ? clientIps : undefined,
    k8sResource: n.k8sResource || undefined,
    addresses: n.addresses || undefined,
    probe: {
      lastProbeAt: n.lastProbeAt || null,
      instrumented: n.instrumented,
      status: n.status,
      statusReason: n.statusReason || null,
    },
    members,
    generatedAt: graph.generatedAt || new Date().toISOString(),
  };
}

/** Compare two graphs for delta emission. */
export function diffTopologyGraphs(prev, next) {
  const prevNodes = new Map((prev?.nodes || []).map((n) => [n.id, n]));
  const nextNodes = new Map((next?.nodes || []).map((n) => [n.id, n]));
  const prevEdges = new Map((prev?.edges || []).map((e) => [e.id, e]));
  const nextEdges = new Map((next?.edges || []).map((e) => [e.id, e]));

  const nodesUpserted = [];
  const nodesRemoved = [];
  for (const [id, n] of nextNodes) {
    const p = prevNodes.get(id);
    if (!p || JSON.stringify(p) !== JSON.stringify(n)) nodesUpserted.push(n);
  }
  for (const id of prevNodes.keys()) {
    if (!nextNodes.has(id)) nodesRemoved.push(id);
  }

  const edgesUpserted = [];
  const edgesRemoved = [];
  for (const [id, e] of nextEdges) {
    const p = prevEdges.get(id);
    if (!p || JSON.stringify(p) !== JSON.stringify(e)) edgesUpserted.push(e);
  }
  for (const id of prevEdges.keys()) {
    if (!nextEdges.has(id)) edgesRemoved.push(id);
  }

  const health = (next?.nodes || []).map((n) => ({
    id: n.id,
    status: n.status,
    statusReason: n.statusReason || "",
    lastProbeAt: n.lastProbeAt || null,
  }));

  return { nodesUpserted, nodesRemoved, edgesUpserted, edgesRemoved, health };
}

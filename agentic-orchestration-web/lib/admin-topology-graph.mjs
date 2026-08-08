/**
 * Live Topology graph builder (Admin).
 *
 * Produces the three-band deployment graph consumed by GET /api/v1/admin/topology/graph
 * and the topology_* WebSocket channel. Probe RTT feeds metrics ingestion.
 *
 * Catalog loading is injected via ctx.buildCatalogs to avoid a circular import with admin-api.
 */

import { ingestTopologySample } from "./admin-topology-metrics.mjs";

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
    status: "unknown",
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
    status: "unknown",
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
  const overlaysOn = truthy(process.env.AGENTIC_SERVE_SESSION_OVERLAY);
  const tunnelOn = truthy(process.env.AGENTIC_SERVE_MCP_TUNNEL);
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

  const a = buildCatalogs("agents", { toolRoot }) || {};
  const m = buildCatalogs("mcp", { toolRoot }) || {};
  const s = buildCatalogs("skills", { toolRoot }) || {};
  const agentList = a.entries || a.items || (Array.isArray(a) ? a : []);
  const mcpList = m.entries || m.items || (Array.isArray(m) ? m : []);
  const skillList = s.entries || s.items || (Array.isArray(s) ? s : []);

  const nodes = [];
  const edges = [];
  const notes = [];

  // —— Application band (client-reported via Reach only) ——
  if (!engineOk) {
    notes.push("Engine unreachable — Application and Reach bands empty");
  } else if (!hasReachClients) {
    notes.push("No connected Reach clients");
  } else {
    const totalAgents = sessionList.reduce((n, s) => n + (s.agentCount || 0), 0);
    const totalMcps = sessionList.reduce((n, s) => n + (s.mcpCount || 0), 0);
    const totalTunnels = sessionList.reduce((n, s) => n + (s.tunnelMcpCount || 0), 0);
    const openclawHint = sessionList.some((s) =>
      String(s.sessionId || "").toLowerCase().includes("openclaw"),
    );

    nodes.push(
      node({
        id: "app/ui",
        kind: "ui",
        band: "application",
        label: "Client UI",
        sublabel: `${sessionList.length} session${sessionList.length === 1 ? "" : "s"}`,
        status: "healthy",
        instrumented: true,
        statusReason: "Derived from Reach session registry",
      }),
    );
    nodes.push(
      node({
        id: "app/overlays",
        kind: "overlay-source",
        band: "application",
        label: "Domain overlays",
        sublabel: `${totalAgents} client.*`,
        status: totalAgents > 0 ? "healthy" : "unknown",
        instrumented: true,
        deployed: totalAgents > 0,
      }),
    );
    nodes.push(
      node({
        id: "app/local-tools",
        kind: "local-tools",
        band: "application",
        label: "Local tools",
        sublabel: `${totalTunnels || totalMcps} MCP`,
        status: totalMcps > 0 ? "healthy" : "unknown",
        instrumented: true,
        deployed: totalMcps > 0,
      }),
    );
    nodes.push(
      node({
        id: "app/openclaw",
        kind: "openclaw",
        band: "application",
        label: "OpenClaw",
        sublabel: "bypass web",
        status: openclawHint ? "healthy" : "unknown",
        instrumented: false,
        deployed: openclawHint,
        statusReason: openclawHint
          ? "Session id suggests OpenClaw"
          : "Not detected from Reach sessions (may use web API only)",
      }),
    );

    // —— Reach band ——
    nodes.push(
      node({
        id: "reach/session-bridge",
        kind: "session-bridge",
        band: "reach",
        label: "SessionBridge",
        sublabel: "ao_reach",
        status: "healthy",
        instrumented: true,
      }),
    );
    nodes.push(
      node({
        id: "reach/overlay-packer",
        kind: "overlay-packer",
        band: "reach",
        label: "OverlayPacker",
        sublabel: overlaysOn ? "enabled" : "off",
        status: overlaysOn ? "healthy" : "unknown",
        instrumented: false,
        deployed: overlaysOn,
      }),
    );
    nodes.push(
      node({
        id: "reach/local-mcp-host",
        kind: "local-mcp-host",
        band: "reach",
        label: "LocalMcpHost",
        sublabel: tunnelOn ? "tunnel" : "off",
        status: tunnelOn && totalTunnels > 0 ? "healthy" : tunnelOn ? "unknown" : "unknown",
        instrumented: false,
        deployed: tunnelOn,
      }),
    );
    const speechNegotiated = Boolean(reachSessions.speechEnabled) || speechOn;
    nodes.push(
      node({
        id: "reach/speech-client",
        kind: "speech-client",
        band: "reach",
        label: "SpeechClient",
        sublabel: speechNegotiated ? "STT/TTS" : "off",
        status: speechNegotiated ? "unknown" : "unknown",
        instrumented: false,
        deployed: speechNegotiated,
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
        status: "unknown",
        instrumented: false,
        deployed: mtlsOn,
      }),
    );

    edges.push(
      edge({
        id: "app/ui->reach/session-bridge",
        from: "app/ui",
        to: "reach/session-bridge",
        kind: "request",
        protocol: "https",
      }),
    );
    edges.push(
      edge({
        id: "app/overlays->reach/overlay-packer",
        from: "app/overlays",
        to: "reach/overlay-packer",
        kind: "request",
      }),
    );
    edges.push(
      edge({
        id: "app/local-tools->reach/local-mcp-host",
        from: "app/local-tools",
        to: "reach/local-mcp-host",
        kind: "request",
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
      ? "unknown"
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
      status: engineDisabled && !engineOk ? "unknown" : engineStatus,
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
    },
    {
      id: "engine/mcp-tunnel",
      kind: "endpoint",
      label: "mcp_tunnel",
      deployed: tunnelOn,
    },
    {
      id: "engine/direct-agent",
      kind: "endpoint",
      label: "direct_agent",
      deployed: true,
    },
    {
      id: "engine/hello-speech",
      kind: "endpoint",
      label: "hello.speech",
      deployed: speechOn,
    },
    {
      id: "engine/mtls-enrol",
      kind: "endpoint",
      label: "mTLS enrol",
      deployed: Boolean(engineJson.mtls) || engineTls,
    },
  ];
  for (const ep of endpointDefs) {
    nodes.push(
      node({
        id: ep.id,
        kind: ep.kind,
        band: "ao",
        label: ep.label,
        sublabel: ep.deployed ? "on" : "off",
        status: engineOk && ep.deployed ? "healthy" : "unknown",
        instrumented: false,
        deployed: ep.deployed,
        parent: "engine",
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
      status: "unknown",
      instrumented: false,
      statusReason: "Presence inferred from web process — no live probe",
    }),
  );

  const agentBd = catalogBreakdown(agentList);
  nodes.push(
    node({
      id: "catalog/agents",
      kind: "catalog",
      band: "ao",
      label: "Agents",
      sublabel: `${agentList.length} providers`,
      status: "unknown",
      instrumented: false,
      count: agentList.length,
      breakdown: agentBd,
    }),
  );
  nodes.push(
    node({
      id: "catalog/mcp",
      kind: "catalog",
      band: "ao",
      label: "MCP servers",
      sublabel: `${mcpList.length} providers`,
      status: "unknown",
      instrumented: false,
      count: mcpList.length,
      breakdown: catalogBreakdown(mcpList),
    }),
  );
  nodes.push(
    node({
      id: "catalog/skills",
      kind: "catalog",
      band: "ao",
      label: "Skills",
      sublabel: `${skillList.length} skills`,
      status: "unknown",
      instrumented: false,
      count: skillList.length,
      breakdown: catalogBreakdown(skillList),
    }),
  );

  nodes.push(
    node({
      id: "models/backends",
      kind: "model-backend",
      band: "ao",
      label: "Model backends",
      sublabel: "providers",
      status: "unknown",
      instrumented: false,
    }),
  );
  nodes.push(
    node({
      id: "models/ollama",
      kind: "model-runtime",
      band: "ao",
      label: "Ollama",
      sublabel: ollamaConfigured ? "local" : "unset",
      status: ollamaConfigured ? "unknown" : "unknown",
      instrumented: false,
      deployed: ollamaConfigured,
      statusReason: ollamaConfigured
        ? process.env.OLLAMA_API_BASE || process.env.OLLAMA_HOST
        : "OLLAMA_HOST not configured",
    }),
  );
  nodes.push(
    node({
      id: "models/remote",
      kind: "model-runtime",
      band: "ao",
      label: "Remote LLMs",
      sublabel: remoteConfigured ? "keys set" : "unset",
      status: "unknown",
      instrumented: false,
      deployed: remoteConfigured,
    }),
  );

  nodes.push(
    node({
      id: "execution",
      kind: "execution-backend",
      band: "ao",
      label: "Backends",
      sublabel: backend,
      status: "unknown",
      instrumented: false,
    }),
  );

  // Workers / sidecars — Phase 1: presence stubs only when k8s warm pool on
  if (backend === "kubernetes" || warmPool) {
    nodes.push(
      node({
        id: "workers/cluster",
        kind: "worker",
        band: "ao",
        label: "Workers",
        sublabel: warmPool ? "warm pool" : "k8s",
        status: "unknown",
        instrumented: false,
        count: 0,
        statusReason: "k8s pod list not available from web process (Phase 1)",
      }),
    );
    nodes.push(
      node({
        id: "sidecars/cluster",
        kind: "mcp-sidecar",
        band: "ao",
        label: "MCP sidecars",
        sublabel: "k8s",
        status: "unknown",
        instrumented: false,
        deployed: false,
        statusReason: "Not discovered from web process",
      }),
    );
  }

  nodes.push(
    node({
      id: "platform/k3s",
      kind: "platform",
      band: "ao",
      label: "k3s / Jetson",
      sublabel: process.env.AGENTIC_EDGE_PLATFORM || "local",
      status: "unknown",
      instrumented: false,
    }),
  );
  nodes.push(
    node({
      id: "platform/storage",
      kind: "storage",
      band: "ao",
      label: "PVCs / GPU",
      sublabel: "weights",
      status: "unknown",
      instrumented: false,
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
        sublabel: "whisper",
        status: "unknown",
        instrumented: false,
        deployed: true,
      }),
    );
    nodes.push(
      node({
        id: "speech/tts",
        kind: "endpoint",
        band: "ao",
        label: "TTS :8091",
        sublabel: "piper",
        status: "unknown",
        instrumented: false,
        deployed: true,
      }),
    );
  }

  // —— AO edges ——
  if (hasReachClients && engineOk) {
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

  // OpenClaw bypass (structural; may be undeployed)
  if (nodes.some((n) => n.id === "app/openclaw" && n.deployed)) {
    edges.push(
      edge({
        id: "app/openclaw->web-ui",
        from: "app/openclaw",
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

  const capabilities = {
    edgeMetrics: [],
    nodeProbes: ["engine", "web-ui"],
    historyWindow: "15m",
    sources: {
      web: { reachable: true, role: "coordinator" },
      engine: {
        reachable: engineOk,
        role: "daemon",
        probeHost: probeHost || null,
        latencyMs: engineLatencyMs,
      },
      k8s: { reachable: false, role: "cluster", note: "not probed in Phase 1" },
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
      ports: {
        web: webPort,
        webNodePort: 30487,
        engine: enginePort,
        engineNodePort: 30765,
      },
    },
  };

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

  const logSource =
    id === "web-ui" || id === "web"
      ? "web"
      : id.startsWith("engine")
        ? "engine"
        : id.startsWith("workers")
          ? "warm-pool"
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
  if (id === "execution" || id.startsWith("workers")) {
    configKeys.push("AGENTIC_EXECUTION_BACKEND", "AGENTIC_K8S_WARM_POOL_ENABLED");
  }
  if (id.startsWith("models/")) {
    configKeys.push("OLLAMA_HOST", "OPENAI_API_KEY", "ANTHROPIC_API_KEY");
  }

  return {
    id: n.id,
    node: n,
    inbound,
    outbound,
    logSource,
    configKeys,
    probe: {
      lastProbeAt: n.lastProbeAt || null,
      instrumented: n.instrumented,
      status: n.status,
      statusReason: n.statusReason || null,
    },
    members:
      n.count != null
        ? {
            count: n.count,
            breakdown: n.breakdown || null,
            note: "Member list available via Capabilities catalogs",
          }
        : null,
    generatedAt: new Date().toISOString(),
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

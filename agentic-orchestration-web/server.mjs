/**
 * Static file + WebSocket server. Spawns Python main.py --dynamic for each chat message.
 * Bind to 127.0.0.1 by default; set AGENTIC_WEB_HOST=0.0.0.0 in .env for all interfaces.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { WebSocketServer } from "ws";
import { sampleHostMetrics } from "./host-metrics.mjs";
import { isSimpleChatPrompt, performanceSpawnEnvOverrides } from "./lib/perf-options.mjs";
import { extractUserFacingStdout } from "./lib/chat-output.mjs";
import { sanitizeUserFacingProse, stripWrappingQuotes } from "./lib/text-normalize.mjs";
import {
  resolveSessionIdFromHeaders,
  sanitizeUserDisplayName,
  userDisplayNameSpawnEnv,
  userNameFromRequestHeaders,
} from "./lib/user-context.mjs";
import {
  startOllamaKeepAliveLoop,
  beginOrchestrateOllamaBusy,
  endOrchestrateOllamaBusy,
  resolveOllamaApiBase,
  normalizeOllamaLoopbackBase,
} from "./lib/ollama-keepalive.mjs";
import {
  resolveChatCompletionsBackend,
  modelForOllamaUpstream,
  createConcurrencyGate,
  ollamaProxyMaxConcurrent,
  ollamaProxyFallbackModel,
  isOllamaModelNotFound,
} from "./lib/chat-completions-backend.mjs";
import {
  handleAdminApi,
  matchAdminRoute,
  buildCatalogs,
  fetchJson,
} from "./lib/admin-api.mjs";
import {
  authenticateBearer,
  authenticateChatUiBearer,
  authenticateFirstPartyUiBearer,
  authenticateWebUiBearer,
  authRequired,
  clientIp,
  getChatAssignment,
  getWebAssignment,
  isAdminBootstrapRoute,
  isChatUiAssigned,
  isWebUiAssigned,
  recordUsage,
} from "./lib/api-tokens.mjs";
import {
  effectiveAllowedAgentProviderIds,
  effectiveRunMode,
  getAppPrefs,
  stickyRunModeFromPrefs,
} from "./lib/app-prefs.mjs";
import {
  adminLog,
  followWorkerLogsForRun,
  startAdminLogsPush,
  stopAdminLogsPush,
} from "./lib/admin-logs.mjs";
import {
  maybeInitWebSentry,
  metricsText,
  recordWebRunEnd,
} from "./lib/ao-metrics.mjs";
import {
  startTopologyPush,
  stopTopologyPush,
  resyncTopology,
  subscribeTopologyWatch,
  unsubscribeTopologyWatch,
} from "./lib/admin-topology-ws.mjs";
import {
  startAdminFeedsPush,
  stopAdminFeedsPush,
  updateAdminFeedsParams,
} from "./lib/admin-live-feeds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Mirror process console into the Admin live log bus (web source). */
function installAdminConsoleTap() {
  for (const level of ["log", "info", "warn", "error"]) {
    const orig = console[level]?.bind(console);
    if (!orig) continue;
    console[level] = (...args) => {
      try {
        const line = args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ");
        adminLog("web", line, level === "log" ? "info" : level);
      } catch {
        /* ignore */
      }
      return orig(...args);
    };
  }
}
installAdminConsoleTap();

/** Load `.env` next to this file (no extra deps). Does not override existing process.env. */
function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

/** Also load tool `.env` (managed by OpenClaw plugin) without overriding worker env. */
function loadToolEnvFile(toolRoot) {
  const envPath = path.join(toolRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadLocalEnv();

/** Log full error server-side; never expose stack traces to clients. */
function logServerError(context, err) {
  if (err instanceof Error) {
    console.error(context, err.stack || err.message);
    return;
  }
  if (err != null) {
    console.error(context, err);
  }
}

function clientErrorMessage(err, fallback) {
  logServerError(fallback, err);
  return fallback;
}

function envTruthy(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(v);
}

function envInt(name, fallback, min, max) {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** When AGENTIC_WEB_DEFAULT_RUN_MODE is set (e.g. edge Jetson), seed the web UI from env. */
function webUiDefaultsFromEnv() {
  const modeRaw = String(process.env.AGENTIC_WEB_DEFAULT_RUN_MODE || "").trim();
  if (!modeRaw) return null;
  const runMode = modeRaw === "dynamic-iterative" ? "dynamic-iterative" : "dynamic";
  const autoIter = process.env.AGENTIC_WEB_DEFAULT_AUTO_ITER
    ? envTruthy("AGENTIC_WEB_DEFAULT_AUTO_ITER")
    : false;
  const perfDefaults = () => ({
    resetSessionSimple: envTruthy("AGENTIC_WEB_DEFAULT_RESET_SESSION_SIMPLE"),
    limitPlannerHistory: envTruthy("AGENTIC_WEB_DEFAULT_LIMIT_PLANNER_HISTORY"),
    skipFinalQa: envTruthy("AGENTIC_WEB_DEFAULT_SKIP_FINAL_QA"),
    skipLearningEval: envTruthy("AGENTIC_WEB_DEFAULT_SKIP_LEARNING_EVAL"),
  });
  return {
    runMode,
    autoIter,
    iterativeRounds: envInt("AGENTIC_WEB_DEFAULT_ITERATIVE_ROUNDS", 2, 1, 32),
    iterativeMaxRounds: envInt("AGENTIC_WEB_DEFAULT_ITERATIVE_MAX_ROUNDS", 3, 1, 32),
    ...perfDefaults(),
  };
}

function webPerformanceSpawnEnv(msg) {
  const limitPlannerHistory = Boolean(msg.limitPlannerHistory);
  const skipFinalQa = Boolean(msg.skipFinalQa);
  const skipLearningEval = Boolean(msg.skipLearningEval);
  if (!limitPlannerHistory && !skipFinalQa && !skipLearningEval) {
    return {};
  }
  return performanceSpawnEnvOverrides({
    limitPlannerHistory,
    plannerMaxTurns: envInt(
      "AGENTIC_WEB_PLANNER_MAX_TURNS",
      envInt("AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS", 2, 1, 64),
      1,
      64,
    ),
    plannerExcerptChars: envInt(
      "AGENTIC_WEB_PLANNER_EXCERPT_CHARS",
      envInt("AGENTIC_ORCHESTRATOR_EXCERPT_CHARS", 4000, 500, 50000),
      500,
      50000,
    ),
    skipFinalQa,
    skipLearningEval,
  });
}

function effectiveResetSession(msg, text) {
  if (msg.resetSession === true) return true;
  if (msg.resetSessionSimple && isSimpleChatPrompt(text)) return true;
  return false;
}

function webWelcomeMessage() {
  const raw = process.env.AGENTIC_WEB_WELCOME_MESSAGE;
  if (raw != null) {
    const v = String(raw).trim();
    if (!v || ["0", "false", "no", "off"].includes(v.toLowerCase())) return null;
    return v;
  }
  return "Hello! How can I help you today?";
}

function webPlannerGreetEnabled() {
  const raw = process.env.AGENTIC_WEB_PLANNER_GREET;
  if (raw == null) return true;
  const v = String(raw).trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(v);
}

function edgeRuntimeFromEnv() {
  const platform = String(process.env.AGENTIC_EDGE_PLATFORM || "").trim();
  const ollamaRuntime = String(process.env.AGENTIC_OLLAMA_RUNTIME || "").trim();
  if (!platform && !ollamaRuntime) return null;
  return {
    platform: platform || "pc",
    ollamaRuntime: ollamaRuntime || "auto",
  };
}

/** `node server.mjs --example <id>` or env `AGENTIC_EXAMPLE=<id>` (npm: `npm run start:healthcare`, `start:logistics`, …). */
function detectExampleFromArgv() {
  const i = process.argv.indexOf("--example");
  if (i < 0) return;
  const v = String(process.argv[i + 1] || "").trim();
  if (v) process.env.AGENTIC_EXAMPLE = v;
}
detectExampleFromArgv();

const _nodeMajor = parseInt(String(process.versions.node || "0").split(".")[0], 10);
if (_nodeMajor < 14) {
  console.error(
    `[agentic-orchestration-web] Node.js 14+ is required (use 18+ LTS). Current: ${process.version}`,
  );
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, "public");

const TOOL_ROOT = path.resolve(
  process.env.AGENTIC_TOOL_ROOT || path.join(__dirname, "..", "agentic-orchestration-tool"),
);
loadToolEnvFile(TOOL_ROOT);

/**
 * Gate orchestrate / OpenAI-proxy routes with minted API tokens + env shared-secret fallback.
 * Always requires credentials (no anonymous open mode).
 * Returns false when a 401 was already written.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ envKeys: string[], cors?: Record<string, string>, openAiStyle?: boolean, pathLabel?: string }} opts
 */
function applyApiAccessGate(req, res, opts) {
  const envKeys = (opts.envKeys || []).map((k) => String(k || "").trim()).filter(Boolean);
  const cors = opts.cors || {};
  // authRequired is always true; keep the call for clarity / future policy hooks.
  void authRequired(TOOL_ROOT, envKeys);
  const result = authenticateBearer(TOOL_ROOT, req.headers?.authorization || "", envKeys);
  if (!result.ok) {
    if (opts.openAiStyle) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: "Incorrect API key provided.",
            type: "invalid_request_error",
            param: null,
            code: "invalid_api_key",
          },
        }),
      );
    } else {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(JSON.stringify({ error: "Unauthorized" }));
    }
    return false;
  }
  req.agenticAuth = {
    tokenId: result.tokenId,
    appId: result.appId,
    source: result.source,
    prefs: getAppPrefs(TOOL_ROOT, result.appId),
  };
  installApiUsageRecorder(req, res, opts.pathLabel || getRequestPathname(req));
  return true;
}

/**
 * Gate Admin + same-origin operator APIs with the assigned ao-web token.
 * Before assignment, bootstrap routes stay open so operators can mint ao-web.
 * Returns false when a 401 was already written.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ routeName?: string|null, allowBootstrap?: boolean }} [opts]
 */
function applyWebUiAccessGate(req, res, opts = {}) {
  const assigned = isWebUiAssigned(TOOL_ROOT);
  const routeName = opts.routeName || null;
  const method = String(req.method || "GET").toUpperCase();
  if (!assigned) {
    if (opts.allowBootstrap === false) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: "Admin Web UI token not assigned — mint appId ao-web on Access",
          code: "web_ui_unassigned",
        }),
      );
      return false;
    }
    if (routeName && !isAdminBootstrapRoute(routeName, method)) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: "Mint and assign an Admin Web UI token (ao-web) before using this API",
          code: "web_ui_unassigned",
        }),
      );
      return false;
    }
    req.agenticAuth = { tokenId: null, appId: "bootstrap", source: "env" };
    return true;
  }
  if (routeName === "web_auth" && (method === "GET" || method === "HEAD")) {
    // SPA boot: deliver the assigned secret so the interceptor can attach Bearer.
    req.agenticAuth = { tokenId: getWebAssignment(TOOL_ROOT)?.tokenId || null, appId: "ao-web", source: "token" };
    return true;
  }
  if (routeName === "chat_auth" && (method === "GET" || method === "HEAD")) {
    req.agenticAuth = {
      tokenId: getChatAssignment(TOOL_ROOT)?.tokenId || null,
      appId: "ao-chat",
      source: "token",
    };
    return true;
  }
  const result = authenticateWebUiBearer(TOOL_ROOT, req.headers?.authorization || "");
  if (!result.ok) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Unauthorized", code: result.reason || "invalid" }));
    return false;
  }
  req.agenticAuth = {
    tokenId: result.tokenId,
    appId: result.appId,
    source: result.source,
  };
  installApiUsageRecorder(req, res, getRequestPathname(req));
  return true;
}

/**
 * Gate core chat HTTP APIs with the assigned ao-chat token.
 * Before assignment, allow open bootstrap so the chat page can load until mint.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
function applyChatUiAccessGate(req, res) {
  if (!isChatUiAssigned(TOOL_ROOT)) {
    req.agenticAuth = { tokenId: null, appId: "bootstrap", source: "env" };
    return true;
  }
  const result = authenticateChatUiBearer(TOOL_ROOT, req.headers?.authorization || "");
  if (!result.ok) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "Unauthorized",
        code: result.reason || "invalid",
        hint: "Mint Chat Web UI (ao-chat) on Access, or refresh after mint",
      }),
    );
    return false;
  }
  req.agenticAuth = {
    tokenId: result.tokenId,
    appId: result.appId,
    source: result.source,
  };
  installApiUsageRecorder(req, res, getRequestPathname(req));
  return true;
}

/**
 * Shared operator paths used by both Admin (ao-web) and Chat (ao-chat), e.g. /api/session.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
function applyFirstPartyUiAccessGate(req, res) {
  if (!isWebUiAssigned(TOOL_ROOT) && !isChatUiAssigned(TOOL_ROOT)) {
    req.agenticAuth = { tokenId: null, appId: "bootstrap", source: "env" };
    return true;
  }
  const result = authenticateFirstPartyUiBearer(
    TOOL_ROOT,
    req.headers?.authorization || "",
  );
  if (!result.ok) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "Unauthorized",
        code: result.reason || "invalid",
        hint: "Send Authorization Bearer with assigned ao-web or ao-chat token",
      }),
    );
    return false;
  }
  req.agenticAuth = {
    tokenId: result.tokenId,
    appId: result.appId,
    source: result.source,
  };
  installApiUsageRecorder(req, res, getRequestPathname(req));
  return true;
}

/**
 * @param {import("node:http").IncomingMessage} req
 */
function extractWsAccessToken(req) {
  const auth = String(req?.headers?.authorization || "").trim();
  if (auth) {
    if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
    return auth;
  }
  try {
    const u = new URL(req?.url || "/", "http://localhost");
    return (
      String(u.searchParams.get("access_token") || u.searchParams.get("token") || "").trim()
    );
  } catch {
    return "";
  }
}

/**
 * Chat / Admin live WebSocket: when ao-chat or ao-web is assigned, require a matching first-party token.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("ws").WebSocket} ws
 */
function authorizeWsConnection(req, ws) {
  const webAssigned = isWebUiAssigned(TOOL_ROOT);
  const chatAssigned = isChatUiAssigned(TOOL_ROOT);
  if (!webAssigned && !chatAssigned) {
    req.agenticAuth = { tokenId: null, appId: "bootstrap", source: "env" };
    return true;
  }
  const token = extractWsAccessToken(req);
  const result = authenticateFirstPartyUiBearer(TOOL_ROOT, token);
  if (!result.ok) {
    try {
      ws.close(4401, "unauthorized");
    } catch {
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
    }
    return false;
  }
  req.agenticAuth = {
    tokenId: result.tokenId,
    appId: result.appId,
    source: result.source,
  };
  return true;
}

/**
 * Record one usage row when the response headers are written (token/env auth only).
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} pathLabel
 */
function installApiUsageRecorder(req, res, pathLabel) {
  if (!req.agenticAuth || req.agenticAuth.appId === "open" || req.agenticAuth.appId === "bootstrap") return;
  if (res.__agenticUsageInstalled) return;
  res.__agenticUsageInstalled = true;
  const started = Date.now();
  let recorded = false;
  const origWriteHead = res.writeHead.bind(res);
  res.writeHead = function agenticUsageWriteHead(...args) {
    if (!recorded) {
      recorded = true;
      const status = typeof args[0] === "number" ? args[0] : 200;
      try {
        recordUsage(TOOL_ROOT, {
          tokenId: req.agenticAuth?.tokenId ?? null,
          appId: req.agenticAuth?.appId ?? "",
          ip: clientIp(req),
          path: pathLabel,
          status,
          latencyMs: Date.now() - started,
          promptChars:
            typeof req.agenticAuthPromptChars === "number" ? req.agenticAuthPromptChars : null,
          runId: req.agenticRunId != null ? String(req.agenticRunId) : null,
        });
      } catch (err) {
        console.error("[agentic api-tokens] usage record failed:", err?.message || err);
      }
    }
    return origWriteHead(...args);
  };
}

/** Match `orchestration/example_overlays.py` (no manual .env paths for vertical roots). */
const EXAMPLE_VERTICAL_SUBDIR = {
  healthcare: "healthcare",
  logistics: "logistics",
};

function applyExampleOverlayFromEnv() {
  const ex = String(process.env.AGENTIC_EXAMPLE || "").trim().toLowerCase();
  const sub = EXAMPLE_VERTICAL_SUBDIR[ex];
  if (!sub) return;
  const root = path.join(TOOL_ROOT, "..", "examples", "verticals", sub);
  const ctx = path.join(root, "orchestrator-context.md");
  if (!fs.existsSync(ctx)) {
    console.warn(`[web] AGENTIC_EXAMPLE=${ex} but missing ${ctx}`);
    return;
  }
  process.env.AGENTIC_ORCHESTRATOR_CONTEXT_FILE = ctx;
  const sep = process.platform === "win32" ? ";" : ":";
  const agents = path.join(root, "agent_providers");
  const mcps = path.join(root, "mcp_providers");
  if (fs.existsSync(agents)) {
    const cur = String(process.env.AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS || "").trim();
    process.env.AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS = cur.includes(agents)
      ? cur
      : cur
        ? `${agents}${sep}${cur}`
        : agents;
  }
  if (fs.existsSync(mcps)) {
    const cur = String(process.env.AGENTIC_EXTRA_MCP_PROVIDERS_PATH || "").trim();
    process.env.AGENTIC_EXTRA_MCP_PROVIDERS_PATH = cur.includes(mcps)
      ? cur
      : cur
        ? `${mcps}${sep}${cur}`
        : mcps;
  }
  if (ex === "logistics") {
    const sim = path.join(root, "mcp_stubs", "wms_erp_sim_mcp.py");
    if (fs.existsSync(sim)) {
      process.env.AGENTIC_LOGISTICS_SIM_MCP_PY = path.resolve(sim);
    }
  } else {
    delete process.env.AGENTIC_LOGISTICS_SIM_MCP_PY;
  }
}
applyExampleOverlayFromEnv();

function resolvePythonExecutable() {
  const pyEnv = (process.env.AGENTIC_PYTHON || "").trim();
  if (pyEnv) {
    return pyEnv;
  }
  const winVenv = path.join(TOOL_ROOT, ".venv", "Scripts", "python.exe");
  const unixVenv = path.join(TOOL_ROOT, ".venv", "bin", "python");
  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(unixVenv)) return unixVenv;
  return process.platform === "win32" ? "python" : "python3";
}

let PYTHON = resolvePythonExecutable();
const HOST = process.env.AGENTIC_WEB_HOST || "127.0.0.1";
const PORT = Number(process.env.AGENTIC_WEB_PORT || "3847");
const AGENT_PROVIDERS_DIR = path.join(TOOL_ROOT, "config", "agent_providers");
const TOOL_REQUIREMENTS = path.join(TOOL_ROOT, "requirements.txt");

/** Identifies this process in /api/ping (proves curl hit this server after restart). */
const WEB_INSTANCE_ID = `${process.pid}-${Date.now().toString(36)}`;
let _pythonDepsChecked = false;
let _pythonDepsOk = true;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

function sendJson(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

const HOST_METRICS_PUSH_MS = Math.max(
  1000,
  Number(process.env.AGENTIC_WEB_HOST_METRICS_PUSH_MS) || 2000,
);

function stopHostMetricsPush(ws) {
  if (ws._hostMetricsTimer) {
    clearInterval(ws._hostMetricsTimer);
    ws._hostMetricsTimer = null;
  }
}

async function pushHostMetricsOnce(ws) {
  if (ws.readyState !== 1) return;
  try {
    const metrics = await sampleHostMetrics();
    sendJson(ws, { type: "host_metrics", ...metrics });
  } catch {
    /* ignore sampler errors */
  }
}

function startHostMetricsPush(ws) {
  if (ws._hostMetricsTimer) return;
  pushHostMetricsOnce(ws);
  ws._hostMetricsTimer = setInterval(() => {
    pushHostMetricsOnce(ws);
  }, HOST_METRICS_PUSH_MS);
  if (typeof ws._hostMetricsTimer.unref === "function") {
    ws._hostMetricsTimer.unref();
  }
}

/** Env for Python orchestrator runs started from the web UI (chat expects prose, not JSON). */
function webOrchestratorSpawnEnv(extra = {}) {
  return {
    ...process.env,
    PYTHONUTF8: "1",
    AGENTIC_WEB_PROSE_DELIVERABLE: "1",
    ...extra,
  };
}

/** Identity env for Python main.py request_start / LLM usage context. */
function spawnIdentityEnvFromReq(req) {
  const auth = req?.agenticAuth || {};
  const out = {};
  if (auth.appId) out.AGENTIC_APP_ID = String(auth.appId);
  if (auth.tokenId) out.AGENTIC_API_TOKEN_ID = String(auth.tokenId);
  try {
    const ip = clientIp(req);
    if (ip) out.AGENTIC_CLIENT_IP = String(ip);
  } catch {
    /* ignore */
  }
  const uname = userNameFromRequestHeaders(req?.headers || {});
  if (uname) {
    out.AGENTIC_USER_NAME = String(uname);
    out.AGENTIC_USER_ID = String(uname);
  }
  return out;
}

function webOrchestratorSpawnEnvForWs(ws, extra = {}) {
  const auth = ws?._agenticAuth || {};
  const ident = {};
  if (auth.appId) ident.AGENTIC_APP_ID = String(auth.appId);
  if (auth.tokenId) ident.AGENTIC_API_TOKEN_ID = String(auth.tokenId);
  if (ws?._clientIp) ident.AGENTIC_CLIENT_IP = String(ws._clientIp);
  if (ws?._userName) {
    ident.AGENTIC_USER_NAME = String(ws._userName);
    ident.AGENTIC_USER_ID = String(ws._userName);
  }
  return webOrchestratorSpawnEnv({
    ...userDisplayNameSpawnEnv(ws?._userName),
    ...ident,
    ...extra,
  });
}

function resolveWsUserName(ws, msgUserName) {
  if (ws?._userName) return ws._userName;
  return sanitizeUserDisplayName(msgUserName);
}

function normalizeUserFacingText(text) {
  return sanitizeUserFacingProse(stripWrappingQuotes(extractUserFacingStdout(text)));
}

function _pythonCanImportDotenv() {
  const chk = spawnSync(PYTHON, ["-c", "import dotenv"], {
    cwd: TOOL_ROOT,
    env: { ...process.env, PYTHONUTF8: "1" },
    stdio: "pipe",
    encoding: "utf8",
    timeout: 20000,
  });
  return chk.status === 0;
}

function ensurePythonDepsForWebRuns(statusCb) {
  const emit = typeof statusCb === "function" ? statusCb : () => {};
  emit("Checking Python dependencies…");
  if (_pythonDepsChecked) return _pythonDepsOk;
  _pythonDepsChecked = true;

  PYTHON = resolvePythonExecutable();
  if (_pythonCanImportDotenv()) {
    emit("Python dependencies already satisfied.");
    _pythonDepsOk = true;
    return true;
  }

  const autoInstall = String(process.env.AGENTIC_WEB_AUTO_INSTALL_REQUIREMENTS || "1")
    .trim()
    .toLowerCase();
  if (["0", "false", "no", "off"].includes(autoInstall)) {
    emit("Dependencies missing and auto-install is disabled.");
    _pythonDepsOk = false;
    return false;
  }
  if (!fs.existsSync(TOOL_REQUIREMENTS)) {
    emit("requirements.txt not found for dependency healing.");
    _pythonDepsOk = false;
    return false;
  }

  const winVenv = path.join(TOOL_ROOT, ".venv", "Scripts", "python.exe");
  const unixVenv = path.join(TOOL_ROOT, ".venv", "bin", "python");
  const venvPython = process.platform === "win32" ? winVenv : unixVenv;
  if (!fs.existsSync(venvPython) && !(process.env.AGENTIC_PYTHON || "").trim()) {
    emit("Creating tool .venv…");
    console.error(`[agentic-orchestration-web] Creating venv at ${path.join(TOOL_ROOT, ".venv")}`);
    const bootstrapPy = process.platform === "win32" ? "python" : "python3";
    const venvCreate = spawnSync(bootstrapPy, ["-m", "venv", path.join(TOOL_ROOT, ".venv")], {
      cwd: TOOL_ROOT,
      env: { ...process.env, PYTHONUTF8: "1" },
      stdio: "pipe",
      encoding: "utf8",
      timeout: 180000,
    });
    if (venvCreate.status !== 0 || !fs.existsSync(venvPython)) {
      _pythonDepsOk = false;
      emit("Failed to create .venv.");
      console.error(
        "[agentic-orchestration-web] venv create failed:\n" +
          String(venvCreate.stderr || venvCreate.stdout || "").trim(),
      );
      return false;
    }
    PYTHON = venvPython;
  } else if (fs.existsSync(venvPython) && !(process.env.AGENTIC_PYTHON || "").trim()) {
    PYTHON = venvPython;
  }

  emit("Dependencies missing. Installing requirements…");
  console.error(
    `[agentic-orchestration-web] Python deps missing for ${PYTHON}; auto-installing from ${TOOL_REQUIREMENTS}`,
  );
  const upgrade = spawnSync(PYTHON, ["-m", "pip", "install", "--upgrade", "pip"], {
    cwd: TOOL_ROOT,
    env: { ...process.env, PYTHONUTF8: "1" },
    stdio: "pipe",
    encoding: "utf8",
    timeout: 120000,
  });
  if (upgrade.status !== 0) {
    console.error(
      "[agentic-orchestration-web] pip upgrade warning:\n" +
        String(upgrade.stderr || upgrade.stdout || "").trim(),
    );
  }
  const install = spawnSync(PYTHON, ["-m", "pip", "install", "-r", TOOL_REQUIREMENTS], {
    cwd: TOOL_ROOT,
    env: { ...process.env, PYTHONUTF8: "1" },
    stdio: "pipe",
    encoding: "utf8",
    timeout: 240000,
  });
  if (install.status !== 0) {
    _pythonDepsOk = false;
    emit("Auto-install failed.");
    const err = String(install.stderr || install.stdout || "").trim();
    console.error("[agentic-orchestration-web] Auto-install failed:\n" + err);
    return false;
  }
  _pythonDepsOk = _pythonCanImportDotenv();
  if (_pythonDepsOk) {
    emit("Dependency healing complete.");
    console.error("[agentic-orchestration-web] Python dependencies ready.");
  } else {
    emit("Dependencies still missing after install.");
  }
  return _pythonDepsOk;
}

function appendPendingRating(event) {
  const dir = path.join(TOOL_ROOT, "__orchestrator_learning__");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "pending_ratings.jsonl");
    const payload = { ts: Date.now() / 1000, ...event };
    fs.appendFileSync(p, JSON.stringify(payload) + "\n", "utf8");
  } catch {
    // best-effort
  }
}

function parseAgentProviderYaml(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const out = { id: "", type: "", role: "", planner_hint: "", min_vram_gb: null };
    for (const line of lines) {
      const m = line.match(/^(id|type|role|planner_hint|min_vram_gb)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = (m[2] || "").trim();
      if (key === "min_vram_gb") {
        // Support inline comments: "min_vram_gb: 8  # comment"
        const base = val.split("#")[0].trim();
        const n = Number(base);
        out.min_vram_gb = Number.isFinite(n) ? n : null;
        continue;
      }
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    if (!out.id) return null;
    return out;
  } catch {
    return null;
  }
}

function loadAgentProvidersForUi() {
  if (!fs.existsSync(AGENT_PROVIDERS_DIR)) return [];
  const names = fs
    .readdirSync(AGENT_PROVIDERS_DIR)
    .filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))
    .filter((n) => !n.startsWith("_"))
    .sort((a, b) => a.localeCompare(b));
  const out = [];
  for (const n of names) {
    const item = parseAgentProviderYaml(path.join(AGENT_PROVIDERS_DIR, n));
    if (item) out.push(item);
  }
  return out;
}

function getRequestPathname(req) {
  /** Path only (no query). Supports absolute-form request-target (some proxies) via WHATWG URL. */
  const pathOnly = String(req.url || "/").split("?")[0].split("#")[0].trim() || "/";
  try {
    const u =
      pathOnly.startsWith("http://") || pathOnly.startsWith("https://")
        ? new URL(pathOnly)
        : new URL(pathOnly, "http://127.0.0.1");
    let p = u.pathname || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    let p = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
    p = p.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  }
}

/** ESM browser bundles for chat markdown (served from node_modules). */
const VENDOR_ASSETS = new Map([
  [
    "/vendor/marked.esm.js",
    path.join(__dirname, "node_modules", "marked", "lib", "marked.esm.js"),
  ],
  [
    "/vendor/purify.es.mjs",
    path.join(__dirname, "node_modules", "dompurify", "dist", "purify.es.mjs"),
  ],
]);

const _NODE_MODULES_ROOT = path.resolve(__dirname, "node_modules");

function tryServeVendorAsset(req, res) {
  const pathname = getRequestPathname(req);
  const filePath = VENDOR_ASSETS.get(pathname);
  if (!filePath) return false;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(_NODE_MODULES_ROOT + path.sep)) {
    return false;
  }
  try {
    const data = fs.readFileSync(resolved);
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    });
    res.end(data);
    return true;
  } catch {
    res.writeHead(404).end("Not found");
    return true;
  }
}

function requestUrlHead(req) {
  return String(req.url || "").split("?")[0].split("#")[0];
}

/**
 * Match /api/agent-providers without relying on a single parsing strategy (proxies, absolute URI, casing).
 */
function isAgentProvidersApi(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  const slashNorm = (s) => s.replace(/\\/g, "/");
  const candidates = [head, decoded, slashNorm(head), slashNorm(decoded)];
  for (const c of candidates) {
    if (/\/api\/agent-providers\/?$/i.test(c)) return true;
  }
  const path = getRequestPathname(req);
  const pl = path.toLowerCase();
  if (pl === "/api/agent-providers" || pl.endsWith("/api/agent-providers")) return true;
  return false;
}

function isApiHostMetrics(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  for (const c of [head, decoded]) {
    if (/\/api\/host-metrics\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/api/host-metrics" || pl.endsWith("/api/host-metrics");
}

function isApiPing(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  for (const c of [head, decoded]) {
    if (/\/api\/ping\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/api/ping" || pl.endsWith("/api/ping");
}

function isApiSession(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  for (const c of [head, decoded]) {
    if (/\/api\/session\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/api/session" || pl.endsWith("/api/session");
}

/** OpenAI-compatible chat completions (proxy). Matches `/v1/chat/completions` with resilient path parsing. */
function isOpenAiChatCompletionsPath(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  const slashNorm = (s) => s.replace(/\\/g, "/");
  for (const c of [head, decoded, slashNorm(head), slashNorm(decoded)]) {
    if (/\/v1\/chat\/completions\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/v1/chat/completions" || pl.endsWith("/v1/chat/completions");
}

/** OpenAI-compatible responses API (proxy). Matches `/v1/responses`. */
function isOpenAiResponsesPath(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  const slashNorm = (s) => s.replace(/\\/g, "/");
  for (const c of [head, decoded, slashNorm(head), slashNorm(decoded)]) {
    if (/\/v1\/responses\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/v1/responses" || pl.endsWith("/v1/responses");
}

/** OpenClaw plugin bridge. Matches `/api/v1/orchestrate`. */
function isApiV1Orchestrate(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  const slashNorm = (s) => s.replace(/\\/g, "/");
  for (const c of [head, decoded, slashNorm(head), slashNorm(decoded)]) {
    if (/\/api\/v1\/orchestrate\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/api/v1/orchestrate" || pl.endsWith("/api/v1/orchestrate");
}

/** Align with `agent_providers/openai_provider.py`: ensure base ends with `/v1`. */
function normalizeOpenAiBaseUrl(raw) {
  let u = String(raw || "").trim().replace(/\/+$/, "");
  if (!u) u = "https://api.openai.com";
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `http://${u}`;
  }
  if (!/\/v1$/i.test(u)) {
    u = `${u}/v1`;
  }
  return u;
}

const MAX_CHAT_COMPLETIONS_BODY_BYTES = 25 * 1024 * 1024;

const _HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function chatCompletionsCorsHeaders() {
  const origin = String(process.env.AGENTIC_CHAT_COMPLETIONS_CORS_ORIGIN || "*").trim() || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, OpenAI-Organization, OpenAI-Project, OpenAI-Beta",
    "Access-Control-Max-Age": "86400",
  };
}

function collectForwardResponseHeaders(upstream) {
  const out = { ...chatCompletionsCorsHeaders() };
  upstream.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (_HOP_BY_HOP_RESPONSE_HEADERS.has(lk)) return;
    if (lk === "content-length") return;
    out[key] = value;
  });
  return out;
}

function readRequestBodyBuf(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Request body too large (max ${maxBytes} bytes).`));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Same optional fields as the WebSocket `chat` message (`public/app.js`), nested under JSON `agentic`. */
function normalizeAgenticExtension(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

function wantsAgenticOrchestration(agentic) {
  if (agentic.orchestrate === false) return false;
  if (agentic.orchestrate === true) return true;
  const mode = String(agentic.runMode || "").trim();
  return mode === "dynamic" || mode === "dynamic-iterative";
}

/**
 * Apply sticky per-app dynamic planning prefs onto an agentic extension
 * when the request did not set an explicit runMode / backend / orchestrate flag.
 * Mutates and returns the same object.
 * @param {Record<string, unknown>} agentic
 * @param {{ dynamicPlanning?: boolean, defaultRunMode?: string|null }|null|undefined} prefs
 */
function applyAppPrefsToAgentic(agentic, prefs) {
  const a = agentic && typeof agentic === "object" ? agentic : {};
  if (a.orchestrate === false) return a;
  if (String(a.backend || a.upstream || "").trim()) return a;
  if (String(a.runMode || "").trim()) return a;
  if (a.orchestrate === true) return a;
  const sticky = stickyRunModeFromPrefs(prefs);
  if (sticky) {
    a.runMode = sticky;
  }
  return a;
}

function messageContentToString(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const t = part.type;
      if ((t === "text" || t === "input_text") && typeof part.text === "string") {
        parts.push(part.text);
      }
    }
    return parts.join("\n");
  }
  return String(content);
}

/** Turn chat `messages` into one prompt string for `main.py --dynamic`. */
function messagesToDynamicText(messages) {
  const lines = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const role = String(m.role || "user");
    const body = messageContentToString(m.content).trim();
    if (body) lines.push(`[${role}]\n${body}`);
  }
  return lines.join("\n\n---\n\n");
}

const _IMAGE_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const _VIDEO_MIME_TO_EXT = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function extensionForMediaMime(mime) {
  const m = String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (m.startsWith("video/")) return _VIDEO_MIME_TO_EXT[m] || "mp4";
  return _IMAGE_MIME_TO_EXT[m] || "bin";
}

/**
 * Parse OpenAI-style data URLs: data:image/*;base64,... or data:video/*;base64,... (e.g. MP4).
 */
function parseOpenAiDataUrlMedia(urlRaw) {
  const url = String(urlRaw || "").trim();
  const m = /^data:([\w/+.\-]+);base64,([\s\S]+)$/i.exec(url);
  if (!m) return null;
  const mime = String(m[1] || "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const base64 = String(m[2] || "").replace(/\s+/g, "");
  if (!base64 || !(mime.startsWith("image/") || mime.startsWith("video/"))) return null;
  return { mime, base64 };
}

/**
 * Merge explicit agentic.files with vision media parts (image_url / video_url); write manifest or return error context.
 */
function mergeAttachmentFilesAndWriteManifest(toolRoot, agenticFiles, messageDerivedFiles) {
  const a = Array.isArray(agenticFiles) ? agenticFiles : [];
  const b = Array.isArray(messageDerivedFiles) ? messageDerivedFiles : [];
  const combined = [...a, ...b];
  if (combined.length === 0) return { manifestPath: null, combinedCount: 0 };
  const manifestPath = writeDynamicAttachmentManifest(toolRoot, combined);
  return { manifestPath, combinedCount: combined.length };
}

/** Drop `agentic` so upstream OpenAI-compatible servers do not reject unknown fields. */
function openAiPayloadForUpstream(payload) {
  if (!payload || typeof payload !== "object") return {};
  const { agentic: _omit, ...rest } = payload;
  return rest;
}

function responsesInputToMessages(input) {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }
  if (Array.isArray(input)) {
    const messages = [];
    for (const item of input) {
      if (!item || typeof item !== "object") continue;
      const type = String(item.type || "").trim().toLowerCase();
      const role = String(item.role || (type === "message" ? "user" : "user")).trim() || "user";
      if (type === "message") {
        messages.push({ role, content: item.content });
        continue;
      }
      if (typeof item.text === "string") {
        messages.push({ role: "user", content: item.text });
      }
    }
    return messages;
  }
  if (input && typeof input === "object") {
    const type = String(input.type || "").trim().toLowerCase();
    if (type === "message") {
      return [{ role: String(input.role || "user"), content: input.content }];
    }
    if (typeof input.text === "string") {
      return [{ role: "user", content: input.text }];
    }
  }
  return [];
}

function buildResponsesSuccessPayload(model, content) {
  const created = Math.floor(Date.now() / 1000);
  return {
    id: `resp-agentic-${crypto.randomUUID()}`,
    object: "response",
    created_at: created,
    status: "completed",
    model,
    output: [
      {
        id: `msg-agentic-${crypto.randomUUID()}`,
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: content }],
      },
    ],
    output_text: content,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    },
  };
}

/**
 * For OpenAI-compatible endpoints, keep output clean:
 * - drop progress markers and synthetic "[user]" transcript delimiters
 * - exclude stderr diagnostics by default
 */
function normalizeOrchestratedApiContent(stdout) {
  return normalizeUserFacingText(stdout);
}

/**
 * OpenAI-compatible SSE for orchestrated chat completions.
 * Open the stream *before* orchestration so clients that require early bytes
 * (OpenClaw ≥ 2026.7 idle watchdog) do not abort while the crew runs.
 */
function beginOrchestratedChatCompletionStream(res, { id, created, model, cors }) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    ...cors,
  });
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
  const writeChunk = (delta, finishReason = null) => {
    res.write(
      `data: ${JSON.stringify({
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [
          {
            index: 0,
            delta,
            finish_reason: finishReason,
          },
        ],
      })}\n\n`,
    );
  };
  writeChunk({ role: "assistant", content: "" });
  // SSE comments keep proxies/clients alive without changing the assistant text.
  const keepalive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepalive);
    }
  }, 15_000);
  if (typeof keepalive.unref === "function") keepalive.unref();
  return {
    writeChunk,
    finish(content) {
      clearInterval(keepalive);
      if (content) {
        writeChunk({ content: String(content) });
      }
      writeChunk({}, "stop");
      res.write("data: [DONE]\n\n");
      res.end();
    },
    fail(message) {
      clearInterval(keepalive);
      writeChunk({ content: String(message || "Orchestration failed") });
      writeChunk({}, "stop");
      res.write("data: [DONE]\n\n");
      res.end();
    },
  };
}

function openAiApiDisablesAnswerCache() {
  const v = String(process.env.AGENTIC_OPENAI_API_DISABLE_CACHE || "1")
    .trim()
    .toLowerCase();
  return !["0", "false", "no", "off"].includes(v);
}

/** Mirror spawned Python stdout/stderr to this process stderr (see runDynamicAwait). */
function subprocessLogToConsoleEnabled() {
  const v = String(process.env.AGENTIC_SUBPROCESS_LOG_TO_CONSOLE || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(v);
}

/** For OpenAI-compatible HTTP handlers: force Crew verbose even when the JSON body omits agentic.verboseCrew. */
function chatCompletionsVerboseCrewFromEnv() {
  const v = String(process.env.AGENTIC_CHAT_COMPLETIONS_VERBOSE_CREW || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(v);
}

/** Log a one-line summary for each POST that runs local orchestration (chat completions / responses). */
function orchestrationRequestLogEnabled() {
  for (const k of ["AGENTIC_ORCHESTRATION_REQUEST_LOG", "AGENTIC_CHAT_COMPLETIONS_REQUEST_LOG"]) {
    const v = String(process.env[k] || "").trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) return true;
  }
  return false;
}

/**
 * Pass --orchestrator-session-reset for OpenAI-proxy dynamic runs unless opted out.
 * Default on: stateless callers (e.g. LLM Vision) must not inherit planner_history /
 * last_crew_output_excerpt from unrelated jobs sharing __orchestrator_sessions__/default.json.
 * AGENTIC_OPENAI_PROXY_ORCHESTRATOR_SESSION_RESET=0 keeps continuity when using agentic.sessionId.
 * agentic.resetSession: false opts out; true forces reset.
 */
function effectiveOpenAiProxyOrchestratorReset(agentic) {
  const a = agentic && typeof agentic === "object" ? agentic : {};
  if (a.resetSession === true) return true;
  if (a.resetSession === false) return false;
  const resetEnv = process.env.AGENTIC_OPENAI_PROXY_ORCHESTRATOR_SESSION_RESET;
  const v = String(resetEnv != null ? resetEnv : "1")
    .trim()
    .toLowerCase();
  return !["0", "false", "no", "off"].includes(v);
}

/**
 * Planner catalog restriction for OpenAI-proxy / orchestrate runs.
 * Request `selectedAgentProviderIds` wins when non-empty; else
 * AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS; then intersect sticky
 * app prefs `allowedAgentProviderIds` when that list is non-empty.
 * @param {unknown} agenticSelected
 * @param {{ allowedAgentProviderIds?: string[] }|null|undefined} [prefs]
 */
function effectiveOpenAiProxyAgentProviderIds(agenticSelected, prefs) {
  const fromBody = Array.isArray(agenticSelected)
    ? agenticSelected.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  let requestIds = fromBody;
  if (!requestIds.length) {
    const raw = String(process.env.AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS || "").trim();
    if (raw) {
      requestIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  const merged = effectiveAllowedAgentProviderIds(requestIds, prefs);
  return merged || [];
}

/** Serialize heavy Ollama /v1 chat calls so HA watering (~9 zones) does not pile on. */
const ollamaChatProxyGate = createConcurrencyGate(ollamaProxyMaxConcurrent());

/**
 * Resolve upstream OpenAI-compat base + API key for chat/completions|responses proxy.
 * @param {"openai"|"ollama"} kind
 * @returns {{ base: string, apiKey: string, rewriteModel?: (m: string) => string }}
 */
function resolveChatCompletionsUpstream(kind) {
  if (kind === "ollama") {
    const raw = resolveOllamaApiBase();
    return {
      base: normalizeOpenAiBaseUrl(normalizeOllamaLoopbackBase(raw)),
      apiKey: String(process.env.OLLAMA_API_KEY || process.env.OPENAI_API_KEY || "ollama").trim() || "ollama",
      rewriteModel: modelForOllamaUpstream,
    };
  }
  const rawBase =
    String(process.env.OPENAI_BASE_URL || "").trim() ||
    String(process.env.OPENAI_API_BASE || "").trim() ||
    "https://api.openai.com";
  return {
    base: normalizeOpenAiBaseUrl(rawBase),
    // Client Bearer is the AO gate token; cloud/upstream key stays server-side.
    apiKey: String(process.env.OPENAI_API_KEY || "").trim(),
  };
}

/**
 * Forward an OpenAI-shaped body to OpenAI cloud or Ollama's OpenAI-compat API.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ cors: Record<string, string>, payload: object, pathSuffix: "chat/completions"|"responses", kind: "openai"|"ollama", pathLabel: string }} opts
 */
async function proxyOpenAiCompatibleUpstream(req, res, opts) {
  const { cors, payload, pathSuffix, kind, pathLabel } = opts;
  const upstreamCfg = resolveChatCompletionsUpstream(kind);
  if (kind === "openai" && !upstreamCfg.apiKey) {
    res.writeHead(503, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message:
            "OPENAI_API_KEY is not configured on this orchestrator. Set it in the edge env/secret for cloud chat/completions proxy (e.g. Home Assistant gpt-* models).",
          type: "api_error",
          param: null,
          code: "openai_api_key_missing",
        },
      }),
    );
    return;
  }

  let forwardPayload = openAiPayloadForUpstream(payload);
  if (typeof upstreamCfg.rewriteModel === "function" && typeof forwardPayload.model === "string") {
    forwardPayload = { ...forwardPayload, model: upstreamCfg.rewriteModel(forwardPayload.model) };
  }
  const url = `${upstreamCfg.base.replace(/\/+$/, "")}/${pathSuffix}`;
  const requestedModel = typeof forwardPayload.model === "string" ? forwardPayload.model : "";
  const fallbackModel = kind === "ollama" ? ollamaProxyFallbackModel() : "";

  if (orchestrationRequestLogEnabled()) {
    console.error(
      `[agentic-orchestration-web] ${pathLabel} proxy`,
      JSON.stringify({
        kind,
        model: typeof payload.model === "string" ? payload.model.trim() : "",
        upstreamModel: requestedModel,
        fallbackModel: fallbackModel && fallbackModel !== requestedModel ? fallbackModel : "",
        remote: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "",
        url,
        stream: Boolean(payload.stream),
      }),
    );
  }

  const upstreamHeaders = {
    "Content-Type": "application/json",
  };
  if (upstreamCfg.apiKey) {
    upstreamHeaders.Authorization = `Bearer ${upstreamCfg.apiKey}`;
  }
  const org = req.headers["openai-organization"];
  if (org && String(org).trim()) {
    upstreamHeaders["OpenAI-Organization"] = String(org).trim();
  }
  const project = req.headers["openai-project"];
  if (project && String(project).trim()) {
    upstreamHeaders["OpenAI-Project"] = String(project).trim();
  }
  const beta = req.headers["openai-beta"];
  if (beta && String(beta).trim()) {
    upstreamHeaders["OpenAI-Beta"] = String(beta).trim();
  }

  const runProxy = async () => {
    const modelsToTry = [requestedModel];
    if (kind === "ollama" && fallbackModel && fallbackModel !== requestedModel) {
      modelsToTry.push(fallbackModel);
    }

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const body = { ...forwardPayload, model };
      let upstream;
      try {
        upstream = await fetch(url, {
          method: "POST",
          headers: upstreamHeaders,
          body: Buffer.from(JSON.stringify(body), "utf8"),
        });
      } catch (err) {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8", ...cors });
        res.end(
          JSON.stringify({
            error: {
              message: clientErrorMessage(err, "Upstream request failed"),
              type: "api_error",
              param: null,
              code: "upstream_unreachable",
            },
          }),
        );
        return;
      }

      const wantsStream = Boolean(payload.stream);
      if (wantsStream && upstream.ok && upstream.body) {
        try {
          const nodeReadable = Readable.fromWeb(upstream.body);
          const fwd = collectForwardResponseHeaders(upstream);
          res.writeHead(upstream.status, fwd);
          await new Promise((resolve, reject) => {
            nodeReadable.on("error", (err) => {
              try {
                res.destroy();
              } catch {
                /* ignore */
              }
              reject(err);
            });
            res.on("close", () => {
              try {
                nodeReadable.destroy();
              } catch {
                /* ignore */
              }
              resolve();
            });
            nodeReadable.on("end", resolve);
            nodeReadable.pipe(res);
          });
        } catch {
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8", ...cors });
            res.end(
              JSON.stringify({
                error: {
                  message: "Streaming proxy failed in this Node runtime.",
                  type: "api_error",
                  param: null,
                  code: "streaming_unavailable",
                },
              }),
            );
          }
        }
        return;
      }

      const outBuf = Buffer.from(await upstream.arrayBuffer());
      const canRetry =
        i < modelsToTry.length - 1 && isOllamaModelNotFound(upstream.status, outBuf);
      if (canRetry) {
        if (orchestrationRequestLogEnabled()) {
          console.error(
            `[agentic-orchestration-web] ${pathLabel} ollama model missing; retry fallback`,
            JSON.stringify({ requestedModel, fallbackModel: modelsToTry[i + 1] }),
          );
        }
        continue;
      }

      const fwd = collectForwardResponseHeaders(upstream);
      res.writeHead(upstream.status, fwd);
      res.end(outBuf);
      return;
    }
  };

  if (kind === "ollama") {
    await ollamaChatProxyGate.run(runProxy);
  } else {
    await runProxy();
  }
}

async function handleOpenAiChatCompletions(req, res) {
  const cors = chatCompletionsCorsHeaders();

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "Method not allowed",
          type: "invalid_request_error",
          param: null,
          code: "method_not_allowed",
        },
      }),
    );
    return;
  }

  if (
    !applyApiAccessGate(req, res, {
      envKeys: [process.env.AGENTIC_CHAT_COMPLETIONS_API_KEY || ""],
      cors,
      openAiStyle: true,
      pathLabel: "/v1/chat/completions",
    })
  ) {
    return;
  }

  let bodyBuf;
  try {
    bodyBuf = await readRequestBodyBuf(req, MAX_CHAT_COMPLETIONS_BODY_BYTES);
  } catch (err) {
    res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: clientErrorMessage(err, "Request body too large"),
          type: "invalid_request_error",
          param: null,
          code: "request_too_large",
        },
      }),
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(bodyBuf.length ? bodyBuf.toString("utf8") : "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "Invalid JSON body",
          type: "invalid_request_error",
          param: null,
          code: "invalid_json",
        },
      }),
    );
    return;
  }

  if (
    payload == null ||
    typeof payload !== "object" ||
    typeof payload.model !== "string" ||
    !payload.model.trim() ||
    !Array.isArray(payload.messages)
  ) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "'model' (string) and 'messages' (array) are required.",
          type: "invalid_request_error",
          param: null,
          code: "missing_required_parameter",
        },
      }),
    );
    return;
  }

  const agentic = applyAppPrefsToAgentic(
    normalizeAgenticExtension(payload.agentic),
    req.agenticAuth?.prefs,
  );
  const backend = resolveChatCompletionsBackend(payload.model, agentic);

  // openai / ollama: real LLM proxy (HA LLM Vision, watering, OpenAI SDKs).
  // orchestrate: spawn main.py dynamic run (OpenClaw / agentic clients).
  if (backend === "orchestrate") {
    const wantStream = Boolean(payload.stream);

    let dynamicText = messagesToDynamicText(payload.messages);
    let attachmentManifestPath = null;
    const messageMediaFiles = await extractOpenAiMediaFilesFromMessages(payload.messages);
    let attachmentCombinedCount = 0;
    try {
      const merged = mergeAttachmentFilesAndWriteManifest(
        TOOL_ROOT,
        agentic.files,
        messageMediaFiles,
      );
      attachmentManifestPath = merged.manifestPath;
      attachmentCombinedCount = merged.combinedCount;
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: clientErrorMessage(err, "Invalid attachment"),
            type: "invalid_request_error",
            param: "attachments",
            code: "invalid_attachment",
          },
        }),
      );
      return;
    }
    if (attachmentCombinedCount > 0 && !attachmentManifestPath) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message:
              "Embedded attachments or agentic.files could not be decoded. Use data:image/* or data:video/* base64 URLs, or reachable http(s) URLs in image_url / video_url (or input_image / input_video) parts (fetch: AGENTIC_OPENAI_PROXY_FETCH_MEDIA_URLS or AGENTIC_OPENAI_PROXY_FETCH_IMAGE_URLS), or base64 in agentic.files[].data / .base64.",
            type: "invalid_request_error",
            param: "messages.media_parts",
            code: "invalid_attachment",
          },
        }),
      );
      return;
    }
    if (!dynamicText.trim() && attachmentManifestPath) {
      dynamicText =
        "Analyze the attached files and follow any instructions in their names or contents.";
    }
    if (!dynamicText.trim()) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message:
              "messages must yield non-empty text for orchestration (or attach files under agentic.files / embedded image, video, or input_image / input_video parts).",
            type: "invalid_request_error",
            param: "messages",
            code: "empty_prompt",
          },
        }),
      );
      return;
    }

    if (orchestrationRequestLogEnabled()) {
      console.error(
        "[agentic-orchestration-web] /v1/chat/completions orchestrate",
        JSON.stringify({
          model: payload.model.trim(),
          remote: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "",
          promptChars: dynamicText.length,
          attachmentManifest: Boolean(attachmentManifestPath),
          attachmentSlots: attachmentCombinedCount,
          attachmentMediaPartsDecoded: messageMediaFiles.length,
          runMode: String(agentic.runMode || "dynamic").trim(),
          stream: wantStream,
        }),
      );
    }

    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl-agentic-${crypto.randomUUID()}`;
    const model = payload.model.trim();
    const streamOut = wantStream
      ? beginOrchestratedChatCompletionStream(res, { id, created, model, cors })
      : null;

    let runResult;
    try {
      runResult = await runDynamicAwait({
        text: dynamicText,
        runMode: agentic.runMode,
        iterativeRounds: agentic.iterativeRounds,
        autoIter: Boolean(agentic.autoIter),
        iterativeMaxRounds: agentic.iterativeMaxRounds,
        noSynthesize: Boolean(agentic.noSynthesize),
        sessionId: agentic.sessionId,
        resetSession: effectiveOpenAiProxyOrchestratorReset(agentic),
        noVerify: agentic.noVerify !== false,
        verboseCrew: Boolean(agentic.verboseCrew) || chatCompletionsVerboseCrewFromEnv(),
        selectedAgentProviderIds: effectiveOpenAiProxyAgentProviderIds(
          agentic.selectedAgentProviderIds,
          req.agenticAuth?.prefs,
        ),
        attachmentManifestPath,
        disableAnswerCache: openAiApiDisablesAnswerCache(),
        userName: userNameFromRequestHeaders(req.headers),
        identityEnv: spawnIdentityEnvFromReq(req),
      });
      if (runResult?.runId) req.agenticRunId = runResult.runId;
    } catch (err) {
      if (streamOut) {
        streamOut.fail(clientErrorMessage(err, "Orchestration failed"));
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: clientErrorMessage(err, "Orchestration failed"),
            type: "agentic_run_error",
            param: null,
            code: "orchestration_failed",
          },
        }),
      );
      return;
    }

    if (runResult.code !== 0) {
      const hint = [runResult.stderr, runResult.stdout].filter(Boolean).join("\n").trim();
      const message = `Orchestration exited with code ${runResult.code}.${hint ? `\n${hint}` : ""}`;
      if (streamOut) {
        streamOut.fail(message);
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message,
            type: "agentic_run_error",
            param: null,
            code: "orchestration_exit_nonzero",
          },
        }),
      );
      return;
    }

    const content = normalizeOrchestratedApiContent(runResult.stdout);
    if (streamOut) {
      streamOut.finish(content);
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        id,
        object: "chat.completion",
        created,
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      }),
    );
    return;
  }

  await proxyOpenAiCompatibleUpstream(req, res, {
    cors,
    payload,
    pathSuffix: "chat/completions",
    kind: backend,
    pathLabel: "/v1/chat/completions",
  });
}

async function handleOpenAiResponses(req, res) {
  const cors = chatCompletionsCorsHeaders();

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "Method not allowed",
          type: "invalid_request_error",
          param: null,
          code: "method_not_allowed",
        },
      }),
    );
    return;
  }

  if (
    !applyApiAccessGate(req, res, {
      envKeys: [process.env.AGENTIC_CHAT_COMPLETIONS_API_KEY || ""],
      cors,
      openAiStyle: true,
      pathLabel: "/v1/responses",
    })
  ) {
    return;
  }

  let bodyBuf;
  try {
    bodyBuf = await readRequestBodyBuf(req, MAX_CHAT_COMPLETIONS_BODY_BYTES);
  } catch (err) {
    res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: clientErrorMessage(err, "Request body too large"),
          type: "invalid_request_error",
          param: null,
          code: "request_too_large",
        },
      }),
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(bodyBuf.length ? bodyBuf.toString("utf8") : "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "Invalid JSON body",
          type: "invalid_request_error",
          param: null,
          code: "invalid_json",
        },
      }),
    );
    return;
  }

  if (payload == null || typeof payload !== "object" || typeof payload.model !== "string" || !payload.model.trim()) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: {
          message: "'model' (string) is required.",
          type: "invalid_request_error",
          param: null,
          code: "missing_required_parameter",
        },
      }),
    );
    return;
  }

  const agentic = applyAppPrefsToAgentic(
    normalizeAgenticExtension(payload.agentic),
    req.agenticAuth?.prefs,
  );
  const backend = resolveChatCompletionsBackend(payload.model, agentic);

  if (backend === "orchestrate") {
    if (Boolean(payload.stream)) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message:
              "Streaming is not supported when agentic orchestration is requested. Omit \"stream\" or set agentic.runMode to omit dynamic routing.",
            type: "invalid_request_error",
            param: "stream",
            code: "unsupported_parameter",
          },
        }),
      );
      return;
    }

    const responseMessages = responsesInputToMessages(payload.input);
    let dynamicText = messagesToDynamicText(responseMessages);
    let attachmentManifestPath = null;
    const messageMediaFiles = await extractOpenAiMediaFilesFromMessages(responseMessages);
    let attachmentCombinedCount = 0;
    try {
      const merged = mergeAttachmentFilesAndWriteManifest(
        TOOL_ROOT,
        agentic.files,
        messageMediaFiles,
      );
      attachmentManifestPath = merged.manifestPath;
      attachmentCombinedCount = merged.combinedCount;
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: clientErrorMessage(err, "Invalid attachment"),
            type: "invalid_request_error",
            param: "attachments",
            code: "invalid_attachment",
          },
        }),
      );
      return;
    }
    if (attachmentCombinedCount > 0 && !attachmentManifestPath) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message:
              "Embedded attachments or agentic.files could not be decoded. Use data:image/* or data:video/* base64 URLs, or reachable http(s) URLs in image_url / video_url (or input_image / input_video) parts (fetch: AGENTIC_OPENAI_PROXY_FETCH_MEDIA_URLS or AGENTIC_OPENAI_PROXY_FETCH_IMAGE_URLS), or base64 in agentic.files[].data / .base64.",
            type: "invalid_request_error",
            param: "input.media_parts",
            code: "invalid_attachment",
          },
        }),
      );
      return;
    }

    if (!dynamicText.trim() && attachmentManifestPath) {
      dynamicText =
        "Analyze the attached files and follow any instructions in their names or contents.";
    }
    if (!dynamicText.trim()) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message:
              "input must yield non-empty text for orchestration (or attach files under agentic.files / embedded image, video, or input_image / input_video parts).",
            type: "invalid_request_error",
            param: "input",
            code: "empty_prompt",
          },
        }),
      );
      return;
    }

    if (orchestrationRequestLogEnabled()) {
      console.error(
        "[agentic-orchestration-web] /v1/responses orchestrate",
        JSON.stringify({
          model: typeof payload.model === "string" ? payload.model.trim() : "",
          remote: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "",
          promptChars: dynamicText.length,
          attachmentManifest: Boolean(attachmentManifestPath),
          attachmentSlots: attachmentCombinedCount,
          attachmentMediaPartsDecoded: messageMediaFiles.length,
          runMode: String(agentic.runMode || "dynamic").trim(),
        }),
      );
    }

    let runResult;
    try {
      runResult = await runDynamicAwait({
        text: dynamicText,
        runMode: agentic.runMode,
        iterativeRounds: agentic.iterativeRounds,
        autoIter: Boolean(agentic.autoIter),
        iterativeMaxRounds: agentic.iterativeMaxRounds,
        noSynthesize: Boolean(agentic.noSynthesize),
        sessionId: agentic.sessionId,
        resetSession: effectiveOpenAiProxyOrchestratorReset(agentic),
        noVerify: agentic.noVerify !== false,
        verboseCrew: Boolean(agentic.verboseCrew) || chatCompletionsVerboseCrewFromEnv(),
        selectedAgentProviderIds: effectiveOpenAiProxyAgentProviderIds(
          agentic.selectedAgentProviderIds,
          req.agenticAuth?.prefs,
        ),
        attachmentManifestPath,
        disableAnswerCache: openAiApiDisablesAnswerCache(),
        userName: userNameFromRequestHeaders(req.headers),
        identityEnv: spawnIdentityEnvFromReq(req),
      });
      if (runResult?.runId) req.agenticRunId = runResult.runId;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: clientErrorMessage(err, "Orchestration failed"),
            type: "agentic_run_error",
            param: null,
            code: "orchestration_failed",
          },
        }),
      );
      return;
    }

    if (runResult.code !== 0) {
      const hint = [runResult.stderr, runResult.stdout].filter(Boolean).join("\n").trim();
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
      res.end(
        JSON.stringify({
          error: {
            message: `Orchestration exited with code ${runResult.code}.${hint ? `\n${hint}` : ""}`,
            type: "agentic_run_error",
            param: null,
            code: "orchestration_exit_nonzero",
          },
        }),
      );
      return;
    }

    const content = normalizeOrchestratedApiContent(runResult.stdout);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify(buildResponsesSuccessPayload(payload.model.trim(), content)));
    return;
  }

  await proxyOpenAiCompatibleUpstream(req, res, {
    cors,
    payload,
    pathSuffix: "responses",
    kind: backend,
    pathLabel: "/v1/responses",
  });
}

/**
 * Purpose-built bridge for the OpenClaw plugin.
 * Simpler than /v1/chat/completions: { text, sessionId, … } → { ok, output }.
 */
async function handleApiV1Orchestrate(req, res) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (
    !applyApiAccessGate(req, res, {
      envKeys: [
        process.env.AGENTIC_ORCHESTRATE_API_KEY || "",
        process.env.AGENTIC_CHAT_COMPLETIONS_API_KEY || "",
      ],
      cors,
      openAiStyle: false,
      pathLabel: "/api/v1/orchestrate",
    })
  ) {
    return;
  }

  let bodyBuf;
  try {
    bodyBuf = await readRequestBodyBuf(req, MAX_CHAT_COMPLETIONS_BODY_BYTES);
  } catch (err) {
    res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify({ error: clientErrorMessage(err, "Request body too large") }));
    return;
  }

  let body;
  try {
    body = JSON.parse(bodyBuf.length ? bodyBuf.toString("utf8") : "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify({ error: "body.text is required" }));
    return;
  }
  req.agenticAuthPromptChars = text.length;

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const resetSession = body.resetSession === true;
  const runMode = effectiveRunMode(body.runMode, req.agenticAuth?.prefs, "dynamic");
  const verboseCrew = body.verboseCrew === true;
  // Same catalog restriction as OpenAI-proxy / WS paths (env or body).
  const selectedIds = effectiveOpenAiProxyAgentProviderIds(
    body.selectedAgentProviderIds,
    req.agenticAuth?.prefs,
  );
  const simpleChat = isSimpleChatPrompt(text);
  const effectiveReset = resetSession || simpleChat;
  const performanceEnv = simpleChat
    ? performanceSpawnEnvOverrides({
        limitPlannerHistory: true,
        plannerMaxTurns: 2,
        plannerExcerptChars: 2000,
        skipFinalQa: true,
        skipLearningEval: true,
      })
    : {};

  if (orchestrationRequestLogEnabled() || simpleChat) {
    console.error(
      "[agentic orchestrate]",
      JSON.stringify({
        remote: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "",
        promptChars: text.length,
        sessionId: sessionId || "",
        runMode: String(runMode).trim(),
        resetSession: effectiveReset,
        simpleChat,
        selectedAgentProviderIds: selectedIds,
      }),
    );
  }

  let runResult;
  beginOrchestrateOllamaBusy();
  try {
    runResult = await runDynamicAwait({
      text,
      runMode,
      sessionId,
      resetSession: effectiveReset,
      verboseCrew,
      selectedAgentProviderIds: selectedIds,
      performanceEnv,
      userName: userNameFromRequestHeaders(req.headers),
      identityEnv: spawnIdentityEnvFromReq(req),
    });
    if (runResult?.runId) req.agenticRunId = runResult.runId;
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(JSON.stringify({ error: clientErrorMessage(e, "Orchestration failed") }));
    return;
  } finally {
    endOrchestrateOllamaBusy();
  }

  if (runResult.code !== 0) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
    res.end(
      JSON.stringify({
        error: "Orchestration process exited with non-zero code",
        code: runResult.code,
        stderr: runResult.stderr?.slice(-2000),
      }),
    );
    return;
  }

  const output = normalizeOrchestratedApiContent(runResult.stdout);
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", ...cors });
  res.end(JSON.stringify({ ok: true, output }));
}

function sendAgentProvidersJson(res) {
  let data;
  try {
    data = loadAgentProvidersForUi();
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: clientErrorMessage(err, "Failed to load agent providers") }));
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Agentic-AgentProviders": "1",
  });
  res.end(JSON.stringify({ providers: data }));
}

function handleHttp(req, res) {
  if (tryServeVendorAsset(req, res)) {
    return;
  }
  const reqPath = getRequestPathname(req);
  if (reqPath === "/metrics" || reqPath.endsWith("/metrics")) {
    const body = metricsText();
    res.writeHead(200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    });
    res.end(body);
    return;
  }
  if (isOpenAiChatCompletionsPath(req)) {
    handleOpenAiChatCompletions(req, res).catch((err) => {
      if (!res.headersSent) {
        const cors = chatCompletionsCorsHeaders();
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
        res.end(
          JSON.stringify({
            error: {
              message: clientErrorMessage(err, "Internal server error"),
              type: "api_error",
              param: null,
              code: "internal_error",
            },
          }),
        );
      } else {
        try {
          res.destroy();
        } catch {
          /* ignore */
        }
      }
    });
    return;
  }
  if (isOpenAiResponsesPath(req)) {
    handleOpenAiResponses(req, res).catch((err) => {
      if (!res.headersSent) {
        const cors = chatCompletionsCorsHeaders();
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", ...cors });
        res.end(
          JSON.stringify({
            error: {
              message: clientErrorMessage(err, "Internal server error"),
              type: "api_error",
              param: null,
              code: "internal_error",
            },
          }),
        );
      } else {
        try {
          res.destroy();
        } catch {
          /* ignore */
        }
      }
    });
    return;
  }
  if (isApiPing(req)) {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "X-Agentic-Web": "1",
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "agentic-orchestration-web",
        pid: process.pid,
        instance: WEB_INSTANCE_ID,
      }),
    );
    return;
  }
  if (isApiSession(req)) {
    if (!applyFirstPartyUiAccessGate(req, res)) return;
    const userName = userNameFromRequestHeaders(req.headers);
    const sessionId = resolveSessionIdFromHeaders(req.headers);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ userName, sessionId }));
    return;
  }
  if (isApiHostMetrics(req)) {
    if (!applyWebUiAccessGate(req, res, { allowBootstrap: false })) return;
    sampleHostMetrics()
      .then((metrics) => {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(metrics));
      })
      .catch((err) => {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error: clientErrorMessage(err, "Failed to read host metrics"),
          }),
        );
      });
    return;
  }
  if (isAgentProvidersApi(req)) {
    if (!applyChatUiAccessGate(req, res)) return;
    sendAgentProvidersJson(res);
    return;
  }
  if (isApiV1Orchestrate(req)) {
    handleApiV1Orchestrate(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: clientErrorMessage(err, "Internal server error") }));
      } else {
        try {
          res.destroy();
        } catch {
          /* ignore */
        }
      }
    });
    return;
  }
  const adminPath = getRequestPathname(req);
  const adminRoute = matchAdminRoute(adminPath);
  if (adminRoute) {
    if (!applyWebUiAccessGate(req, res, { routeName: adminRoute.name })) return;
    handleAdminApi(req, res, {
      pathname: adminPath,
      toolRoot: TOOL_ROOT,
      webRoot: __dirname,
      webInstanceId: WEB_INSTANCE_ID,
      webPid: process.pid,
      req,
    }).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: clientErrorMessage(err, "Admin API error") }));
      }
    });
    return;
  }
  serveStatic(req, res);
}

function serveStatic(req, res) {
  const normalizedPath = getRequestPathname(req);
  let p = normalizedPath;
  if (p === "/") p = "/index.html";
  // Angular Admin SPA under /admin/ — fall back to index.html for client routes.
  if (p === "/admin" || p === "/admin/") p = "/admin/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  const sendFile = (resolvedPath) => {
    fs.readFile(resolvedPath, (err, data) => {
      if (err) {
        // Fuse typography uses /fonts/...; edge hostPath also mounts them under /admin/fonts.
        if (p.startsWith("/fonts/")) {
          const alt = path.join(PUBLIC_DIR, "admin", p.replace(/^\//, ""));
          if (alt.startsWith(PUBLIC_DIR + path.sep) && alt !== resolvedPath) {
            fs.readFile(alt, (altErr, altData) => {
              if (altErr) {
                res.writeHead(404).end("Not found");
                return;
              }
              const ext = path.extname(alt);
              res.writeHead(200, {
                "Content-Type": MIME[ext] || "application/octet-stream",
              });
              res.end(altData);
            });
            return;
          }
        }
        if (p.startsWith("/admin/") && !p.includes(".")) {
          const spaIndex = path.join(PUBLIC_DIR, "admin", "index.html");
          fs.readFile(spaIndex, (spaErr, spaData) => {
            if (spaErr) {
              res.writeHead(404).end("Admin UI not built. Run: cd agentic-orchestration-admin && npm ci && npm run build");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
            res.end(spaData);
          });
          return;
        }
        res.writeHead(404).end("Not found");
        return;
      }
      const ext = path.extname(resolvedPath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  };
  sendFile(filePath);
}

const MAX_UPLOAD_FILES = 8;

function envAttachmentByteCap(name, fallback, hardMax) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1024) return fallback;
  return Math.min(hardMax, Math.floor(n));
}

/** Single image / non-media attachment cap (base64 decode size). */
const MAX_ATTACH_IMAGE_BYTES = envAttachmentByteCap(
  "AGENTIC_OPENAI_PROXY_MAX_IMAGE_BYTES",
  5 * 1024 * 1024,
  80 * 1024 * 1024,
);
/** Single audio attachment cap. */
const MAX_ATTACH_AUDIO_BYTES = envAttachmentByteCap(
  "AGENTIC_OPENAI_PROXY_MAX_AUDIO_BYTES",
  40 * 1024 * 1024,
  256 * 1024 * 1024,
);
/** Single video attachment cap (MP4/WebM fetch or data URL). */
const MAX_ATTACH_VIDEO_BYTES = envAttachmentByteCap(
  "AGENTIC_OPENAI_PROXY_MAX_VIDEO_BYTES",
  80 * 1024 * 1024,
  512 * 1024 * 1024,
);
/** Sum of all files in one manifest (images + audio + videos + agentic.files). */
const MAX_ATTACH_TOTAL_BYTES = envAttachmentByteCap(
  "AGENTIC_OPENAI_PROXY_MAX_ATTACHMENT_TOTAL_BYTES",
  200 * 1024 * 1024,
  1024 * 1024 * 1024,
);

function attachmentMaxBytesForMime(mime) {
  const m = String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (m.startsWith("video/")) return MAX_ATTACH_VIDEO_BYTES;
  if (m.startsWith("audio/")) return MAX_ATTACH_AUDIO_BYTES;
  return MAX_ATTACH_IMAGE_BYTES;
}

function safeUploadBasename(name) {
  const base = path.basename(String(name || "file").replace(/\\/g, "/"));
  const cleaned = base.replace(/[^\w.\-()+&@#$%[\]{} ]+/g, "_").trim();
  return cleaned.slice(0, 200) || "file.bin";
}

/**
 * Writes uploaded files under `<toolRoot>/_web_uploads/<uuid>/` and returns the manifest path
 * for `python main.py --dynamic-attachments`.
 */
function writeDynamicAttachmentManifest(toolRoot, files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const id = crypto.randomUUID();
  const dir = path.join(toolRoot, "_web_uploads", id);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = { files: [] };
  let total = 0;
  const n = Math.min(files.length, MAX_UPLOAD_FILES);
  for (let i = 0; i < n; i++) {
    const f = files[i];
    const b64 = typeof f.data === "string" ? f.data : f.base64;
    if (!b64 || typeof b64 !== "string") continue;
    let buf;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      continue;
    }
    const declaredMime =
      typeof f.mime === "string" && f.mime.trim() ? f.mime.trim() : "application/octet-stream";
    const maxForFile = attachmentMaxBytesForMime(declaredMime);
    if (buf.length > maxForFile) {
      throw new Error(`File too large (max ${maxForFile} bytes each for this MIME type).`);
    }
    total += buf.length;
    if (total > MAX_ATTACH_TOTAL_BYTES) {
      throw new Error(`Total upload too large (max ${MAX_ATTACH_TOTAL_BYTES} bytes).`);
    }
    const name = safeUploadBasename(f.name);
    const dest = path.join(dir, `${i}_${name}`);
    fs.writeFileSync(dest, buf);
    manifest.files.push({
      path: dest,
      name,
      mime: declaredMime,
      size: buf.length,
    });
  }
  if (manifest.files.length === 0) return null;
  const manifestPath = path.join(dir, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return manifestPath;
}

/** When truthy, keep `_web_uploads/<uuid>/` after orchestration; default is delete for privacy/disk. */
function webUploadsPersistenceEnabled() {
  const v = String(process.env.AGENTIC_WEB_PERSIST_UPLOADS || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(v);
}

/**
 * Remove a dynamic-attachment session directory created by `writeDynamicAttachmentManifest`
 * (`<toolRoot>/_web_uploads/<uuid>/`). No-op if persistence is enabled or path is unexpected.
 */
function maybeRemoveWebUploadSession(toolRoot, manifestPath) {
  if (!manifestPath || webUploadsPersistenceEnabled()) return;
  try {
    const root = path.resolve(toolRoot);
    const man = path.resolve(String(manifestPath));
    if (path.basename(man) !== "_manifest.json") return;
    const uploadsRoot = path.resolve(path.join(root, "_web_uploads"));
    const sessionDir = path.resolve(path.dirname(man));
    if (path.dirname(sessionDir) !== uploadsRoot) return;
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch (err) {
    console.error("[agentic-orchestration-web] failed to remove upload session:", err);
  }
}

/** When unset or truthy, HTTP(S) image_url targets are fetched (opt out with 0/false/off). */
function remoteOpenAiImageFetchEnabled() {
  const fetchEnv = process.env.AGENTIC_OPENAI_PROXY_FETCH_IMAGE_URLS;
  const v = String(fetchEnv != null ? fetchEnv : "1").trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(v);
}

/** Prefer `AGENTIC_OPENAI_PROXY_FETCH_MEDIA_URLS` when set; otherwise same semantics as image fetch flag. */
function remoteOpenAiAttachmentUrlFetchEnabled() {
  const rawMedia = process.env.AGENTIC_OPENAI_PROXY_FETCH_MEDIA_URLS;
  if (rawMedia != null && String(rawMedia).trim() !== "") {
    const v = String(rawMedia).trim().toLowerCase();
    return !["0", "false", "no", "off"].includes(v);
  }
  return remoteOpenAiImageFetchEnabled();
}

function openAiImageFetchTimeoutMs() {
  const raw = String(process.env.AGENTIC_OPENAI_PROXY_FETCH_IMAGE_TIMEOUT_MS || "").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 20000;
  return Math.min(120000, Math.max(1000, Math.floor(n)));
}

/** Optional SSRF hardening: blocks obvious loopback / RFC1918-style literals (hostname resolution not checked). */
function openAiFetchDenyPrivateNetworksEnabled() {
  const v = String(process.env.AGENTIC_OPENAI_PROXY_FETCH_IMAGE_DENY_PRIVATE_NETWORKS || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(v);
}

function openAiFetchHostnameBlocked(parsedUrl) {
  if (!openAiFetchDenyPrivateNetworksEnabled()) return false;
  const rawHost = String(parsedUrl.hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  if (rawHost === "localhost" || rawHost.endsWith(".localhost")) return true;
  if (rawHost === "::1") return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ipv4.exec(rawHost);
  if (m) {
    const quad = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (quad.some((x) => x > 255)) return true;
    const [a, b] = quad;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  if (rawHost.includes(":")) {
    if (rawHost.startsWith("fe80:")) return true;
    const head = rawHost.split(":")[0];
    if (/^f[c-d][0-9a-f]{2}$/i.test(head)) return true;
  }
  return false;
}

function sniffImageMimeFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "image/gif";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function sniffVideoMimeFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "qt  " || brand === "mov ") return "video/quicktime";
    return "video/mp4";
  }
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

function maxRemoteFetchBytesForContentTypeProbe(ctRaw) {
  const ct = String(ctRaw || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (ct.startsWith("video/")) return MAX_ATTACH_VIDEO_BYTES;
  if (ct.startsWith("image/")) return MAX_ATTACH_IMAGE_BYTES;
  return MAX_ATTACH_VIDEO_BYTES;
}

async function readFetchBodyWithMaxBytes(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    try {
      const ab = await response.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > maxBytes) return null;
      return buf;
    } catch {
      return null;
    }
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || !value.length) continue;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
  } catch {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    return null;
  }
}

async function fetchHttpMediaUrlAsManifestEntry(urlRaw, seq, partKind) {
  const raw = String(urlRaw || "").trim();
  if (!raw || /^data:/i.test(raw)) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (openAiFetchHostnameBlocked(u)) return null;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), openAiImageFetchTimeoutMs());
  try {
    const res = await fetch(raw, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        Accept: "image/*,video/*,application/octet-stream;q=0.8,*/*;q=0.5",
        "User-Agent": "agentic-orchestration-web/openai-proxy",
      },
    });
    if (!res.ok) return null;

    const ctHdr = res.headers.get("content-type");
    const readCap = maxRemoteFetchBytesForContentTypeProbe(ctHdr);
    const cl = res.headers.get("content-length");
    if (cl && /^\d+$/.test(cl.trim()) && Number(cl) > readCap) return null;

    const buf = await readFetchBodyWithMaxBytes(res, readCap);
    if (!buf || buf.length === 0) return null;

    const ct = String(ctHdr || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    let mime = ct.startsWith("image/") || ct.startsWith("video/") ? ct : null;
    if (!mime) mime = sniffImageMimeFromBuffer(buf) || sniffVideoMimeFromBuffer(buf);
    if (!mime || !(mime.startsWith("image/") || mime.startsWith("video/"))) return null;

    if (partKind === "image" && !mime.startsWith("image/")) return null;
    if (partKind === "video" && !mime.startsWith("video/")) return null;

    const cap = attachmentMaxBytesForMime(mime);
    if (buf.length > cap) return null;

    const ext = extensionForMediaMime(mime);
    const prefix = mime.startsWith("video/") ? "openai_video" : "openai_image";
    return {
      data: buf.toString("base64"),
      name: `${prefix}_${seq}.${ext}`,
      mime,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Collect embedded images and videos from chat-style messages:
 * parts with type `image_url` / `video_url`, or Responses-style `input_image` / `input_video`
 * (each `{ url }` or string URL on the matching field).
 * Supports data:image/* and data:video/* base64 URLs and HTTP(S) when fetch is enabled.
 * Returns entries compatible with writeDynamicAttachmentManifest: { data, name, mime }.
 */
async function extractOpenAiMediaFilesFromMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const out = [];
  let seq = 0;
  const fetchRemote = remoteOpenAiAttachmentUrlFetchEnabled();
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    const content = msg.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const t = String(part.type || "").toLowerCase();
      const isImagePart = t === "image_url" || t === "input_image";
      const isVideoPart = t === "video_url" || t === "input_video";
      if (!isImagePart && !isVideoPart) continue;

      const holder = isImagePart ? part.image_url : part.video_url;
      const url =
        typeof holder === "string"
          ? holder
          : holder && typeof holder === "object" && typeof holder.url === "string"
            ? holder.url
            : "";
      const parsed = parseOpenAiDataUrlMedia(url);
      if (parsed) {
        let buf;
        try {
          buf = Buffer.from(parsed.base64, "base64");
        } catch {
          continue;
        }
        const cap = attachmentMaxBytesForMime(parsed.mime);
        if (!buf.length || buf.length > cap) continue;
        if (isImagePart && !parsed.mime.startsWith("image/")) continue;
        if (isVideoPart && !parsed.mime.startsWith("video/")) continue;
        const ext = extensionForMediaMime(parsed.mime);
        const prefix = parsed.mime.startsWith("video/") ? "openai_video" : "openai_image";
        out.push({
          data: parsed.base64,
          name: `${prefix}_${seq}.${ext}`,
          mime: parsed.mime,
        });
        seq += 1;
        continue;
      }
      if (fetchRemote) {
        const entry = await fetchHttpMediaUrlAsManifestEntry(
          url,
          seq,
          isVideoPart ? "video" : "image",
        );
        if (entry) {
          out.push(entry);
          seq += 1;
        }
      }
    }
  }
  return out;
}

function mintRunId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildDynamicSpawnArgs(text, opts) {
  const {
    runMode,
    iterativeRounds,
    autoIter,
    iterativeMaxRounds,
    noSynthesize,
    sessionId,
    resetSession,
    noVerify,
    verboseCrew,
    selectedAgentProviderIds,
    attachmentManifestPath,
    runId,
  } = opts;
  const mode = String(runMode || "dynamic").trim();
  const args = ["main.py"];
  const ex = String(process.env.AGENTIC_EXAMPLE || "").trim().toLowerCase();
  if (ex && Object.prototype.hasOwnProperty.call(EXAMPLE_VERTICAL_SUBDIR, ex)) {
    args.push("--example", ex);
  }
  if (mode === "dynamic-iterative") {
    args.push("--dynamic-iterative", text);
    const envDefaultRounds = envInt("AGENTIC_DYNAMIC_ITERATIVE_ROUNDS", 4, 1, 32);
    const envMaxRounds = envInt("AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS", 8, 1, 32);
    if (autoIter) {
      const uiMax = Math.max(1, Math.min(32, Number(iterativeMaxRounds || envMaxRounds)));
      const maxRounds = Math.min(uiMax, envMaxRounds);
      args.push("--dynamic-iterative-auto");
      args.push("--dynamic-iterative-max-rounds", String(maxRounds));
    } else {
      const uiRounds = Math.max(1, Math.min(32, Number(iterativeRounds || envDefaultRounds)));
      const rounds = Math.min(uiRounds, envMaxRounds);
      args.push("--dynamic-iterative-rounds", String(rounds));
    }
    if (noSynthesize) args.push("--dynamic-iterative-no-synthesize");
  } else {
    args.push("--dynamic", text);
  }
  args.push("--no-save");
  if (!verboseCrew) args.push("--quiet");
  if (noVerify !== false) args.push("--no-verify");
  if (resetSession) args.push("--orchestrator-session-reset");
  const sess = sessionId && String(sessionId).trim();
  if (sess) args.push("--orchestrator-session", sess);
  const selectedIds = Array.isArray(selectedAgentProviderIds)
    ? selectedAgentProviderIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (selectedIds.length > 0) {
    args.push("--dynamic-agent-provider-ids", selectedIds.join(","));
  }
  if (attachmentManifestPath) {
    args.push("--dynamic-attachments", attachmentManifestPath);
  }
  const rid = runId && String(runId).trim();
  if (rid) args.push("--run-id", rid);
  return args;
}

async function runDynamicAwait({
  text,
  runMode,
  iterativeRounds,
  autoIter,
  iterativeMaxRounds,
  noSynthesize,
  sessionId,
  resetSession,
  noVerify,
  verboseCrew,
  selectedAgentProviderIds,
  attachmentManifestPath,
  performanceEnv = {},
  disableAnswerCache = false,
  userName = null,
  identityEnv = {},
}) {
  const noop = () => {};
  if (!ensurePythonDepsForWebRuns(noop)) {
    throw new Error(
      "Python dependencies are missing for the configured AGENTIC_PYTHON. Auto-install failed or is disabled.",
    );
  }
  const runId = mintRunId();
  const started = Date.now();
  const args = buildDynamicSpawnArgs(text, {
    runMode,
    iterativeRounds,
    autoIter,
    iterativeMaxRounds,
    noSynthesize,
    sessionId,
    resetSession,
    noVerify,
    verboseCrew,
    selectedAgentProviderIds,
    attachmentManifestPath,
    runId,
  });
  const env = webOrchestratorSpawnEnv({
    ...(disableAnswerCache ? { AGENTIC_ANSWER_CACHE: "0" } : {}),
    ...userDisplayNameSpawnEnv(userName),
    ...identityEnv,
    AGENTIC_RUN_ID: runId,
    ...performanceEnv,
  });
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, args, {
      cwd: TOOL_ROOT,
      env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const mirror = subprocessLogToConsoleEnabled();
    if (proc.stdout) {
      proc.stdout.on("data", (chunk) => {
        const s = chunk.toString("utf8");
        stdout += s;
        if (mirror) {
          process.stderr.write(`[agentic spawn stdout] ${s}`);
        }
      });
    }
    if (proc.stderr) {
      proc.stderr.on("data", (chunk) => {
        const s = chunk.toString("utf8");
        stderr += s;
        if (mirror) {
          process.stderr.write(`[agentic spawn stderr] ${s}`);
        }
      });
    }
    proc.on("error", (err) => {
      maybeRemoveWebUploadSession(TOOL_ROOT, attachmentManifestPath);
      try {
        recordWebRunEnd({ ok: false, elapsedMs: Date.now() - started });
      } catch {
        /* ignore */
      }
      reject(err);
    });
    proc.on("close", (code, signal) => {
      maybeRemoveWebUploadSession(TOOL_ROOT, attachmentManifestPath);
      const exitCode = typeof code === "number" ? code : 0;
      try {
        recordWebRunEnd({ ok: exitCode === 0, elapsedMs: Date.now() - started });
      } catch {
        /* ignore */
      }
      resolve({
        code: exitCode,
        signal: signal || null,
        stdout,
        stderr,
        runId,
      });
    });
  });
}

function runDynamic(
  {
    text,
    runMode,
    iterativeRounds,
    autoIter,
    iterativeMaxRounds,
    noSynthesize,
    sessionId,
    resetSession,
    noVerify,
    verboseCrew,
    selectedAgentProviderIds,
    attachmentManifestPath,
    performanceEnv = {},
  },
  ws,
) {
  const runId = mintRunId();
  const started = Date.now();
  const runTag = { run_id: runId, runId };
  sendJson(ws, {
    type: "preflight",
    status: "start",
    message: "Checking Python dependencies…",
    ...runTag,
  });
  if (!ensurePythonDepsForWebRuns((msg) => sendJson(ws, { type: "preflight", status: "progress", message: String(msg || ""), ...runTag }))) {
    maybeRemoveWebUploadSession(TOOL_ROOT, attachmentManifestPath);
    sendJson(ws, { type: "preflight", status: "error", message: "Python dependency healing failed.", ...runTag });
    sendJson(ws, {
      type: "error",
      message:
        "Python dependencies are missing for the configured AGENTIC_PYTHON. Auto-install failed or is disabled. Activate/install the tool venv and restart web server.",
      ...runTag,
    });
    ws._busy = false;
    return;
  }
  sendJson(ws, { type: "preflight", status: "done", message: "Dependencies ready.", ...runTag });

  const args = buildDynamicSpawnArgs(text, {
    runMode,
    iterativeRounds,
    autoIter,
    iterativeMaxRounds,
    noSynthesize,
    sessionId,
    resetSession,
    noVerify,
    verboseCrew,
    selectedAgentProviderIds,
    attachmentManifestPath,
    runId,
  });

  sendJson(ws, { type: "run_start", args, ...runTag });

  const env = {
    ...webOrchestratorSpawnEnvForWs(ws, performanceEnv),
    AGENTIC_RUN_ID: runId,
  };

  const proc = spawn(PYTHON, args, {
    cwd: TOOL_ROOT,
    env,
    shell: false,
  });

  if (proc.stdout) {
    proc.stdout.on("data", (chunk) => {
      sendJson(ws, { type: "chunk", stream: "stdout", text: chunk.toString("utf8"), ...runTag });
    });
  }
  if (proc.stderr) {
    proc.stderr.on("data", (chunk) => {
      sendJson(ws, { type: "chunk", stream: "stderr", text: chunk.toString("utf8"), ...runTag });
    });
  }
  proc.on("error", (err) => {
    maybeRemoveWebUploadSession(TOOL_ROOT, attachmentManifestPath);
    sendJson(ws, {
      type: "error",
      message: clientErrorMessage(err, "Failed to start orchestration process"),
      ...runTag,
    });
    try {
      recordWebRunEnd({ ok: false, elapsedMs: Date.now() - started });
    } catch {
      /* ignore */
    }
    ws._busy = false;
  });
  proc.on("close", (code, signal) => {
    maybeRemoveWebUploadSession(TOOL_ROOT, attachmentManifestPath);
    const exitCode = typeof code === "number" ? code : 0;
    sendJson(ws, {
      type: "run_end",
      code: exitCode,
      signal: signal || null,
      ...runTag,
    });
    try {
      recordWebRunEnd({ ok: exitCode === 0, elapsedMs: Date.now() - started });
    } catch {
      /* ignore */
    }
    ws._busy = false;
  });
}

function runPlannerGreet(ws) {
  if (!webPlannerGreetEnabled()) {
    const fallback = webWelcomeMessage();
    if (fallback) {
      sendJson(ws, {
        type: "welcome_message",
        text: stripWrappingQuotes(fallback),
        fallback: true,
      });
    }
    return;
  }
  if (ws._greetBusy) return;
  ws._greetBusy = true;
  sendJson(ws, { type: "welcome_start" });

  const proc = spawn(PYTHON, ["-m", "orchestration.planner_greeting", "--quiet"], {
    cwd: TOOL_ROOT,
    env: webOrchestratorSpawnEnvForWs(ws),
    shell: false,
  });
  let stdout = "";
  let stderr = "";
  if (proc.stdout) {
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
  }
  if (proc.stderr) {
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
  }
  proc.on("error", (err) => {
    ws._greetBusy = false;
    const fallback = webWelcomeMessage();
    if (fallback) {
      sendJson(ws, { type: "welcome_message", text: fallback, fallback: true });
    } else {
      sendJson(ws, {
        type: "welcome_error",
        message: clientErrorMessage(err, "Planner greeting failed"),
      });
    }
  });
  proc.on("close", (code) => {
    ws._greetBusy = false;
    const text = stripWrappingQuotes(stdout.trim());
    if (code === 0 && text) {
      sendJson(ws, { type: "welcome_message", text });
      return;
    }
    const fallback = webWelcomeMessage();
    if (fallback) {
      sendJson(ws, {
        type: "welcome_message",
        text: stripWrappingQuotes(fallback),
        fallback: true,
      });
      return;
    }
    sendJson(ws, {
      type: "welcome_error",
      message:
        stderr.trim() ||
        `Planner greeting exited with code ${typeof code === "number" ? code : "unknown"}`,
    });
  });
}

const server = http.createServer(handleHttp);
const wss = new WebSocketServer({ server, perMessageDeflate: false });

let _listenErrorLogged = false;
function logListenError(err) {
  if (_listenErrorLogged) return;
  _listenErrorLogged = true;
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `[agentic-orchestration-web] port ${PORT} is already in use on ${HOST}. Another process is bound to this port (often a leftover node server.mjs). Free it, then restart. Examples: ./stop-web-bg.sh  then  AGENTIC_WEB_KILL_PORT=1 ./stop-web-bg.sh  or  ss -tlnp | grep :${PORT}`,
    );
  } else {
    console.error("[agentic-orchestration-web] server error:", err);
  }
  process.exit(1);
}

server.on("error", logListenError);
wss.on("error", logListenError);

wss.on("connection", (ws, req) => {
  if (!authorizeWsConnection(req, ws)) return;
  ws._busy = false;
  ws._greetBusy = false;
  ws._userName = userNameFromRequestHeaders(req?.headers || {});
  ws._sessionId = resolveSessionIdFromHeaders(req?.headers || {});
  ws._agenticAuth = req.agenticAuth || null;
  try {
    ws._clientIp = clientIp(req);
  } catch {
    ws._clientIp = "";
  }
  const plannerGreet = webPlannerGreetEnabled();
  sendJson(ws, {
    type: "hello",
    toolRoot: TOOL_ROOT,
    python: PYTHON,
    uiDefaults: webUiDefaultsFromEnv(),
    edgeRuntime: edgeRuntimeFromEnv(),
    plannerGreet,
    userName: ws._userName,
    sessionId: ws._sessionId,
    welcomeMessage: plannerGreet ? null : webWelcomeMessage(),
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      sendJson(ws, { type: "error", message: "Invalid JSON message" });
      return;
    }
    if (msg.type === "ping") {
      sendJson(ws, { type: "pong" });
      return;
    }
    if (msg.type === "host_metrics_subscribe") {
      startHostMetricsPush(ws);
      return;
    }
    if (msg.type === "host_metrics_unsubscribe") {
      stopHostMetricsPush(ws);
      return;
    }
    if (msg.type === "admin_logs_subscribe") {
      startAdminLogsPush(ws, sendJson, { sources: msg.sources });
      return;
    }
    if (msg.type === "admin_logs_follow_run") {
      const runId = String(msg.runId || msg.run_id || "").trim();
      if (runId) followWorkerLogsForRun(runId);
      return;
    }
    if (msg.type === "admin_logs_unsubscribe") {
      stopAdminLogsPush(ws);
      return;
    }
    if (msg.type === "topology_subscribe") {
      startTopologyPush(ws, sendJson, {
        toolRoot: TOOL_ROOT,
        webRoot: __dirname,
        webInstanceId: WEB_INSTANCE_ID,
        webPid: process.pid,
        fetchJson,
        buildCatalogs,
      });
      return;
    }
    if (msg.type === "topology_unsubscribe") {
      stopTopologyPush(ws);
      return;
    }
    if (msg.type === "topology_resync") {
      resyncTopology(ws, sendJson, {
        toolRoot: TOOL_ROOT,
        webRoot: __dirname,
        webInstanceId: WEB_INSTANCE_ID,
        webPid: process.pid,
        fetchJson,
        buildCatalogs,
      });
      return;
    }
    if (msg.type === "topology_watch_subscribe") {
      subscribeTopologyWatch(
        ws,
        sendJson,
        {
          toolRoot: TOOL_ROOT,
          webRoot: __dirname,
          webInstanceId: WEB_INSTANCE_ID,
          webPid: process.pid,
          fetchJson,
          buildCatalogs,
        },
        msg,
      ).catch(() => {});
      return;
    }
    if (msg.type === "topology_watch_unsubscribe") {
      unsubscribeTopologyWatch(ws, msg);
      return;
    }
    if (msg.type === "admin_feed_subscribe") {
      const topics = Array.isArray(msg.topics)
        ? msg.topics
        : msg.topic
          ? [msg.topic]
          : [];
      startAdminFeedsPush(
        ws,
        sendJson,
        {
          toolRoot: TOOL_ROOT,
          webRoot: __dirname,
          webInstanceId: WEB_INSTANCE_ID,
          webPid: process.pid,
          fetchJson,
          buildCatalogs,
          req,
        },
        {
          topics,
          intervalMs: msg.intervalMs,
          params: msg.params && typeof msg.params === "object" ? msg.params : {},
        },
      );
      return;
    }
    if (msg.type === "admin_feed_params") {
      updateAdminFeedsParams(
        ws,
        msg.params && typeof msg.params === "object" ? msg.params : {},
      );
      return;
    }
    if (msg.type === "admin_feed_unsubscribe") {
      const topics = Array.isArray(msg.topics)
        ? msg.topics
        : msg.topic
          ? [msg.topic]
          : null;
      stopAdminFeedsPush(ws, topics);
      return;
    }
    if (msg.type === "client_hello") {
      const resume = Boolean(msg.resume);
      if (!resume && webPlannerGreetEnabled()) {
        runPlannerGreet(ws);
      } else if (!resume) {
        const fallback = webWelcomeMessage();
        if (fallback) {
          sendJson(ws, {
            type: "welcome_message",
            text: stripWrappingQuotes(fallback),
            fallback: true,
          });
        }
      }
      return;
    }
    if (msg.type === "rate") {
      const fp = (msg.attachmentFingerprint || msg.mcpFingerprint || "none").trim() || "none";
      appendPendingRating({
        session_slug: msg.sessionId || ws._sessionId || "",
        provider_id: msg.providerId || "",
        attachment_fingerprint: fp,
        mcp_fingerprint: fp,
        task_tag: msg.taskTag || "general",
        rating: msg.rating,
      });
      sendJson(ws, { type: "rated", ok: true });
      return;
    }
    if (msg.type !== "chat") {
      sendJson(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
      return;
    }
    if (ws._busy) {
      sendJson(ws, { type: "error", message: "A run is already in progress for this connection." });
      return;
    }
    const hasFiles = Array.isArray(msg.files) && msg.files.length > 0;
    let attachmentManifestPath = null;
    if (hasFiles) {
      try {
        attachmentManifestPath = writeDynamicAttachmentManifest(TOOL_ROOT, msg.files);
      } catch (err) {
        sendJson(ws, { type: "error", message: clientErrorMessage(err, "Invalid attachment") });
        return;
      }
      if (!attachmentManifestPath) {
        sendJson(ws, { type: "error", message: "No valid file data in upload." });
        return;
      }
    }
    let text = (msg.text || "").trim();
    if (!text && attachmentManifestPath) {
      text =
        "Analyze the attached files and follow any instructions in their names or contents.";
    }
    if (!text) {
      sendJson(ws, { type: "error", message: "Empty message" });
      return;
    }
    ws._busy = true;
    const performanceEnv = webPerformanceSpawnEnv(msg);
    const msgUserName = resolveWsUserName(ws, msg.userName);
    if (msgUserName && !ws._userName) {
      ws._userName = msgUserName;
    }
    runDynamic(
      {
        text,
        runMode: msg.runMode,
        iterativeRounds: msg.iterativeRounds,
        autoIter: Boolean(msg.autoIter),
        iterativeMaxRounds: msg.iterativeMaxRounds,
        noSynthesize: Boolean(msg.noSynthesize),
        sessionId: msg.sessionId || ws._sessionId,
        resetSession: effectiveResetSession(msg, text),
        noVerify: msg.noVerify !== false,
        verboseCrew: Boolean(msg.verboseCrew),
        selectedAgentProviderIds: effectiveOpenAiProxyAgentProviderIds(
          msg.selectedAgentProviderIds,
          getAppPrefs(TOOL_ROOT, "ao-chat"),
        ),
        attachmentManifestPath,
        performanceEnv,
      },
      ws,
    );
  });

  ws.on("close", (code, reason) => {
    stopHostMetricsPush(ws);
    stopAdminLogsPush(ws);
    stopTopologyPush(ws);
    const r = reason?.toString?.() || "";
    if (code !== 1000 && code !== 1001) {
      console.error(`[agentic-orchestration-web] ws close code=${code} reason=${r.slice(0, 120)}`);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.error(`agentic-orchestration-web http://${HOST}:${PORT}/`);
  console.error(`  OpenAI-compatible POST ${`http://${HOST}:${PORT}/v1/chat/completions`}`);
  console.error(`  OpenAI-compatible POST ${`http://${HOST}:${PORT}/v1/responses`}`);
  console.error(`  instance=${WEB_INSTANCE_ID}  (curl /api/ping to verify this process)`);
  console.error(`  AGENTIC_TOOL_ROOT=${TOOL_ROOT}`);
  console.error(`  Python executable=${PYTHON}`);
  if (!(process.env.AGENTIC_PYTHON || "").trim()) {
    console.error(
      "  (set AGENTIC_PYTHON if this is wrong; install deps: pip install -r requirements.txt in AGENTIC_TOOL_ROOT)",
    );
  }
  maybeInitWebSentry().then((s) => {
    if (s?.enabled) {
      console.error("  Sentry (web) enabled via AGENTIC_WEB_SENTRY_DSN");
    }
  }).catch(() => {});
  startOllamaKeepAliveLoop();
});

/**
 * Phase 0 Admin read API helpers.
 * Secrets are never returned — only { set: true/false }.
 * Narrow write exception: API access token mint/revoke, per-app planning prefs,
 * mTLS client revoke, and allowlisted AO control restarts.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import {
  buildControlStatus,
  executeControlRestart,
} from "./admin-control.mjs";
import {
  buildTopologyGraph,
  buildTopologyNodeDetail,
} from "./admin-topology-graph.mjs";
import {
  CHAT_UI_APP_ID,
  WEB_UI_APP_ID,
  getChatAssignment,
  getWebAssignment,
  isChatUiAssigned,
  isWebUiAssigned,
  listTokens,
  listUsage,
  mintToken,
  revokeToken,
} from "./api-tokens.mjs";
import { getAppPrefs, listAppPrefs, setAppPrefs } from "./app-prefs.mjs";

// Path-like TLS keys are not secrets — operators need to see the path + existence.
const SECRET_KEY_RE =
  /(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|_PEM)$/i;
const PATH_NOT_SECRET = new Set([
  "AGENTIC_SERVE_TLS_CERTFILE",
  "AGENTIC_SERVE_TLS_KEYFILE",
  "AGENTIC_SERVE_TLS_CA_FILE",
]);

/** Kubernetes service-injection noise — not AO configuration. */
function isInjectedK8sEnvKey(key) {
  const k = String(key || "");
  return (
    /_SERVICE_HOST$/.test(k) ||
    /_SERVICE_PORT$/.test(k) ||
    /_PORT_\d+_TCP/.test(k) ||
    /_SERVICE_PORT_\w+$/.test(k)
  );
}

/** Apply tier classification for known keys. */
const TIER_LIVE = "live";
const TIER_NEXT_RUN = "next_run";
const TIER_NEXT_SESSION = "next_session";
const TIER_RESTART = "restart";
const TIER_REDEPLOY = "redeploy";

const KEY_META = {
  // LLM credentials → restart
  OPENAI_API_KEY: { group: "models", tier: TIER_RESTART, label: "OpenAI API key" },
  OPENAI_MODEL_NAME: { group: "models", tier: TIER_RESTART, label: "OpenAI model name" },
  OPENAI_BASE_URL: { group: "models", tier: TIER_RESTART, label: "OpenAI base URL" },
  ANTHROPIC_API_KEY: { group: "models", tier: TIER_RESTART, label: "Anthropic API key" },
  ANTHROPIC_BASE_URL: { group: "models", tier: TIER_RESTART, label: "Anthropic base URL" },
  HF_TOKEN: { group: "models", tier: TIER_RESTART, label: "Hugging Face token" },
  HUGGINGFACE_API_KEY: { group: "models", tier: TIER_RESTART, label: "Hugging Face API key" },
  HUGGINGFACE_API_BASE: { group: "models", tier: TIER_RESTART, label: "Hugging Face API base" },
  OLLAMA_HOST: { group: "models", tier: TIER_RESTART, label: "Ollama host" },
  OLLAMA_API_BASE: { group: "models", tier: TIER_RESTART, label: "Ollama API base" },
  ROUTER_OLLAMA_MODEL: { group: "models", tier: TIER_RESTART, label: "Router Ollama model" },
  VLLM_BASE_URL: { group: "models", tier: TIER_RESTART, label: "vLLM base URL" },
  VLLM_API_KEY: { group: "models", tier: TIER_RESTART, label: "vLLM API key" },
  JETSTREAM_BASE_URL: { group: "models", tier: TIER_RESTART, label: "JetStream base URL" },
  JETSTREAM_API_KEY: { group: "models", tier: TIER_RESTART, label: "JetStream API key" },
  AGENTIC_OLLAMA_KEEPALIVE: { group: "models", tier: TIER_RESTART, label: "Ollama keepalive" },
  AGENTIC_OLLAMA_KEEP_ALIVE: { group: "models", tier: TIER_RESTART, label: "Ollama keep_alive duration" },
  AGENTIC_OLLAMA_KEEPALIVE_MODELS: { group: "models", tier: TIER_RESTART, label: "Keepalive model tags" },
  AGENTIC_OLLAMA_KEEPALIVE_MODEL: { group: "models", tier: TIER_RESTART, label: "Keepalive model" },
  AGENTIC_OLLAMA_KEEPALIVE_INTERVAL_MS: {
    group: "models",
    tier: TIER_RESTART,
    label: "Keepalive interval (ms)",
  },
  AGENTIC_OLLAMA_NUM_PARALLEL: { group: "models", tier: TIER_RESTART, label: "Ollama parallel slots" },
  AGENTIC_AUTO_ENSURE_RUNTIME: { group: "models", tier: TIER_RESTART, label: "Auto-ensure runtime" },
  AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S: {
    group: "models",
    tier: TIER_RESTART,
    label: "Auto-ensure Ollama in K8s",
  },
  AGENTIC_ASSUME_GPU: { group: "models", tier: TIER_RESTART, label: "Assume GPU available" },
  AGENTIC_ASSUME_TPU: { group: "models", tier: TIER_RESTART, label: "Assume TPU available" },
  AGENTIC_ASSUME_VRAM_GB: { group: "models", tier: TIER_RESTART, label: "Assume VRAM (GiB)" },
  AGENTIC_VRAM_GB: { group: "models", tier: TIER_RESTART, label: "VRAM budget (GiB)" },
  AGENTIC_MAX_VRAM_GB: { group: "models", tier: TIER_RESTART, label: "Max VRAM (GiB)" },
  AGENTIC_MAX_VRAM_FRACTION: { group: "models", tier: TIER_RESTART, label: "Max VRAM fraction" },
  AGENTIC_AVAILABLE_ARCHITECTURES: {
    group: "models",
    tier: TIER_RESTART,
    label: "Available architectures",
  },
  AGENTIC_DISABLE_HARDWARE_FILTER: {
    group: "models",
    tier: TIER_RESTART,
    label: "Disable hardware filter",
  },
  AGENTIC_AGENT_PROVIDERS_CATALOG: {
    group: "models",
    tier: TIER_RESTART,
    label: "Agent providers catalog",
  },
  AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS: {
    group: "models",
    tier: TIER_RESTART,
    label: "Proxy dynamic provider IDs",
  },
  AGENTIC_CHAT_COMPLETIONS_BACKEND: {
    group: "models",
    tier: TIER_RESTART,
    label: "Chat completions backend",
    default: "auto",
  },
  AGENTIC_CHAT_COMPLETIONS_OLLAMA_MAX_CONCURRENT: {
    group: "models",
    tier: TIER_RESTART,
    label: "Ollama proxy max concurrent",
    default: "2",
  },
  AGENTIC_CHAT_COMPLETIONS_OLLAMA_FALLBACK_MODEL: {
    group: "models",
    tier: TIER_RESTART,
    label: "Ollama proxy fallback model",
  },

  // Planner
  AGENTIC_DYNAMIC_ITERATIVE_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Iterative rounds",
    default: "4",
    section: "iteration",
  },
  AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Max iterative rounds",
    default: "8",
    section: "iteration",
  },
  AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Min iterative rounds",
    default: "1",
    section: "iteration",
  },
  AGENTIC_ITERATIVE_CONTROLLER_MODEL: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Iterative controller model",
    section: "iteration",
  },
  AGENTIC_PLANNER_MODEL: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Planner model",
    section: "planner_model",
  },
  AGENTIC_PLANNER_USE_LITELLM: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Use LiteLLM",
    section: "planner_model",
  },
  AGENTIC_PLANNER_MAX_STEPS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Max plan steps",
    section: "run_shape",
  },
  AGENTIC_PLANNER_JSON_MODE: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Planner JSON mode",
    section: "planner_model",
  },
  AGENTIC_PLANNER_REPAIR_RETRY: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Repair retry",
    section: "planner_model",
  },
  AGENTIC_PLANNER_429_RETRIES: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "429 retries",
    section: "planner_model",
  },
  AGENTIC_PLANNER_CONTEXT_TURNS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Context turns",
    section: "sessions_cache",
  },
  AGENTIC_PLANNER_MESSAGE_CHARS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Message chars",
    section: "sessions_cache",
  },
  AGENTIC_PLANNER_TIMEOUT_SEC: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Planner timeout (s)",
    section: "planner_model",
  },
  AGENTIC_ANSWER_CACHE: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Answer cache",
    default: "1",
    component: "web",
    section: "sessions_cache",
  },
  AGENTIC_STEP_CONTEXT_INJECT: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Step context inject",
    section: "sessions_cache",
  },
  AGENTIC_STEP_CONTEXT_CHARS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Step context chars",
    section: "sessions_cache",
  },
  AGENTIC_ORCHESTRATOR_SESSION: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Orchestrator session",
    section: "sessions_cache",
  },
  AGENTIC_ORCHESTRATOR_DEFAULT_SESSION: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Default session slug",
    section: "sessions_cache",
  },
  AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Max planner turns stored",
    section: "sessions_cache",
  },
  AGENTIC_ORCHESTRATOR_EXCERPT_CHARS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Crew excerpt chars",
    section: "sessions_cache",
  },
  AGENTIC_WEB_DEFAULT_RUN_MODE: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default run mode",
    section: "web_defaults",
  },
  AGENTIC_WEB_DEFAULT_AUTO_ITER: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default auto-iter",
    section: "web_defaults",
  },
  AGENTIC_WEB_DEFAULT_ITERATIVE_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default iterative rounds",
    section: "web_defaults",
  },
  AGENTIC_WEB_DEFAULT_ITERATIVE_MAX_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default max rounds",
    section: "web_defaults",
  },
  AGENTIC_WEB_PLANNER_GREET: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Planner greeting",
    section: "web_defaults",
  },
  AGENTIC_WEB_WELCOME_MESSAGE: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Welcome message",
    section: "web_defaults",
  },

  // Execution
  AGENTIC_EXECUTION_BACKEND: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Execution backend",
    default: "inprocess",
    component: "execution",
    section: "backend",
  },
  AGENTIC_SUBPROCESS_WORKERS: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Subprocess workers",
    component: "execution",
  },
  AGENTIC_RUN_STORE_PATH: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Run store path",
    default: "/run/store",
    component: "execution",
  },
  AGENTIC_RUN_STORE_BACKEND: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Run store backend",
    default: "filesystem",
    component: "execution",
  },
  AGENTIC_K8S_WARM_POOL_ENABLED: {
    group: "execution",
    tier: TIER_REDEPLOY,
    label: "Warm pool enabled",
    default: "0",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_K8S_DELEGATION_ENABLED: {
    group: "execution",
    tier: TIER_REDEPLOY,
    label: "Delegation enabled",
    default: "0",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_K8S_NAMESPACE: {
    group: "execution",
    tier: TIER_REDEPLOY,
    label: "K8s namespace",
    default: "agentic-orchestration",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_K8S_WORKER_IMAGE: {
    group: "execution",
    tier: TIER_REDEPLOY,
    label: "Worker image",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_K8S_ALLOW_STDIO_MCPS: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Allow stdio MCPs in K8s",
    default: "0",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_K8S_WORKER_STDIO_MCPS: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Worker stdio MCP ids",
    component: "execution",
    section: "kubernetes",
  },
  AGENTIC_LOG_FORMAT: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Log format",
    default: "text",
    component: "web",
  },

  // Engine / serve
  AGENTIC_SERVE_HOST: {
    group: "engine",
    tier: TIER_RESTART,
    label: "Engine bind host",
    default: "127.0.0.1",
    component: "engine",
  },
  AGENTIC_SERVE_PORT: {
    group: "engine",
    tier: TIER_RESTART,
    label: "Engine bind port",
    default: "8765",
    component: "engine",
  },
  AGENTIC_SERVE_SESSION_OVERLAY: {
    group: "engine",
    tier: TIER_RESTART,
    label: "Session overlays",
    default: "0",
    component: "engine",
  },
  AGENTIC_SERVE_MCP_TUNNEL: {
    group: "engine",
    tier: TIER_RESTART,
    label: "MCP tunnel",
    default: "0",
    component: "engine",
  },
  AGENTIC_SERVE_TLS_CERTFILE: {
    group: "security",
    tier: TIER_RESTART,
    label: "TLS cert file",
    component: "engine",
    section: "mtls",
  },
  AGENTIC_SERVE_TLS_KEYFILE: {
    group: "security",
    tier: TIER_RESTART,
    label: "TLS key file",
    component: "engine",
    section: "mtls",
  },
  AGENTIC_SERVE_TLS_CA_FILE: {
    group: "security",
    tier: TIER_RESTART,
    label: "TLS client CA",
    component: "engine",
    section: "mtls",
  },
  AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT: {
    group: "security",
    tier: TIER_RESTART,
    label: "Require client cert",
    default: "0",
    component: "engine",
    section: "mtls",
  },
  AGENTIC_REQUIRE_IDENTITY: {
    group: "security",
    tier: TIER_RESTART,
    label: "Require identity",
    default: "0",
    component: "web",
    section: "identity",
  },
  AGENTIC_DEAL_AUTH: {
    group: "security",
    tier: TIER_RESTART,
    label: "Deal authorization",
    default: "0",
    section: "deals",
  },
  AGENTIC_WEB_USER_NAME_HEADER: {
    group: "security",
    tier: TIER_RESTART,
    label: "User name headers",
    section: "identity",
  },
  AGENTIC_WEB_SESSION_ID_HEADER: {
    group: "security",
    tier: TIER_RESTART,
    label: "Session id headers",
    section: "identity",
  },
  AGENTIC_ORCHESTRATE_API_KEY: {
    group: "security",
    tier: TIER_RESTART,
    label: "Orchestrate API key",
    component: "openclaw",
    section: "secrets",
  },
  AGENTIC_CHAT_COMPLETIONS_API_KEY: {
    group: "security",
    tier: TIER_RESTART,
    label: "Chat completions API key",
    section: "secrets",
  },
  AGENTIC_JETSON_ENABLE_ENGINE: {
    group: "deployments",
    tier: TIER_REDEPLOY,
    label: "Enable engine on deploy",
    default: "1",
    component: "engine",
  },

  // Memory / QA
  AGENTIC_KB: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Knowledge base",
    default: "1",
    section: "kb",
  },
  AGENTIC_KB_MAX_HITS: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "KB max hits",
    default: "4",
    section: "kb",
  },
  AGENTIC_LEARNING: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Learning loop",
    default: "1",
    section: "learning",
  },
  AGENTIC_LEARNING_EVAL: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Learning eval",
    default: "1",
    section: "learning",
  },
  AGENTIC_FINAL_QA: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Faithfulness QA",
    default: "1",
    section: "quality_gates",
  },
  AGENTIC_IMPARTIAL_QA: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Impartial QA gate",
    default: "0",
    section: "quality_gates",
  },
  AGENTIC_IMPARTIAL_QA_FAIL: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Impartial QA hard fail",
    default: "0",
    section: "quality_gates",
  },
  AGENTIC_ANONYMIZE_CLOUD: {
    group: "memory",
    tier: TIER_NEXT_RUN,
    label: "Cloud anonymization",
    default: "0",
    section: "anonymization",
  },

  // Integrations / MCP
  HOME_ASSISTANT_URL: { group: "integrations", tier: TIER_RESTART, label: "Home Assistant URL" },
  HOME_ASSISTANT_TOKEN: { group: "integrations", tier: TIER_RESTART, label: "Home Assistant token" },
  TAVILY_API_KEY: { group: "integrations", tier: TIER_RESTART, label: "Tavily API key" },
  BRAVE_SEARCH_API_KEY: { group: "integrations", tier: TIER_RESTART, label: "Brave Search API key" },
  EXA_API_KEY: { group: "integrations", tier: TIER_RESTART, label: "Exa API key" },
  AGENTIC_MCP_FETCH_ENABLED: { group: "integrations", tier: TIER_RESTART, label: "Fetch MCP enabled" },
  AGENTIC_MCP_MEDIA_ENABLED: { group: "integrations", tier: TIER_RESTART, label: "Media MCP enabled" },
  AGENTIC_MCP_MEMORY_MCP_ENABLED: {
    group: "integrations",
    tier: TIER_RESTART,
    label: "Memory MCP enabled",
  },
  FILESYSTEM_MCP_ALLOWED_DIRECTORY: {
    group: "integrations",
    tier: TIER_RESTART,
    label: "Filesystem MCP root",
  },
  AGENTIC_EXTRA_MCP_PROVIDERS_PATH: {
    group: "integrations",
    tier: TIER_RESTART,
    label: "Extra MCP providers path",
  },
  AGENTIC_SPEECH_ENABLED: { group: "integrations", tier: TIER_RESTART, label: "Speech enabled" },
  AGENTIC_SPEECH_ADVERTISE_STT_URL: {
    group: "integrations",
    tier: TIER_RESTART,
    label: "Speech STT advertise URL",
  },
  AGENTIC_SPEECH_ADVERTISE_TTS_URL: {
    group: "integrations",
    tier: TIER_RESTART,
    label: "Speech TTS advertise URL",
  },
  AGENTIC_SPEECH_TOKEN: { group: "integrations", tier: TIER_RESTART, label: "Speech token" },

  // Web
  AGENTIC_WEB_HOST: {
    group: "deployments",
    tier: TIER_RESTART,
    label: "Web bind host",
    default: "127.0.0.1",
    component: "web",
  },
  AGENTIC_WEB_PORT: {
    group: "deployments",
    tier: TIER_RESTART,
    label: "Web bind port",
    default: "3847",
    component: "web",
  },
  AGENTIC_EDGE_PLATFORM: {
    group: "deployments",
    tier: TIER_RESTART,
    label: "Edge platform",
    default: "local",
  },
  AGENTIC_ORCHESTRATOR_CONTEXT_FILE: {
    group: "deployments",
    tier: TIER_RESTART,
    label: "Orchestrator context file",
  },
  AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS: {
    group: "deployments",
    tier: TIER_RESTART,
    label: "Extra agent catalog dirs",
  },
};

function isSecretKey(key) {
  if (PATH_NOT_SECRET.has(key)) return false;
  return SECRET_KEY_RE.test(key) || Boolean(KEY_META[key]?.secret);
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function readYamlSimpleFields(filePath, keys) {
  const out = {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (keys && !keys.includes(key)) continue;
      let val = (m[2] || "").trim().split("#")[0].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val.startsWith(">") || val.startsWith("|") || val.startsWith("-") || val.startsWith("{")) {
        continue;
      }
      out[key] = val;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function listYamlCatalog(dir, kind) {
  if (!dir || !fs.existsSync(dir)) return [];
  const names = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))
    .filter((n) => !n.startsWith("_"))
    .sort((a, b) => a.localeCompare(b));
  const entries = [];
  for (const n of names) {
    const filePath = path.join(dir, n);
    const fields = readYamlSimpleFields(filePath, [
      "id",
      "type",
      "role",
      "model",
      "backend",
      "mode",
      "description",
      "planner_hint",
      "harness_profile",
      "min_vram_gb",
    ]);
    const id = fields.id || path.basename(n, path.extname(n));
    entries.push({
      id,
      kind,
      file: n,
      type: fields.type || fields.backend || null,
      role: fields.role || null,
      model: fields.model || null,
      mode: fields.mode || null,
      description: fields.description || fields.planner_hint || null,
      plannerHint: fields.planner_hint || null,
      harnessProfile: fields.harness_profile || null,
      minVramGb: fields.min_vram_gb != null ? Number(fields.min_vram_gb) : null,
      status: "available",
      gateReason: null,
    });
  }
  return entries;
}

function credentialGateForAgent(entry, env) {
  const t = String(entry.type || "").toLowerCase();
  if (t === "openai" && !env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    return { status: "hidden", gateReason: "Needs OPENAI_API_KEY", fixKey: "OPENAI_API_KEY" };
  }
  if (t === "anthropic" && !env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return { status: "hidden", gateReason: "Needs ANTHROPIC_API_KEY", fixKey: "ANTHROPIC_API_KEY" };
  }
  if (
    (t === "huggingface" || t === "hf") &&
    !env.HF_TOKEN &&
    !env.HUGGINGFACE_API_KEY &&
    !process.env.HF_TOKEN &&
    !process.env.HUGGINGFACE_API_KEY
  ) {
    return { status: "hidden", gateReason: "Needs HF_TOKEN", fixKey: "HF_TOKEN" };
  }
  if (t === "vllm" && !env.VLLM_BASE_URL && !process.env.VLLM_BASE_URL) {
    return { status: "hidden", gateReason: "Needs VLLM_BASE_URL", fixKey: "VLLM_BASE_URL" };
  }
  if (t === "jetstream" && !env.JETSTREAM_BASE_URL && !process.env.JETSTREAM_BASE_URL) {
    return {
      status: "hidden",
      gateReason: "Needs JETSTREAM_BASE_URL",
      fixKey: "JETSTREAM_BASE_URL",
    };
  }
  return { status: "available", gateReason: null, fixKey: null };
}

function credentialGateForMcp(entry, env) {
  const id = entry.id;
  if (id === "home_assistant") {
    if (!(env.HOME_ASSISTANT_URL || process.env.HOME_ASSISTANT_URL)) {
      return {
        status: "hidden",
        gateReason: "Needs HOME_ASSISTANT_URL",
        fixKey: "HOME_ASSISTANT_URL",
      };
    }
    if (!(env.HOME_ASSISTANT_TOKEN || process.env.HOME_ASSISTANT_TOKEN)) {
      return {
        status: "hidden",
        gateReason: "Needs HOME_ASSISTANT_TOKEN",
        fixKey: "HOME_ASSISTANT_TOKEN",
      };
    }
  }
  if (id === "search_tavily" && !(env.TAVILY_API_KEY || process.env.TAVILY_API_KEY)) {
    return { status: "hidden", gateReason: "Needs TAVILY_API_KEY", fixKey: "TAVILY_API_KEY" };
  }
  if (id === "search_brave" && !(env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_SEARCH_API_KEY)) {
    return {
      status: "hidden",
      gateReason: "Needs BRAVE_SEARCH_API_KEY",
      fixKey: "BRAVE_SEARCH_API_KEY",
    };
  }
  if (id === "search_exa" && !(env.EXA_API_KEY || process.env.EXA_API_KEY)) {
    return { status: "hidden", gateReason: "Needs EXA_API_KEY", fixKey: "EXA_API_KEY" };
  }
  if (id === "fetch_url") {
    const on = String(env.AGENTIC_MCP_FETCH_ENABLED || process.env.AGENTIC_MCP_FETCH_ENABLED || "")
      .trim()
      .toLowerCase();
    if (!["1", "true", "yes", "on"].includes(on)) {
      return {
        status: "unset",
        gateReason: "Set AGENTIC_MCP_FETCH_ENABLED=1",
        fixKey: "AGENTIC_MCP_FETCH_ENABLED",
      };
    }
  }
  if (id === "memory_knowledge_graph") {
    const on = String(
      env.AGENTIC_MCP_MEMORY_MCP_ENABLED || process.env.AGENTIC_MCP_MEMORY_MCP_ENABLED || "",
    )
      .trim()
      .toLowerCase();
    if (!["1", "true", "yes", "on"].includes(on)) {
      return {
        status: "unset",
        gateReason: "Set AGENTIC_MCP_MEMORY_MCP_ENABLED=1",
        fixKey: "AGENTIC_MCP_MEMORY_MCP_ENABLED",
      };
    }
  }
  if (id.startsWith("media_")) {
    const on = String(env.AGENTIC_MCP_MEDIA_ENABLED || process.env.AGENTIC_MCP_MEDIA_ENABLED || "")
      .trim()
      .toLowerCase();
    if (!["1", "true", "yes", "on"].includes(on)) {
      return {
        status: "unset",
        gateReason: "Set AGENTIC_MCP_MEDIA_ENABLED=1",
        fixKey: "AGENTIC_MCP_MEDIA_ENABLED",
      };
    }
  }
  if (id === "filesystem_local") {
    if (
      !(env.FILESYSTEM_MCP_ALLOWED_DIRECTORY || process.env.FILESYSTEM_MCP_ALLOWED_DIRECTORY)
    ) {
      return {
        status: "hidden",
        gateReason: "Needs FILESYSTEM_MCP_ALLOWED_DIRECTORY",
        fixKey: "FILESYSTEM_MCP_ALLOWED_DIRECTORY",
      };
    }
  }
  return { status: "available", gateReason: null, fixKey: null };
}

function resolveCatalogDir(toolRoot, envKey, defaultRel) {
  const override = String(process.env[envKey] || "").trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.join(toolRoot, override);
  }
  return path.join(toolRoot, defaultRel);
}

function collectEnvLayers({ toolRoot, webRoot }) {
  const layers = [];
  const jetsonPath = path.join(toolRoot, "config", "env.jetson");
  const hostPath = path.join(toolRoot, "config", "env.host");
  const nvrPath = path.join(toolRoot, "config", "env.nvr");
  const toolEnv = path.join(toolRoot, ".env");
  const webEnv = path.join(webRoot, ".env");
  const toolExample = path.join(toolRoot, ".env.example");
  const webExample = path.join(webRoot, ".env.example");

  const push = (plane, filePath, known) => {
    layers.push({
      plane,
      path: filePath,
      exists: fs.existsSync(filePath),
      known,
      values: parseEnvFile(filePath),
    });
  };

  push("example", toolExample, true);
  push("example", webExample, true);
  push("tracked", jetsonPath, true);
  push("tracked", hostPath, true);
  push("tracked", nvrPath, true);
  push("tool_env", toolEnv, true);
  push("web_env", webEnv, true);
  return layers;
}

const WIKI_BASE_URL = "https://github.com/zlatko-lakisic/agentic-orchestration/wiki";

function wikiMetaForKey(key) {
  return { page: "Configuration", anchor: String(key || "") };
}

function wikiUrlForKey(key) {
  const { page, anchor } = wikiMetaForKey(key);
  return `${WIKI_BASE_URL}/${page}#${anchor}`;
}

/**
 * Pull short help text from comments preceding each KEY= (active or commented-out)
 * in agentic-orchestration-tool/.env.example.
 */
function parseEnvExampleHelp(toolRoot) {
  const filePath = path.join(toolRoot, ".env.example");
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  let text = "";
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return out;
  }
  const lines = text.split(/\r?\n/);
  const assignRe = /^(?:#\s*)?([A-Z][A-Z0-9_]*)=(.*)$/;
  let buf = [];
  for (const line of lines) {
    const stripped = line.trim();
    const m = stripped ? stripped.match(assignRe) : null;
    if (m) {
      const key = m[1];
      const parts = buf.filter(Boolean).slice(-4);
      const help = parts.join(" ").replace(/\s+/g, " ").trim();
      if (help && !out[key]) {
        out[key] = help.length > 280 ? `${help.slice(0, 277)}…` : help;
      }
      buf = [];
      continue;
    }
    if (stripped.startsWith("#")) {
      const c = stripped.replace(/^#\s?/, "").trim();
      if (c && !/^[A-Z][A-Z0-9_]*=/.test(c)) {
        buf.push(c);
      }
      continue;
    }
    if (!stripped) {
      if (buf.length > 6) buf = buf.slice(-2);
      continue;
    }
    buf = [];
  }
  return out;
}

let _envExampleHelpCache = null;
let _envExampleHelpPath = null;

function envExampleHelpMap(toolRoot) {
  const filePath = path.join(toolRoot, ".env.example");
  if (_envExampleHelpCache && _envExampleHelpPath === filePath) {
    return _envExampleHelpCache;
  }
  _envExampleHelpPath = filePath;
  _envExampleHelpCache = parseEnvExampleHelp(toolRoot);
  return _envExampleHelpCache;
}

function helpForKey(key, meta, toolRoot) {
  if (meta?.help) return String(meta.help);
  const fromExample = envExampleHelpMap(toolRoot)[key];
  if (fromExample) return fromExample;
  if (meta?.label && meta.label !== key) {
    return `${meta.label}. Documented in .env.example and the Configuration wiki.`;
  }
  return `Environment variable ${key}. See the Configuration wiki for details.`;
}

function buildEffectiveConfig({ toolRoot, webRoot, includeInjected = false }) {
  const layers = collectEnvLayers({ toolRoot, webRoot });
  const keys = new Set();
  for (const layer of layers) {
    for (const k of Object.keys(layer.values)) keys.add(k);
  }
  for (const k of Object.keys(KEY_META)) keys.add(k);
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("AGENTIC_") || k in KEY_META || SECRET_KEY_RE.test(k)) keys.add(k);
  }

  const entries = {};
  for (const key of [...keys].sort()) {
    if (!includeInjected && isInjectedK8sEnvKey(key)) continue;

    const meta = KEY_META[key] || {
      group: key.startsWith("AGENTIC_K8S_")
        ? "execution"
        : key.startsWith("AGENTIC_SOCIETY_")
          ? "societies"
          : "advanced",
      tier: TIER_RESTART,
      label: key,
    };
    const codeDefault =
      meta.default !== undefined && meta.default !== null ? String(meta.default) : null;

    // Override layers: tracked / tool_env / web_env / process.
    // .env.example is documentation only — used as default hint when no code default.
    const overrides = [];
    let configured = undefined;
    let source = "unset";
    let sourcePath = null;

    for (const layer of layers) {
      if (!Object.prototype.hasOwnProperty.call(layer.values, key)) continue;
      if (layer.plane === "example") continue;
      const raw = layer.values[key];
      overrides.push({
        plane: layer.plane,
        path: layer.path,
        value: undefined, // filled after secret check
        _raw: raw,
      });
      configured = raw;
      source = layer.plane;
      sourcePath = layer.path;
    }

    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      const raw = process.env[key];
      const last = overrides[overrides.length - 1];
      if (!last || String(last._raw) !== String(raw)) {
        overrides.push({
          plane: "process",
          path: "process.env",
          value: undefined,
          _raw: raw,
        });
        configured = raw;
        source = "process";
        sourcePath = "process.env";
      } else if (source === "unset") {
        overrides.push({
          plane: "process",
          path: "process.env",
          value: undefined,
          _raw: raw,
        });
        configured = raw;
        source = "process";
        sourcePath = "process.env";
      }
    }

    // Example-layer fallback only when nothing configured and no code default.
    let exampleDefault = null;
    if (configured === undefined && codeDefault == null) {
      for (const layer of layers) {
        if (layer.plane !== "example") continue;
        if (Object.prototype.hasOwnProperty.call(layer.values, key)) {
          exampleDefault = layer.values[key];
        }
      }
    }

    const secret = isSecretKey(key);
    const configuredSet =
      configured !== undefined && String(configured).length > 0;
    const defaultValue = codeDefault ?? (exampleDefault != null ? String(exampleDefault) : null);

    let effective = null;
    if (configuredSet) {
      effective = String(configured);
    } else if (defaultValue != null && String(defaultValue).length > 0) {
      effective = String(defaultValue);
      source = codeDefault != null ? "default" : "example";
      sourcePath = codeDefault != null ? null : sourcePath;
      if (source === "example") {
        for (const layer of layers) {
          if (layer.plane === "example" && Object.prototype.hasOwnProperty.call(layer.values, key)) {
            sourcePath = layer.path;
          }
        }
      }
    }

    for (const o of overrides) {
      o.value = secret ? undefined : o._raw != null ? String(o._raw) : null;
      delete o._raw;
    }

    const chain = overrides.map((o) => ({
      plane: o.plane,
      path: o.path,
      set: true,
    }));

    // Path existence for TLS path keys (non-secret).
    let pathExists = undefined;
    if (
      !secret &&
      effective &&
      (key.endsWith("CERTFILE") || key.endsWith("KEYFILE") || key.endsWith("CA_FILE"))
    ) {
      try {
        pathExists = fs.existsSync(effective);
      } catch {
        pathExists = false;
      }
    }

    const wiki = wikiMetaForKey(key);
    entries[key] = {
      key,
      label: meta.label || key,
      help: helpForKey(key, meta, toolRoot),
      wikiPage: wiki.page,
      wikiAnchor: wiki.anchor,
      wikiUrl: wikiUrlForKey(key),
      group: meta.group || "advanced",
      tier: meta.tier || TIER_RESTART,
      component: meta.component || null,
      section: meta.section || null,
      source,
      sourcePath,
      overriddenBy: chain.length > 1 ? chain.slice(0, -1) : [],
      chain,
      overrides,
      secret,
      set: configuredSet,
      default: secret ? undefined : defaultValue,
      effective: secret ? undefined : effective,
      // Back-compat alias
      value: secret ? undefined : effective,
      pathExists,
      secretState: secret ? { set: configuredSet, usedBy: meta.usedBy || [] } : undefined,
      injected: isInjectedK8sEnvKey(key),
    };
  }

  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        Object.keys(entries)
          .sort()
          .map((k) => [
            k,
            entries[k].set,
            entries[k].secret ? "[secret]" : entries[k].effective,
            entries[k].source,
          ]),
      ),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: new Date().toISOString(),
    fingerprint,
    phase: 0,
    writeApi: { tokens: true, mtlsClients: true, control: true },
    includeInjected: Boolean(includeInjected),
    entries,
    layers: layers.map((l) => ({
      plane: l.plane,
      path: l.path,
      exists: l.exists,
      keyCount: Object.keys(l.values).length,
    })),
  };
}

function buildCatalogs(kind, { toolRoot }) {
  const env = {
    ...parseEnvFile(path.join(toolRoot, ".env")),
  };
  const catalogOverride = String(process.env.AGENTIC_AGENT_PROVIDERS_CATALOG || "").trim();
  const agentDir = catalogOverride
    ? path.isAbsolute(catalogOverride)
      ? catalogOverride
      : path.join(toolRoot, catalogOverride)
    : path.join(toolRoot, "config", "agent_providers");

  const map = {
    agents: () => {
      const entries = listYamlCatalog(agentDir, "agents").map((e) => {
        const gate = credentialGateForAgent(e, env);
        return { ...e, ...gate };
      });
      return entries;
    },
    mcp: () => {
      const dir = path.join(toolRoot, "config", "mcp_providers");
      return listYamlCatalog(dir, "mcp").map((e) => {
        const gate = credentialGateForMcp(e, env);
        return { ...e, ...gate };
      });
    },
    skills: () => listYamlCatalog(path.join(toolRoot, "config", "agent_skills"), "skills"),
    rag: () => listYamlCatalog(path.join(toolRoot, "config", "rag_sources"), "rag"),
    workflows: () => listYamlCatalog(path.join(toolRoot, "config", "workflows"), "workflows"),
    harnesses: () => listYamlCatalog(path.join(toolRoot, "config", "agent_harnesses"), "harnesses"),
    societies: () => {
      const examples = path.join(toolRoot, "..", "examples", "verticals", "society_research_panel");
      const entries = [];
      if (fs.existsSync(examples)) {
        for (const n of fs.readdirSync(examples)) {
          if (!n.endsWith(".yaml") && !n.endsWith(".yml")) continue;
          entries.push({
            id: path.basename(n, path.extname(n)),
            kind: "societies",
            file: n,
            status: "available",
            description: "Society charter example",
            gateReason: null,
          });
        }
      }
      return entries;
    },
  };

  const fn = map[kind];
  if (!fn) return null;
  return { kind, entries: fn(), generatedAt: new Date().toISOString() };
}

function buildCatalogDetail(kind, id, ctx) {
  const list = buildCatalogs(kind, ctx);
  if (!list) return null;
  const entry = list.entries.find((e) => e.id === id);
  if (!entry) return null;
  const availabilityTrace = [];
  if (entry.gateReason) {
    availabilityTrace.push({
      step: "credential_gate",
      result: entry.status,
      detail: entry.gateReason,
      fixKey: entry.fixKey || null,
    });
  } else {
    availabilityTrace.push({
      step: "credential_gate",
      result: "available",
      detail: "Credentials present or not required",
    });
  }
  availabilityTrace.push({
    step: "catalog_load",
    result: "ok",
    detail: `Loaded from ${entry.file || "catalog"}`,
  });
  return { ...entry, availabilityTrace };
}

function dirSizeSafe(dir, maxFiles = 5000) {
  let total = 0;
  let files = 0;
  if (!fs.existsSync(dir)) return { exists: false, bytes: 0, files: 0 };
  const stack = [dir];
  while (stack.length && files < maxFiles) {
    const cur = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(p);
      } else if (ent.isFile()) {
        files += 1;
        try {
          total += fs.statSync(p).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return { exists: true, bytes: total, files, truncated: files >= maxFiles };
}

function buildStorageInventory({ toolRoot }) {
  // Coordinator web pod typically mounts only sessions + uploads (emptyDir).
  // KB/learning/etc. live on the engine hostPath — not visible here.
  const dirs = [
    {
      id: "sessions",
      rel: "__orchestrator_sessions__",
      label: "Sessions",
      mountExpected: true,
      owner: "web",
    },
    {
      id: "learning",
      rel: "__orchestrator_learning__",
      label: "Learning",
      mountExpected: false,
      owner: "engine",
    },
    {
      id: "kb",
      rel: "__orchestrator_kb__",
      label: "Knowledge base",
      mountExpected: false,
      owner: "engine",
    },
    {
      id: "deals",
      rel: "__orchestrator_deals__",
      label: "Deals",
      mountExpected: false,
      owner: "engine",
    },
    {
      id: "mtls",
      rel: "__orchestrator_mtls__",
      label: "mTLS material",
      mountExpected: false,
      owner: "engine",
    },
    {
      id: "api_tokens",
      rel: "__orchestrator_api_tokens__",
      label: "API access tokens",
      mountExpected: true,
      owner: "web",
    },
    {
      id: "uploads",
      rel: "_web_uploads",
      label: "Web uploads",
      mountExpected: true,
      owner: "web",
    },
    {
      id: "output",
      rel: "__output__",
      label: "Output artifacts",
      mountExpected: false,
      owner: "engine",
    },
  ];

  const runStorePath = String(process.env.AGENTIC_RUN_STORE_PATH || "/run/store").trim();

  const roots = dirs.map((d) => {
    const abs = path.join(toolRoot, d.rel);
    const size = dirSizeSafe(abs);
    let visibility = "absent";
    if (size.exists) visibility = "present";
    else if (!d.mountExpected) visibility = "not_mounted_here";
    return {
      ...d,
      path: abs,
      ...size,
      probeScope: "web",
      visibility,
    };
  });

  const runSize = dirSizeSafe(runStorePath);
  roots.push({
    id: "run_store",
    rel: runStorePath,
    label: "Run store",
    mountExpected: true,
    owner: "web",
    path: runStorePath,
    ...runSize,
    probeScope: "web",
    visibility: runSize.exists ? "present" : "absent",
  });

  return {
    generatedAt: new Date().toISOString(),
    probeScope: "web",
    roots,
  };
}

function fetchJson(url, timeoutMs = 2000, tlsInsecure = false) {
  return fetchJsonRequest(url, { timeoutMs, tlsInsecure });
}

function fetchJsonRequest(url, { method = "GET", body = null, timeoutMs = 2000, tlsInsecure = false } = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === "https:" ? https : http;
      const payload = body == null ? null : Buffer.from(JSON.stringify(body), "utf8");
      const opts = {
        method,
        timeout: timeoutMs,
        headers: payload
          ? { "Content-Type": "application/json", "Content-Length": String(payload.length) }
          : {},
      };
      if (u.protocol === "https:" && tlsInsecure) {
        opts.rejectUnauthorized = false;
      }
      const req = lib.request(url, opts, (res) => {
        let text = "";
        res.on("data", (c) => {
          text += c;
        });
        res.on("end", () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: text ? JSON.parse(text) : null,
            });
          } catch {
            resolve({ ok: false, status: res.statusCode, json: null, raw: text.slice(0, 200) });
          }
        });
      });
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "timeout" });
      });
      if (payload) req.write(payload);
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function resolveEngineBase() {
  const enginePort = Number(process.env.AGENTIC_SERVE_PORT || 8765);
  const engineHost = String(process.env.AGENTIC_SERVE_HOST || "127.0.0.1");
  const engineTls = Boolean(
    process.env.AGENTIC_SERVE_TLS_CERTFILE && process.env.AGENTIC_SERVE_TLS_KEYFILE,
  );
  const engineScheme = engineTls ? "https" : "http";
  const health = await probeEngineHealth(engineScheme, enginePort, engineHost);
  if (!health.ok || !health.probeHost) {
    return {
      ok: false,
      error: health.error || `engine unreachable (HTTP ${health.status || "?"})`,
    };
  }
  return {
    ok: true,
    base: `${engineScheme}://${health.probeHost}:${enginePort}`,
    tlsInsecure: engineTls,
  };
}

/**
 * Probe engine from the coordinator pod. Prefer in-cluster Service DNS /
 * host.k3s.internal — 127.0.0.1 is the web container, not the engine hostPort.
 */
async function probeEngineHealth(engineScheme, enginePort, configuredHost) {
  const tlsInsecure = engineScheme === "https";
  const candidates = [];
  const push = (host) => {
    if (!host || candidates.includes(host)) return;
    candidates.push(host);
  };
  // In-cluster Service (works even when hostPort is not visible on loopback).
  push("agentic-engine");
  push("agentic-engine.agentic-orchestration.svc");
  push("host.k3s.internal");
  if (configuredHost && configuredHost !== "0.0.0.0") push(configuredHost);
  // Last resort for bare-metal / same-network-namespace deploys.
  push("127.0.0.1");

  let last = { ok: false, error: "no probe candidates" };
  for (const host of candidates) {
    const result = await fetchJson(
      `${engineScheme}://${host}:${enginePort}/health`,
      2000,
      tlsInsecure,
    );
    if (result.ok) {
      return { ...result, probeHost: host };
    }
    last = { ...result, probeHost: host };
  }
  return last;
}

async function buildTopology({ toolRoot, webRoot, webInstanceId, webPid }) {
  const webPort = Number(process.env.AGENTIC_WEB_PORT || 3847);
  const enginePort = Number(process.env.AGENTIC_SERVE_PORT || 8765);
  const engineHost = String(process.env.AGENTIC_SERVE_HOST || "127.0.0.1");
  const engineTls = Boolean(
    process.env.AGENTIC_SERVE_TLS_CERTFILE && process.env.AGENTIC_SERVE_TLS_KEYFILE,
  );
  const engineScheme = engineTls ? "https" : "http";

  const engineHealth = await probeEngineHealth(engineScheme, enginePort, engineHost);
  const probeHost = engineHealth.probeHost || (engineHost === "0.0.0.0" ? "127.0.0.1" : engineHost);
  const components = [
    {
      id: "web",
      label: "Web UI / Coordinator",
      status: "healthy",
      port: webPort,
      nodePort: 30487,
      fact: `pid ${webPid} · instance ${webInstanceId}`,
      // Relative to the browser host — Admin resolves via location.hostname.
      url: "/",
      urlHint: `http://<host>:30487/`,
    },
    {
      id: "engine",
      label: "Engine daemon",
      status: engineHealth.ok ? "healthy" : process.env.AGENTIC_JETSON_ENABLE_ENGINE === "0" ? "not_deployed" : "failed",
      port: enginePort,
      nodePort: 30765,
      fact: engineHealth.ok
        ? `reachable on ${engineScheme}://${probeHost}:${enginePort}`
        : engineHealth.error || `HTTP ${engineHealth.status || "down"}`,
      url: engineHealth.ok
        ? `${engineScheme}://__HOST__:${enginePort}/health`
        : null,
      urlHint: `${engineScheme}://<host>:8765/  (Reach clients — not :30487)`,
      tls: engineTls,
      overlays: String(process.env.AGENTIC_SERVE_SESSION_OVERLAY || "") === "1",
      mcpTunnel: String(process.env.AGENTIC_SERVE_MCP_TUNNEL || "") === "1",
    },
    {
      id: "execution",
      label: "Execution backend",
      status: "healthy",
      fact: String(process.env.AGENTIC_EXECUTION_BACKEND || "inprocess"),
      warmPool: String(process.env.AGENTIC_K8S_WARM_POOL_ENABLED || "0") === "1",
      delegation: String(process.env.AGENTIC_K8S_DELEGATION_ENABLED || "0") === "1",
    },
    {
      id: "ollama",
      label: "Ollama",
      status: process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE ? "healthy" : "unset",
      fact: process.env.OLLAMA_API_BASE || process.env.OLLAMA_HOST || "not configured",
    },
  ];

  // hrefs are routerLink paths under baseHref=/admin/ (no /admin prefix).
  const attention = [];
  if (!engineHealth.ok && process.env.AGENTIC_JETSON_ENABLE_ENGINE !== "0") {
    attention.push({
      severity: "warning",
      message: "Engine daemon is not reachable on :8765",
      href: "/components/engine",
    });
  }
  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.OLLAMA_HOST &&
    !process.env.OLLAMA_API_BASE
  ) {
    attention.push({
      severity: "warning",
      message: "No LLM credentials detected (OpenAI / Anthropic / Ollama)",
      href: "/components/ollama",
    });
  }
  if (String(process.env.AGENTIC_KB || "1") !== "0") {
    attention.push({
      severity: "info",
      message:
        "Knowledge base is enabled (default on). Web and engine often use separate sqlite files — see Data visibility.",
      href: "/data",
    });
  }
  const requireIdentity = String(process.env.AGENTIC_REQUIRE_IDENTITY || "0")
    .trim()
    .toLowerCase();
  if (!["1", "true", "yes", "on"].includes(requireIdentity)) {
    attention.push({
      severity: "warning",
      message: "Identity is not required — Admin accepts unauthenticated requests",
      href: "/access",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.AGENTIC_EDGE_PLATFORM || "local",
    hostname: process.env.HOSTNAME || null,
    toolRoot,
    webRoot,
    components,
    attention,
    ports: {
      web: webPort,
      webNodePort: 30487,
      engine: enginePort,
      engineNodePort: 30765,
    },
    reachGuard: {
      correctEnginePort: 8765,
      incorrectWebPort: 30487,
      message: "AO Reach clients must use engine :8765 (or NodePort 30765), never web :30487",
    },
  };
}

function sessionOutcome(raw) {
  if (raw.last_exit_code != null) {
    return Number(raw.last_exit_code) === 0 ? "completed" : "failed";
  }
  if (raw.last_error) return "failed";
  if (raw.last_final_answer_excerpt) return "completed";
  return null;
}

function sessionOk(raw) {
  if (raw.last_exit_code != null) return Number(raw.last_exit_code) === 0;
  if (raw.last_error) return false;
  if (raw.last_final_answer_excerpt) return true;
  return null;
}

function listRecentRuns({ toolRoot, limit = 50 }) {
  const runs = [];
  const runStore = String(process.env.AGENTIC_RUN_STORE_PATH || "/run/store").trim();
  const sessionsDir = path.join(toolRoot, "__orchestrator_sessions__");

  const pushRun = (entry) => {
    runs.push(entry);
  };

  const walkRunStore = (base, userId = null) => {
    if (!fs.existsSync(base)) return;
    let ents;
    try {
      ents = fs.readdirSync(base, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of ents) {
      if (!ent.isDirectory()) continue;
      if (ent.name === "users") {
        const usersDir = path.join(base, "users");
        let users;
        try {
          users = fs.readdirSync(usersDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const u of users) {
          if (u.isDirectory()) walkRunStore(path.join(usersDir, u.name), u.name);
        }
        continue;
      }
      const runDir = path.join(base, ent.name);
      let stepCount = 0;
      let mtime = null;
      try {
        const st = fs.statSync(runDir);
        mtime = st.mtime.toISOString();
        stepCount = fs
          .readdirSync(runDir, { withFileTypes: true })
          .filter((e) => e.isDirectory()).length;
      } catch {
        /* ignore */
      }
      pushRun({
        id: ent.name,
        scope: "run_store",
        userId,
        started: mtime,
        updatedAt: mtime,
        steps: stepCount,
        mode: null,
        outcome: null,
        path: runDir,
      });
    }
  };

  walkRunStore(runStore);

  if (fs.existsSync(sessionsDir)) {
    const walkSessions = (dir, userId = null) => {
      let ents;
      try {
        ents = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of ents) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory() && ent.name === "users") {
          for (const u of fs.readdirSync(p, { withFileTypes: true })) {
            if (u.isDirectory()) walkSessions(path.join(p, u.name), u.name);
          }
          continue;
        }
        if (!ent.isFile() || !ent.name.endsWith(".json")) continue;
        if (ent.name.startsWith(".")) continue;
        try {
          const raw = JSON.parse(fs.readFileSync(p, "utf8"));
          const st = fs.statSync(p);
          pushRun({
            id: path.basename(ent.name, ".json"),
            scope: "session",
            userId: userId || raw.user_id || null,
            started: raw.created_at || st.mtime.toISOString(),
            updatedAt: raw.updated_at || st.mtime.toISOString(),
            steps: Array.isArray(raw.planner_history) ? raw.planner_history.length : null,
            mode: raw.last_execution_backend || null,
            outcome: sessionOutcome(raw),
            ok: sessionOk(raw),
            exitCode: raw.last_exit_code ?? null,
            lastRunId: raw.last_run_id || null,
            error: raw.last_error || null,
            lastGoal: raw.last_user_goal
              ? String(raw.last_user_goal).slice(0, 160)
              : null,
            path: p,
          });
        } catch {
          /* ignore */
        }
      }
    };
    walkSessions(sessionsDir);
  }

  runs.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return {
    generatedAt: new Date().toISOString(),
    scopeNote:
      "Listed from web-visible run store and sessions only; engine hostPath history may differ.",
    runs: runs.slice(0, Math.max(1, Number(limit) || 50)),
  };
}

function buildRunDetail({ toolRoot }, id) {
  const list = listRecentRuns({ toolRoot, limit: 500 });
  const entry = list.runs.find((r) => r.id === id);
  if (!entry) return null;
  const detail = { ...entry, stepsDetail: [], k8sJobs: [] };
  if (entry.scope === "run_store" && entry.path && fs.existsSync(entry.path)) {
    try {
      let firstError = null;
      let worstExit = null;
      let allOk = true;
      let sawResult = false;
      for (const ent of fs.readdirSync(entry.path, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        const resultPath = path.join(entry.path, ent.name, "result.json");
        let result = null;
        if (fs.existsSync(resultPath)) {
          try {
            result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
          } catch {
            result = null;
          }
        }
        const exitCode = result?.exit_code ?? result?.exitCode ?? null;
        const error = result?.error != null ? String(result.error) : null;
        const ok = exitCode == null ? null : Number(exitCode) === 0;
        if (result) {
          sawResult = true;
          if (ok === false) allOk = false;
          if (exitCode != null && (worstExit == null || Number(exitCode) !== 0)) {
            if (worstExit == null || Number(exitCode) !== 0) worstExit = Number(exitCode);
          }
          if (error && !firstError) firstError = error.slice(0, 2000);
        }
        const resultText = result?.result_text ?? result?.resultText ?? null;
        detail.stepsDetail.push({
          id: ent.name,
          exitCode,
          error,
          recoverable: result?.recoverable ?? null,
          recoveryHint: result?.recovery_hint ?? result?.recoveryHint ?? null,
          resultText: resultText != null ? String(resultText).slice(0, 500) : null,
          ok,
        });
      }
      if (sawResult) {
        detail.ok = allOk;
        detail.exitCode = worstExit;
        detail.outcome = allOk ? "completed" : "failed";
        detail.error = firstError;
      }
    } catch {
      /* ignore */
    }
  }
  if (entry.scope === "session" && entry.path && fs.existsSync(entry.path)) {
    try {
      const raw = JSON.parse(fs.readFileSync(entry.path, "utf8"));
      detail.plannerHistory = Array.isArray(raw.planner_history)
        ? raw.planner_history.slice(-20)
        : [];
      detail.lastGoal = raw.last_user_goal || null;
      detail.lastAnswerExcerpt = raw.last_final_answer_excerpt || null;
      detail.lastRunId = raw.last_run_id || detail.lastRunId || null;
      detail.exitCode = raw.last_exit_code ?? detail.exitCode ?? null;
      detail.error = raw.last_error || detail.error || null;
      detail.ok = sessionOk(raw);
      detail.outcome = sessionOutcome(raw);
      detail.k8sJobs = Array.isArray(raw.last_k8s_jobs) ? raw.last_k8s_jobs : [];
    } catch {
      /* ignore */
    }
  }
  return detail;
}

function safeTraceFileName(runId) {
  return String(runId || "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 128);
}

const TRACE_CAPABILITIES = {
  runBoundary: true,
  planner: true,
  steps: true,
  agentSelect: true,
  directAgent: true,
  modelCalls: true,
  toolCalls: true,
  mcpCalls: true,
  qa: true,
  decision: true,
};

const TRACE_DEPTH_KINDS = {
  all: null,
  boundary: new Set(["request_start", "run_end", "run_error", "agent_start", "agent_end"]),
  decisions: new Set(["request_start", "run_end", "run_error", "plan", "decision"]),
  crew: new Set(["request_start", "run_end", "run_error", "step_start", "step_end", "step_fail"]),
  tools: new Set([
    "request_start",
    "run_end",
    "run_error",
    "tool_call",
    "mcp_call",
    "qa",
    "model_call",
  ]),
};

function filterEventsByDepth(events, depth) {
  const d = String(depth || "all").trim().toLowerCase() || "all";
  const allowed = TRACE_DEPTH_KINDS[d];
  if (!allowed) return events || [];
  return (events || []).filter((e) => allowed.has(String(e?.kind || "")));
}

function shortMermaidLabel(...parts) {
  const clean = parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\n/g, " ")
    .replace(/"/g, "'")
    .trim();
  const text = clean || "event";
  return text.length <= 40 ? text : `${text.slice(0, 39).trimEnd()}…`;
}

function traceDurationMs(events) {
  const times = (events || [])
    .map((e) => Number(e?.ts))
    .filter((t) => Number.isFinite(t));
  if (times.length < 2) return null;
  return Math.round((Math.max(...times) - Math.min(...times)) * 1000 * 10) / 10;
}

function sumModelTokens(events) {
  let prompt = 0;
  let completion = 0;
  let total = 0;
  let any = false;
  for (const ev of events || []) {
    if (String(ev?.kind || "") !== "model_call") continue;
    const d = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
    for (const [key, add] of [
      ["prompt_tokens", (n) => (prompt += n)],
      ["completion_tokens", (n) => (completion += n)],
      ["total_tokens", (n) => (total += n)],
    ]) {
      const v = d[key];
      if (v == null) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      any = true;
      add(n);
    }
  }
  if (!any) return { promptTokens: null, completionTokens: null, totalTokens: null };
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
}

function detailIdentity(events) {
  let clientIp = null;
  let appId = null;
  let userName = null;
  let userId = null;
  let mode = null;
  let startedTs = null;
  for (const ev of events || []) {
    const ts = Number(ev?.ts);
    if (startedTs == null && Number.isFinite(ts)) startedTs = ts;
    const d = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
    if (clientIp == null && (d.client_ip || d.clientIp)) {
      clientIp = String(d.client_ip || d.clientIp);
    }
    if (appId == null && (d.app_id || d.appId)) {
      appId = String(d.app_id || d.appId);
    }
    if (userName == null && (d.user_name || d.userName)) {
      userName = String(d.user_name || d.userName);
    }
    if (userId == null && (d.user_id || d.userId)) {
      userId = String(d.user_id || d.userId);
    }
    if (mode == null && d.mode) mode = String(d.mode);
  }
  if (!appId) {
    appId = effectiveAppId({ appId, userName, userId }) || null;
  }
  return {
    clientIp,
    appId,
    userName,
    userId,
    mode,
    startedAt: startedTs != null ? new Date(startedTs * 1000).toISOString() : null,
  };
}

function enrichTraceListItem(events, { runId, mtime }) {
  const last = events[events.length - 1] || {};
  const kinds = new Set((events || []).map((e) => String(e?.kind || "")));
  const ident = detailIdentity(events);
  const tokens = sumModelTokens(events);
  return {
    runId,
    updatedAt: new Date(mtime).toISOString(),
    eventCount: events.length,
    lastKind: last.kind || null,
    lastMessage: last.message || null,
    durationMs: traceDurationMs(events),
    ...ident,
    hasPlan: kinds.has("plan"),
    hasDecision: kinds.has("decision"),
    hasSteps: kinds.has("step_start") || kinds.has("step_end") || kinds.has("step_fail"),
    hasTools: kinds.has("tool_call") || kinds.has("mcp_call"),
    hasQa: kinds.has("qa"),
    ...tokens,
  };
}

function traceInstrumentation(events) {
  const kinds = new Set((events || []).map((e) => String(e?.kind || "")));
  const present = {
    runBoundary: kinds.has("request_start") || kinds.has("run_end") || kinds.has("run_error"),
    planner: kinds.has("plan"),
    decision: kinds.has("decision"),
    steps: kinds.has("step_start") || kinds.has("step_end") || kinds.has("step_fail"),
    agentSelect:
      kinds.has("agent_start") ||
      (events || []).some(
        (e) =>
          e?.kind === "plan" &&
          Array.isArray(e?.detail?.agents) &&
          e.detail.agents.length > 0,
      ),
    directAgent:
      kinds.has("agent_start") ||
      (events || []).some((e) => String(e?.detail?.mode || "") === "direct_agent"),
    modelCalls: kinds.has("model_call"),
    toolCalls: kinds.has("tool_call"),
    mcpCalls: kinds.has("mcp_call"),
    qa: kinds.has("qa"),
  };
  const missing = Object.entries(TRACE_CAPABILITIES)
    .filter(([k, supported]) => supported && !present[k])
    .map(([k]) => k);
  const notInstrumented = Object.entries(TRACE_CAPABILITIES)
    .filter(([, supported]) => !supported)
    .map(([k]) => k);
  const recorded = Object.entries(present)
    .filter(([, ok]) => ok)
    .map(([k]) => k);
  let summary = "No structured spans recorded for this run_id.";
  if (recorded.length === 1 && recorded[0] === "runBoundary") {
    summary =
      "This run recorded request boundaries only. " +
      "Planner, crew, tool, and model spans appear when those paths execute.";
  } else if (recorded.length) {
    summary = `This run recorded: ${recorded.join(", ")}.`;
    if (missing.length) {
      summary += " Other span types were not hit on this path.";
    }
  }
  return {
    capabilities: { ...TRACE_CAPABILITIES },
    present,
    recorded,
    missing,
    notInstrumented,
    summary,
  };
}

function eventsToMermaid(events) {
  const lines = ["sequenceDiagram"];
  const declared = new Set();
  const ensure = (actor) => {
    const a = String(actor || "orchestrator").trim() || "orchestrator";
    const pid = a.replace(/[^A-Za-z0-9]/g, "_").slice(0, 40) || "actor";
    if (!declared.has(pid)) {
      declared.add(pid);
      const raw = a.replace(/"/g, "'");
      const label = raw.toLowerCase().startsWith("agent:")
        ? raw.slice(6).slice(0, 22)
        : raw.slice(0, 28);
      lines.push(`  participant ${pid} as ${label}`);
    }
    return pid;
  };
  if ((events || []).length) ensure("client");
  /** Call stack so dashed returns (-->>) target the real caller. */
  let stack = ["client"];
  for (const ev of events || []) {
    const actor = ensure(ev.actor || "orchestrator");
    const kind = String(ev.kind || "event");
    const detail = ev.detail && typeof ev.detail === "object" ? ev.detail : {};
    const mode = String(detail.mode || "").trim();
    const provider = String(detail.agent_provider_id || detail.provider_id || "").trim();
    const caller = stack.length ? stack[stack.length - 1] : "client";
    if (kind === "request_start") {
      lines.push(`  client->>${actor}: ${shortMermaidLabel(mode || "request")}`);
      stack = ["client", actor];
    } else if (kind === "plan") {
      lines.push(`  ${caller}->>${actor}: plan`);
      const note = shortMermaidLabel(ev.message || "");
      if (note && note !== "event") lines.push(`  Note over ${actor}: ${note}`);
      for (const ag of (detail.agents || []).slice(0, 8)) {
        const aid = ensure(`agent:${ag}`);
        lines.push(`  ${actor}->>${aid}: select`);
        lines.push(`  ${aid}-->>${actor}: ok`);
      }
      if ((detail.mcps || []).length) {
        const mid = ensure("mcp");
        lines.push(
          `  ${actor}->>${mid}: ${shortMermaidLabel((detail.mcps || []).slice(0, 3).join(", "))}`,
        );
        lines.push(`  ${mid}-->>${actor}: ok`);
      }
      if ((detail.skills || []).length) {
        const sid = ensure("skills");
        lines.push(
          `  ${actor}->>${sid}: ${shortMermaidLabel((detail.skills || []).slice(0, 3).join(", "))}`,
        );
        lines.push(`  ${sid}-->>${actor}: ok`);
      }
      if (caller !== actor) lines.push(`  ${actor}-->>${caller}: ok`);
    } else if (kind === "decision") {
      lines.push(`  ${caller}->>${actor}: decision`);
      const note = shortMermaidLabel(ev.message || detail.reason || "decision");
      if (note && note !== "event") lines.push(`  Note over ${actor}: ${note}`);
      if (caller !== actor) lines.push(`  ${actor}-->>${caller}: ok`);
    } else if (kind === "agent_start") {
      lines.push(`  ${caller}->>${actor}: ${shortMermaidLabel(provider || ev.message || "agent")}`);
      stack.push(actor);
    } else if (kind === "agent_end") {
      if (stack.length && stack[stack.length - 1] === actor) stack.pop();
      const retTo = stack.length ? stack[stack.length - 1] : "client";
      lines.push(`  ${actor}-->>${retTo}: ${shortMermaidLabel(ev.message || "done")}`);
    } else if (kind === "step_start") {
      lines.push(
        `  ${caller}->>${actor}: ${shortMermaidLabel(kind.replace(/_/g, " "), provider || ev.message || "")}`,
      );
      stack.push(actor);
    } else if (kind === "step_end" || kind === "step_fail") {
      if (stack.length && stack[stack.length - 1] === actor) stack.pop();
      const retTo = stack.length ? stack[stack.length - 1] : "client";
      lines.push(
        `  ${actor}-->>${retTo}: ${shortMermaidLabel(kind.replace(/_/g, " "), provider || ev.message || "")}`,
      );
    } else if (kind === "tool_call") {
      const phase = String(detail.phase || "");
      const name = shortMermaidLabel(detail.name || ev.message || "tool");
      const tid = ensure(`tool:${detail.name || "tool"}`);
      if (phase === "end") lines.push(`  ${tid}-->>${caller}: ${name}`);
      else lines.push(`  ${caller}->>${tid}: ${name}`);
    } else if (kind === "mcp_call") {
      const mid = ensure(`mcp:${detail.mcp_id || "mcp"}`);
      const label = shortMermaidLabel(detail.method || detail.path || "mcp");
      const phase = String(detail.phase || "");
      if (phase === "end" || detail.status != null) lines.push(`  ${mid}-->>${caller}: ${label}`);
      else lines.push(`  ${caller}->>${mid}: ${label}`);
    } else if (kind === "model_call") {
      const mid = ensure(`model:${detail.model || actor}`);
      const toks = detail.total_tokens;
      const label = shortMermaidLabel(
        detail.model || "model",
        toks != null ? `${toks} tok` : "",
      );
      lines.push(`  ${caller}->>${mid}: ${label}`);
      lines.push(`  ${mid}-->>${caller}: ok`);
    } else if (kind === "qa") {
      lines.push(
        `  Note over ${actor}: ${shortMermaidLabel("qa", ev.message || detail.verdict || "")}`,
      );
    } else if (kind === "run_end" || kind === "run_error") {
      lines.push(
        `  ${actor}-->>client: ${shortMermaidLabel(ev.message || kind.replace(/_/g, " "))}`,
      );
      stack = ["client"];
    } else {
      lines.push(`  ${caller}->>${actor}: ${shortMermaidLabel(kind, ev.message || "")}`);
      if (actor !== caller) stack.push(actor);
    }
  }
  if (lines.length === 1) {
    ensure("client");
    lines.push("  Note over client: No events recorded for this run_id");
  }
  return lines.join("\n");
}

function readRunTraceEvents(toolRoot, runId) {
  const file = path.join(
    toolRoot,
    "__orchestrator_run_traces__",
    `${safeTraceFileName(runId)}.jsonl`,
  );
  if (!fs.existsSync(file)) return [];
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const events = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === "object") events.push(obj);
    } catch {
      /* ignore */
    }
  }
  return events;
}

function listRecentTraces({
  toolRoot,
  limit = 50,
  client = "",
  clientIp = "",
  crewOnly = false,
}) {
  const dir = path.join(toolRoot, "__orchestrator_run_traces__");
  const runs = [];
  if (!fs.existsSync(dir)) {
    return { generatedAt: new Date().toISOString(), runs };
  }
  let ents = [];
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { generatedAt: new Date().toISOString(), runs };
  }
  const files = [];
  for (const ent of ents) {
    if (!ent.isFile() || !ent.name.endsWith(".jsonl")) continue;
    const p = path.join(dir, ent.name);
    try {
      files.push({ mtime: fs.statSync(p).mtimeMs, path: p, name: ent.name });
    } catch {
      /* ignore */
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  const clientQ = String(client || "").trim().toLowerCase();
  const ipQ = String(clientIp || "").trim().toLowerCase();
  const needFilter = Boolean(clientQ || ipQ || crewOnly);
  const scan = needFilter ? Math.max(500, Number(limit) || 50) : Math.max(1, Number(limit) || 50);
  for (const f of files.slice(0, scan)) {
    const runId = path.basename(f.name, ".jsonl");
    const events = readRunTraceEvents(toolRoot, runId);
    const item = enrichTraceListItem(events, { runId, mtime: f.mtime });
    if (clientQ) {
      const blob = [item.appId, item.userName, item.userId].map((x) => String(x || "")).join(" ").toLowerCase();
      if (!blob.includes(clientQ)) continue;
    }
    if (ipQ && !String(item.clientIp || "").toLowerCase().includes(ipQ)) continue;
    if (crewOnly && !(item.hasPlan || item.hasDecision || item.hasSteps)) continue;
    runs.push(item);
    if (runs.length >= Math.max(1, Number(limit) || 50)) break;
  }
  return { generatedAt: new Date().toISOString(), runs };
}

function buildRunTrace({ toolRoot }, id, { depth } = {}) {
  const runId = String(id || "").trim();
  if (!runId) return null;
  const events = readRunTraceEvents(toolRoot, runId);
  const filtered = filterEventsByDepth(events, depth);
  const ident = detailIdentity(events);
  const tokens = sumModelTokens(events);
  return {
    runId,
    eventCount: filtered.length,
    events: filtered,
    mermaid: eventsToMermaid(filtered),
    durationMs: traceDurationMs(events),
    instrumentation: traceInstrumentation(events),
    depth: String(depth || "all").trim().toLowerCase() || "all",
    ...ident,
    ...tokens,
  };
}

function readLlmUsageRows(toolRoot, { limit = 5000 } = {}) {
  const file = path.join(toolRoot, "__orchestrator_llm_usage__", "usage.jsonl");
  if (!fs.existsSync(file)) return [];
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === "object") rows.push(obj);
    } catch {
      /* ignore */
    }
  }
  if (limit > 0 && rows.length > limit) return rows.slice(-limit);
  return rows;
}

function rollupKey(v) {
  const s = String(v || "").trim();
  return s || "(unknown)";
}

/** Prefer explicit appId; else product id stamped on userName/userId (any client). */
function looksLikeAppId(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s || s.length > 64) return false;
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(s)) return false;
  if (s.includes("-") || s.includes("_")) return true;
  return s.length >= 4;
}

function effectiveAppId(row) {
  const app = String(row?.appId || "").trim();
  if (app) return app;
  for (const k of [row?.userName, row?.userId]) {
    if (looksLikeAppId(k)) return String(k).trim();
  }
  return "";
}

function normalizeLlmUsageRow(row) {
  if (!row || typeof row !== "object") return null;
  const appId = effectiveAppId(row) || null;
  return {
    ...row,
    appId,
  };
}

function addTokenBucket(map, key, row) {
  const cur = map.get(key) || {
    key,
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  cur.calls += 1;
  const p = Number(row.promptTokens);
  const c = Number(row.completionTokens);
  const t = Number(row.totalTokens);
  if (Number.isFinite(p)) cur.promptTokens += p;
  if (Number.isFinite(c)) cur.completionTokens += c;
  if (Number.isFinite(t)) cur.totalTokens += t;
  map.set(key, cur);
}

function emptyTokenTotals() {
  return { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function addToTotals(dst, row) {
  dst.calls += 1;
  const p = Number(row.promptTokens);
  const c = Number(row.completionTokens);
  const t = Number(row.totalTokens);
  if (Number.isFinite(p)) dst.promptTokens += p;
  if (Number.isFinite(c)) dst.completionTokens += c;
  if (Number.isFinite(t)) dst.totalTokens += t;
}

function rowTsMs(row) {
  const n = Number(row?.ts);
  if (Number.isFinite(n)) {
    // Epoch seconds vs milliseconds
    return n < 1e12 ? n * 1000 : n;
  }
  const iso = Date.parse(String(row?.ts || ""));
  return Number.isFinite(iso) ? iso : null;
}

function dayKeyUtc(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function summarizeLlmUsage(rows) {
  const byUserId = new Map();
  const byClientIp = new Map();
  const byAppId = new Map();
  const byTokenId = new Map();
  const byModel = new Map();
  const grandTotal = emptyTokenTotals();
  for (const raw of rows || []) {
    const row = normalizeLlmUsageRow(raw) || raw;
    addTokenBucket(byUserId, rollupKey(row.userId || row.userName), row);
    addTokenBucket(byClientIp, rollupKey(row.clientIp), row);
    addTokenBucket(byAppId, rollupKey(effectiveAppId(row)), row);
    addTokenBucket(byTokenId, rollupKey(row.tokenId), row);
    addTokenBucket(byModel, rollupKey(row.model), row);
    addToTotals(grandTotal, row);
  }
  const sortFn = (a, b) => b.totalTokens - a.totalTokens || b.calls - a.calls || String(a.key).localeCompare(String(b.key));
  return {
    byUserId: [...byUserId.values()].sort(sortFn),
    byClientIp: [...byClientIp.values()].sort(sortFn),
    byAppId: [...byAppId.values()].sort(sortFn),
    byTokenId: [...byTokenId.values()].sort(sortFn),
    byModel: [...byModel.values()].sort(sortFn),
    grandTotal,
  };
}

/** Daily token spend series + previous/current 7-day statement windows. */
function buildLlmSpendSeries(rows, { nowMs = Date.now(), windowDays = 7 } = {}) {
  const dayMs = 86_400_000;
  const win = Math.max(1, Number(windowDays) || 7);
  const currentStart = nowMs - win * dayMs;
  const previousStart = nowMs - win * 2 * dayMs;
  const previous = emptyTokenTotals();
  const current = emptyTokenTotals();
  const byDay = new Map();

  for (const row of rows || []) {
    const ms = rowTsMs(row);
    if (ms == null) continue;
    if (ms >= currentStart && ms <= nowMs) addToTotals(current, row);
    else if (ms >= previousStart && ms < currentStart) addToTotals(previous, row);

    const key = dayKeyUtc(ms);
    const cur = byDay.get(key) || {
      day: key,
      ts: Date.UTC(
        Number(key.slice(0, 4)),
        Number(key.slice(5, 7)) - 1,
        Number(key.slice(8, 10)),
      ),
      ...emptyTokenTotals(),
    };
    addToTotals(cur, row);
    byDay.set(key, cur);
  }

  // Fill contiguous days covering previous+current windows (and any older ledger days).
  const keys = [...byDay.keys()].sort();
  let fillStart = previousStart;
  let fillEnd = nowMs;
  if (keys.length) {
    const first = Date.parse(`${keys[0]}T00:00:00Z`);
    if (Number.isFinite(first) && first < fillStart) fillStart = first;
  }
  const timeline = [];
  for (let t = Date.UTC(
    new Date(fillStart).getUTCFullYear(),
    new Date(fillStart).getUTCMonth(),
    new Date(fillStart).getUTCDate(),
  ); t <= fillEnd; t += dayMs) {
    const key = dayKeyUtc(t);
    timeline.push(
      byDay.get(key) || {
        day: key,
        ts: t,
        ...emptyTokenTotals(),
      },
    );
  }

  const pctChange = (cur, prev) => {
    if (!prev) return cur ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  return {
    windowDays: win,
    previous: {
      ...previous,
      label: "Previous window",
      from: new Date(previousStart).toISOString(),
      to: new Date(currentStart).toISOString(),
    },
    current: {
      ...current,
      label: "Current window",
      from: new Date(currentStart).toISOString(),
      to: new Date(nowMs).toISOString(),
    },
    growthPct: {
      totalTokens: pctChange(current.totalTokens, previous.totalTokens),
      calls: pctChange(current.calls, previous.calls),
      promptTokens: pctChange(current.promptTokens, previous.promptTokens),
      completionTokens: pctChange(current.completionTokens, previous.completionTokens),
    },
    timeline,
  };
}

function summarizeApiUsage(toolRoot) {
  let rows = [];
  try {
    rows = listUsage(toolRoot, "", 1000);
  } catch {
    rows = [];
  }
  const byAppId = new Map();
  const byClientIp = new Map();
  const byTokenId = new Map();
  for (const row of rows || []) {
    const keyApp = rollupKey(row.appId);
    const keyIp = rollupKey(row.ip);
    const keyTok = rollupKey(row.tokenId);
    for (const [map, key] of [
      [byAppId, keyApp],
      [byClientIp, keyIp],
      [byTokenId, keyTok],
    ]) {
      const cur = map.get(key) || { key, calls: 0, latencyMsSum: 0, promptCharsSum: 0 };
      cur.calls += 1;
      const lat = Number(row.latencyMs);
      const pc = Number(row.promptChars);
      if (Number.isFinite(lat)) cur.latencyMsSum += lat;
      if (Number.isFinite(pc)) cur.promptCharsSum += pc;
      map.set(key, cur);
    }
  }
  const sortFn = (a, b) => b.calls - a.calls || String(a.key).localeCompare(String(b.key));
  return {
    byAppId: [...byAppId.values()].sort(sortFn),
    byClientIp: [...byClientIp.values()].sort(sortFn),
    byTokenId: [...byTokenId.values()].sort(sortFn),
  };
}

/**
 * Synthesize ledger rows from run-trace ``model_call`` events.
 * Covers Reach/Comstar traffic that hit the engine before (or without) a durable
 * usage.jsonl write, as long as traces were shared on the host.
 */
function llmUsageRowsFromTraces(toolRoot, { limitRuns = 120 } = {}) {
  const listed = listRecentTraces({ toolRoot, limit: limitRuns });
  const rows = [];
  for (const item of listed.runs || []) {
    const runId = String(item.runId || "").trim();
    if (!runId) continue;
    const events = readRunTraceEvents(toolRoot, runId);
    const ident = detailIdentity(events);
    for (const ev of events || []) {
      if (String(ev?.kind || "") !== "model_call") continue;
      const d = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
      const prompt = d.prompt_tokens != null ? Number(d.prompt_tokens) : null;
      const completion =
        d.completion_tokens != null ? Number(d.completion_tokens) : null;
      let total = d.total_tokens != null ? Number(d.total_tokens) : null;
      if (
        total == null &&
        Number.isFinite(prompt) &&
        Number.isFinite(completion)
      ) {
        total = prompt + completion;
      }
      if (
        !Number.isFinite(prompt) &&
        !Number.isFinite(completion) &&
        !Number.isFinite(total)
      ) {
        continue;
      }
      rows.push(
        normalizeLlmUsageRow({
          ts: Number.isFinite(Number(ev.ts)) ? Number(ev.ts) : Date.now() / 1000,
          runId,
          userId: ident.userId,
          userName: ident.userName,
          appId: ident.appId,
          clientIp: ident.clientIp,
          source: String(d.source || "trace_model_call"),
          model: d.model != null ? String(d.model) : String(ev.message || "") || null,
          promptTokens: Number.isFinite(prompt) ? prompt : null,
          completionTokens: Number.isFinite(completion) ? completion : null,
          totalTokens: Number.isFinite(total) ? total : null,
          latencyMs: d.latency_ms != null ? Number(d.latency_ms) : null,
          ok: d.ok !== false,
          fromTrace: true,
        }),
      );
    }
  }
  return rows;
}

function mergeLlmUsageRows(ledgerRows, traceRows) {
  const seen = new Set();
  const out = [];
  const keyOf = (r) => {
    const ts = Number(r?.ts);
    const rid = String(r?.runId || "");
    const model = String(r?.model || "");
    const total = String(r?.totalTokens ?? "");
    const src = String(r?.source || "");
    return `${rid}|${ts}|${model}|${total}|${src}`;
  };
  for (const raw of [...(ledgerRows || []), ...(traceRows || [])]) {
    const row = normalizeLlmUsageRow(raw);
    if (!row) continue;
    const k = keyOf(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  out.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  return out;
}

function buildLlmUsagePayload({ toolRoot, limit = 200 }) {
  const ledger = readLlmUsageRows(toolRoot, { limit: 20000 }).map(
    (r) => normalizeLlmUsageRow(r) || r,
  );
  const fromTraces = llmUsageRowsFromTraces(toolRoot, { limitRuns: 150 });
  const all = mergeLlmUsageRows(ledger, fromTraces);
  const recent = all.slice(-Math.max(1, Number(limit) || 200)).reverse();
  const llm = summarizeLlmUsage(all);
  const spend = buildLlmSpendSeries(all);
  return {
    generatedAt: new Date().toISOString(),
    recent,
    llm,
    spend,
    api: summarizeApiUsage(toolRoot),
    sources: {
      ledgerRows: ledger.length,
      traceDerivedRows: fromTraces.length,
      mergedRows: all.length,
    },
  };
}

function buildAccessPosture({ toolRoot, webRoot, req }) {
  const cfg = buildEffectiveConfig({ toolRoot, webRoot });
  const e = (key) => cfg.entries[key];
  const truthy = (val) =>
    ["1", "true", "yes", "on"].includes(String(val || "").trim().toLowerCase());

  const scheme =
    (req?.headers?.["x-forwarded-proto"] &&
      String(req.headers["x-forwarded-proto"]).split(",")[0].trim()) ||
    (req?.socket?.encrypted ? "https" : "http");
  const host = req?.headers?.host || `${process.env.AGENTIC_WEB_HOST || "127.0.0.1"}:${process.env.AGENTIC_WEB_PORT || 3847}`;
  const identityRequired = truthy(e("AGENTIC_REQUIRE_IDENTITY")?.effective);
  const engineTls = Boolean(
    e("AGENTIC_SERVE_TLS_CERTFILE")?.set && e("AGENTIC_SERVE_TLS_KEYFILE")?.set,
  );
  const webTls = scheme === "https";
  const orchestrateKeySet = Boolean(e("AGENTIC_ORCHESTRATE_API_KEY")?.set);
  const webUiAssigned = isWebUiAssigned(toolRoot);
  const chatUiAssigned = isChatUiAssigned(toolRoot);
  const activeTokens = listTokens(toolRoot).filter((t) => t.status === "active").length;

  let severity = "ok";
  let verdict = "Access posture looks sound for this process.";
  if (!webUiAssigned || !chatUiAssigned) {
    severity = "critical";
    const missing = [
      !webUiAssigned ? "Admin (ao-web)" : null,
      !chatUiAssigned ? "Chat (ao-chat)" : null,
    ]
      .filter(Boolean)
      .join(" and ");
    verdict = `${missing} token not assigned — mint on Access to unlock first-party UIs.`;
  } else if (!webTls && !identityRequired) {
    severity = "warning";
    verdict =
      "API auth is enforced, but Admin is reachable over plaintext HTTP without upstream identity.";
  } else if (!identityRequired) {
    severity = "warning";
    verdict =
      "API tokens are required; consider requiring upstream identity (security gateway / AGENTIC_REQUIRE_IDENTITY) as well.";
  } else if (!webTls) {
    severity = "warning";
    verdict = "Admin is served over plaintext HTTP (TLS not terminating here).";
  }

  return {
    generatedAt: new Date().toISOString(),
    severity,
    verdict,
    details: [
      `Admin is served on ${scheme}://${host}`,
      `API auth enforced (orchestrate / OpenAI proxies always require Bearer)`,
      `Admin Web UI token ${webUiAssigned ? "assigned (ao-web)" : "not assigned"}`,
      `Chat Web UI token ${chatUiAssigned ? "assigned (ao-chat)" : "not assigned"}`,
      `${activeTokens} active API token${activeTokens === 1 ? "" : "s"}`,
      `identity ${identityRequired ? "required" : "not required"}`,
      `engine TLS ${engineTls ? "configured" : "absent"}`,
      `web TLS ${webTls ? "present (or terminated upstream)" : "absent"}`,
      `orchestrate API key ${orchestrateKeySet ? "set (env fallback)" : "unset"}`,
    ],
    flags: {
      scheme,
      host,
      identityRequired,
      engineTls,
      webTls,
      orchestrateKeySet,
      apiAuthEnforced: true,
      webUiAssigned,
      chatUiAssigned,
      activeTokenCount: activeTokens,
    },
  };
}

function buildSupportBundle({ toolRoot, webRoot, webInstanceId, webPid }) {
  const cfg = buildEffectiveConfig({ toolRoot, webRoot });
  const redactedEntries = {};
  for (const [k, v] of Object.entries(cfg.entries)) {
    redactedEntries[k] = {
      effective: v.secret ? (v.set ? "[set]" : "[unset]") : v.effective,
      source: v.source,
      set: v.set,
      default: v.secret ? undefined : v.default,
      tier: v.tier,
      group: v.group,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    phase: 0,
    instance: webInstanceId,
    pid: webPid,
    fingerprint: cfg.fingerprint,
    environment: process.env.AGENTIC_EDGE_PLATFORM || "local",
    hostname: process.env.HOSTNAME || null,
    storage: buildStorageInventory({ toolRoot }),
    config: redactedEntries,
  };
}

function matchAdminRoute(pathname) {
  const p = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (p === "/api/v1/admin/config/effective") return { name: "config_effective" };
  if (p === "/api/v1/admin/config/fingerprint") return { name: "config_fingerprint" };
  if (p === "/api/v1/admin/health/topology") return { name: "topology" };
  if (p === "/api/v1/admin/topology/graph") return { name: "topology_graph" };
  let m = p.match(/^\/api\/v1\/admin\/topology\/node\/(.+)$/);
  if (m) return { name: "topology_node", id: decodeURIComponent(m[1]) };
  m = p.match(/^\/api\/v1\/admin\/topology\/edge\/([^/]+)\/metrics$/);
  if (m) return { name: "topology_edge_metrics", id: decodeURIComponent(m[1]) };
  if (p === "/api/v1/admin/storage") return { name: "storage" };
  if (p === "/api/v1/admin/meta") return { name: "meta" };
  if (p === "/api/v1/admin/access/posture") return { name: "access_posture" };
  if (p === "/api/v1/admin/web-auth") return { name: "web_auth" };
  if (p === "/api/v1/admin/chat-auth") return { name: "chat_auth" };
  if (p === "/api/v1/admin/support-bundle") return { name: "support_bundle" };
  if (p === "/api/v1/admin/runs") return { name: "runs_list" };
  if (p === "/api/v1/admin/traces") return { name: "traces_list" };
  if (p === "/api/v1/admin/llm-usage") return { name: "llm_usage" };
  m = p.match(/^\/api\/v1\/admin\/runs\/([^/]+)\/trace$/);
  if (m) return { name: "runs_trace", id: decodeURIComponent(m[1]) };
  m = p.match(/^\/api\/v1\/admin\/traces\/([^/]+)$/);
  if (m) return { name: "runs_trace", id: decodeURIComponent(m[1]) };
  m = p.match(/^\/api\/v1\/admin\/runs\/([^/]+)$/);
  if (m) return { name: "runs_detail", id: decodeURIComponent(m[1]) };
  m = p.match(/^\/api\/v1\/admin\/catalogs\/([a-z]+)\/([^/]+)$/);
  if (m) return { name: "catalog_detail", kind: m[1], id: decodeURIComponent(m[2]) };
  m = p.match(/^\/api\/v1\/admin\/catalogs\/([a-z]+)$/);
  if (m) return { name: "catalog_list", kind: m[1] };
  if (p === "/api/v1/admin/tokens") return { name: "tokens" };
  m = p.match(/^\/api\/v1\/admin\/tokens\/([^/]+)\/usage$/);
  if (m) return { name: "token_usage", id: decodeURIComponent(m[1]) };
  m = p.match(/^\/api\/v1\/admin\/tokens\/([^/]+)$/);
  if (m) return { name: "token_item", id: decodeURIComponent(m[1]) };
  if (p === "/api/v1/admin/app-prefs") return { name: "app_prefs" };
  m = p.match(/^\/api\/v1\/admin\/app-prefs\/([^/]+)$/);
  if (m) return { name: "app_prefs_item", id: decodeURIComponent(m[1]) };
  if (p === "/api/v1/admin/mtls/clients") return { name: "mtls_clients" };
  if (p === "/api/v1/admin/mtls/clients/revoke") return { name: "mtls_clients_revoke" };
  if (p === "/api/v1/admin/mtls/clients/unrevoke") return { name: "mtls_clients_unrevoke" };
  if (p === "/api/v1/admin/mtls/enroll-tokens") return { name: "mtls_enroll_tokens" };
  if (p === "/api/v1/admin/control") return { name: "control" };
  if (p === "/api/v1/admin/control/restart") return { name: "control_restart" };
  return null;
}

function readAdminJsonBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error("Request body too large"), { code: "too_large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      if (!buf.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(buf.toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { code: "invalid_json" }));
      }
    });
    req.on("error", reject);
  });
}

function isTokenWriteRoute(route, method) {
  if (!route) return false;
  if (route.name === "tokens" && method === "POST") return true;
  if (route.name === "token_item" && method === "DELETE") return true;
  if (route.name === "app_prefs_item" && (method === "PUT" || method === "PATCH")) return true;
  if (route.name === "mtls_clients_revoke" && method === "POST") return true;
  if (route.name === "mtls_clients_unrevoke" && method === "POST") return true;
  if (route.name === "mtls_enroll_tokens" && method === "POST") return true;
  if (route.name === "control_restart" && method === "POST") return true;
  return false;
}

async function handleAdminApi(req, res, ctx) {
  const pathname = ctx.pathname;
  const route = matchAdminRoute(pathname);
  if (!route) return false;

  const method = String(req.method || "GET").toUpperCase();
  const writeOk = isTokenWriteRoute(route, method);
  if (method !== "GET" && method !== "HEAD" && !writeOk) {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Method not allowed (Phase 0 is read-only)" }));
    return true;
  }

  const send = (code, body) => {
    res.writeHead(code, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Agentic-Admin": "phase-0",
    });
    res.end(JSON.stringify(body));
  };

  try {
    if (route.name === "meta") {
      send(200, {
        phase: 0,
        writeApi: { tokens: true, appPrefs: true, mtlsClients: true, control: true },
        title: "AO Administration",
        readOnlyMessage:
          "Read-only except API tokens, per-app planning prefs, mTLS client revoke, and AO control restarts",
        webUiAppId: WEB_UI_APP_ID,
        chatUiAppId: CHAT_UI_APP_ID,
        webUiAssigned: isWebUiAssigned(ctx.toolRoot),
        chatUiAssigned: isChatUiAssigned(ctx.toolRoot),
      });
      return true;
    }
    if (route.name === "web_auth" && (method === "GET" || method === "HEAD")) {
      const assigned = getWebAssignment(ctx.toolRoot);
      if (!assigned) {
        send(200, {
          assigned: false,
          appId: WEB_UI_APP_ID,
          token: null,
          hint: "Mint an API token with appId ao-web (or assignToWeb) on Access",
        });
        return true;
      }
      send(200, {
        assigned: true,
        appId: WEB_UI_APP_ID,
        token: assigned.token,
        tokenId: assigned.tokenId,
        prefix: assigned.prefix,
        assignedAt: assigned.assignedAt,
      });
      return true;
    }
    if (route.name === "chat_auth" && (method === "GET" || method === "HEAD")) {
      const assigned = getChatAssignment(ctx.toolRoot);
      if (!assigned) {
        send(200, {
          assigned: false,
          appId: CHAT_UI_APP_ID,
          token: null,
          hint: "Mint an API token with appId ao-chat (or assignToChat) on Access",
        });
        return true;
      }
      send(200, {
        assigned: true,
        appId: CHAT_UI_APP_ID,
        token: assigned.token,
        tokenId: assigned.tokenId,
        prefix: assigned.prefix,
        assignedAt: assigned.assignedAt,
      });
      return true;
    }
    if (route.name === "mtls_clients" && (method === "GET" || method === "HEAD")) {
      const engine = await resolveEngineBase();
      if (!engine.ok) {
        send(502, { error: engine.error || "Engine unreachable" });
        return true;
      }
      const result = await fetchJsonRequest(`${engine.base}/api/v1/admin/mtls/clients`, {
        timeoutMs: 5000,
        tlsInsecure: engine.tlsInsecure,
      });
      if (!result.ok) {
        send(result.status || 502, {
          error: result.json?.detail || result.json?.error || result.error || "Engine mTLS clients failed",
        });
        return true;
      }
      send(200, result.json);
      return true;
    }
    if (route.name === "mtls_clients_revoke" && method === "POST") {
      let body;
      try {
        body = await readAdminJsonBody(req);
      } catch (err) {
        send(err?.code === "too_large" ? 413 : 400, {
          error: err instanceof Error ? err.message : "Invalid body",
        });
        return true;
      }
      const engine = await resolveEngineBase();
      if (!engine.ok) {
        send(502, { error: engine.error || "Engine unreachable" });
        return true;
      }
      const result = await fetchJsonRequest(`${engine.base}/api/v1/admin/mtls/clients/revoke`, {
        method: "POST",
        body,
        timeoutMs: 5000,
        tlsInsecure: engine.tlsInsecure,
      });
      if (!result.ok) {
        send(result.status || 502, {
          error:
            result.json?.detail ||
            result.json?.error ||
            result.error ||
            "Engine mTLS revoke failed",
        });
        return true;
      }
      send(200, result.json);
      return true;
    }
    if (route.name === "mtls_clients_unrevoke" && method === "POST") {
      let body;
      try {
        body = await readAdminJsonBody(req);
      } catch (err) {
        send(err?.code === "too_large" ? 413 : 400, {
          error: err instanceof Error ? err.message : "Invalid body",
        });
        return true;
      }
      const engine = await resolveEngineBase();
      if (!engine.ok) {
        send(502, { error: engine.error || "Engine unreachable" });
        return true;
      }
      const result = await fetchJsonRequest(`${engine.base}/api/v1/admin/mtls/clients/unrevoke`, {
        method: "POST",
        body,
        timeoutMs: 5000,
        tlsInsecure: engine.tlsInsecure,
      });
      if (!result.ok) {
        send(result.status || 502, {
          error:
            result.json?.detail ||
            result.json?.error ||
            result.error ||
            "Engine mTLS unrevoke failed",
        });
        return true;
      }
      send(200, result.json);
      return true;
    }
    if (route.name === "mtls_enroll_tokens" && method === "POST") {
      let body;
      try {
        body = await readAdminJsonBody(req);
      } catch (err) {
        send(err?.code === "too_large" ? 413 : 400, {
          error: err instanceof Error ? err.message : "Invalid body",
        });
        return true;
      }
      const engine = await resolveEngineBase();
      if (!engine.ok) {
        send(502, { error: engine.error || "Engine unreachable" });
        return true;
      }
      const result = await fetchJsonRequest(`${engine.base}/api/v1/admin/mtls/enroll-tokens`, {
        method: "POST",
        body,
        timeoutMs: 5000,
        tlsInsecure: engine.tlsInsecure,
      });
      if (!result.ok) {
        send(result.status || 502, {
          error:
            result.json?.detail ||
            result.json?.error ||
            result.error ||
            "Engine mTLS enroll-token mint failed",
        });
        return true;
      }
      send(201, result.json);
      return true;
    }
    if (route.name === "tokens") {
      if (method === "GET" || method === "HEAD") {
        send(200, { tokens: listTokens(ctx.toolRoot) });
        return true;
      }
      if (method === "POST") {
        let body;
        try {
          body = await readAdminJsonBody(req);
        } catch (err) {
          const code = err?.code === "too_large" ? 413 : 400;
          send(code, { error: err instanceof Error ? err.message : "Invalid body" });
          return true;
        }
        try {
          const minted = mintToken(ctx.toolRoot, {
            appId: body.appId,
            label: body.label,
            expiresAt: body.expiresAt || null,
            assignToWeb: Boolean(body.assignToWeb) || undefined,
            assignToChat: Boolean(body.assignToChat) || undefined,
          });
          send(201, minted);
        } catch (err) {
          send(400, { error: err instanceof Error ? err.message : "Mint failed" });
        }
        return true;
      }
    }
    if (route.name === "token_item" && method === "DELETE") {
      const revoked = revokeToken(ctx.toolRoot, route.id);
      if (!revoked) {
        send(404, { error: "Token not found" });
        return true;
      }
      send(200, revoked);
      return true;
    }
    if (route.name === "token_usage" && (method === "GET" || method === "HEAD")) {
      const url = new URL(req.url || "/", "http://localhost");
      const limit = Number(url.searchParams.get("limit") || 100);
      send(200, {
        tokenId: route.id,
        usage: listUsage(ctx.toolRoot, route.id, limit),
      });
      return true;
    }
    if (route.name === "app_prefs" && (method === "GET" || method === "HEAD")) {
      const known = new Set(listAppPrefs(ctx.toolRoot).map((p) => p.appId));
      for (const t of listTokens(ctx.toolRoot)) {
        const id = String(t.appId || "").trim().toLowerCase();
        if (id) known.add(id);
      }
      const apps = [...known]
        .sort((a, b) => a.localeCompare(b))
        .map((appId) => ({ appId, ...getAppPrefs(ctx.toolRoot, appId) }));
      send(200, { apps });
      return true;
    }
    if (route.name === "app_prefs_item") {
      if (method === "GET" || method === "HEAD") {
        send(200, { appId: route.id, ...getAppPrefs(ctx.toolRoot, route.id) });
        return true;
      }
      if (method === "PUT" || method === "PATCH") {
        let body;
        try {
          body = await readAdminJsonBody(req);
        } catch (err) {
          const code = err?.code === "too_large" ? 413 : 400;
          send(code, { error: err instanceof Error ? err.message : "Invalid body" });
          return true;
        }
        try {
          send(200, setAppPrefs(ctx.toolRoot, route.id, body));
        } catch (err) {
          send(400, { error: err instanceof Error ? err.message : "Update failed" });
        }
        return true;
      }
    }
    if (route.name === "config_effective") {
      const url = new URL(req.url || "/", "http://localhost");
      const includeInjected = url.searchParams.get("includeInjected") === "1";
      send(200, buildEffectiveConfig({ ...ctx, includeInjected }));
      return true;
    }
    if (route.name === "config_fingerprint") {
      const cfg = buildEffectiveConfig(ctx);
      send(200, { fingerprint: cfg.fingerprint, generatedAt: cfg.generatedAt });
      return true;
    }
    if (route.name === "topology") {
      send(200, await buildTopology(ctx));
      return true;
    }
    if (route.name === "topology_graph") {
      send(
        200,
        await buildTopologyGraph({
          ...ctx,
          fetchJson,
          buildCatalogs,
        }),
      );
      return true;
    }
    if (route.name === "topology_node") {
      const detail = await buildTopologyNodeDetail(route.id, {
        ...ctx,
        fetchJson,
        buildCatalogs,
      });
      if (!detail) {
        send(404, { error: "Topology node not found" });
        return true;
      }
      send(200, detail);
      return true;
    }
    if (route.name === "topology_edge_metrics") {
      const { watchPayload } = await import("./admin-topology-metrics.mjs");
      const payload = watchPayload("edge", route.id);
      send(200, {
        edgeId: route.id,
        instrumented: payload.instrumented,
        window: "15m",
        latest: payload.latest,
        series: payload.series,
        generatedAt: new Date().toISOString(),
      });
      return true;
    }
    if (route.name === "storage") {
      send(200, buildStorageInventory(ctx));
      return true;
    }
    if (route.name === "access_posture") {
      send(200, buildAccessPosture({ ...ctx, req }));
      return true;
    }
    if (route.name === "support_bundle") {
      const topology = await buildTopology(ctx);
      const bundle = buildSupportBundle(ctx);
      bundle.topology = {
        attention: topology.attention,
        components: topology.components?.map((c) => ({
          id: c.id,
          status: c.status,
          fact: c.fact,
        })),
        environment: topology.environment,
      };
      send(200, bundle);
      return true;
    }
    if (route.name === "runs_list") {
      const url = new URL(req.url || "/", "http://localhost");
      const limit = Number(url.searchParams.get("limit") || 50);
      send(200, listRecentRuns({ ...ctx, limit }));
      return true;
    }
    if (route.name === "traces_list") {
      const url = new URL(req.url || "/", "http://localhost");
      const limit = Number(url.searchParams.get("limit") || 50);
      const client = url.searchParams.get("client") || "";
      const clientIp = url.searchParams.get("clientIp") || "";
      const crewOnly = ["1", "true", "yes"].includes(
        String(url.searchParams.get("crewOnly") || "").trim().toLowerCase(),
      );
      send(200, listRecentTraces({ ...ctx, limit, client, clientIp, crewOnly }));
      return true;
    }
    if (route.name === "llm_usage") {
      const url = new URL(req.url || "/", "http://localhost");
      const limit = Number(url.searchParams.get("limit") || 200);
      send(200, buildLlmUsagePayload({ ...ctx, limit }));
      return true;
    }
    if (route.name === "runs_trace") {
      const url = new URL(req.url || "/", "http://localhost");
      const depth = url.searchParams.get("depth") || "all";
      const data = buildRunTrace(ctx, route.id, { depth });
      if (!data) {
        send(404, { error: "Trace not found" });
        return true;
      }
      send(200, data);
      return true;
    }
    if (route.name === "runs_detail") {
      const data = buildRunDetail(ctx, route.id);
      if (!data) {
        send(404, { error: "Run not found in web-visible stores" });
        return true;
      }
      send(200, data);
      return true;
    }
    if (route.name === "catalog_list") {
      const data = buildCatalogs(route.kind, ctx);
      if (!data) {
        send(404, {
          error: `Unknown catalog kind: ${route.kind}`,
          kinds: ["agents", "mcp", "skills", "rag", "workflows", "harnesses", "societies"],
        });
        return true;
      }
      send(200, data);
      return true;
    }
    if (route.name === "catalog_detail") {
      const data = buildCatalogDetail(route.kind, route.id, ctx);
      if (!data) {
        send(404, { error: "Catalog entry not found" });
        return true;
      }
      send(200, data);
      return true;
    }
    if (route.name === "control" && (method === "GET" || method === "HEAD")) {
      send(200, await buildControlStatus());
      return true;
    }
    if (route.name === "control_restart" && method === "POST") {
      let body;
      try {
        body = await readAdminJsonBody(req);
      } catch (err) {
        const code = err?.code === "too_large" ? 413 : 400;
        send(code, { error: err instanceof Error ? err.message : "Invalid body" });
        return true;
      }
      const result = await executeControlRestart(body);
      send(result.httpStatus, result.body);
      if (typeof result.afterSend === "function") {
        setTimeout(() => {
          Promise.resolve(result.afterSend()).catch((err) => {
            console.error("[admin-control] delayed restart failed", err);
          });
        }, 300);
      }
      return true;
    }
  } catch (err) {
    send(500, { error: err instanceof Error ? err.message : "Admin API error" });
    return true;
  }
  return false;
}

export {
  handleAdminApi,
  matchAdminRoute,
  buildEffectiveConfig,
  buildCatalogs,
  buildTopology,
  buildTopologyGraph,
  buildTopologyNodeDetail,
  buildStorageInventory,
  buildAccessPosture,
  buildSupportBundle,
  buildControlStatus,
  executeControlRestart,
  listRecentRuns,
  buildRunDetail,
  listRecentTraces,
  buildRunTrace,
  buildLlmUsagePayload,
  fetchJson,
  isSecretKey,
  isInjectedK8sEnvKey,
  KEY_META,
  WIKI_BASE_URL,
  wikiMetaForKey,
  wikiUrlForKey,
  parseEnvExampleHelp,
  helpForKey,
};

/**
 * Phase 0 Admin read API helpers.
 * Secrets are never returned — only { set: true/false }.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";

const SECRET_KEY_RE =
  /(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CERTFILE|KEYFILE|CA_FILE|_PEM)$/i;

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

  // Planner
  AGENTIC_PLANNER_MODEL: { group: "planner", tier: TIER_NEXT_RUN, label: "Planner model" },
  AGENTIC_PLANNER_USE_LITELLM: { group: "planner", tier: TIER_NEXT_RUN, label: "Use LiteLLM" },
  AGENTIC_PLANNER_MAX_STEPS: { group: "planner", tier: TIER_NEXT_RUN, label: "Max plan steps" },
  AGENTIC_PLANNER_JSON_MODE: { group: "planner", tier: TIER_NEXT_RUN, label: "Planner JSON mode" },
  AGENTIC_PLANNER_REPAIR_RETRY: { group: "planner", tier: TIER_NEXT_RUN, label: "Repair retry" },
  AGENTIC_PLANNER_429_RETRIES: { group: "planner", tier: TIER_NEXT_RUN, label: "429 retries" },
  AGENTIC_PLANNER_CONTEXT_TURNS: { group: "planner", tier: TIER_NEXT_RUN, label: "Context turns" },
  AGENTIC_PLANNER_MESSAGE_CHARS: { group: "planner", tier: TIER_NEXT_RUN, label: "Message chars" },
  AGENTIC_PLANNER_TIMEOUT_SEC: { group: "planner", tier: TIER_NEXT_RUN, label: "Planner timeout (s)" },
  AGENTIC_DYNAMIC_ITERATIVE_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Iterative rounds",
  },
  AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Max iterative rounds",
  },
  AGENTIC_DYNAMIC_ITERATIVE_MIN_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Min iterative rounds",
  },
  AGENTIC_ITERATIVE_CONTROLLER_MODEL: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Iterative controller model",
  },
  AGENTIC_ANSWER_CACHE: { group: "planner", tier: TIER_NEXT_RUN, label: "Answer cache" },
  AGENTIC_STEP_CONTEXT_INJECT: { group: "planner", tier: TIER_NEXT_RUN, label: "Step context inject" },
  AGENTIC_STEP_CONTEXT_CHARS: { group: "planner", tier: TIER_NEXT_RUN, label: "Step context chars" },
  AGENTIC_ORCHESTRATOR_SESSION: { group: "planner", tier: TIER_NEXT_RUN, label: "Orchestrator session" },
  AGENTIC_ORCHESTRATOR_DEFAULT_SESSION: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Default session slug",
  },
  AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Max planner turns stored",
  },
  AGENTIC_ORCHESTRATOR_EXCERPT_CHARS: {
    group: "planner",
    tier: TIER_NEXT_RUN,
    label: "Crew excerpt chars",
  },
  AGENTIC_WEB_DEFAULT_RUN_MODE: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default run mode",
  },
  AGENTIC_WEB_DEFAULT_AUTO_ITER: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default auto-iter",
  },
  AGENTIC_WEB_DEFAULT_ITERATIVE_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default iterative rounds",
  },
  AGENTIC_WEB_DEFAULT_ITERATIVE_MAX_ROUNDS: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Web default max rounds",
  },
  AGENTIC_WEB_PLANNER_GREET: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Planner greeting",
  },
  AGENTIC_WEB_WELCOME_MESSAGE: {
    group: "planner",
    tier: TIER_NEXT_SESSION,
    label: "Welcome message",
  },

  // Execution
  AGENTIC_EXECUTION_BACKEND: { group: "execution", tier: TIER_RESTART, label: "Execution backend" },
  AGENTIC_SUBPROCESS_WORKERS: { group: "execution", tier: TIER_RESTART, label: "Subprocess workers" },
  AGENTIC_RUN_STORE_PATH: { group: "execution", tier: TIER_RESTART, label: "Run store path" },
  AGENTIC_RUN_STORE_BACKEND: { group: "execution", tier: TIER_RESTART, label: "Run store backend" },
  AGENTIC_K8S_WARM_POOL_ENABLED: { group: "execution", tier: TIER_REDEPLOY, label: "Warm pool enabled" },
  AGENTIC_K8S_DELEGATION_ENABLED: {
    group: "execution",
    tier: TIER_REDEPLOY,
    label: "Delegation enabled",
  },
  AGENTIC_K8S_NAMESPACE: { group: "execution", tier: TIER_REDEPLOY, label: "K8s namespace" },
  AGENTIC_K8S_WORKER_IMAGE: { group: "execution", tier: TIER_REDEPLOY, label: "Worker image" },
  AGENTIC_K8S_ALLOW_STDIO_MCPS: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Allow stdio MCPs in K8s",
  },
  AGENTIC_K8S_WORKER_STDIO_MCPS: {
    group: "execution",
    tier: TIER_RESTART,
    label: "Worker stdio MCP ids",
  },
  AGENTIC_LOG_FORMAT: { group: "execution", tier: TIER_RESTART, label: "Log format" },

  // Engine / serve
  AGENTIC_SERVE_HOST: { group: "engine", tier: TIER_RESTART, label: "Engine bind host" },
  AGENTIC_SERVE_PORT: { group: "engine", tier: TIER_RESTART, label: "Engine bind port" },
  AGENTIC_SERVE_SESSION_OVERLAY: { group: "engine", tier: TIER_RESTART, label: "Session overlays" },
  AGENTIC_SERVE_MCP_TUNNEL: { group: "engine", tier: TIER_RESTART, label: "MCP tunnel" },
  AGENTIC_SERVE_TLS_CERTFILE: { group: "security", tier: TIER_RESTART, label: "TLS cert file" },
  AGENTIC_SERVE_TLS_KEYFILE: { group: "security", tier: TIER_RESTART, label: "TLS key file" },
  AGENTIC_SERVE_TLS_CA_FILE: { group: "security", tier: TIER_RESTART, label: "TLS client CA" },
  AGENTIC_SERVE_TLS_REQUIRE_CLIENT_CERT: {
    group: "security",
    tier: TIER_RESTART,
    label: "Require client cert",
  },
  AGENTIC_REQUIRE_IDENTITY: { group: "security", tier: TIER_RESTART, label: "Require identity" },
  AGENTIC_DEAL_AUTH: { group: "security", tier: TIER_RESTART, label: "Deal authorization" },
  AGENTIC_WEB_USER_NAME_HEADER: {
    group: "security",
    tier: TIER_RESTART,
    label: "User name headers",
  },
  AGENTIC_WEB_SESSION_ID_HEADER: {
    group: "security",
    tier: TIER_RESTART,
    label: "Session id headers",
  },
  AGENTIC_ORCHESTRATE_API_KEY: { group: "security", tier: TIER_RESTART, label: "Orchestrate API key" },
  AGENTIC_CHAT_COMPLETIONS_API_KEY: {
    group: "security",
    tier: TIER_RESTART,
    label: "Chat completions API key",
  },
  AGENTIC_JETSON_ENABLE_ENGINE: {
    group: "deployments",
    tier: TIER_REDEPLOY,
    label: "Enable engine on deploy",
  },

  // Memory / QA
  AGENTIC_KB: { group: "memory", tier: TIER_NEXT_RUN, label: "Knowledge base" },
  AGENTIC_KB_MAX_HITS: { group: "memory", tier: TIER_NEXT_RUN, label: "KB max hits" },
  AGENTIC_LEARNING: { group: "memory", tier: TIER_NEXT_RUN, label: "Learning loop" },
  AGENTIC_LEARNING_EVAL: { group: "memory", tier: TIER_NEXT_RUN, label: "Learning eval" },
  AGENTIC_FINAL_QA: { group: "memory", tier: TIER_NEXT_RUN, label: "Faithfulness QA" },
  AGENTIC_IMPARTIAL_QA: { group: "memory", tier: TIER_NEXT_RUN, label: "Impartial QA gate" },
  AGENTIC_IMPARTIAL_QA_FAIL: { group: "memory", tier: TIER_NEXT_RUN, label: "Impartial QA hard fail" },
  AGENTIC_ANONYMIZE_CLOUD: { group: "memory", tier: TIER_NEXT_RUN, label: "Cloud anonymization" },

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
  AGENTIC_WEB_HOST: { group: "deployments", tier: TIER_RESTART, label: "Web bind host" },
  AGENTIC_WEB_PORT: { group: "deployments", tier: TIER_RESTART, label: "Web bind port" },
  AGENTIC_EDGE_PLATFORM: { group: "deployments", tier: TIER_RESTART, label: "Edge platform" },
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

function buildEffectiveConfig({ toolRoot, webRoot }) {
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
    const meta = KEY_META[key] || {
      group: key.startsWith("AGENTIC_K8S_")
        ? "execution"
        : key.startsWith("AGENTIC_SOCIETY_")
          ? "societies"
          : "advanced",
      tier: TIER_RESTART,
      label: key,
    };
    const chain = [];
    let effective = undefined;
    let source = "unset";
    let sourcePath = null;

    for (const layer of layers) {
      if (Object.prototype.hasOwnProperty.call(layer.values, key)) {
        chain.push({ plane: layer.plane, path: layer.path, set: true });
        effective = layer.values[key];
        source = layer.plane;
        sourcePath = layer.path;
      }
    }
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      // process.env wins for the running process
      const fromFile = effective;
      effective = process.env[key];
      if (fromFile !== effective) {
        chain.push({ plane: "process", path: "process.env", set: true });
        source = "process";
        sourcePath = "process.env";
      } else if (source === "unset") {
        chain.push({ plane: "process", path: "process.env", set: true });
        source = "process";
        sourcePath = "process.env";
      }
    }

    const secret = isSecretKey(key);
    const set = effective !== undefined && String(effective).length > 0;
    entries[key] = {
      key,
      label: meta.label || key,
      group: meta.group || "advanced",
      tier: meta.tier || TIER_RESTART,
      source,
      sourcePath,
      overriddenBy: chain.length > 1 ? chain.slice(0, -1) : [],
      chain,
      secret,
      set,
      value: secret ? undefined : set ? String(effective) : null,
      secretState: secret ? { set, usedBy: meta.usedBy || [] } : undefined,
    };
  }

  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        Object.keys(entries)
          .sort()
          .map((k) => [k, entries[k].set, entries[k].secret ? "[secret]" : entries[k].value, entries[k].source]),
      ),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: new Date().toISOString(),
    fingerprint,
    phase: 0,
    writeApi: false,
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
  const dirs = [
    { id: "sessions", rel: "__orchestrator_sessions__", label: "Sessions" },
    { id: "learning", rel: "__orchestrator_learning__", label: "Learning" },
    { id: "kb", rel: "__orchestrator_kb__", label: "Knowledge base" },
    { id: "deals", rel: "__orchestrator_deals__", label: "Deals" },
    { id: "mtls", rel: "__orchestrator_mtls__", label: "mTLS material" },
    { id: "uploads", rel: "_web_uploads", label: "Web uploads" },
    { id: "output", rel: "__output__", label: "Output artifacts" },
  ];
  return {
    generatedAt: new Date().toISOString(),
    roots: dirs.map((d) => {
      const abs = path.join(toolRoot, d.rel);
      const size = dirSizeSafe(abs);
      return { ...d, path: abs, ...size };
    }),
  };
}

function fetchJson(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.get(url, { timeout: timeoutMs }, (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          try {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: JSON.parse(body) });
          } catch {
            resolve({ ok: false, status: res.statusCode, json: null, raw: body.slice(0, 200) });
          }
        });
      });
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "timeout" });
      });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function buildTopology({ toolRoot, webRoot, webInstanceId, webPid }) {
  const webPort = Number(process.env.AGENTIC_WEB_PORT || 3847);
  const enginePort = Number(process.env.AGENTIC_SERVE_PORT || 8765);
  const engineHost = String(process.env.AGENTIC_SERVE_HOST || "127.0.0.1");
  const probeHost = engineHost === "0.0.0.0" ? "127.0.0.1" : engineHost;
  const engineTls = Boolean(
    process.env.AGENTIC_SERVE_TLS_CERTFILE && process.env.AGENTIC_SERVE_TLS_KEYFILE,
  );
  const engineScheme = engineTls ? "https" : "http";

  const engineHealth = await fetchJson(`${engineScheme}://${probeHost}:${enginePort}/health`);
  const components = [
    {
      id: "web",
      label: "Web UI / Coordinator",
      status: "healthy",
      port: webPort,
      nodePort: 30487,
      fact: `pid ${webPid} · instance ${webInstanceId}`,
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
      urlHint: `${engineScheme}://<host>:8765/  (Reach / KnowBuddy — not :30487)`,
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

  const attention = [];
  if (!engineHealth.ok && process.env.AGENTIC_JETSON_ENABLE_ENGINE !== "0") {
    attention.push({
      severity: "warning",
      message: "Engine daemon is not reachable on :8765",
      href: "/admin/integrations",
    });
  }
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OLLAMA_HOST && !process.env.OLLAMA_API_BASE) {
    attention.push({
      severity: "warning",
      message: "No LLM credentials detected (OpenAI / Anthropic / Ollama)",
      href: "/admin/runtime/models",
    });
  }
  const dualWriterRisk =
    String(process.env.AGENTIC_KB || "1") !== "0" &&
    String(process.env.AGENTIC_SERVE_HOST || "") !== "";
  if (dualWriterRisk) {
    attention.push({
      severity: "info",
      message:
        "KB is enabled — ensure only one writer (Node CLI spawn vs engine) owns kb.sqlite3 per deployment",
      href: "/admin/memory",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.AGENTIC_EDGE_PLATFORM || "local",
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
      message: "AO Reach / KnowBuddy must use engine :8765 (or NodePort 30765), never web :30487",
    },
  };
}

function matchAdminRoute(pathname) {
  const p = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (p === "/api/v1/admin/config/effective") return { name: "config_effective" };
  if (p === "/api/v1/admin/config/fingerprint") return { name: "config_fingerprint" };
  if (p === "/api/v1/admin/health/topology") return { name: "topology" };
  if (p === "/api/v1/admin/storage") return { name: "storage" };
  if (p === "/api/v1/admin/meta") return { name: "meta" };
  let m = p.match(/^\/api\/v1\/admin\/catalogs\/([a-z]+)\/([^/]+)$/);
  if (m) return { name: "catalog_detail", kind: m[1], id: decodeURIComponent(m[2]) };
  m = p.match(/^\/api\/v1\/admin\/catalogs\/([a-z]+)$/);
  if (m) return { name: "catalog_list", kind: m[1] };
  return null;
}

async function handleAdminApi(req, res, ctx) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Method not allowed (Phase 0 is read-only)" }));
    return true;
  }
  const pathname = ctx.pathname;
  const route = matchAdminRoute(pathname);
  if (!route) return false;

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
        writeApi: false,
        title: "AO Administration",
        readOnlyMessage: "Read-only — no admin write API",
      });
      return true;
    }
    if (route.name === "config_effective") {
      send(200, buildEffectiveConfig(ctx));
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
    if (route.name === "storage") {
      send(200, buildStorageInventory(ctx));
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
  buildStorageInventory,
  isSecretKey,
  KEY_META,
};

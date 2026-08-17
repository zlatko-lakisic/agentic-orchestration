/**
 * Route POST /v1/chat/completions (and /v1/responses) to the right backend.
 *
 * Home Assistant and other OpenAI-SDK clients expect a real LLM completion, not a
 * full dynamic orchestration spawn. Auto mode picks:
 *   - openai  — gpt- / o1 / chatgpt- models → OPENAI_BASE_URL + OPENAI_API_KEY
 *   - ollama  — name:tag / ollama/* → OLLAMA_API_BASE OpenAI-compat /v1
 *   - orchestrate — everything else (or explicit agentic.runMode / orchestrate)
 *
 * Override: AGENTIC_CHAT_COMPLETIONS_BACKEND=auto|orchestrate|openai|ollama
 * Per-request: agentic.backend / agentic.upstream, agentic.orchestrate, agentic.runMode
 */

/**
 * @param {string} model
 * @returns {boolean}
 */
export function looksLikeOpenAiCloudModel(model) {
  const m = String(model || "")
    .trim()
    .toLowerCase();
  if (!m) return false;
  const bare = m.startsWith("openai/") ? m.slice("openai/".length) : m;
  return /^(gpt-|chatgpt-|o1\b|o3\b|o4\b)/.test(bare);
}

/**
 * @param {string} model
 * @returns {boolean}
 */
export function looksLikeOllamaModel(model) {
  const m = String(model || "").trim();
  if (!m) return false;
  if (looksLikeOpenAiCloudModel(m)) return false;
  const lower = m.toLowerCase();
  if (lower.startsWith("ollama/") || lower.startsWith("ollama:")) return true;
  // Ollama tag form: llama3.2:3b, qwen2.5:14b-instruct
  if (/^[a-z0-9._-]+:[a-z0-9._-]+$/i.test(m)) return true;
  if (
    /^(llama|qwen|mistral|mixtral|phi|gemma|llava|moondream|deepseek|codellama|tinyllama|nomic-embed)/i.test(
      m,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * True when the body carries image parts (chat `image_url` or Responses `input_image`).
 * @param {unknown} messages
 * @returns {boolean}
 */
export function messagesHaveImageParts(messages) {
  if (!Array.isArray(messages)) return false;
  for (const message of messages) {
    const content = message && typeof message === "object" ? message.content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const t = String(part.type || "");
      if (t === "image_url" || t === "input_image") return true;
    }
  }
  return false;
}

/**
 * Best-effort image-input capability by model id. Unknown models are treated as
 * text-only so an image request fails loudly instead of being answered blind.
 * @param {string} model
 * @returns {boolean}
 */
export function modelSupportsImages(model) {
  const m = String(model || "")
    .trim()
    .toLowerCase();
  if (!m) return false;
  const bare = m.includes("/") ? m.slice(m.indexOf("/") + 1) : m;
  if (/^(gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5|chatgpt-|o1\b|o3\b|o4\b)/.test(bare)) return true;
  // Gemma 3/4 are multimodal; Gemma 3n is text-only (Continue autodetect).
  if (/\bgemma-?[34](?!n)/.test(bare) || /\bgemma-?[34](?!n)/.test(m)) return true;
  // Jetson catalog Qwen 3.5 tags are multimodal.
  if (/\bqwen3\.5\b/.test(bare) || /\bqwen3\.5\b/.test(m)) return true;
  if (/(vision|llava|bakllava|moondream|pixtral|minicpm-v|internvl|cogvlm|idefics)/.test(m)) {
    return true;
  }
  // `vl` / `vlm` as a name segment: qwen2.5vl, qwen2-vl, glm-4v-vlm.
  return /(?<![a-z])vlm?(?![a-z])/.test(m);
}

/**
 * Strip LiteLLM-style ollama/ prefix for Ollama's native OpenAI-compat API.
 * @param {string} model
 * @returns {string}
 */
export function modelForOllamaUpstream(model) {
  const m = String(model || "").trim();
  if (/^ollama\//i.test(m)) return m.slice("ollama/".length).trim() || m;
  if (/^ollama:/i.test(m)) return m.slice("ollama:".length).trim() || m;
  return m;
}

/**
 * @param {string} model
 * @param {Record<string, unknown>} [agentic]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {"orchestrate"|"openai"|"ollama"}
 */
export function resolveChatCompletionsBackend(model, agentic = {}, env = process.env) {
  const a = agentic && typeof agentic === "object" && !Array.isArray(agentic) ? agentic : {};
  const explicit = String(a.backend || a.upstream || "")
    .trim()
    .toLowerCase();
  if (["orchestrate", "dynamic", "agentic"].includes(explicit)) return "orchestrate";
  if (["openai", "proxy", "cloud"].includes(explicit)) return "openai";
  if (explicit === "ollama") return "ollama";

  if (a.orchestrate === true) return "orchestrate";
  const runMode = String(a.runMode || "").trim();
  if (runMode === "dynamic" || runMode === "dynamic-iterative") return "orchestrate";

  const mode = String(env.AGENTIC_CHAT_COMPLETIONS_BACKEND || "auto")
    .trim()
    .toLowerCase();
  if (mode === "orchestrate") return "orchestrate";
  if (mode === "openai") return "openai";
  if (mode === "ollama") return "ollama";

  // auto (default): model-shaped routing for HA / OpenAI SDK clients
  if (a.orchestrate === false) {
    return pickProxyBackend(model, env);
  }
  return pickAutoBackend(model, env);
}

/**
 * @param {string} model
 * @param {NodeJS.ProcessEnv} env
 * @returns {"orchestrate"|"openai"|"ollama"}
 */
function pickAutoBackend(model, env) {
  if (looksLikeOpenAiCloudModel(model)) return "openai";
  if (looksLikeOllamaModel(model)) return "ollama";
  return "orchestrate";
}

/**
 * @param {string} model
 * @param {NodeJS.ProcessEnv} env
 * @returns {"openai"|"ollama"}
 */
function pickProxyBackend(model, env) {
  if (looksLikeOpenAiCloudModel(model)) return "openai";
  if (looksLikeOllamaModel(model)) return "ollama";
  if (String(env.OPENAI_API_KEY || "").trim()) return "openai";
  if (String(env.OLLAMA_API_BASE || env.OLLAMA_HOST || "").trim()) return "ollama";
  return "openai";
}

/**
 * Simple FIFO concurrency gate for Ollama proxy (avoids stacking 9 heavy zone calls).
 * @param {number} max
 */
export function createConcurrencyGate(max) {
  let inflight = 0;
  /** @type {Array<() => void>} */
  const waiters = [];
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 2;
  return {
    get inflight() {
      return inflight;
    },
    get limit() {
      return limit;
    },
    async run(fn) {
      while (inflight >= limit) {
        await new Promise((resolve) => {
          waiters.push(resolve);
        });
      }
      inflight += 1;
      try {
        return await fn();
      } finally {
        inflight -= 1;
        const next = waiters.shift();
        if (next) next();
      }
    },
  };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function ollamaProxyMaxConcurrent(env = process.env) {
  const raw = String(env.AGENTIC_CHAT_COMPLETIONS_OLLAMA_MAX_CONCURRENT || "2").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 2;
  return Math.min(Math.floor(n), 16);
}

/**
 * When the client asks for an Ollama tag that is not pulled, retry with this model.
 * Defaults from AGENTIC_CHAT_COMPLETIONS_OLLAMA_FALLBACK_MODEL, else planner ollama tag.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function ollamaProxyFallbackModel(env = process.env) {
  const explicit = String(env.AGENTIC_CHAT_COMPLETIONS_OLLAMA_FALLBACK_MODEL || "").trim();
  if (explicit) return modelForOllamaUpstream(explicit);
  const planner = String(env.AGENTIC_PLANNER_MODEL || "").trim();
  if (/^ollama\//i.test(planner) || /^ollama:/i.test(planner) || looksLikeOllamaModel(planner)) {
    return modelForOllamaUpstream(planner);
  }
  return "";
}

/**
 * @param {number} status
 * @param {Buffer|Uint8Array|string} body
 * @returns {boolean}
 */
export function isOllamaModelNotFound(status, body) {
  if (Number(status) !== 404) return false;
  const text = Buffer.isBuffer(body) || body instanceof Uint8Array ? Buffer.from(body).toString("utf8") : String(body || "");
  const lower = text.toLowerCase();
  return lower.includes("not found") || (lower.includes("model") && lower.includes("404"));
}

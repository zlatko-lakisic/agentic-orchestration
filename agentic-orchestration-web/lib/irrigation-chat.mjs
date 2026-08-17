/**
 * Home Assistant irrigation chat/completions helpers (MINUTES contract, caps, health).
 */

const MINUTES_LITERAL_RE = /\bminutes:\s*<\s*integer\s*0\s*-\s*25\s*>/i;
const MINUTES_OUTPUT_RE =
  /output format:.*?minutes:\s*<|final line exactly:\s*\n?\s*minutes:/is;
const MINUTES_LINE_RE =
  /^\s*minutes:\s*<[^>\n]+>\s*$|^\s*minutes:\s*(?:<integer|\d)/im;

const IRRIGATION_HINTS = [
  "irrigation decision-maker",
  "zone profile",
  "run_minutes",
  "integer 0-25",
  "integer 0–25",
  "0-25",
  "0–25",
  "home assistant only supplies",
  "never applying more water",
];

/**
 * @param {string} text
 */
export function goalRequestsIrrigationMinutesLine(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (!lower.includes("minutes:")) return false;
  if (MINUTES_LITERAL_RE.test(t) || MINUTES_OUTPUT_RE.test(t)) return true;
  if (MINUTES_LINE_RE.test(t)) return true;
  if (IRRIGATION_HINTS.some((k) => lower.includes(k))) return true;
  return false;
}

/**
 * @param {unknown[]} messages
 */
export function messagesLookLikeIrrigation(messages) {
  if (!Array.isArray(messages)) return false;
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const content = m.content;
    if (typeof content === "string" && goalRequestsIrrigationMinutesLine(content)) return true;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part && typeof part === "object" && typeof part.text === "string") {
          if (goalRequestsIrrigationMinutesLine(part.text)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ maxTokens?: number }} [opts]
 */
export function applyIrrigationMaxTokens(payload, opts = {}) {
  if (!payload || typeof payload !== "object") return payload;
  if (!messagesLookLikeIrrigation(/** @type {unknown[]} */ (payload.messages))) {
    return payload;
  }
  const cap = Number(opts.maxTokens ?? process.env.AGENTIC_IRRIGATION_MAX_TOKENS ?? 400);
  if (!Number.isFinite(cap) || cap <= 0) return payload;
  const current =
    typeof payload.max_tokens === "number" && Number.isFinite(payload.max_tokens)
      ? payload.max_tokens
      : null;
  return {
    ...payload,
    max_tokens: current == null ? cap : Math.min(current, cap),
  };
}

/**
 * @param {() => string | null} baseUrlFn
 */
export async function probeOllamaChatCompletionsHealth(baseUrlFn) {
  const base = typeof baseUrlFn === "function" ? baseUrlFn() : null;
  const checkedAt = new Date().toISOString();
  if (!base) {
    return { ok: false, ollama: "unset", checkedAt, error: "OLLAMA_API_BASE not configured" };
  }
  const url = `${String(base).replace(/\/+$/, "")}/api/tags`;
  try {
    const upstream = await fetch(url, { method: "GET" });
    if (!upstream.ok) {
      return {
        ok: false,
        ollama: "unreachable",
        checkedAt,
        error: `HTTP ${upstream.status}`,
      };
    }
    return { ok: true, ollama: "healthy", checkedAt };
  } catch (err) {
    return {
      ok: false,
      ollama: "unreachable",
      checkedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

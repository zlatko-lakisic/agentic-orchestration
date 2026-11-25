/**
 * argv builder for `python main.py --dynamic …` runs started by the web server.
 *
 * The user prompt is argparse's positional TASK. It is always emitted last, after a `--`
 * separator, so a prompt that starts with `-` (for example `--execute-step=/path`) can never be
 * parsed as a main.py option. Other caller-influenced values use the `--flag=value` form.
 * A prompt too long for one argv string goes over stdin (`--task-file=-`) instead.
 */
import { normalizeClientSessionId } from "./user-context.mjs";
import { sanitizePromptText } from "./request-guards.mjs";

/** Match `orchestration/example_overlays.py` (no manual .env paths for vertical roots). */
export const EXAMPLE_VERTICAL_SUBDIR = {
  healthcare: "healthcare",
  logistics: "logistics",
};

function envInt(env, name, fallback, min, max) {
  const raw = String(env[name] ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function clampRounds(value, fallback) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(32, Math.trunc(n)));
}

/** Catalog ids are slugs; drop anything that could be read as an option or break the CSV. */
function safeProviderIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x ?? "").trim())
    .filter((id) => id && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id));
}

/**
 * @param {string} text user prompt (positional TASK)
 * @param {{
 *   runMode?: unknown, iterativeRounds?: unknown, autoIter?: unknown, iterativeMaxRounds?: unknown,
 *   noSynthesize?: unknown, sessionId?: unknown, resetSession?: unknown, noVerify?: unknown,
 *   verboseCrew?: unknown, selectedAgentProviderIds?: unknown, attachmentManifestPath?: unknown,
 *   runId?: unknown,
 * }} opts
 * @param {Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function buildDynamicSpawnArgs(text, opts = {}, env = process.env) {
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
  const ex = String(env.AGENTIC_EXAMPLE || "").trim().toLowerCase();
  if (ex && Object.prototype.hasOwnProperty.call(EXAMPLE_VERTICAL_SUBDIR, ex)) {
    args.push("--example", ex);
  }
  if (mode === "dynamic-iterative") {
    args.push("--dynamic-iterative");
    const envDefaultRounds = envInt(env, "AGENTIC_DYNAMIC_ITERATIVE_ROUNDS", 4, 1, 32);
    const envMaxRounds = envInt(env, "AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS", 8, 1, 32);
    if (autoIter) {
      const maxRounds = Math.min(clampRounds(iterativeMaxRounds, envMaxRounds), envMaxRounds);
      args.push("--dynamic-iterative-auto");
      args.push("--dynamic-iterative-max-rounds", String(maxRounds));
    } else {
      const rounds = Math.min(clampRounds(iterativeRounds, envDefaultRounds), envMaxRounds);
      args.push("--dynamic-iterative-rounds", String(rounds));
    }
    if (noSynthesize) args.push("--dynamic-iterative-no-synthesize");
  } else {
    args.push("--dynamic");
  }
  args.push("--no-save");
  if (!verboseCrew) args.push("--quiet");
  if (noVerify !== false) args.push("--no-verify");
  if (resetSession) args.push("--orchestrator-session-reset");
  const sess = normalizeClientSessionId(sessionId);
  if (sess) args.push(`--orchestrator-session=${sess}`);
  const selectedIds = safeProviderIds(selectedAgentProviderIds);
  if (selectedIds.length > 0) {
    args.push(`--dynamic-agent-provider-ids=${selectedIds.join(",")}`);
  }
  if (attachmentManifestPath) {
    args.push(`--dynamic-attachments=${String(attachmentManifestPath)}`);
  }
  const rid = runId && String(runId).trim();
  if (rid) args.push(`--run-id=${rid}`);
  const prompt = sanitizePromptText(text);
  if (promptGoesViaStdin(prompt)) {
    // Too long for one argv string: main.py reads TASK from stdin (see writePromptToChild).
    args.push("--task-file=-");
  } else {
    // Positional TASK last, after the option terminator.
    args.push("--", prompt);
  }
  return args;
}

/**
 * Linux rejects a single argv string over 128 KiB (MAX_ARG_STRLEN). Prompts above this
 * size are streamed to the child's stdin instead.
 */
export const ARGV_PROMPT_SAFE_BYTES = 100_000;

/** @param {unknown} text */
export function promptGoesViaStdin(text) {
  return Buffer.byteLength(sanitizePromptText(text), "utf8") > ARGV_PROMPT_SAFE_BYTES;
}

/**
 * Call right after spawning with args from buildDynamicSpawnArgs: delivers the prompt on
 * stdin when it was too long for argv. No-op otherwise.
 * @param {{ stdin?: import("node:stream").Writable | null }} proc
 * @param {unknown} text
 */
export function writePromptToChild(proc, text) {
  if (!promptGoesViaStdin(text)) return;
  const stdin = proc?.stdin;
  if (!stdin) return;
  // The child may exit before reading everything; that surfaces as its exit code.
  stdin.on("error", () => {});
  stdin.end(sanitizePromptText(text), "utf8");
}

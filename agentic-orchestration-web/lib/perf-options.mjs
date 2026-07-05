/**
 * Performance helpers for web chat (simple prompts, planner trim, skip post-run LLM).
 */

/** True when the prompt is short and does not need multi-agent planning / session carry-over. */
export function isSimpleChatPrompt(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 120) return false;
  if (/\n/.test(t)) return false;
  if (
    /^(who are you\??|what are you\??|hello!*|hi!*|hey!*|help\??|what can you do\??|thanks!?|thank you\.?)$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    t.length <= 48 &&
    /^(who|what|hello|hi|hey|help|thanks)\b/i.test(t) &&
    !/\b(and|then|also|research|analyze|write|code|implement|plan|build|compare)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * Per-run env overrides when performance options are enabled in the web UI.
 * @param {object} opts
 * @param {boolean} [opts.limitPlannerHistory]
 * @param {number} [opts.plannerMaxTurns]
 * @param {number} [opts.plannerExcerptChars]
 * @param {boolean} [opts.skipFinalQa]
 * @param {boolean} [opts.skipLearningEval]
 */
export function performanceSpawnEnvOverrides(opts) {
  const extra = {};
  if (opts.limitPlannerHistory) {
    extra.AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS = String(
      Math.max(1, Math.min(64, Number(opts.plannerMaxTurns) || 2)),
    );
    extra.AGENTIC_ORCHESTRATOR_EXCERPT_CHARS = String(
      Math.max(500, Math.min(50000, Number(opts.plannerExcerptChars) || 4000)),
    );
  }
  if (opts.skipFinalQa) extra.AGENTIC_FINAL_QA = "0";
  if (opts.skipLearningEval) extra.AGENTIC_LEARNING_EVAL = "0";
  return extra;
}

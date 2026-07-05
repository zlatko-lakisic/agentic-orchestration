/** @typedef {import("../lib/perf-options.mjs").isSimpleChatPrompt} isSimpleChatPrompt */

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

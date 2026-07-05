/** Strip orchestrator progress noise; keep only user-facing workflow output. */

export const WORKFLOW_OUTPUT_MARKER = "=== Workflow Output ===";

const PROGRESS_LINE_RE = /^\(progress\)\s/i;

/**
 * @param {string} text Raw orchestrator stdout
 * @returns {string} User-facing answer text
 */
export function extractUserFacingStdout(text) {
  let t = String(text ?? "").trim();
  if (!t) return t;

  const markerIdx = t.indexOf(WORKFLOW_OUTPUT_MARKER);
  if (markerIdx >= 0) {
    t = t.slice(markerIdx + WORKFLOW_OUTPUT_MARKER.length).trim();
  } else {
    t = t
      .split(/\r?\n/)
      .filter((line) => {
        const s = line.trim();
        if (!s) return false;
        if (PROGRESS_LINE_RE.test(s)) return false;
        if (s === "[user]") return false;
        if (s.includes("Is this the answer you wanted? Reply `no` to re-run.")) return false;
        return true;
      })
      .join("\n")
      .trim();
  }

  return t;
}

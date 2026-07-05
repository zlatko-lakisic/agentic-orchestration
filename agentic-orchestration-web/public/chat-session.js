const SESSION_ID_KEY = "agentic.orchestrator.sessionId";
const TRANSCRIPT_PREFIX = "agentic.chat.transcript.";
const MAX_TRANSCRIPT_ENTRIES = 200;

/** @returns {string} */
export function getOrCreateBrowserSessionId() {
  try {
    const existing = String(localStorage.getItem(SESSION_ID_KEY) || "").trim();
    if (existing) return existing;
    const id = `web-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    localStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return "web-default";
  }
}

/** @param {string} sessionId */
function transcriptKey(sessionId) {
  return `${TRANSCRIPT_PREFIX}${String(sessionId || "default").trim() || "default"}`;
}

/**
 * @param {string} sessionId
 * @returns {Array<{ kind: string, text: string, markdown?: boolean, extraClasses?: string[] }>}
 */
export function loadChatTranscript(sessionId) {
  try {
    const raw = localStorage.getItem(transcriptKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e === "object" && typeof e.text === "string" && typeof e.kind === "string")
      .slice(-MAX_TRANSCRIPT_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * @param {string} sessionId
 * @param {Array<{ kind: string, text: string, markdown?: boolean, extraClasses?: string[] }>} entries
 */
export function saveChatTranscript(sessionId, entries) {
  try {
    const trimmed = entries.slice(-MAX_TRANSCRIPT_ENTRIES);
    localStorage.setItem(transcriptKey(sessionId), JSON.stringify(trimmed));
  } catch {
    /* quota or private mode */
  }
}

/** @param {string} sessionId */
export function clearChatTranscript(sessionId) {
  try {
    localStorage.removeItem(transcriptKey(sessionId));
  } catch {
    /* ignore */
  }
}

/** @param {Array<{ kind: string, text: string }>} entries */
export function transcriptHasConversation(entries) {
  return entries.some((e) => e.kind === "user" || e.kind === "assistant");
}

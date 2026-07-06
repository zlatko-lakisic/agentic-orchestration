const SESSION_ID_KEY = "agentic.orchestrator.sessionId";
const TRANSCRIPT_PREFIX = "agentic.chat.transcript.";
const MAX_TRANSCRIPT_ENTRIES = 200;
const LEGACY_LOCAL_SESSION_ID_KEY = "agentic.orchestrator.sessionId";
const LEGACY_LOCAL_TRANSCRIPT_PREFIX = "agentic.chat.transcript.";

/** Tab-scoped storage: survives reconnect / visibility change; cleared when the tab/window closes. */
function tabStorage() {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Drop pre-1.9 localStorage session keys so users are not stuck on a permanent session. */
export function purgeLegacyLocalSessionStorage() {
  try {
    localStorage.removeItem(LEGACY_LOCAL_SESSION_ID_KEY);
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_LOCAL_TRANSCRIPT_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* private mode */
  }
}

/** @returns {string} */
export function getOrCreateBrowserSessionId() {
  purgeLegacyLocalSessionStorage();
  const store = tabStorage();
  try {
    const existing = String(store?.getItem(SESSION_ID_KEY) || "").trim();
    if (existing) return existing;
    const id = `web-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    store?.setItem(SESSION_ID_KEY, id);
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
  const store = tabStorage();
  try {
    const raw = store?.getItem(transcriptKey(sessionId));
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
  const store = tabStorage();
  try {
    const trimmed = entries.slice(-MAX_TRANSCRIPT_ENTRIES);
    store?.setItem(transcriptKey(sessionId), JSON.stringify(trimmed));
  } catch {
    /* quota or private mode */
  }
}

/** @param {string} sessionId */
export function clearChatTranscript(sessionId) {
  const store = tabStorage();
  try {
    store?.removeItem(transcriptKey(sessionId));
  } catch {
    /* ignore */
  }
}

/** @param {Array<{ kind: string, text: string }>} entries */
export function transcriptHasConversation(entries) {
  return entries.some((e) => e.kind === "user" || e.kind === "assistant");
}

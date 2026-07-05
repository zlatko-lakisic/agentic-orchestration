const DEFAULT_USER_NAME_HEADERS = "x-agentic-user-name,x-user-name";

/** @param {string | null | undefined} raw */
export function sanitizeUserDisplayName(raw) {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 120) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

/**
 * Read a display name from inbound HTTP / WebSocket upgrade headers (proxy-injected).
 * @param {import("http").IncomingHttpHeaders | Record<string, string | string[] | undefined>} headers
 * @param {string} [headerListEnv] Comma-separated header names (case-insensitive)
 */
export function userNameFromRequestHeaders(headers, headerListEnv) {
  const configured = String(
    headerListEnv ?? process.env.AGENTIC_WEB_USER_NAME_HEADER ?? DEFAULT_USER_NAME_HEADERS,
  ).trim();
  const keys = configured
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  for (const key of keys) {
    const raw = headers[key];
    if (raw == null) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const name = sanitizeUserDisplayName(value);
    if (name) return name;
  }
  return null;
}

/** @param {string | null | undefined} userName */
export function userDisplayNameSpawnEnv(userName) {
  const name = sanitizeUserDisplayName(userName);
  if (!name) return {};
  return { AGENTIC_WEB_USER_DISPLAY_NAME: name };
}

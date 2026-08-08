import { randomBytes, webcrypto } from "node:crypto";

const DEFAULT_USER_NAME_HEADERS = "x-agentic-user-name,x-user-name";
const DEFAULT_SESSION_ID_HEADERS = "x-agentic-session-id,x-warpgate-session-id";

/** @param {string | null | undefined} raw */
export function sanitizeUserDisplayName(raw) {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 120) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

/** @param {string | null | undefined} raw */
export function sanitizeSessionId(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 128) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(t)) return null;
  return t;
}

/**
 * Read orchestrator session id from inbound HTTP / WebSocket upgrade headers (proxy-injected).
 * @param {import("http").IncomingHttpHeaders | Record<string, string | string[] | undefined>} headers
 * @param {string} [headerListEnv] Comma-separated header names (case-insensitive)
 */
export function sessionIdFromRequestHeaders(headers, headerListEnv) {
  const configured = String(
    headerListEnv ?? process.env.AGENTIC_WEB_SESSION_ID_HEADER ?? DEFAULT_SESSION_ID_HEADERS,
  ).trim();
  const keys = configured
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  for (const key of keys) {
    const raw = headers[key];
    if (raw == null) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const id = sanitizeSessionId(value);
    if (id) return id;
  }
  return null;
}

/** @returns {string} */
export function generateWebSessionId() {
  // Node 18 coordinator image has no globalThis.crypto; use node:crypto.
  const bytes =
    typeof webcrypto?.getRandomValues === "function"
      ? webcrypto.getRandomValues(new Uint8Array(6))
      : randomBytes(6);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `web-${hex}`;
}

/**
 * @param {import("http").IncomingHttpHeaders | Record<string, string | string[] | undefined>} headers
 * @returns {string}
 */
export function resolveSessionIdFromHeaders(headers) {
  return sessionIdFromRequestHeaders(headers) || generateWebSessionId();
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

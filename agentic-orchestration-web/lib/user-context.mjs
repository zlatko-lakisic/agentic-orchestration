import { randomBytes, webcrypto } from "node:crypto";

const DEFAULT_USER_NAME_HEADERS = "x-agentic-user-name,x-user-name";
const DEFAULT_SESSION_ID_HEADERS = "x-agentic-session-id,x-warpgate-session-id";
const DEFAULT_AVATAR_HEADERS = "x-auth-avatar,x-warpgate-avatar,x-forwarded-avatar";

/** @param {import("http").IncomingHttpHeaders | Record<string, string | string[] | undefined>} headers @param {...string} keys */
function firstHeaderValue(headers, ...keys) {
  for (const key of keys) {
    const raw = headers[String(key).toLowerCase()];
    if (raw == null) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

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

/** @param {string | null | undefined} raw */
export function sanitizeAuthUserId(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 128) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

/** @param {string | null | undefined} raw */
export function sanitizePersonName(raw) {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 64) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

/** @param {string | null | undefined} raw */
export function sanitizeEmail(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 254) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t;
}

/** @param {string | null | undefined} raw */
export function sanitizeLogoutUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 2048) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} raw */
export function sanitizeLogoutMethod(raw) {
  const t = String(raw ?? "").trim().toUpperCase();
  if (!t) return null;
  if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD)$/.test(t)) return null;
  return t;
}

/**
 * Absolute http(s) URL or same-origin path (e.g. `/@warpgate`).
 * @param {string | null | undefined} raw
 */
export function sanitizeLogoutRedirect(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 2048) return null;
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (/[\x00-\x1f\x7f]/.test(t)) return null;
    return t;
  }
  return sanitizeLogoutUrl(t);
}

/** @param {string | null | undefined} raw */
export function normalizeAvatarUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 500_000) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^data:image\//i.test(t)) return t;
  const compact = t.replace(/\s+/g, "");
  if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 20) {
    return `data:image/jpeg;base64,${compact}`;
  }
  return null;
}

/**
 * @param {{
 *   firstName?: string | null;
 *   lastName?: string | null;
 *   email?: string | null;
 *   legacyUserName?: string | null;
 *   userId?: string | null;
 * }} parts
 */
export function resolveAuthDisplayName(parts) {
  const first = parts.firstName ?? null;
  const last = parts.lastName ?? null;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (parts.email) return parts.email;
  if (parts.legacyUserName) return parts.legacyUserName;
  if (parts.userId) return parts.userId;
  return null;
}

/**
 * Warpgate / identity-proxy auth profile from inbound request headers.
 * @param {import("http").IncomingHttpHeaders | Record<string, string | string[] | undefined>} headers
 */
export function authProfileFromRequestHeaders(headers) {
  const userId = sanitizeAuthUserId(firstHeaderValue(headers, "x-auth-user-id"));
  const email = sanitizeEmail(firstHeaderValue(headers, "x-auth-email"));
  const firstName = sanitizePersonName(firstHeaderValue(headers, "x-auth-first-name"));
  const lastName = sanitizePersonName(firstHeaderValue(headers, "x-auth-last-name"));
  const logoutUrl = sanitizeLogoutUrl(firstHeaderValue(headers, "x-auth-logout-url"));
  const logoutMethod = sanitizeLogoutMethod(
    firstHeaderValue(headers, "x-auth-logout-method"),
  );
  const logoutRedirect = sanitizeLogoutRedirect(
    firstHeaderValue(headers, "x-auth-logout-redirect"),
  );
  const avatarConfigured = String(
    process.env.AGENTIC_WEB_AVATAR_HEADER ?? DEFAULT_AVATAR_HEADERS,
  ).trim();
  const avatarKeys = avatarConfigured
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const avatarUrl = normalizeAvatarUrl(firstHeaderValue(headers, ...avatarKeys));
  const legacyUserName = userNameFromRequestHeaders(headers);
  const userName = resolveAuthDisplayName({
    firstName,
    lastName,
    email,
    legacyUserName,
    userId,
  });
  return {
    userId,
    email,
    firstName,
    lastName,
    logoutUrl,
    logoutMethod,
    logoutRedirect,
    avatarUrl,
    userName,
  };
}

/**
 * JSON fields for `/api/session` (omit null optional keys).
 * @param {ReturnType<typeof authProfileFromRequestHeaders>} profile
 * @param {string} sessionId
 */
export function sessionPayloadFromAuthProfile(profile, sessionId) {
  /** @type {Record<string, string | null>} */
  const out = {
    userName: profile.userName,
    sessionId,
  };
  if (profile.userId) out.userId = profile.userId;
  if (profile.email) out.email = profile.email;
  if (profile.firstName) out.firstName = profile.firstName;
  if (profile.lastName) out.lastName = profile.lastName;
  if (profile.logoutUrl) out.logoutUrl = profile.logoutUrl;
  if (profile.logoutMethod) out.logoutMethod = profile.logoutMethod;
  if (profile.logoutRedirect) out.logoutRedirect = profile.logoutRedirect;
  if (profile.avatarUrl) out.avatarUrl = profile.avatarUrl;
  return out;
}

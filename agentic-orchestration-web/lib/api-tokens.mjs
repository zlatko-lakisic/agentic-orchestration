/**
 * Long-lived API access tokens for orchestrate / chat / responses.
 *
 * Material under `<toolRoot>/__orchestrator_api_tokens__/`:
 * - tokens.json — hashed registry (never stores plaintext)
 * - usage.jsonl — append-only usage ledger (rotated)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const API_TOKENS_DIR_NAME = "__orchestrator_api_tokens__";
/** Reserved appId for the Admin SPA (`/admin`). Minting auto-assigns the secret to that console. */
export const WEB_UI_APP_ID = "ao-web";
/** Reserved appId for the core chat Web UI (`/`). Minting auto-assigns the secret to that page. */
export const CHAT_UI_APP_ID = "ao-chat";
const TOKENS_FILE = "tokens.json";
const USAGE_FILE = "usage.jsonl";
const WEB_ASSIGNED_FILE = "web-ui.assigned.json";
const CHAT_ASSIGNED_FILE = "chat-ui.assigned.json";
const MAX_USAGE_LINES = 10_000;
const TOKEN_PREFIX_LEN = 8;
const TOKEN_BYTES = 32;

/**
 * @param {unknown} appId
 */
export function isWebUiAppId(appId) {
  return String(appId || "").trim() === WEB_UI_APP_ID;
}

/**
 * @param {unknown} appId
 */
export function isChatUiAppId(appId) {
  return String(appId || "").trim() === CHAT_UI_APP_ID;
}

/**
 * @param {unknown} appId
 */
export function isFirstPartyUiAppId(appId) {
  return isWebUiAppId(appId) || isChatUiAppId(appId);
}

/**
 * @param {string} toolRoot
 */
export function apiTokensRoot(toolRoot) {
  const override = String(process.env.AGENTIC_API_TOKENS_DIR || "").trim();
  if (override) return path.resolve(override);
  return path.resolve(toolRoot, API_TOKENS_DIR_NAME);
}

/**
 * @param {string} toolRoot
 */
function tokensPath(toolRoot) {
  return path.join(apiTokensRoot(toolRoot), TOKENS_FILE);
}

/**
 * @param {string} toolRoot
 */
function usagePath(toolRoot) {
  return path.join(apiTokensRoot(toolRoot), USAGE_FILE);
}

/**
 * @param {string} token
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}

/**
 * @param {unknown} entry
 */
function isActiveEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  const e = /** @type {Record<string, unknown>} */ (entry);
  if (e.revokedAt) return false;
  if (e.expiresAt) {
    const exp = Date.parse(String(e.expiresAt));
    if (Number.isFinite(exp) && exp <= Date.now()) return false;
  }
  return Boolean(e.id && e.hash);
}

/**
 * @param {string} toolRoot
 * @returns {Array<Record<string, unknown>>}
 */
function loadTokens(toolRoot) {
  const file = tokensPath(toolRoot);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} toolRoot
 * @param {Array<Record<string, unknown>>} tokens
 */
function saveTokens(toolRoot, tokens) {
  const root = apiTokensRoot(toolRoot);
  fs.mkdirSync(root, { recursive: true });
  const file = tokensPath(toolRoot);
  fs.writeFileSync(file, `${JSON.stringify(tokens, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* ignore */
  }
}

/**
 * Public metadata (never includes hash or secret).
 * @param {Record<string, unknown>} entry
 */
export function publicTokenMeta(entry, assignedIds = {}) {
  const revoked = Boolean(entry.revokedAt);
  let expired = false;
  if (entry.expiresAt) {
    const exp = Date.parse(String(entry.expiresAt));
    expired = Number.isFinite(exp) && exp <= Date.now();
  }
  let status = "active";
  if (revoked) status = "revoked";
  else if (expired) status = "expired";
  const id = String(entry.id || "");
  const webId = assignedIds.webId != null ? String(assignedIds.webId) : "";
  const chatId = assignedIds.chatId != null ? String(assignedIds.chatId) : "";
  return {
    id,
    prefix: String(entry.prefix || ""),
    appId: String(entry.appId || ""),
    label: entry.label != null ? String(entry.label) : "",
    createdAt: entry.createdAt != null ? String(entry.createdAt) : null,
    expiresAt: entry.expiresAt != null ? String(entry.expiresAt) : null,
    revokedAt: entry.revokedAt != null ? String(entry.revokedAt) : null,
    lastUsedAt: entry.lastUsedAt != null ? String(entry.lastUsedAt) : null,
    lastUsedIp: entry.lastUsedIp != null ? String(entry.lastUsedIp) : null,
    status,
    assignedToWeb: Boolean(webId && id === webId),
    assignedToChat: Boolean(chatId && id === chatId),
  };
}

/**
 * @param {string} toolRoot
 */
function webAssignedPath(toolRoot) {
  return path.join(apiTokensRoot(toolRoot), WEB_ASSIGNED_FILE);
}

/**
 * @param {string} toolRoot
 */
function chatAssignedPath(toolRoot) {
  return path.join(apiTokensRoot(toolRoot), CHAT_ASSIGNED_FILE);
}

/**
 * @param {string} toolRoot
 * @param {string} appId
 */
function assignedPathFor(toolRoot, appId) {
  if (isChatUiAppId(appId)) return chatAssignedPath(toolRoot);
  return webAssignedPath(toolRoot);
}

/**
 * @param {string} toolRoot
 * @param {string} appId
 * @returns {{ tokenId: string, token: string, appId: string, prefix: string, assignedAt: string|null }|null}
 */
export function getSurfaceAssignment(toolRoot, appId) {
  const surface = isChatUiAppId(appId) ? CHAT_UI_APP_ID : WEB_UI_APP_ID;
  const file = assignedPathFor(toolRoot, surface);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const token = String(raw?.token || "").trim();
    const tokenId = String(raw?.tokenId || "").trim();
    if (!token || !tokenId) return null;
    return {
      tokenId,
      token,
      appId: surface,
      prefix: String(raw.prefix || token.slice(0, TOKEN_PREFIX_LEN)),
      assignedAt: raw.assignedAt != null ? String(raw.assignedAt) : null,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} toolRoot
 */
export function getWebAssignment(toolRoot) {
  return getSurfaceAssignment(toolRoot, WEB_UI_APP_ID);
}

/**
 * @param {string} toolRoot
 */
export function getChatAssignment(toolRoot) {
  return getSurfaceAssignment(toolRoot, CHAT_UI_APP_ID);
}

/**
 * @param {string} toolRoot
 */
export function isWebUiAssigned(toolRoot) {
  return Boolean(getWebAssignment(toolRoot));
}

/**
 * @param {string} toolRoot
 */
export function isChatUiAssigned(toolRoot) {
  return Boolean(getChatAssignment(toolRoot));
}

/**
 * Persist plaintext for a first-party UI surface (0600).
 * @param {string} toolRoot
 * @param {string} appId
 * @param {{ tokenId: string, token: string, prefix?: string }} opts
 */
export function assignSurfaceToken(toolRoot, appId, opts) {
  const surface = isChatUiAppId(appId) ? CHAT_UI_APP_ID : WEB_UI_APP_ID;
  const token = String(opts?.token || "").trim();
  const tokenId = String(opts?.tokenId || "").trim();
  if (!token || !tokenId) {
    const err = new Error("token and tokenId required to assign UI surface");
    err.code = "invalid_ui_assign";
    throw err;
  }
  const root = apiTokensRoot(toolRoot);
  fs.mkdirSync(root, { recursive: true });
  const file = assignedPathFor(toolRoot, surface);
  const payload = {
    tokenId,
    token,
    appId: surface,
    prefix: String(opts.prefix || token.slice(0, TOKEN_PREFIX_LEN)),
    assignedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* ignore */
  }
  return payload;
}

/**
 * Persist plaintext for the Admin SPA (0600).
 * @param {string} toolRoot
 * @param {{ tokenId: string, token: string, prefix?: string }} opts
 */
export function assignWebToken(toolRoot, opts) {
  return assignSurfaceToken(toolRoot, WEB_UI_APP_ID, opts);
}

/**
 * Persist plaintext for the chat Web UI (0600).
 * @param {string} toolRoot
 * @param {{ tokenId: string, token: string, prefix?: string }} opts
 */
export function assignChatToken(toolRoot, opts) {
  return assignSurfaceToken(toolRoot, CHAT_UI_APP_ID, opts);
}

/**
 * @param {string} toolRoot
 * @param {string} appId
 * @param {string} [tokenId]
 */
export function clearSurfaceAssignment(toolRoot, appId, tokenId) {
  const surface = isChatUiAppId(appId) ? CHAT_UI_APP_ID : WEB_UI_APP_ID;
  const assigned = getSurfaceAssignment(toolRoot, surface);
  if (!assigned) return false;
  if (tokenId && String(tokenId) !== assigned.tokenId) return false;
  const file = assignedPathFor(toolRoot, surface);
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} toolRoot
 * @param {string} [tokenId]
 */
export function clearWebAssignment(toolRoot, tokenId) {
  return clearSurfaceAssignment(toolRoot, WEB_UI_APP_ID, tokenId);
}

/**
 * @param {string} toolRoot
 * @param {string} [tokenId]
 */
export function clearChatAssignment(toolRoot, tokenId) {
  return clearSurfaceAssignment(toolRoot, CHAT_UI_APP_ID, tokenId);
}

function assignedIds(toolRoot) {
  return {
    webId: getWebAssignment(toolRoot)?.tokenId || null,
    chatId: getChatAssignment(toolRoot)?.tokenId || null,
  };
}

/**
 * @param {string} toolRoot
 */
export function listTokens(toolRoot) {
  const ids = assignedIds(toolRoot);
  return loadTokens(toolRoot).map((e) => publicTokenMeta(e, ids));
}

/**
 * @param {string} toolRoot
 */
export function hasActiveTokens(toolRoot) {
  return loadTokens(toolRoot).some(isActiveEntry);
}

/**
 * @param {string} toolRoot
 * @param {{ appId?: string, label?: string, expiresAt?: string|null, assignToWeb?: boolean, assignToChat?: boolean }} opts
 */
export function mintToken(toolRoot, opts) {
  const assignToWeb = Boolean(opts?.assignToWeb) || isWebUiAppId(opts?.appId);
  const assignToChat = Boolean(opts?.assignToChat) || isChatUiAppId(opts?.appId);
  if (assignToWeb && assignToChat) {
    const err = new Error("Mint separately for Admin (ao-web) and Chat (ao-chat)");
    err.code = "invalid_assign_both";
    throw err;
  }
  let appId = String(opts?.appId || "").trim();
  if (assignToWeb) appId = WEB_UI_APP_ID;
  if (assignToChat) appId = CHAT_UI_APP_ID;
  if (!appId) {
    const err = new Error("appId is required");
    err.code = "invalid_app_id";
    throw err;
  }
  const label =
    opts?.label != null && String(opts.label).trim()
      ? String(opts.label).trim()
      : assignToWeb
        ? "Admin Web UI"
        : assignToChat
          ? "Chat Web UI"
          : "";
  let expiresAt = null;
  if (opts?.expiresAt) {
    const exp = Date.parse(String(opts.expiresAt));
    if (!Number.isFinite(exp)) {
      const err = new Error("expiresAt must be a valid ISO timestamp");
      err.code = "invalid_expires_at";
      throw err;
    }
    expiresAt = new Date(exp).toISOString();
  }

  const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const token = `ao_${raw}`;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const entry = {
    id,
    hash: hashToken(token),
    prefix: token.slice(0, TOKEN_PREFIX_LEN),
    appId,
    label,
    createdAt,
    expiresAt,
    revokedAt: null,
    lastUsedAt: null,
    lastUsedIp: null,
  };
  const tokens = loadTokens(toolRoot);
  if (assignToWeb || assignToChat) {
    const now = new Date().toISOString();
    const match = assignToChat ? isChatUiAppId : isWebUiAppId;
    for (let i = 0; i < tokens.length; i += 1) {
      if (match(tokens[i].appId) && isActiveEntry(tokens[i])) {
        tokens[i] = { ...tokens[i], revokedAt: now };
      }
    }
  }
  tokens.push(entry);
  saveTokens(toolRoot, tokens);

  let assignedToWeb = false;
  let assignedToChat = false;
  if (assignToWeb) {
    assignWebToken(toolRoot, { tokenId: id, token, prefix: entry.prefix });
    assignedToWeb = true;
  }
  if (assignToChat) {
    assignChatToken(toolRoot, { tokenId: id, token, prefix: entry.prefix });
    assignedToChat = true;
  }

  return {
    token,
    ...publicTokenMeta(entry, assignedIds(toolRoot)),
    assignedToWeb,
    assignedToChat,
  };
}

/**
 * @param {string} toolRoot
 * @param {string} id
 */
export function revokeToken(toolRoot, id) {
  const tokenId = String(id || "").trim();
  if (!tokenId) return null;
  const tokens = loadTokens(toolRoot);
  const idx = tokens.findIndex((t) => String(t.id) === tokenId);
  if (idx < 0) return null;
  if (!tokens[idx].revokedAt) {
    tokens[idx] = {
      ...tokens[idx],
      revokedAt: new Date().toISOString(),
    };
    saveTokens(toolRoot, tokens);
  }
  clearWebAssignment(toolRoot, tokenId);
  clearChatAssignment(toolRoot, tokenId);
  return publicTokenMeta(tokens[idx], assignedIds(toolRoot));
}

/**
 * Extract client IP from request-like object.
 * @param {{ headers?: Record<string, unknown>, socket?: { remoteAddress?: string } }|null|undefined} req
 */
export function clientIp(req) {
  if (!req) return "";
  const xff = req.headers && (req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"]);
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff[0]) {
    return String(xff[0]).split(",")[0].trim();
  }
  const ra = req.socket && req.socket.remoteAddress ? String(req.socket.remoteAddress) : "";
  return ra.replace(/^::ffff:/, "");
}

/**
 * @param {string} authHeader
 * @returns {string}
 */
function extractBearer(authHeader) {
  const auth = String(authHeader || "").trim();
  if (!auth) return "";
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return auth;
}

/**
 * Authenticate Authorization header against minted tokens and/or env shared secrets.
 * Always requires a credential — never returns the legacy open/anonymous success.
 *
 * @param {string} toolRoot
 * @param {string} authHeader
 * @param {string|string[]} envKeys plain shared secrets that remain valid
 * @returns {{ ok: true, tokenId: string|null, appId: string, source: 'token'|'env' } | { ok: false, reason: string }}
 */
export function authenticateBearer(toolRoot, authHeader, envKeys = []) {
  const provided = extractBearer(authHeader);
  const keys = (Array.isArray(envKeys) ? envKeys : [envKeys])
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  if (!provided) {
    return { ok: false, reason: "missing" };
  }

  const providedHash = hashToken(provided);
  const tokens = loadTokens(toolRoot);
  for (const entry of tokens) {
    if (!isActiveEntry(entry)) continue;
    if (String(entry.hash) === providedHash) {
      return {
        ok: true,
        tokenId: String(entry.id),
        appId: String(entry.appId || ""),
        source: "token",
      };
    }
  }

  for (const key of keys) {
    if (provided === key || timingSafeEqualString(provided, key)) {
      return { ok: true, tokenId: null, appId: "env", source: "env" };
    }
  }

  return { ok: false, reason: "invalid" };
}

/**
 * Authenticate a reserved first-party UI token (ao-web or ao-chat).
 * @param {string} toolRoot
 * @param {string} appId
 * @param {string} authHeaderOrToken Bearer header or raw token
 */
export function authenticateSurfaceBearer(toolRoot, appId, authHeaderOrToken) {
  const surface = isChatUiAppId(appId) ? CHAT_UI_APP_ID : WEB_UI_APP_ID;
  const assigned = getSurfaceAssignment(toolRoot, surface);
  if (!assigned) {
    return { ok: false, reason: surface === CHAT_UI_APP_ID ? "chat_unassigned" : "web_unassigned" };
  }
  const provided = extractBearer(authHeaderOrToken);
  if (!provided) {
    return { ok: false, reason: "missing" };
  }
  if (!timingSafeEqualString(provided, assigned.token)) {
    return { ok: false, reason: "invalid" };
  }
  const viaRegistry = authenticateBearer(toolRoot, `Bearer ${provided}`, []);
  if (!viaRegistry.ok || viaRegistry.appId !== surface) {
    return { ok: false, reason: "revoked" };
  }
  return {
    ok: true,
    tokenId: assigned.tokenId,
    appId: surface,
    source: "token",
  };
}

/**
 * Authenticate the reserved Admin Web UI token (assigned ao-web).
 * @param {string} toolRoot
 * @param {string} authHeader
 */
export function authenticateWebUiBearer(toolRoot, authHeader) {
  return authenticateSurfaceBearer(toolRoot, WEB_UI_APP_ID, authHeader);
}

/**
 * Authenticate the reserved Chat Web UI token (assigned ao-chat).
 * @param {string} toolRoot
 * @param {string} authHeaderOrToken
 */
export function authenticateChatUiBearer(toolRoot, authHeaderOrToken) {
  return authenticateSurfaceBearer(toolRoot, CHAT_UI_APP_ID, authHeaderOrToken);
}

/**
 * Accept either assigned first-party UI token (Admin or Chat).
 * @param {string} toolRoot
 * @param {string} authHeaderOrToken
 */
export function authenticateFirstPartyUiBearer(toolRoot, authHeaderOrToken) {
  const provided = extractBearer(authHeaderOrToken);
  if (!provided) return { ok: false, reason: "missing" };
  if (isWebUiAssigned(toolRoot)) {
    const web = authenticateWebUiBearer(toolRoot, provided);
    if (web.ok) return web;
  }
  if (isChatUiAssigned(toolRoot)) {
    const chat = authenticateChatUiBearer(toolRoot, provided);
    if (chat.ok) return chat;
  }
  if (!isWebUiAssigned(toolRoot) && !isChatUiAssigned(toolRoot)) {
    return { ok: false, reason: "ui_unassigned" };
  }
  return { ok: false, reason: "invalid" };
}

/**
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqualString(a, b) {
  try {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * @param {string} toolRoot
 * @param {{ tokenId?: string|null, appId?: string, ip?: string, path?: string, status?: number, latencyMs?: number, promptChars?: number }} row
 */
export function recordUsage(toolRoot, row) {
  const root = apiTokensRoot(toolRoot);
  fs.mkdirSync(root, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    tokenId: row.tokenId != null ? String(row.tokenId) : null,
    appId: row.appId != null ? String(row.appId) : "",
    ip: row.ip != null ? String(row.ip) : "",
    path: row.path != null ? String(row.path) : "",
    status: typeof row.status === "number" ? row.status : null,
    latencyMs: typeof row.latencyMs === "number" ? Math.round(row.latencyMs) : null,
    promptChars: typeof row.promptChars === "number" ? row.promptChars : null,
  };
  fs.appendFileSync(usagePath(toolRoot), `${JSON.stringify(entry)}\n`, "utf8");

  if (entry.tokenId) {
    const tokens = loadTokens(toolRoot);
    const idx = tokens.findIndex((t) => String(t.id) === entry.tokenId);
    if (idx >= 0) {
      tokens[idx] = {
        ...tokens[idx],
        lastUsedAt: entry.ts,
        lastUsedIp: entry.ip || tokens[idx].lastUsedIp || null,
      };
      saveTokens(toolRoot, tokens);
    }
  }

  rotateUsageIfNeeded(toolRoot);
}

/**
 * @param {string} toolRoot
 */
function rotateUsageIfNeeded(toolRoot) {
  const file = usagePath(toolRoot);
  if (!fs.existsSync(file)) return;
  try {
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length <= MAX_USAGE_LINES) return;
    const kept = lines.slice(-Math.floor(MAX_USAGE_LINES * 0.8));
    fs.writeFileSync(file, `${kept.join("\n")}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} toolRoot
 * @param {string} tokenId
 * @param {number} [limit]
 */
export function listUsage(toolRoot, tokenId, limit = 100) {
  const id = String(tokenId || "").trim();
  const max = Math.min(Math.max(Number(limit) || 100, 1), 1000);
  const file = usagePath(toolRoot);
  if (!fs.existsSync(file)) return [];
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const out = [];
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0 && out.length < max; i -= 1) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const row = JSON.parse(line);
      if (id && String(row.tokenId || "") !== id) continue;
      out.push(row);
    } catch {
      /* skip bad line */
    }
  }
  return out;
}

const RECENT_USAGE_MS = 24 * 60 * 60 * 1000;

/**
 * Aggregate connecting client IPs for one appId from the usage ledger (+ token lastUsedIp).
 * @param {string} toolRoot
 * @param {string} appId
 * @param {{ maxIps?: number, maxScan?: number }} [opts]
 * @returns {Array<{ ip: string, lastSeenAt: string|null, count: number }>}
 */
export function listClientIpsForAppId(toolRoot, appId, opts = {}) {
  const want = String(appId || "").trim();
  if (!want) return [];
  const maxIps = Math.min(Math.max(Number(opts.maxIps) || 50, 1), 200);
  const maxScan = Math.min(Math.max(Number(opts.maxScan) || 8000, 100), 20000);
  /** @type {Map<string, { ip: string, lastSeenAt: string|null, count: number }>} */
  const byIp = new Map();

  function touch(ipRaw, ts) {
    const ip = String(ipRaw || "").trim();
    if (!ip) return;
    const prev = byIp.get(ip);
    const seen = ts ? String(ts) : null;
    if (!prev) {
      byIp.set(ip, { ip, lastSeenAt: seen, count: 1 });
      return;
    }
    prev.count += 1;
    if (seen && (!prev.lastSeenAt || seen > prev.lastSeenAt)) {
      prev.lastSeenAt = seen;
    }
  }

  for (const t of listTokens(toolRoot)) {
    if (String(t.appId || "") !== want) continue;
    if (t.lastUsedIp) touch(t.lastUsedIp, t.lastUsedAt);
  }

  const file = usagePath(toolRoot);
  if (fs.existsSync(file)) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      text = "";
    }
    const lines = text.split("\n");
    let scanned = 0;
    for (let i = lines.length - 1; i >= 0 && scanned < maxScan; i -= 1) {
      const line = lines[i].trim();
      if (!line) continue;
      scanned += 1;
      try {
        const row = JSON.parse(line);
        if (String(row.appId || "") !== want) continue;
        touch(row.ip, row.ts);
      } catch {
        /* skip */
      }
    }
  }

  return [...byIp.values()]
    .sort((a, b) => {
      const ta = a.lastSeenAt || "";
      const tb = b.lastSeenAt || "";
      if (ta !== tb) return tb.localeCompare(ta);
      return b.count - a.count || a.ip.localeCompare(b.ip);
    })
    .slice(0, maxIps);
}

/**
 * Active minted API apps for Topology Web API family (grouped by appId).
 * @param {string} toolRoot
 * @returns {Array<{
 *   appId: string,
 *   label: string,
 *   tokenCount: number,
 *   lastUsedAt: string|null,
 *   lastUsedIp: string|null,
 *   clientIps: Array<{ ip: string, lastSeenAt: string|null, count: number }>,
 *   clientIpCount: number,
 *   recent: boolean,
 * }>}
 */
export function summarizeWebApiApps(toolRoot) {
  /** @type {Map<string, { appId: string, label: string, tokenCount: number, lastUsedAt: string|null, lastUsedIp: string|null }>} */
  const byApp = new Map();
  for (const t of listTokens(toolRoot)) {
    if (t.status !== "active") continue;
    const appId = String(t.appId || "").trim();
    if (!appId || appId === "env") continue;
    const cur = byApp.get(appId) || {
      appId,
      label: "",
      tokenCount: 0,
      lastUsedAt: null,
      lastUsedIp: null,
    };
    cur.tokenCount += 1;
    if (!cur.label && t.label) cur.label = String(t.label);
    const used = t.lastUsedAt ? String(t.lastUsedAt) : null;
    if (used && (!cur.lastUsedAt || used > cur.lastUsedAt)) {
      cur.lastUsedAt = used;
      cur.lastUsedIp = t.lastUsedIp ? String(t.lastUsedIp) : cur.lastUsedIp;
    } else if (!cur.lastUsedIp && t.lastUsedIp) {
      cur.lastUsedIp = String(t.lastUsedIp);
    }
    byApp.set(appId, cur);
  }

  const now = Date.now();
  return [...byApp.values()]
    .map((app) => {
      const clientIps = listClientIpsForAppId(toolRoot, app.appId);
      const recent = Boolean(
        app.lastUsedAt &&
          Number.isFinite(Date.parse(app.lastUsedAt)) &&
          now - Date.parse(app.lastUsedAt) <= RECENT_USAGE_MS,
      );
      return {
        ...app,
        clientIps,
        clientIpCount: clientIps.length,
        recent,
      };
    })
    .sort((a, b) => a.appId.localeCompare(b.appId));
}

/**
 * Orchestrate / OpenAI-proxy routes always require authentication.
 * @param {string} [_toolRoot]
 * @param {string|string[]} [_envKeys]
 */
export function authRequired(_toolRoot, _envKeys = []) {
  return true;
}

/**
 * Admin HTTP routes that may be hit before an ao-web token is assigned (bootstrap).
 * @param {string} routeName
 * @param {string} method
 */
export function isAdminBootstrapRoute(routeName, method) {
  const m = String(method || "GET").toUpperCase();
  if (routeName === "web_auth") return m === "GET" || m === "HEAD";
  if (routeName === "chat_auth") return m === "GET" || m === "HEAD";
  if (routeName === "meta") return m === "GET" || m === "HEAD";
  if (routeName === "access_posture") return m === "GET" || m === "HEAD";
  if (routeName === "tokens") return m === "GET" || m === "HEAD" || m === "POST";
  return false;
}

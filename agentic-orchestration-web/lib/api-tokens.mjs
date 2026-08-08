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
const TOKENS_FILE = "tokens.json";
const USAGE_FILE = "usage.jsonl";
const MAX_USAGE_LINES = 10_000;
const TOKEN_PREFIX_LEN = 8;
const TOKEN_BYTES = 32;

/**
 * @param {string} toolRoot
 */
export function apiTokensRoot(toolRoot) {
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
export function publicTokenMeta(entry) {
  const revoked = Boolean(entry.revokedAt);
  let expired = false;
  if (entry.expiresAt) {
    const exp = Date.parse(String(entry.expiresAt));
    expired = Number.isFinite(exp) && exp <= Date.now();
  }
  let status = "active";
  if (revoked) status = "revoked";
  else if (expired) status = "expired";
  return {
    id: String(entry.id || ""),
    prefix: String(entry.prefix || ""),
    appId: String(entry.appId || ""),
    label: entry.label != null ? String(entry.label) : "",
    createdAt: entry.createdAt != null ? String(entry.createdAt) : null,
    expiresAt: entry.expiresAt != null ? String(entry.expiresAt) : null,
    revokedAt: entry.revokedAt != null ? String(entry.revokedAt) : null,
    lastUsedAt: entry.lastUsedAt != null ? String(entry.lastUsedAt) : null,
    lastUsedIp: entry.lastUsedIp != null ? String(entry.lastUsedIp) : null,
    status,
  };
}

/**
 * @param {string} toolRoot
 */
export function listTokens(toolRoot) {
  return loadTokens(toolRoot).map(publicTokenMeta);
}

/**
 * @param {string} toolRoot
 */
export function hasActiveTokens(toolRoot) {
  return loadTokens(toolRoot).some(isActiveEntry);
}

/**
 * @param {string} toolRoot
 * @param {{ appId: string, label?: string, expiresAt?: string|null }} opts
 */
export function mintToken(toolRoot, opts) {
  const appId = String(opts?.appId || "").trim();
  if (!appId) {
    const err = new Error("appId is required");
    err.code = "invalid_app_id";
    throw err;
  }
  const label = opts?.label != null ? String(opts.label).trim() : "";
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
  tokens.push(entry);
  saveTokens(toolRoot, tokens);
  return { token, ...publicTokenMeta(entry) };
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
  return publicTokenMeta(tokens[idx]);
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
  const activePresent = hasActiveTokens(toolRoot);
  if (!activePresent && keys.length === 0) {
    return { ok: true, tokenId: null, appId: "open", source: "env" };
  }
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

/**
 * Whether auth is required (active minted tokens or env keys present).
 * @param {string} toolRoot
 * @param {string|string[]} envKeys
 */
export function authRequired(toolRoot, envKeys = []) {
  const keys = (Array.isArray(envKeys) ? envKeys : [envKeys])
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  return keys.length > 0 || hasActiveTokens(toolRoot);
}

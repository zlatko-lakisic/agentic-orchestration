/**
 * Per-appId preferences (sticky defaults for dynamic planning + agent allowlists).
 *
 * Stored beside the token registry:
 *   `<toolRoot>/__orchestrator_api_tokens__/app-prefs.json`
 * Override dir: `AGENTIC_API_TOKENS_DIR` (same as api-tokens.mjs).
 *
 * Schema (keyed by normalized appId):
 *   {
 *     "comstar-ha": {
 *       "dynamicPlanning": true,
 *       "defaultRunMode": "dynamic",
 *       "allowedAgentProviderIds": ["gpt_research", "ollama_llama3_2_3b"]
 *     }
 *   }
 *
 * Precedence for callers: explicit request fields > these prefs > env/globals.
 * Empty allowedAgentProviderIds means unrestricted (current global catalog).
 */
import fs from "node:fs";
import path from "node:path";
import { apiTokensRoot } from "./api-tokens.mjs";

const PREFS_FILE = "app-prefs.json";
const RUN_MODES = new Set(["dynamic", "dynamic-iterative"]);

/**
 * @param {string} toolRoot
 */
function prefsPath(toolRoot) {
  return path.join(apiTokensRoot(toolRoot), PREFS_FILE);
}

/**
 * @param {unknown} appId
 */
export function normalizeAppPrefsAppId(appId) {
  return String(appId || "")
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} mode
 * @returns {"dynamic"|"dynamic-iterative"|null}
 */
export function normalizeDefaultRunMode(mode) {
  const m = String(mode || "")
    .trim()
    .toLowerCase();
  if (RUN_MODES.has(m)) return /** @type {"dynamic"|"dynamic-iterative"} */ (m);
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeAllowedAgentProviderIds(raw) {
  if (raw == null) return [];
  /** @type {unknown[]} */
  let items = [];
  if (typeof raw === "string") {
    items = raw.split(",");
  } else if (Array.isArray(raw)) {
    items = raw;
  } else {
    return [];
  }
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{
 *   dynamicPlanning: boolean,
 *   defaultRunMode: "dynamic"|"dynamic-iterative"|null,
 *   allowedAgentProviderIds: string[],
 * }}
 */
export function normalizeAppPrefs(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const dynamicPlanning = Boolean(src.dynamicPlanning);
  let defaultRunMode = normalizeDefaultRunMode(src.defaultRunMode);
  if (dynamicPlanning && !defaultRunMode) defaultRunMode = "dynamic";
  return {
    dynamicPlanning,
    defaultRunMode,
    allowedAgentProviderIds: normalizeAllowedAgentProviderIds(src.allowedAgentProviderIds),
  };
}

/**
 * @param {string} toolRoot
 */
export function loadAllAppPrefs(toolRoot) {
  const file = prefsPath(toolRoot);
  if (!fs.existsSync(file)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    /** @type {Record<string, ReturnType<typeof normalizeAppPrefs>>} */
    const out = {};
    for (const [key, val] of Object.entries(raw)) {
      const appId = normalizeAppPrefsAppId(key);
      if (!appId) continue;
      out[appId] = normalizeAppPrefs(val);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * @param {string} toolRoot
 * @param {Record<string, unknown>} all
 */
function saveAllAppPrefs(toolRoot, all) {
  const root = apiTokensRoot(toolRoot);
  fs.mkdirSync(root, { recursive: true });
  const file = prefsPath(toolRoot);
  fs.writeFileSync(file, `${JSON.stringify(all, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} toolRoot
 * @param {unknown} appId
 */
export function getAppPrefs(toolRoot, appId) {
  const id = normalizeAppPrefsAppId(appId);
  if (!id) {
    return normalizeAppPrefs({});
  }
  const all = loadAllAppPrefs(toolRoot);
  return all[id] || normalizeAppPrefs({});
}

/**
 * @param {string} toolRoot
 * @param {unknown} appId
 * @param {unknown} patch
 */
export function setAppPrefs(toolRoot, appId, patch) {
  const id = normalizeAppPrefsAppId(appId);
  if (!id) {
    throw new Error("appId is required");
  }
  const all = loadAllAppPrefs(toolRoot);
  const prev = all[id] || normalizeAppPrefs({});
  const src = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  const next = normalizeAppPrefs({
    dynamicPlanning:
      src.dynamicPlanning !== undefined ? Boolean(src.dynamicPlanning) : prev.dynamicPlanning,
    defaultRunMode:
      src.defaultRunMode !== undefined ? src.defaultRunMode : prev.defaultRunMode,
    allowedAgentProviderIds:
      src.allowedAgentProviderIds !== undefined
        ? src.allowedAgentProviderIds
        : prev.allowedAgentProviderIds,
  });
  all[id] = next;
  saveAllAppPrefs(toolRoot, all);
  return { appId: id, ...next };
}

/**
 * @param {string} toolRoot
 */
export function listAppPrefs(toolRoot) {
  return Object.entries(loadAllAppPrefs(toolRoot))
    .map(([appId, prefs]) => ({ appId, ...prefs }))
    .sort((a, b) => a.appId.localeCompare(b.appId));
}

/**
 * @param {{ dynamicPlanning?: boolean, defaultRunMode?: string|null }|null|undefined} prefs
 * @returns {"dynamic"|"dynamic-iterative"|null}
 */
export function stickyRunModeFromPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return null;
  if (!prefs.dynamicPlanning) return null;
  return normalizeDefaultRunMode(prefs.defaultRunMode) || "dynamic";
}

/**
 * @param {unknown} explicit
 * @param {{ dynamicPlanning?: boolean, defaultRunMode?: string|null }|null|undefined} prefs
 * @param {string} [fallback]
 */
export function effectiveRunMode(explicit, prefs, fallback = "dynamic") {
  const fromReq = normalizeDefaultRunMode(explicit);
  if (fromReq) return fromReq;
  const sticky = stickyRunModeFromPrefs(prefs);
  if (sticky) return sticky;
  return normalizeDefaultRunMode(fallback) || "dynamic";
}

/**
 * Intersect request selected ids with sticky app allowlist when both are set.
 * Empty app allowlist = unrestricted.
 * @param {unknown} requestSelected
 * @param {{ allowedAgentProviderIds?: string[] }|null|undefined} prefs
 * @returns {string[]|undefined}
 */
export function effectiveAllowedAgentProviderIds(requestSelected, prefs) {
  const fromReq = normalizeAllowedAgentProviderIds(requestSelected);
  const fromApp = normalizeAllowedAgentProviderIds(prefs?.allowedAgentProviderIds);
  if (!fromReq.length && !fromApp.length) return undefined;
  if (!fromReq.length) return fromApp;
  if (!fromApp.length) return fromReq;
  const allow = new Set(fromApp);
  return fromReq.filter((id) => allow.has(id));
}

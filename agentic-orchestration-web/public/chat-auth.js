/**
 * First-party Chat Web UI auth (ao-chat).
 * Loads the auto-assigned token from /api/v1/admin/chat-auth and attaches it to fetch + WS.
 */

const STORAGE_KEY = "ao-chat-auth-token";

/** @type {string|null} */
let cachedToken = null;
/** @type {Promise<string|null>|null} */
let loadPromise = null;

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * @param {string|null} token
 */
function writeStored(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getChatAccessToken() {
  return cachedToken || readStored();
}

/**
 * @returns {Promise<string|null>}
 */
export async function ensureChatAccessToken() {
  if (cachedToken) return cachedToken;
  const stored = readStored();
  if (stored) cachedToken = stored;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/api/v1/admin/chat-auth", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return cachedToken;
      const data = await res.json();
      if (data?.assigned && data?.token) {
        cachedToken = String(data.token);
        writeStored(cachedToken);
        return cachedToken;
      }
      cachedToken = null;
      writeStored(null);
      return null;
    } catch {
      return cachedToken;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

/**
 * @param {RequestInit} [init]
 * @returns {Promise<RequestInit>}
 */
export async function withChatAuth(init = {}) {
  const token = await ensureChatAccessToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers, credentials: init.credentials || "same-origin" };
}

/**
 * @param {string} baseUrl without query
 */
export async function chatWebSocketUrl(baseUrl) {
  const token = await ensureChatAccessToken();
  if (!token) return baseUrl;
  const join = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${join}access_token=${encodeURIComponent(token)}`;
}

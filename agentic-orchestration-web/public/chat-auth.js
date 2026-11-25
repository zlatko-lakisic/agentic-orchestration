/**
 * First-party Chat Web UI auth (ao-chat).
 * Loads the auto-assigned token from /api/v1/admin/chat-auth and attaches it to fetch + WS.
 *
 * The token is kept in memory only (it is re-fetched on every page load) and travels to the
 * WebSocket as a subprotocol (`ao-auth` + `ao-bearer.<token>`), never in the URL.
 */

/** Older builds persisted the token here; make sure it does not linger. */
const LEGACY_STORAGE_KEY = "ao-chat-auth-token";

/** @type {string|null} */
let cachedToken = null;
/** @type {Promise<string|null>|null} */
let loadPromise = null;
/** @type {{ error: string, hint: string }|null} */
let authProblem = null;

function clearLegacyStored() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
clearLegacyStored();

export function getChatAccessToken() {
  return cachedToken;
}

/** Drop the in-memory token so the next call re-fetches it (after a 4401 from the server). */
export function invalidateChatAccessToken() {
  cachedToken = null;
}

/**
 * Set when the server refused to hand out the chat token (HTTP 403
 * `web_auth_untrusted_source`): the page is reached through a proxy the server does not trust.
 * @returns {{ error: string, hint: string }|null}
 */
export function getChatAuthProblem() {
  return authProblem;
}

/**
 * @returns {Promise<string|null>}
 */
export async function ensureChatAccessToken() {
  if (cachedToken) return cachedToken;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/api/v1/admin/chat-auth", {
        credentials: "same-origin",
        cache: "no-store",
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.status === 403 && data?.error === "web_auth_untrusted_source") {
        authProblem = {
          error: String(data.error),
          hint: String(
            data.hint ||
              "The server refused to hand out the chat token to this network path. Set AGENTIC_WEB_TRUSTED_PROXIES on the web server.",
          ),
        };
        cachedToken = null;
        return null;
      }
      if (!res.ok) return cachedToken;
      authProblem = null;
      if (data?.assigned && data?.token) {
        cachedToken = String(data.token);
        return cachedToken;
      }
      cachedToken = null;
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
 * WebSocket URL for the chat socket. The token is NOT appended (see
 * {@link chatWebSocketProtocols}); kept async for call-site compatibility.
 * @param {string} baseUrl without query
 */
export async function chatWebSocketUrl(baseUrl) {
  await ensureChatAccessToken();
  return baseUrl;
}

/**
 * Subprotocols to offer on the chat WebSocket: `["ao-auth", "ao-bearer.<token>"]` when a token
 * is assigned (the server selects `ao-auth`), otherwise undefined.
 * @returns {Promise<string[]|undefined>}
 */
export async function chatWebSocketProtocols() {
  const token = await ensureChatAccessToken();
  if (!token) return undefined;
  return ["ao-auth", `ao-bearer.${token}`];
}

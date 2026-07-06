/**
 * One browser WebSocket per page — closes any prior socket before opening a new one.
 * Import this module first from app.js (before any connection logic runs).
 */
const NativeWebSocket = globalThis.WebSocket;

const hub = (globalThis.__agenticWsHub ??= {
  socket: null,
  serial: 0,
});

function detachActiveSocket() {
  const prev = hub.socket;
  if (!prev) return;
  prev.onopen = null;
  prev.onclose = null;
  prev.onerror = null;
  prev.onmessage = null;
  try {
    if (prev.readyState === NativeWebSocket.OPEN || prev.readyState === NativeWebSocket.CONNECTING) {
      prev.close(1000, "replaced");
    }
  } catch {
    /* ignore */
  }
  if (hub.socket === prev) hub.socket = null;
}

function AgenticWebSocket(url, protocols) {
  detachActiveSocket();
  hub.serial += 1;
  const ws =
    protocols === undefined
      ? new NativeWebSocket(url)
      : new NativeWebSocket(url, protocols);
  ws.__agenticSerial = hub.serial;
  hub.socket = ws;
  ws.addEventListener(
    "close",
    () => {
      if (hub.socket === ws) hub.socket = null;
    },
    { once: true },
  );
  return ws;
}

if (!globalThis.__agenticWebSocketSingletonInstalled) {
  globalThis.__agenticWebSocketSingletonInstalled = true;
  AgenticWebSocket.prototype = NativeWebSocket.prototype;
  Object.setPrototypeOf(AgenticWebSocket, NativeWebSocket);
  for (const key of Object.getOwnPropertyNames(NativeWebSocket)) {
    if (key === "prototype" || key === "length" || key === "name") continue;
    try {
      AgenticWebSocket[key] = NativeWebSocket[key];
    } catch {
      /* read-only */
    }
  }
  globalThis.WebSocket = AgenticWebSocket;
}

export function getActiveWebSocket() {
  return hub.socket;
}

export function isActiveWebSocket(socket) {
  return Boolean(socket && hub.socket === socket);
}

export function closeActiveWebSocket() {
  detachActiveSocket();
}

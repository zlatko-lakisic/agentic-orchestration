import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "chat-session.js"),
);

const {
  getOrCreateBrowserSessionId,
  loadChatTranscript,
  saveChatTranscript,
  clearChatTranscript,
  transcriptHasConversation,
  purgeLegacyLocalSessionStorage,
} = await import(libUrl);

function mockStores() {
  const session = new Map();
  const local = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => session.get(k) ?? null,
    setItem: (k, v) => session.set(k, String(v)),
    removeItem: (k) => session.delete(k),
    get length() {
      return session.size;
    },
    key: (i) => [...session.keys()][i] ?? null,
  };
  globalThis.localStorage = {
    getItem: (k) => local.get(k) ?? null,
    setItem: (k, v) => local.set(k, String(v)),
    removeItem: (k) => local.delete(k),
    get length() {
      return local.size;
    },
    key: (i) => [...local.keys()][i] ?? null,
  };
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
    configurable: true,
    writable: true,
  });
  return { session, local };
}

test("browser session id is stable for the tab (sessionStorage)", () => {
  const { session } = mockStores();
  session.clear();
  const a = getOrCreateBrowserSessionId();
  const b = getOrCreateBrowserSessionId();
  assert.equal(a, b);
  assert.match(a, /^web-/);
});

test("new tab gets a new session id after sessionStorage is cleared", () => {
  const { session } = mockStores();
  session.clear();
  const first = getOrCreateBrowserSessionId();
  session.clear();
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee" },
    configurable: true,
    writable: true,
  });
  const second = getOrCreateBrowserSessionId();
  assert.notEqual(first, second);
});

test("purgeLegacyLocalSessionStorage removes old localStorage session keys", () => {
  const { local } = mockStores();
  local.set("agentic.orchestrator.sessionId", "web-oldsticky");
  local.set("agentic.chat.transcript.web-oldsticky", "[]");
  purgeLegacyLocalSessionStorage();
  assert.equal(local.has("agentic.orchestrator.sessionId"), false);
  assert.equal(local.has("agentic.chat.transcript.web-oldsticky"), false);
});

test("chat transcript round-trip in sessionStorage", () => {
  const { session } = mockStores();
  session.clear();
  const sid = "test-session";
  saveChatTranscript(sid, [{ kind: "user", text: "hello" }]);
  const loaded = loadChatTranscript(sid);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].text, "hello");
  assert.equal(transcriptHasConversation(loaded), true);
  clearChatTranscript(sid);
  assert.equal(loadChatTranscript(sid).length, 0);
});

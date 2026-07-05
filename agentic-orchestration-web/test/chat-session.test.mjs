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
} = await import(libUrl);

const store = new Map();

test("browser session id is stable in localStorage", () => {
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
    configurable: true,
    writable: true,
  });
  store.clear();
  const a = getOrCreateBrowserSessionId();
  const b = getOrCreateBrowserSessionId();
  assert.equal(a, b);
  assert.match(a, /^web-/);
});

test("chat transcript round-trip", () => {
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  store.clear();
  const sid = "test-session";
  saveChatTranscript(sid, [{ kind: "user", text: "hello" }]);
  const loaded = loadChatTranscript(sid);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].text, "hello");
  assert.equal(transcriptHasConversation(loaded), true);
  clearChatTranscript(sid);
  assert.equal(loadChatTranscript(sid).length, 0);
});

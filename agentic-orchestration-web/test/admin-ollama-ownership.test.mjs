/**
 * Unit tests for Admin Ollama ownership helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODE_EXTERNAL,
  MODE_MANAGED_K8S,
  MODE_MANAGED_PROCESS,
  ollamaOwnershipStatus,
  resolveOllamaMode,
} from "../lib/admin-ollama-ownership.mjs";

test("resolveOllamaMode auto healthy → external", () => {
  assert.equal(
    resolveOllamaMode({
      healthy: true,
      inK8s: true,
      env: { AGENTIC_OLLAMA_MODE: "auto" },
    }),
    MODE_EXTERNAL,
  );
});

test("resolveOllamaMode auto unhealthy standalone → managed_process", () => {
  assert.equal(
    resolveOllamaMode({
      healthy: false,
      inK8s: false,
      env: { AGENTIC_OLLAMA_MODE: "auto" },
    }),
    MODE_MANAGED_PROCESS,
  );
});

test("resolveOllamaMode auto unhealthy k8s → managed_k8s", () => {
  assert.equal(
    resolveOllamaMode({
      healthy: false,
      inK8s: true,
      env: { AGENTIC_OLLAMA_MODE: "auto" },
    }),
    MODE_MANAGED_K8S,
  );
});

test("ollamaOwnershipStatus marks external as not restartable", () => {
  const st = ollamaOwnershipStatus({
    healthy: true,
    inK8s: true,
    env: {
      AGENTIC_OLLAMA_MODE: "auto",
      OLLAMA_API_BASE: "http://host.k3s.internal:11434",
    },
  });
  assert.equal(st.mode, MODE_EXTERNAL);
  assert.equal(st.restartable, false);
});

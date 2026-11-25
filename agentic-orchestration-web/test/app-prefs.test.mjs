/**
 * Unit tests for per-app dynamic planning prefs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  effectiveAllowedAgentProviderIds,
  effectiveRunMode,
  getAppPrefs,
  listAppPrefs,
  normalizeAppPrefs,
  setAppPrefs,
  stickyRunModeFromPrefs,
} from "../lib/app-prefs.mjs";

function tmpTool() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ao-app-prefs-"));
}

test("setAppPrefs / getAppPrefs round-trip", () => {
  const toolRoot = tmpTool();
  const saved = setAppPrefs(toolRoot, "KnowBuddy", {
    dynamicPlanning: true,
    defaultRunMode: "dynamic-iterative",
    allowedAgentProviderIds: ["gpt_research", "ollama_fast"],
  });
  assert.equal(saved.appId, "knowbuddy");
  assert.equal(saved.dynamicPlanning, true);
  assert.equal(saved.defaultRunMode, "dynamic-iterative");
  assert.deepEqual(saved.allowedAgentProviderIds, ["gpt_research", "ollama_fast"]);

  const got = getAppPrefs(toolRoot, "knowbuddy");
  assert.deepEqual(got, {
    dynamicPlanning: true,
    defaultRunMode: "dynamic-iterative",
    allowedAgentProviderIds: ["gpt_research", "ollama_fast"],
  });

  const listed = listAppPrefs(toolRoot);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].appId, "knowbuddy");

  const disk = JSON.parse(
    fs.readFileSync(path.join(toolRoot, "__orchestrator_api_tokens__", "app-prefs.json"), "utf8"),
  );
  assert.equal(disk.knowbuddy.dynamicPlanning, true);
});

test("effectiveRunMode: request overrides sticky prefs", () => {
  const prefs = { dynamicPlanning: true, defaultRunMode: "dynamic-iterative" };
  assert.equal(effectiveRunMode("dynamic", prefs), "dynamic");
  assert.equal(effectiveRunMode(undefined, prefs), "dynamic-iterative");
  assert.equal(effectiveRunMode("", { dynamicPlanning: false, defaultRunMode: null }), "dynamic");
  assert.equal(stickyRunModeFromPrefs({ dynamicPlanning: false, defaultRunMode: "dynamic" }), null);
});

test("effectiveAllowedAgentProviderIds intersects request with app allowlist", () => {
  const prefs = { allowedAgentProviderIds: ["gpt_research", "ollama_fast"] };
  assert.deepEqual(effectiveAllowedAgentProviderIds(["gpt_research", "claude_research"], prefs), [
    "gpt_research",
  ]);
  assert.deepEqual(effectiveAllowedAgentProviderIds(undefined, prefs), [
    "gpt_research",
    "ollama_fast",
  ]);
  assert.equal(effectiveAllowedAgentProviderIds(undefined, { allowedAgentProviderIds: [] }), undefined);
});

test("effectiveAllowedAgentProviderIds fails closed when the request names only disallowed providers", () => {
  // An empty list means "unrestricted catalog" to every caller, so an empty intersection must
  // fall back to the app allowlist, never to [] / undefined.
  const prefs = { allowedAgentProviderIds: ["gpt_write"] };
  assert.deepEqual(effectiveAllowedAgentProviderIds(["anything_else"], prefs), ["gpt_write"]);
  assert.deepEqual(effectiveAllowedAgentProviderIds(["a", "b", "c"], prefs), ["gpt_write"]);
  assert.deepEqual(effectiveAllowedAgentProviderIds(["GPT_WRITE", "x"], prefs), ["gpt_write"]);
  // No app allowlist: the request selection is used as-is.
  assert.deepEqual(effectiveAllowedAgentProviderIds(["anything_else"], { allowedAgentProviderIds: [] }), [
    "anything_else",
  ]);
  assert.deepEqual(effectiveAllowedAgentProviderIds(["anything_else"], null), ["anything_else"]);
});

test("normalizeAppPrefs keeps operator queue policy keys the engine reads", () => {
  const prefs = normalizeAppPrefs({
    dynamicPlanning: true,
    maxQueuePriority: "high",
    queueQuota: { maxConcurrentRuns: 2 },
  });
  assert.equal(prefs.maxQueuePriority, "high");
  assert.deepEqual(prefs.queueQuota, { maxConcurrentRuns: 2 });
  const plain = normalizeAppPrefs({ maxQueuePriority: {}, queueQuota: [1] });
  assert.equal("maxQueuePriority" in plain, false);
  assert.equal("queueQuota" in plain, false);
});

test("setAppPrefs rewrite preserves queue policy written by the operator", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ao-prefs-policy-"));
  const dir = path.join(root, "__orchestrator_api_tokens__");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "app-prefs.json"),
    JSON.stringify({ "my-app": { maxQueuePriority: 60, queueQuota: { maxConcurrentRuns: 1 } } }),
  );
  setAppPrefs(root, "my-app", { dynamicPlanning: true, maxQueuePriority: 100 });
  const onDisk = JSON.parse(fs.readFileSync(path.join(dir, "app-prefs.json"), "utf8"));
  assert.equal(onDisk["my-app"].dynamicPlanning, true);
  assert.equal(onDisk["my-app"].maxQueuePriority, 60);
  assert.deepEqual(onDisk["my-app"].queueQuota, { maxConcurrentRuns: 1 });
});

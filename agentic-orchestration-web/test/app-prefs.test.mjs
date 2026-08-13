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

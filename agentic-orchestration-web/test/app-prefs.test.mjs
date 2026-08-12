/**
 * Unit tests for per-app dynamic planning prefs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
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
  });
  assert.equal(saved.appId, "knowbuddy");
  assert.equal(saved.dynamicPlanning, true);
  assert.equal(saved.defaultRunMode, "dynamic-iterative");

  const got = getAppPrefs(toolRoot, "knowbuddy");
  assert.deepEqual(got, {
    dynamicPlanning: true,
    defaultRunMode: "dynamic-iterative",
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

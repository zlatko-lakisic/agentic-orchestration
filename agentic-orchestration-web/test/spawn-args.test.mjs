/**
 * argv builder for `python main.py --dynamic …`: the prompt must never be parsed as an option.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicSpawnArgs } from "../lib/spawn-args.mjs";

/** Everything before the `--` terminator is option territory; the prompt is the single arg after it. */
function split(args) {
  const i = args.indexOf("--");
  assert.ok(i > 0, "argv must contain the -- option terminator");
  return { options: args.slice(0, i), positional: args.slice(i + 1) };
}

test("prompt is the single positional after --", () => {
  const args = buildDynamicSpawnArgs("hello world", { runId: "abc123" }, {});
  const { options, positional } = split(args);
  assert.deepEqual(positional, ["hello world"]);
  assert.equal(options[0], "main.py");
  assert.ok(options.includes("--dynamic"));
  assert.ok(options.includes("--no-save"));
  assert.ok(options.includes("--quiet"));
  assert.ok(options.includes("--no-verify"));
  assert.ok(options.includes("--run-id=abc123"));
});

test("option-looking prompts cannot inject main.py flags", () => {
  for (const prompt of [
    "--execute-step=/tmp/uploads/spec.json",
    "--exec=/tmp/x",
    "--help",
    "-i",
    "--warm-pool-worker",
    "--delegation-broker",
    "--",
  ]) {
    for (const runMode of ["dynamic", "dynamic-iterative"]) {
      const { options, positional } = split(buildDynamicSpawnArgs(prompt, { runMode }, {}));
      assert.deepEqual(positional, [prompt], `${runMode}: ${prompt}`);
      assert.ok(!options.includes(prompt), `${runMode}: ${prompt} leaked into options`);
      assert.ok(
        !options.some((o) => o.startsWith("--execute-step") || o.startsWith("--exec")),
        `${runMode}: execute-step option present`,
      );
    }
  }
});

test("caller-influenced option values use --flag=value and are validated", () => {
  const { options } = split(
    buildDynamicSpawnArgs(
      "go",
      {
        sessionId: "--orchestrator-session-reset",
        selectedAgentProviderIds: ["gpt_write", "--execute-step=/x", "", "ollama_fast", "a,b", null],
        attachmentManifestPath: "/tool/_web_uploads/u/_manifest.json",
      },
      {},
    ),
  );
  // A session id made of dashes is normalised, never emitted as its own argv entry.
  assert.ok(options.includes("--orchestrator-session=orchestrator-session-reset"));
  assert.ok(!options.includes("--orchestrator-session-reset"));
  assert.ok(options.includes("--dynamic-agent-provider-ids=gpt_write,ollama_fast"));
  assert.ok(options.includes("--dynamic-attachments=/tool/_web_uploads/u/_manifest.json"));
});

test("unusable session ids are dropped; path-like ones never reach argv", () => {
  for (const sessionId of ["../../etc/passwd", "a/b", "a\\b", "", "   ", 42, null, "x".repeat(200)]) {
    const { options } = split(buildDynamicSpawnArgs("go", { sessionId }, {}));
    assert.ok(!options.some((o) => o.startsWith("--orchestrator-session=")), String(sessionId));
  }
  const { options } = split(buildDynamicSpawnArgs("go", { sessionId: "agent:main:42" }, {}));
  assert.ok(options.includes("--orchestrator-session=agent-main-42"));
});

test("NUL bytes are stripped (spawn would throw)", () => {
  const { positional } = split(buildDynamicSpawnArgs("a\u0000b", {}, {}));
  assert.deepEqual(positional, ["ab"]);
  for (const a of buildDynamicSpawnArgs("a\u0000b", { runId: "r" }, {})) {
    assert.ok(!a.includes("\u0000"));
  }
});

test("iterative rounds are clamped by env limits", () => {
  const env = { AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS: "3" };
  let { options } = split(
    buildDynamicSpawnArgs("go", { runMode: "dynamic-iterative", iterativeRounds: 99 }, env),
  );
  assert.ok(options.includes("--dynamic-iterative"));
  assert.equal(options[options.indexOf("--dynamic-iterative-rounds") + 1], "3");
  ({ options } = split(
    buildDynamicSpawnArgs(
      "go",
      { runMode: "dynamic-iterative", autoIter: true, iterativeMaxRounds: "NaN", noSynthesize: true },
      env,
    ),
  ));
  assert.ok(options.includes("--dynamic-iterative-auto"));
  assert.equal(options[options.indexOf("--dynamic-iterative-max-rounds") + 1], "3");
  assert.ok(options.includes("--dynamic-iterative-no-synthesize"));
});

test("example overlay and flags", () => {
  const { options } = split(
    buildDynamicSpawnArgs(
      "go",
      { verboseCrew: true, noVerify: false, resetSession: true },
      { AGENTIC_EXAMPLE: "Healthcare" },
    ),
  );
  assert.deepEqual(options.slice(0, 3), ["main.py", "--example", "healthcare"]);
  assert.ok(!options.includes("--quiet"));
  assert.ok(!options.includes("--no-verify"));
  assert.ok(options.includes("--orchestrator-session-reset"));
  const none = split(buildDynamicSpawnArgs("go", {}, { AGENTIC_EXAMPLE: "__proto__" })).options;
  assert.ok(!none.includes("--example"));
});

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "perf-options.mjs"),
);

const { isSimpleChatPrompt, performanceSpawnEnvOverrides } = await import(libUrl);

test("isSimpleChatPrompt matches identity and greetings", () => {
  assert.equal(isSimpleChatPrompt("who are you?"), true);
  assert.equal(isSimpleChatPrompt("Hello!"), true);
  assert.equal(isSimpleChatPrompt("hi"), true);
});

test("isSimpleChatPrompt rejects long or compound tasks", () => {
  assert.equal(isSimpleChatPrompt("who are you and analyze my logs"), false);
  assert.equal(
    isSimpleChatPrompt("write a research plan for FDA 510k strategy with citations"),
    false,
  );
  assert.equal(isSimpleChatPrompt("a".repeat(121)), false);
});

test("performanceSpawnEnvOverrides applies trim and QA flags", () => {
  assert.deepEqual(
    performanceSpawnEnvOverrides({
      limitPlannerHistory: true,
      plannerMaxTurns: 2,
      plannerExcerptChars: 4000,
      skipFinalQa: true,
      skipLearningEval: true,
    }),
    {
      AGENTIC_ORCHESTRATOR_MAX_PLANNER_TURNS: "2",
      AGENTIC_ORCHESTRATOR_EXCERPT_CHARS: "4000",
      AGENTIC_FINAL_QA: "0",
      AGENTIC_LEARNING_EVAL: "0",
    },
  );
});

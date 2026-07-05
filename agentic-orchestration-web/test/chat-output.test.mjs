import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "chat-output.mjs"),
);

const { extractUserFacingStdout } = await import(libUrl);

test("extractUserFacingStdout keeps text after workflow marker", () => {
  const raw = [
    "(progress) starting step_1",
    "(progress) completed step_1",
    "",
    "=== Workflow Output ===",
    "",
    "Hello from the agent.",
  ].join("\n");
  assert.equal(extractUserFacingStdout(raw), "Hello from the agent.");
});

test("extractUserFacingStdout strips progress when marker missing", () => {
  const raw = "(progress) starting step_1\nAnswer only.\n";
  assert.equal(extractUserFacingStdout(raw), "Answer only.");
});

test("extractUserFacingStdout returns empty for progress-only stdout", () => {
  assert.equal(
    extractUserFacingStdout("(progress) starting step_1\n(progress) completed step_1\n"),
    "",
  );
});

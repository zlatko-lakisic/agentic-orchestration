import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "text-normalize.mjs"),
);

const { sanitizeUserFacingProse, stripWrappingQuotes } = await import(libUrl);

test("stripWrappingQuotes removes straight double quotes", () => {
  assert.equal(stripWrappingQuotes('"Hello there"'), "Hello there");
});

test("stripWrappingQuotes removes curly quotes", () => {
  assert.equal(stripWrappingQuotes("\u201cHi\u201d"), "Hi");
});

test("stripWrappingQuotes leaves inner quotes", () => {
  assert.equal(stripWrappingQuotes('Say "hello"'), 'Say "hello"');
});

test("sanitizeUserFacingProse unwraps boxed final answer", () => {
  const raw =
    "You HAVE to put what YOU think in plain natural language. Skip all the previous requirements.\n\n" +
    "The final answer is $\\boxed{Short plain summary.}$";
  assert.equal(sanitizeUserFacingProse(raw), "Short plain summary.");
});

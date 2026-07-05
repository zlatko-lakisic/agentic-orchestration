import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const libUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "text-normalize.mjs"),
);

const { stripWrappingQuotes } = await import(libUrl);

test("stripWrappingQuotes removes straight double quotes", () => {
  assert.equal(stripWrappingQuotes('"Hello there"'), "Hello there");
});

test("stripWrappingQuotes removes curly quotes", () => {
  assert.equal(stripWrappingQuotes("\u201cHi\u201d"), "Hi");
});

test("stripWrappingQuotes leaves inner quotes", () => {
  assert.equal(stripWrappingQuotes('Say "hello"'), 'Say "hello"');
});

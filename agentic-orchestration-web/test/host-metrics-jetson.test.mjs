import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "host-metrics.mjs"),
);

const { mergeJetsonIntoMetrics, parseJetsonRamText } = await import(modUrl);

test("parseJetsonRamText reads tegrastats used/total GiB", () => {
  assert.deepEqual(parseJetsonRamText("19.3/61.4GB"), {
    usedGb: 19.3,
    totalGb: 61.4,
    usedPercent: 31.4,
  });
  assert.equal(parseJetsonRamText(""), null);
});

test("mergeJetsonIntoMetrics adds GPU and jetson scope without inventing VRAM", () => {
  const base = {
    scope: "host",
    cpu: { percent: 10, cores: 12 },
    memory: { usedPercent: 40 },
  };
  const jtop = {
    ageMs: 500,
    cpu: { percent: 22.5 },
    gpu: { percent: 67, freqMhz: 918 },
    temperature: { gpu: 51.2 },
    powerW: 14.8,
    ramText: "12.1/61.4GB",
  };
  const out = mergeJetsonIntoMetrics(base, jtop);
  assert.equal(out.scope, "jetson");
  assert.equal(out.cpu.percent, 22.5);
  assert.equal(out.jetson.gpu.percent, 67);
  assert.equal(out.jetson.powerW, 14.8);
  assert.equal(out.jetson.ramText, "12.1/61.4GB");
  assert.equal(out.gpu.percent, 67);
  // tegrastats system RAM must not become discrete VRAM (#95)
  assert.equal(out.gpu.vramTotalGb, null);
  assert.equal(out.gpu.vramUsedGb, null);
  assert.equal(out.gpu.memoryKind, "unified");
  // Display-only unified fields for Admin (#100)
  assert.equal(out.gpu.unifiedUsedGb, 12.1);
  assert.equal(out.gpu.unifiedTotalGb, 61.4);
  assert.equal(out.gpu.unifiedUsedPercent, 19.7);
});

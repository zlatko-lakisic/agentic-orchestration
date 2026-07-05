import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "host-metrics.mjs"),
);

const { mergeJetsonIntoMetrics } = await import(modUrl);

test("mergeJetsonIntoMetrics adds GPU and jetson scope", () => {
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
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  agentsByModel,
  buildAoResourceUsage,
  classifyAoProcess,
  normalizeLoadedModels,
  normalizeModelTag,
  parseVmRssBytes,
  readAoProcesses,
  sampleAoResources,
} from "../lib/ao-resource-usage.mjs";
import { sampleMemoryAndGpu } from "../host-metrics.mjs";
import { matchAdminRoute } from "../lib/admin-api.mjs";
import { knownAdminFeedTopics } from "../lib/admin-live-feeds.mjs";

const GIB = 1024 ** 3;

test("classifyAoProcess maps AO components", () => {
  assert.equal(classifyAoProcess("node\0server.mjs\0")?.id, "web");
  assert.equal(classifyAoProcess("python\0-m\0orchestration.serve")?.id, "engine");
  assert.equal(
    classifyAoProcess("python\0-m\0orchestration.ollama_resource_broker")?.id,
    "ollama-broker",
  );
  assert.equal(
    classifyAoProcess("python\0main.py\0--warm-pool-worker")?.id,
    "warm-pool",
  );
  assert.equal(
    classifyAoProcess("python\0main.py\0--execute-step\0run-1")?.id,
    "step-worker",
  );
  assert.equal(classifyAoProcess("python\0main.py\0--goal\0hi")?.id, "coordinator");
  assert.equal(classifyAoProcess("/usr/bin/ollama\0serve")?.id, "ollama");
  assert.equal(classifyAoProcess("/usr/bin/ollama\0serve")?.kind, "application");
});

test("classifyAoProcess treats model runners as runners, not the daemon", () => {
  const runner = classifyAoProcess(
    "/usr/local/lib/ollama/runners/cuda/ollama_llama_server\0--model\0/root/.ollama/models/blobs/sha256-abc",
  );
  assert.equal(runner?.id, "ollama-runner");
  assert.equal(runner?.kind, "runner");
});

test("classifyAoProcess ignores foreign processes", () => {
  assert.equal(classifyAoProcess("/usr/sbin/sshd\0-D"), null);
  assert.equal(classifyAoProcess(""), null);
  // The broker is Python, not the Ollama binary — must not fall into the runner branch.
  assert.equal(
    classifyAoProcess("python\0-m\0orchestration.ollama_resource_broker")?.kind,
    "application",
  );
});

test("parseVmRssBytes reads kB from /proc status", () => {
  assert.equal(parseVmRssBytes("Name:\tnode\nVmRSS:\t  204800 kB\n"), 204800 * 1024);
  assert.equal(parseVmRssBytes("Name:\tnode\n"), null);
});

test("readAoProcesses scans a proc tree and skips non-AO pids", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ao-proc-"));
  const writePid = (pid, cmdline, rssKb) => {
    const p = path.join(dir, String(pid));
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, "cmdline"), cmdline);
    fs.writeFileSync(path.join(p, "status"), `Name:\tx\nVmRSS:\t${rssKb} kB\n`);
  };
  writePid(101, "node\0server.mjs\0", 102400);
  writePid(102, "python\0-m\0orchestration.serve\0", 204800);
  writePid(103, "/usr/sbin/sshd\0-D\0", 4096);
  fs.writeFileSync(path.join(dir, "meminfo"), "MemTotal: 1 kB\n");

  const { processes, ok } = readAoProcesses({ root: dir });
  assert.equal(ok, true);
  assert.equal(processes.length, 2);
  const web = processes.find((p) => p.app === "web");
  assert.equal(web.ramBytes, 102400 * 1024);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readAoProcesses reports not-ok for a missing proc root", () => {
  const { processes, ok } = readAoProcesses({
    root: path.join(os.tmpdir(), "ao-proc-missing-xyz"),
  });
  assert.equal(ok, false);
  assert.deepEqual(processes, []);
});

test("normalizeLoadedModels splits VRAM from CPU-resident spill", () => {
  const rows = normalizeLoadedModels({
    models: [
      { name: "qwen2.5:7b", size: 6 * GIB, size_vram: 4 * GIB },
      { model: "llama3.2:latest", size: 2 * GIB, size_vram: 2 * GIB },
      { name: "", size: 1 },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].vramBytes, 4 * GIB);
  assert.equal(rows[0].ramBytes, 2 * GIB);
  // `:latest` is implicit — normalize so catalog models line up.
  assert.equal(rows[1].model, "llama3.2");
  assert.equal(rows[1].ramBytes, 0);
});

test("normalizeModelTag and agentsByModel map agents onto tags", () => {
  assert.equal(normalizeModelTag("llama3.2:latest"), "llama3.2");
  const map = agentsByModel([
    { id: "researcher", model: "qwen2.5:7b" },
    { id: "writer", model: "qwen2.5:7b" },
    { id: "planner", model: "llama3.2:latest" },
    { id: "no-model" },
  ]);
  assert.deepEqual(map.get("qwen2.5:7b"), ["researcher", "writer"]);
  assert.deepEqual(map.get("llama3.2"), ["planner"]);
});

test("buildAoResourceUsage totals RAM and VRAM with host percentages", () => {
  const payload = buildAoResourceUsage({
    processes: [
      { pid: 1, app: "web", label: "Web / chat UI", kind: "application", ramBytes: GIB },
      {
        pid: 2,
        app: "engine",
        label: "Engine API daemon",
        kind: "application",
        ramBytes: 2 * GIB,
      },
      {
        pid: 3,
        app: "engine",
        label: "Engine API daemon",
        kind: "application",
        ramBytes: GIB,
      },
    ],
    models: [
      { model: "qwen2.5:7b", vramBytes: 4 * GIB, ramBytes: GIB },
      { model: "llama3.2", vramBytes: 2 * GIB, ramBytes: 0 },
    ],
    agents: [{ id: "researcher", model: "qwen2.5:7b" }],
    memory: { totalBytes: 32 * GIB, usedBytes: 16 * GIB },
    gpu: { vramTotalGb: 12, vramUsedGb: 7 },
    activeModels: ["qwen2.5:7b"],
    sources: { models: "ollama" },
  });

  assert.equal(payload.ao.ramBytes, 5 * GIB);
  assert.equal(payload.ao.ramPercentOfHost, 15.6);
  assert.equal(payload.ao.vramGb, 6);
  assert.equal(payload.ao.vramPercentOfTotal, 50);
  assert.equal(payload.applications[0].id, "engine");
  assert.equal(payload.applications[0].processes, 2);
  assert.equal(payload.applications[0].ramBytes, 3 * GIB);
  assert.deepEqual(payload.models[0].agents, ["researcher"]);
  assert.equal(payload.models[0].active, true);
  assert.equal(payload.models[1].active, false);
});

test("buildAoResourceUsage keeps runner RSS only when /api/ps is unavailable", () => {
  const processes = [
    {
      pid: 9,
      app: "ollama-runner",
      label: "Ollama model runner",
      kind: "runner",
      ramBytes: 3 * GIB,
    },
  ];
  const withoutPs = buildAoResourceUsage({ processes, sources: { models: "none" } });
  assert.equal(withoutPs.applications[0].id, "ollama-runner");
  assert.equal(withoutPs.ao.ramBytes, 3 * GIB);

  // With /api/ps the model rows already carry the CPU-resident share — no double count.
  const withPs = buildAoResourceUsage({
    processes,
    models: [{ model: "qwen2.5:7b", vramBytes: 4 * GIB, ramBytes: GIB }],
    sources: { models: "ollama" },
  });
  assert.equal(withPs.applications.length, 0);
  assert.equal(withPs.ao.ramBytes, GIB);
});

test("buildAoResourceUsage leaves percentages null when host totals are unknown", () => {
  const payload = buildAoResourceUsage({
    processes: [
      { pid: 1, app: "web", label: "Web", kind: "application", ramBytes: GIB },
    ],
    sources: { ram: "unavailable", reason: "proc filesystem not readable" },
  });
  assert.equal(payload.ao.ramPercentOfHost, null);
  assert.equal(payload.ao.vramPercentOfTotal, null);
  assert.equal(payload.sources.reason, "proc filesystem not readable");
});

test("sampleMemoryAndGpu returns totals without a CPU block", () => {
  const sample = sampleMemoryAndGpu();
  assert.ok(sample.memory.totalBytes > 0);
  assert.equal(sample.cpu, undefined);
  assert.ok(typeof sample.scope === "string");
});

test("sampleAoResources folds /api/ps and resource-status into the payload", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ao-sample-"));
  const pidDir = path.join(dir, "77");
  fs.mkdirSync(pidDir, { recursive: true });
  fs.writeFileSync(path.join(pidDir, "cmdline"), "node\0server.mjs\0");
  fs.writeFileSync(path.join(pidDir, "status"), "Name:\tnode\nVmRSS:\t524288 kB\n");

  const calls = [];
  const payload = await sampleAoResources({
    env: { AGENTIC_HOST_METRICS_PROC_ROOT: dir },
    ollamaBase: "http://ollama:11434",
    agents: [{ id: "researcher", model: "qwen2.5:7b" }],
    sampleHost: () => ({
      scope: "host",
      memory: { totalBytes: 32 * GIB, usedBytes: 8 * GIB },
      gpu: { vramTotalGb: 16, vramUsedGb: 5 },
    }),
    fetchJson: async (url) => {
      calls.push(url);
      if (url.endsWith("/api/ps")) {
        return {
          ok: true,
          json: { models: [{ name: "qwen2.5:7b", size: 5 * GIB, size_vram: 4 * GIB }] },
        };
      }
      return { ok: true, json: { active: { "qwen2.5:7b": 1 } } };
    },
  });

  assert.deepEqual(calls, [
    "http://ollama:11434/api/ps",
    "http://ollama:11434/api/agentic/resource-status",
  ]);
  assert.equal(payload.scope, "host");
  assert.equal(payload.sources.models, "ollama");
  assert.equal(payload.applications[0].id, "web");
  assert.equal(payload.models[0].active, true);
  assert.deepEqual(payload.models[0].agents, ["researcher"]);
  assert.equal(payload.ao.vramGb, 4);
  assert.equal(payload.ao.vramPercentOfTotal, 25);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ao-resources is routable and pushed as a live feed topic", () => {
  assert.equal(matchAdminRoute("/api/v1/admin/ao-resources")?.name, "ao_resources");
  assert.ok(knownAdminFeedTopics().includes("ao_resources"));
});

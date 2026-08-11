/**
 * Unit tests for Admin AO control (restart allowlist + host request files).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CONTROL_TARGETS,
  HOST_REBOOT_CONFIRM,
  buildControlStatus,
  executeControlRestart,
  restartPatchBody,
} from "../lib/admin-control.mjs";
import { matchAdminRoute } from "../lib/admin-api.mjs";

function tmpControlDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ao-control-"));
}

function armWatcher(dir, extra = {}) {
  fs.writeFileSync(
    path.join(dir, "watcher.json"),
    JSON.stringify({
      armed: true,
      mode: "test",
      reboot: true,
      ollama: true,
      installedAt: "2026-08-11T00:00:00.000Z",
      ...extra,
    }),
  );
  fs.writeFileSync(path.join(dir, "hostname"), "test-host\n");
}

test("matchAdminRoute recognizes control paths", () => {
  assert.equal(matchAdminRoute("/api/v1/admin/control")?.name, "control");
  assert.equal(matchAdminRoute("/api/v1/admin/control/restart")?.name, "control_restart");
});

test("restartPatchBody sets kubectl restartedAt", () => {
  const at = new Date("2026-08-11T12:00:00.000Z");
  const body = restartPatchBody(at);
  assert.equal(
    body.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"],
    "2026-08-11T12:00:00.000Z",
  );
});

test("buildControlStatus marks k8s targets unavailable without a service account", async () => {
  const dir = tmpControlDir();
  const status = await buildControlStatus({
    sa: null,
    hostControlDir: dir,
    hostname: "local",
    ollamaHealthy: false,
    env: { AGENTIC_OLLAMA_MODE: "auto" },
  });
  const engine = status.targets.find((t) => t.id === "engine");
  const stack = status.targets.find((t) => t.id === "stack");
  const host = status.targets.find((t) => t.id === "host");
  const ollama = status.targets.find((t) => t.id === "ollama");
  assert.equal(engine.available, false);
  assert.match(engine.reason, /Kubernetes/i);
  assert.equal(stack.available, false);
  assert.equal(host.available, false);
  assert.match(host.reason, /watcher/i);
  // auto + unhealthy + not k8s → managed_process (restartable)
  assert.equal(ollama.available, true);
  assert.equal(status.ollama.mode, "managed_process");
});

test("buildControlStatus exposes present deployments and armed host reboot", async () => {
  const dir = tmpControlDir();
  armWatcher(dir);
  const sa = { namespace: "agentic-orchestration", host: "k", port: "443", token: "t", ca: Buffer.alloc(0) };
  const calls = [];
  const k8sRequest = async (_sa, urlPath, opts = {}) => {
    calls.push({ urlPath, method: opts.method || "GET" });
    assert.match(urlPath, /\/deployments$/);
    return JSON.stringify({
      items: [
        { metadata: { name: "agentic-coordinator" } },
        { metadata: { name: "agentic-engine" } },
      ],
    });
  };
  const status = await buildControlStatus({
    sa,
    k8sRequest,
    hostControlDir: dir,
    ollamaHealthy: true,
    env: { AGENTIC_OLLAMA_MODE: "auto", OLLAMA_API_BASE: "http://127.0.0.1:11434" },
  });
  assert.equal(status.hostname, "test-host");
  assert.equal(status.kubernetes.available, true);
  assert.equal(status.targets.find((t) => t.id === "engine").available, true);
  assert.equal(status.targets.find((t) => t.id === "warm-pool").available, false);
  assert.deepEqual(status.targets.find((t) => t.id === "stack").members, [
    "engine",
    "coordinator",
  ]);
  assert.equal(status.targets.find((t) => t.id === "host").available, true);
  // Healthy configured base → external (not AO-owned)
  assert.equal(status.targets.find((t) => t.id === "ollama").available, false);
  assert.equal(status.ollama.mode, "external");
  assert.equal(calls.length, 1);
});

test("ollama Control is restartable for managed_process and managed_k8s", async () => {
  const dir = tmpControlDir();
  const sa = { namespace: "ns", host: "k", port: "443", token: "t", ca: Buffer.alloc(0) };
  const k8sRequest = async () =>
    JSON.stringify({
      items: [
        { metadata: { name: "agentic-coordinator" } },
        { metadata: { name: "agentic-ollama" } },
      ],
    });
  const processMode = await buildControlStatus({
    sa: null,
    hostControlDir: dir,
    ollamaHealthy: false,
    env: { AGENTIC_OLLAMA_MODE: "managed_process" },
  });
  assert.equal(processMode.targets.find((t) => t.id === "ollama").available, true);
  assert.equal(processMode.ollama.mode, "managed_process");

  const k8sMode = await buildControlStatus({
    sa,
    k8sRequest,
    hostControlDir: dir,
    ollamaHealthy: false,
    env: { AGENTIC_OLLAMA_MODE: "managed_k8s" },
  });
  assert.equal(k8sMode.targets.find((t) => t.id === "ollama").available, true);
  assert.equal(k8sMode.ollama.mode, "managed_k8s");
  assert.deepEqual(k8sMode.targets.find((t) => t.id === "stack").members, [
    "ollama",
    "coordinator",
  ]);

  const patches = [];
  const patchK8s = async (_sa, urlPath, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      return JSON.stringify({
        items: [{ metadata: { name: "agentic-ollama" } }],
      });
    }
    patches.push(urlPath);
    return "{}";
  };
  const restarted = await executeControlRestart(
    { target: "ollama" },
    {
      sa,
      k8sRequest: patchK8s,
      hostControlDir: dir,
      ollamaHealthy: false,
      env: { AGENTIC_OLLAMA_MODE: "managed_k8s" },
    },
  );
  assert.equal(restarted.httpStatus, 200);
  assert.match(patches[0], /agentic-ollama/);

  const child = await executeControlRestart(
    { target: "ollama" },
    {
      sa: null,
      hostControlDir: dir,
      ollamaHealthy: false,
      env: { AGENTIC_OLLAMA_MODE: "managed_process" },
      restartManagedProcessOllama: async () => ({
        ok: true,
        detail: "restarted managed_process ollama",
      }),
    },
  );
  assert.equal(child.httpStatus, 200);
  assert.equal(child.body.actions[0].detail, "restarted managed_process ollama");
});

test("executeControlRestart rejects unknown targets and host without confirm", async () => {
  const dir = tmpControlDir();
  armWatcher(dir);
  const unknown = await executeControlRestart({ target: "laptop" }, { hostControlDir: dir, sa: null });
  assert.equal(unknown.httpStatus, 400);
  assert.equal(unknown.body.code, "unknown_target");

  const noConfirm = await executeControlRestart({ target: "host" }, { hostControlDir: dir, sa: null });
  assert.equal(noConfirm.httpStatus, 400);
  assert.equal(noConfirm.body.code, "confirm_required");
  assert.equal(noConfirm.body.confirmPhrase, HOST_REBOOT_CONFIRM);
});

test("executeControlRestart writes a host reboot request after REBOOT confirm", async () => {
  const dir = tmpControlDir();
  armWatcher(dir);
  const at = new Date("2026-08-11T15:00:00.000Z");
  const result = await executeControlRestart(
    { target: "host", confirm: "REBOOT" },
    { hostControlDir: dir, sa: null, at, hostname: "test-host" },
  );
  assert.equal(result.httpStatus, 202);
  assert.equal(result.body.target, "host");
  assert.equal(result.body.disconnectLikely, true);
  const request = JSON.parse(fs.readFileSync(path.join(dir, "reboot.request"), "utf8"));
  assert.equal(request.action, "reboot");
  assert.equal(request.requestedAt, at.toISOString());
  const last = JSON.parse(fs.readFileSync(path.join(dir, "last-action.json"), "utf8"));
  assert.equal(last.target, "host");
});

test("executeControlRestart patches engine immediately and defers coordinator", async () => {
  const dir = tmpControlDir();
  const sa = { namespace: "agentic-orchestration", host: "k", port: "443", token: "t", ca: Buffer.alloc(0) };
  const patches = [];
  const k8sRequest = async (_sa, urlPath, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      return JSON.stringify({
        items: [
          { metadata: { name: "agentic-coordinator" } },
          { metadata: { name: "agentic-engine" } },
          { metadata: { name: "agentic-warm-pool" } },
        ],
      });
    }
    patches.push({ urlPath, body: opts.body, contentType: opts.contentType });
    return "{}";
  };
  const at = new Date("2026-08-11T16:00:00.000Z");
  const engine = await executeControlRestart(
    { target: "engine" },
    { sa, k8sRequest, hostControlDir: dir, at },
  );
  assert.equal(engine.httpStatus, 200);
  assert.equal(patches.length, 1);
  assert.match(patches[0].urlPath, /deployments\/agentic-engine$/);
  assert.equal(patches[0].contentType, "application/strategic-merge-patch+json");

  const coordinator = await executeControlRestart(
    { target: "coordinator" },
    { sa, k8sRequest, hostControlDir: dir, at },
  );
  assert.equal(coordinator.httpStatus, 202);
  assert.equal(patches.length, 1, "coordinator patch is deferred");
  assert.equal(typeof coordinator.afterSend, "function");
  await coordinator.afterSend();
  assert.equal(patches.length, 2);
  assert.match(patches[1].urlPath, /deployments\/agentic-coordinator$/);
});

test("executeControlRestart stack rolls non-coordinator first then schedules coordinator", async () => {
  const dir = tmpControlDir();
  const sa = { namespace: "ns", host: "k", port: "443", token: "t", ca: Buffer.alloc(0) };
  const patched = [];
  const k8sRequest = async (_sa, urlPath, opts = {}) => {
    if ((opts.method || "GET") === "GET") {
      return JSON.stringify({
        items: [
          { metadata: { name: "agentic-coordinator" } },
          { metadata: { name: "agentic-engine" } },
          { metadata: { name: "agentic-mcp-fetch" } },
        ],
      });
    }
    const m = urlPath.match(/deployments\/([^/?]+)$/);
    patched.push(m ? m[1] : urlPath);
    return "{}";
  };
  const result = await executeControlRestart(
    { target: "stack" },
    { sa, k8sRequest, hostControlDir: dir, at: new Date("2026-08-11T17:00:00.000Z") },
  );
  assert.equal(result.httpStatus, 202);
  assert.deepEqual(patched, ["agentic-mcp-fetch", "agentic-engine"]);
  await result.afterSend();
  assert.deepEqual(patched, [
    "agentic-mcp-fetch",
    "agentic-engine",
    "agentic-coordinator",
  ]);
});

test("host reboot uses writable sysrq when the systemd watcher is not armed", async () => {
  const dir = tmpControlDir();
  const trigger = path.join(dir, "sysrq-trigger");
  fs.writeFileSync(trigger, "");
  const status = await buildControlStatus({
    sa: null,
    hostControlDir: dir,
    sysrqPath: trigger,
  });
  const host = status.targets.find((t) => t.id === "host");
  assert.equal(host.available, true);
  assert.equal(host.rebootVia, "sysrq");
  assert.equal(status.hostControl.sysrq, true);

  const result = await executeControlRestart(
    { target: "host", confirm: "REBOOT" },
    { sa: null, hostControlDir: dir, sysrqPath: trigger, at: new Date("2026-08-11T18:00:00.000Z") },
  );
  assert.equal(result.httpStatus, 202);
  assert.equal(typeof result.afterSend, "function");
  await result.afterSend();
  assert.equal(fs.readFileSync(trigger, "utf8"), "b");
});

test("CONTROL_TARGETS stay on the allowlist (no extra host actions)", () => {
  const ids = CONTROL_TARGETS.map((t) => t.id).sort();
  assert.deepEqual(ids, [
    "broker",
    "coordinator",
    "engine",
    "host",
    "mcp-fetch",
    "mcp-filesystem",
    "ollama",
    "stack",
    "warm-pool",
  ]);
});

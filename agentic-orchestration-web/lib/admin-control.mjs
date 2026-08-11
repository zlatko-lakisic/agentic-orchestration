/**
 * Admin AO control: restart allowlisted Kubernetes workloads or request a
 * host reboot / Ollama restart via a hostPath + systemd watcher.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { k8sRequest, readServiceAccount } from "./admin-k8s.mjs";

export const HOST_REBOOT_CONFIRM = "REBOOT";

/** Stack roll order — coordinator last so the API can return 202 first. */
export const K8S_STACK_ORDER = [
  "mcp-fetch",
  "mcp-filesystem",
  "broker",
  "warm-pool",
  "engine",
  "coordinator",
];

export const CONTROL_TARGETS = [
  {
    id: "coordinator",
    label: "Coordinator (Web / Admin)",
    kind: "k8s-deployment",
    deployment: "agentic-coordinator",
    group: "apps",
    disconnectLikely: true,
    description:
      "Restarts Admin and the chat UI. This page disconnects until the new pod is ready.",
  },
  {
    id: "engine",
    label: "Engine",
    kind: "k8s-deployment",
    deployment: "agentic-engine",
    group: "apps",
    description: "Restarts the Reach engine on :8765 (NodePort 30765).",
  },
  {
    id: "warm-pool",
    label: "Warm pool",
    kind: "k8s-deployment",
    deployment: "agentic-warm-pool",
    group: "apps",
    description: "Restarts worker pods. In-flight runs may fail.",
  },
  {
    id: "broker",
    label: "Delegation broker",
    kind: "k8s-deployment",
    deployment: "agentic-delegation-broker",
    group: "apps",
    description: "Restarts task delegation between coordinator and workers.",
  },
  {
    id: "mcp-fetch",
    label: "MCP fetch",
    kind: "k8s-deployment",
    deployment: "agentic-mcp-fetch",
    group: "apps",
    description: "Restarts the fetch-url MCP gateway.",
  },
  {
    id: "mcp-filesystem",
    label: "MCP filesystem",
    kind: "k8s-deployment",
    deployment: "agentic-mcp-filesystem",
    group: "apps",
    description: "Restarts the filesystem MCP gateway.",
  },
  {
    id: "ollama",
    label: "Ollama",
    kind: "host-service",
    hostFile: "ollama.restart.request",
    group: "apps",
    description: "Restarts the host Ollama systemd service.",
  },
  {
    id: "stack",
    label: "AO Kubernetes stack",
    kind: "k8s-stack",
    group: "stack",
    disconnectLikely: true,
    description:
      "Rolls every AO deployment (sidecars, broker, warm pool, engine, then coordinator).",
  },
  {
    id: "host",
    label: "Reboot this server",
    kind: "host-reboot",
    hostFile: "reboot.request",
    group: "host",
    confirmPhrase: HOST_REBOOT_CONFIRM,
    disconnectLikely: true,
    description:
      "Reboots the machine. Kubernetes, Admin, Ollama, and Reach all go down until it is back.",
  },
];

function pickTargetPublic(t) {
  return {
    id: t.id,
    label: t.label,
    kind: t.kind,
    group: t.group,
    description: t.description,
    confirmPhrase: t.confirmPhrase || null,
    disconnectLikely: Boolean(t.disconnectLikely),
  };
}

export function resolveHostControlDir(env = process.env) {
  const fromEnv = String(env.AGENTIC_HOST_CONTROL_DIR || "").trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync("/host/agentic-control")) return "/host/agentic-control";
  return null;
}

export function readWatcherStatus(dir) {
  if (!dir) {
    return {
      armed: false,
      writable: false,
      reboot: false,
      ollama: false,
      reason: "Host control directory is not mounted",
    };
  }
  let writable = false;
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }
  try {
    const json = JSON.parse(fs.readFileSync(path.join(dir, "watcher.json"), "utf8"));
    const armed = Boolean(json.armed);
    return {
      armed,
      writable,
      mode: json.mode || null,
      reboot: json.reboot !== false,
      ollama: json.ollama !== false,
      reason:
        json.reason ||
        (armed ? null : "Host control watcher is not armed"),
      installedAt: json.installedAt || null,
    };
  } catch {
    return {
      armed: false,
      writable,
      reboot: false,
      ollama: false,
      reason: writable
        ? "Host control watcher is not installed (run jetson-install-host-control.sh)"
        : "Host control directory is not writable",
    };
  }
}

export function readHostHostname(dir) {
  if (dir) {
    try {
      const h = fs.readFileSync(path.join(dir, "hostname"), "utf8").trim();
      if (h) return h;
    } catch {
      /* fall through */
    }
  }
  return process.env.AGENTIC_EDGE_HOSTNAME || os.hostname();
}

export function readLastAction(dir) {
  if (!dir) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "last-action.json"), "utf8"));
  } catch {
    return null;
  }
}

export function recordLastAction(dir, action) {
  if (!dir) return;
  try {
    fs.writeFileSync(
      path.join(dir, "last-action.json"),
      JSON.stringify(action, null, 2),
      "utf8",
    );
  } catch {
    /* ignore */
  }
}

export function writeHostRequest(dir, filename, payload) {
  if (!dir) {
    const err = new Error("Host control directory is not available");
    err.code = "host_control_unavailable";
    throw err;
  }
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  const tmp = `${dest}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), {
    encoding: "utf8",
    mode: 0o640,
  });
  fs.renameSync(tmp, dest);
  return dest;
}

export function restartPatchBody(at = new Date()) {
  return {
    spec: {
      template: {
        metadata: {
          annotations: {
            "kubectl.kubernetes.io/restartedAt": at.toISOString(),
          },
        },
      },
    },
  };
}

export async function patchDeploymentRestart(sa, name, opts = {}) {
  const k8sRequestFn = opts.k8sRequest || k8sRequest;
  const at = opts.at || new Date();
  await k8sRequestFn(
    sa,
    `/apis/apps/v1/namespaces/${encodeURIComponent(sa.namespace)}/deployments/${encodeURIComponent(name)}`,
    {
      method: "PATCH",
      contentType: "application/strategic-merge-patch+json",
      body: restartPatchBody(at),
      timeoutMs: 15000,
    },
  );
  return { ok: true, id: name, detail: `restarted deployment ${name}` };
}

async function listDeploymentNames(sa, k8sRequestFn) {
  const body = await k8sRequestFn(
    sa,
    `/apis/apps/v1/namespaces/${encodeURIComponent(sa.namespace)}/deployments`,
    { timeoutMs: 8000 },
  );
  const json = JSON.parse(body);
  return new Set(
    (json.items || []).map((item) => item?.metadata?.name).filter(Boolean),
  );
}

function hostTargetAvailable(spec, dir, watcher) {
  if (!dir || !watcher.writable) {
    return {
      available: false,
      reason: watcher.reason || "Host control directory is not writable",
    };
  }
  if (!watcher.armed) {
    return {
      available: false,
      reason: watcher.reason || "Host control watcher is not armed",
    };
  }
  if (spec.id === "ollama" && watcher.ollama === false) {
    return { available: false, reason: "Ollama restart is not armed on this host" };
  }
  if (spec.id === "host" && watcher.reboot === false) {
    return {
      available: false,
      reason:
        "Host reboot is not armed (needs root systemd unit or passwordless sudo)",
    };
  }
  return { available: true, reason: null };
}

export async function buildControlStatus(opts = {}) {
  const sa = opts.sa !== undefined ? opts.sa : readServiceAccount();
  const k8sRequestFn = opts.k8sRequest || k8sRequest;
  const dir =
    opts.hostControlDir !== undefined ? opts.hostControlDir : resolveHostControlDir();
  const watcher = readWatcherStatus(dir);
  const hostname = opts.hostname || readHostHostname(dir);
  let deployments = new Set();
  let k8sAvailable = Boolean(sa);
  let k8sError = null;
  if (sa) {
    try {
      deployments = await listDeploymentNames(sa, k8sRequestFn);
    } catch (err) {
      k8sAvailable = false;
      k8sError = err instanceof Error ? err.message : String(err);
    }
  }

  const targets = CONTROL_TARGETS.map((spec) => {
    if (spec.kind === "k8s-deployment") {
      const available = k8sAvailable && deployments.has(spec.deployment);
      return {
        ...pickTargetPublic(spec),
        available,
        reason: !sa
          ? "Not running in Kubernetes"
          : k8sError
            ? k8sError
            : available
              ? null
              : `Deployment ${spec.deployment} is not present`,
      };
    }
    if (spec.kind === "k8s-stack") {
      const members = K8S_STACK_ORDER.filter((id) => {
        const member = CONTROL_TARGETS.find((item) => item.id === id);
        return member && deployments.has(member.deployment);
      });
      const available = k8sAvailable && members.length > 0;
      return {
        ...pickTargetPublic(spec),
        available,
        members,
        reason: !sa
          ? "Not running in Kubernetes"
          : k8sError
            ? k8sError
            : available
              ? null
              : "No AO deployments found",
      };
    }
    const host = hostTargetAvailable(spec, dir, watcher);
    return {
      ...pickTargetPublic(spec),
      available: host.available,
      reason: host.reason,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    hostname,
    kubernetes: {
      available: k8sAvailable,
      namespace: sa?.namespace || null,
      error: k8sError,
    },
    hostControl: {
      available: Boolean(dir) && watcher.writable,
      dir: dir || null,
      armed: watcher.armed,
      mode: watcher.mode || null,
      reboot: Boolean(watcher.reboot),
      ollama: Boolean(watcher.ollama),
      reason: watcher.reason,
      installedAt: watcher.installedAt || null,
    },
    targets,
    lastAction: readLastAction(dir),
  };
}

export function normalizeControlTarget(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

/**
 * @param {{ target?: string, confirm?: string }} body
 * @returns {Promise<{ httpStatus: number, body: object, afterSend?: (() => Promise<unknown>)|null }>}
 */
export async function executeControlRestart(body, opts = {}) {
  const targetId = normalizeControlTarget(body?.target);
  const spec = CONTROL_TARGETS.find((item) => item.id === targetId);
  if (!spec) {
    return {
      httpStatus: 400,
      body: { error: "Unknown control target", code: "unknown_target" },
    };
  }
  if (spec.confirmPhrase) {
    const confirm = String(body?.confirm || "").trim();
    if (confirm !== spec.confirmPhrase) {
      return {
        httpStatus: 400,
        body: {
          error: `Type ${spec.confirmPhrase} to confirm`,
          code: "confirm_required",
          confirmPhrase: spec.confirmPhrase,
        },
      };
    }
  }

  const status = await buildControlStatus(opts);
  const live = status.targets.find((item) => item.id === spec.id);
  if (!live?.available) {
    return {
      httpStatus: 409,
      body: {
        error: live?.reason || "Target is not available",
        code: "target_unavailable",
        target: spec.id,
      },
    };
  }

  const sa = opts.sa !== undefined ? opts.sa : readServiceAccount();
  const k8sRequestFn = opts.k8sRequest || k8sRequest;
  const dir =
    opts.hostControlDir !== undefined ? opts.hostControlDir : resolveHostControlDir();
  const at = opts.at || new Date();
  const actions = [];
  let afterSend = null;

  const scheduleDeployment = (deploymentName, id) => {
    return () =>
      patchDeploymentRestart(sa, deploymentName, { k8sRequest: k8sRequestFn, at });
  };

  if (spec.kind === "k8s-deployment") {
    if (spec.id === "coordinator") {
      afterSend = scheduleDeployment(spec.deployment, spec.id);
      actions.push({
        id: spec.id,
        ok: true,
        detail: "coordinator restart scheduled",
      });
    } else {
      await patchDeploymentRestart(sa, spec.deployment, {
        k8sRequest: k8sRequestFn,
        at,
      });
      actions.push({
        id: spec.id,
        ok: true,
        detail: `restarted deployment ${spec.deployment}`,
      });
    }
  } else if (spec.kind === "k8s-stack") {
    const members = Array.isArray(live.members) ? live.members : [];
    for (const id of members) {
      if (id === "coordinator") continue;
      const member = CONTROL_TARGETS.find((item) => item.id === id);
      await patchDeploymentRestart(sa, member.deployment, {
        k8sRequest: k8sRequestFn,
        at,
      });
      actions.push({
        id: member.id,
        ok: true,
        detail: `restarted deployment ${member.deployment}`,
      });
    }
    if (members.includes("coordinator")) {
      afterSend = scheduleDeployment("agentic-coordinator", "coordinator");
      actions.push({
        id: "coordinator",
        ok: true,
        detail: "coordinator restart scheduled",
      });
    }
  } else {
    const payload = {
      action: spec.id === "host" ? "reboot" : "ollama-restart",
      target: spec.id,
      requestedAt: at.toISOString(),
      hostname: status.hostname,
    };
    const dest = writeHostRequest(dir, spec.hostFile, payload);
    actions.push({
      id: spec.id,
      ok: true,
      detail: `wrote ${path.basename(dest)}`,
    });
  }

  const result = {
    ok: true,
    accepted: true,
    target: spec.id,
    actions,
    disconnectLikely: Boolean(spec.disconnectLikely),
    hostname: status.hostname,
    requestedAt: at.toISOString(),
  };
  recordLastAction(dir, { ...result, at: at.toISOString() });
  return {
    httpStatus: spec.disconnectLikely ? 202 : 200,
    body: result,
    afterSend,
  };
}

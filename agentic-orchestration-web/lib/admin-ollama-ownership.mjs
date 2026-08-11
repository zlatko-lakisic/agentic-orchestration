/**
 * Mirror of orchestration/ollama_ownership.py for Admin Control (Node).
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MODE_EXTERNAL = "external";
export const MODE_MANAGED_PROCESS = "managed_process";
export const MODE_MANAGED_K8S = "managed_k8s";
export const K8S_OLLAMA_DEPLOYMENT = "agentic-ollama";
export const K8S_OLLAMA_SERVICE_BASE = "http://agentic-ollama:11434";

export function configuredApiBase(env = process.env) {
  const raw =
    String(env.OLLAMA_API_BASE || "").trim() ||
    String(env.OLLAMA_HOST || "").trim() ||
    "http://127.0.0.1:11434";
  if (raw.includes("://")) return raw.replace(/\/$/, "");
  return `http://${raw}`.replace(/\/$/, "");
}

export function parseOllamaModeRaw(raw) {
  const value = String(raw ?? process.env.AGENTIC_OLLAMA_MODE ?? "auto")
    .trim()
    .toLowerCase();
  const aliases = {
    auto: "auto",
    external: MODE_EXTERNAL,
    managed: MODE_MANAGED_PROCESS,
    managed_process: MODE_MANAGED_PROCESS,
    process: MODE_MANAGED_PROCESS,
    child: MODE_MANAGED_PROCESS,
    managed_k8s: MODE_MANAGED_K8S,
    k8s: MODE_MANAGED_K8S,
    kubernetes: MODE_MANAGED_K8S,
  };
  return aliases[value] || "auto";
}

export function inKubernetes(env = process.env, opts = {}) {
  if (opts.sa) return true;
  if (fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount")) return true;
  return String(env.AGENTIC_EXECUTION_BACKEND || "").trim().toLowerCase() === "kubernetes";
}

export function probeOllamaHealthy(apiBase, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 2000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(ok));
    };
    try {
      const url = new URL(`${apiBase}/api/tags`);
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.get(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          timeout: timeoutMs,
        },
        (res) => {
          res.resume();
          done((res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300);
        },
      );
      req.on("error", () => done(false));
      req.on("timeout", () => {
        req.destroy();
        done(false);
      });
    } catch {
      done(false);
    }
  });
}

/**
 * @param {{ healthy?: boolean, inK8s?: boolean, env?: NodeJS.ProcessEnv, sa?: object|null }} [opts]
 */
export function resolveOllamaMode(opts = {}) {
  const env = opts.env || process.env;
  const mode = parseOllamaModeRaw(env.AGENTIC_OLLAMA_MODE);
  if (mode === MODE_EXTERNAL || mode === MODE_MANAGED_PROCESS || mode === MODE_MANAGED_K8S) {
    return mode;
  }
  const healthy = Boolean(opts.healthy);
  if (healthy) return MODE_EXTERNAL;
  const k8s =
    opts.inK8s !== undefined ? Boolean(opts.inK8s) : inKubernetes(env, { sa: opts.sa });
  if (k8s) return MODE_MANAGED_K8S;
  return MODE_MANAGED_PROCESS;
}

/**
 * @param {{ healthy?: boolean, inK8s?: boolean, deploymentPresent?: boolean, env?: NodeJS.ProcessEnv, sa?: object|null }} [opts]
 */
export function ollamaOwnershipStatus(opts = {}) {
  const env = opts.env || process.env;
  const apiBase = configuredApiBase(env);
  const healthy = Boolean(opts.healthy);
  const mode = resolveOllamaMode({
    healthy,
    inK8s: opts.inK8s,
    env,
    sa: opts.sa,
  });
  const owned = mode === MODE_MANAGED_PROCESS || mode === MODE_MANAGED_K8S;
  let restartable = false;
  let reason = null;
  if (mode === MODE_EXTERNAL) {
    reason = `External Ollama at ${apiBase}`;
  } else if (mode === MODE_MANAGED_PROCESS) {
    restartable = true;
  } else if (mode === MODE_MANAGED_K8S) {
    if (opts.deploymentPresent === false) {
      reason = "Deployment agentic-ollama is not present";
    } else {
      restartable = opts.deploymentPresent !== false;
    }
  }
  return {
    mode,
    owned,
    apiBase,
    healthy,
    restartable,
    reason,
    deployment: mode === MODE_MANAGED_K8S ? K8S_OLLAMA_DEPLOYMENT : null,
  };
}

export function resolveToolRoot(env = process.env) {
  if (env.AGENTIC_TOOL_ROOT) return path.resolve(env.AGENTIC_TOOL_ROOT);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "agentic-orchestration-tool");
}

/**
 * Restart AO-owned child ollama via Python ownership helper.
 * @returns {Promise<{ ok: boolean, detail: string, raw?: string }>}
 */
export function restartManagedProcessOllama(opts = {}) {
  const toolRoot = opts.toolRoot || resolveToolRoot();
  const python =
    opts.python ||
    process.env.AGENTIC_PYTHON ||
    (fs.existsSync(path.join(toolRoot, ".venv", "Scripts", "python.exe"))
      ? path.join(toolRoot, ".venv", "Scripts", "python.exe")
      : fs.existsSync(path.join(toolRoot, ".venv", "bin", "python"))
        ? path.join(toolRoot, ".venv", "bin", "python")
        : "python3");
  return new Promise((resolve) => {
    const child = spawn(
      python,
      ["-m", "orchestration.ollama_ownership", "restart"],
      {
        cwd: toolRoot,
        env: { ...process.env, PYTHONPATH: toolRoot, AGENTIC_TOOL_ROOT: toolRoot },
        windowsHide: true,
      },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => {
      out += c;
    });
    child.stderr.on("data", (c) => {
      err += c;
    });
    child.on("error", (e) => {
      resolve({ ok: false, detail: e.message });
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, detail: "restarted managed_process ollama", raw: out.trim() });
        return;
      }
      resolve({
        ok: false,
        detail: (err || out || `exit ${code}`).trim().slice(0, 400),
        raw: out.trim(),
      });
    });
  });
}

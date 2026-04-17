/**
 * Static file + WebSocket server. Spawns Python main.py --dynamic for each chat message.
 * Bind to 127.0.0.1 by default; set AGENTIC_WEB_HOST=0.0.0.0 in .env for all interfaces.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load `.env` next to this file (no extra deps). Does not override existing process.env. */
function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadLocalEnv();

/** `node server.mjs --example <id>` or env `AGENTIC_EXAMPLE=<id>` (npm: `npm run start:healthcare`, `start:logistics`, …). */
function detectExampleFromArgv() {
  const i = process.argv.indexOf("--example");
  if (i < 0) return;
  const v = String(process.argv[i + 1] || "").trim();
  if (v) process.env.AGENTIC_EXAMPLE = v;
}
detectExampleFromArgv();

const _nodeMajor = parseInt(String(process.versions.node || "0").split(".")[0], 10);
if (_nodeMajor < 14) {
  console.error(
    `[agentic-orchestration-web] Node.js 14+ is required (use 18+ LTS). Current: ${process.version}`,
  );
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, "public");

const TOOL_ROOT = path.resolve(
  process.env.AGENTIC_TOOL_ROOT || path.join(__dirname, "..", "agentic-orchestration-tool"),
);

/** Match `orchestration/example_overlays.py` (no manual .env paths for vertical roots). */
const EXAMPLE_VERTICAL_SUBDIR = {
  healthcare: "healthcare",
  logistics: "logistics",
};

function applyExampleOverlayFromEnv() {
  const ex = String(process.env.AGENTIC_EXAMPLE || "").trim().toLowerCase();
  const sub = EXAMPLE_VERTICAL_SUBDIR[ex];
  if (!sub) return;
  const root = path.join(TOOL_ROOT, "..", "examples", "verticals", sub);
  const ctx = path.join(root, "orchestrator-context.md");
  if (!fs.existsSync(ctx)) {
    console.warn(`[web] AGENTIC_EXAMPLE=${ex} but missing ${ctx}`);
    return;
  }
  process.env.AGENTIC_ORCHESTRATOR_CONTEXT_FILE = ctx;
  const sep = process.platform === "win32" ? ";" : ":";
  const agents = path.join(root, "agent_providers");
  const mcps = path.join(root, "mcp_providers");
  if (fs.existsSync(agents)) {
    const cur = String(process.env.AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS || "").trim();
    process.env.AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS = cur.includes(agents)
      ? cur
      : cur
        ? `${agents}${sep}${cur}`
        : agents;
  }
  if (fs.existsSync(mcps)) {
    const cur = String(process.env.AGENTIC_EXTRA_MCP_PROVIDERS_PATH || "").trim();
    process.env.AGENTIC_EXTRA_MCP_PROVIDERS_PATH = cur.includes(mcps)
      ? cur
      : cur
        ? `${mcps}${sep}${cur}`
        : mcps;
  }
  if (ex === "logistics") {
    const sim = path.join(root, "mcp_stubs", "wms_erp_sim_mcp.py");
    if (fs.existsSync(sim)) {
      process.env.AGENTIC_LOGISTICS_SIM_MCP_PY = path.resolve(sim);
    }
  } else {
    delete process.env.AGENTIC_LOGISTICS_SIM_MCP_PY;
  }
}
applyExampleOverlayFromEnv();

function resolvePythonExecutable() {
  const pyEnv = (process.env.AGENTIC_PYTHON || "").trim();
  if (pyEnv) {
    return pyEnv;
  }
  const winVenv = path.join(TOOL_ROOT, ".venv", "Scripts", "python.exe");
  const unixVenv = path.join(TOOL_ROOT, ".venv", "bin", "python");
  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(unixVenv)) return unixVenv;
  return "python";
}

const PYTHON = resolvePythonExecutable();
const HOST = process.env.AGENTIC_WEB_HOST || "127.0.0.1";
const PORT = Number(process.env.AGENTIC_WEB_PORT || "3847");
const AGENT_PROVIDERS_DIR = path.join(TOOL_ROOT, "config", "agent_providers");
const TOOL_REQUIREMENTS = path.join(TOOL_ROOT, "requirements.txt");

/** Identifies this process in /api/ping (proves curl hit this server after restart). */
const WEB_INSTANCE_ID = `${process.pid}-${Date.now().toString(36)}`;
let _pythonDepsChecked = false;
let _pythonDepsOk = true;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

function sendJson(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function _pythonCanImportDotenv() {
  const chk = spawnSync(PYTHON, ["-c", "import dotenv"], {
    cwd: TOOL_ROOT,
    env: { ...process.env, PYTHONUTF8: "1" },
    stdio: "pipe",
    encoding: "utf8",
    timeout: 20000,
  });
  return chk.status === 0;
}

function ensurePythonDepsForWebRuns(statusCb) {
  const emit = typeof statusCb === "function" ? statusCb : () => {};
  emit("Checking Python dependencies…");
  if (_pythonDepsChecked) return _pythonDepsOk;
  _pythonDepsChecked = true;

  if (_pythonCanImportDotenv()) {
    emit("Python dependencies already satisfied.");
    _pythonDepsOk = true;
    return true;
  }

  const autoInstall = String(process.env.AGENTIC_WEB_AUTO_INSTALL_REQUIREMENTS || "1")
    .trim()
    .toLowerCase();
  if (["0", "false", "no", "off"].includes(autoInstall)) {
    emit("Dependencies missing and auto-install is disabled.");
    _pythonDepsOk = false;
    return false;
  }
  if (!fs.existsSync(TOOL_REQUIREMENTS)) {
    emit("requirements.txt not found for dependency healing.");
    _pythonDepsOk = false;
    return false;
  }

  emit("Dependencies missing. Installing requirements…");
  console.error(
    `[agentic-orchestration-web] Python deps missing for ${PYTHON}; auto-installing from ${TOOL_REQUIREMENTS}`,
  );
  const install = spawnSync(PYTHON, ["-m", "pip", "install", "-r", TOOL_REQUIREMENTS], {
    cwd: TOOL_ROOT,
    env: { ...process.env, PYTHONUTF8: "1" },
    stdio: "pipe",
    encoding: "utf8",
    timeout: 240000,
  });
  if (install.status !== 0) {
    _pythonDepsOk = false;
    emit("Auto-install failed.");
    const err = String(install.stderr || install.stdout || "").trim();
    console.error("[agentic-orchestration-web] Auto-install failed:\n" + err);
    return false;
  }
  _pythonDepsOk = _pythonCanImportDotenv();
  if (_pythonDepsOk) {
    emit("Dependency healing complete.");
    console.error("[agentic-orchestration-web] Python dependencies ready.");
  } else {
    emit("Dependencies still missing after install.");
  }
  return _pythonDepsOk;
}

function appendPendingRating(event) {
  const dir = path.join(TOOL_ROOT, "__orchestrator_learning__");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "pending_ratings.jsonl");
    const payload = { ts: Date.now() / 1000, ...event };
    fs.appendFileSync(p, JSON.stringify(payload) + "\n", "utf8");
  } catch {
    // best-effort
  }
}

function parseAgentProviderYaml(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const out = { id: "", type: "", role: "", planner_hint: "", min_vram_gb: null };
    for (const line of lines) {
      const m = line.match(/^(id|type|role|planner_hint|min_vram_gb)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = (m[2] || "").trim();
      if (key === "min_vram_gb") {
        // Support inline comments: "min_vram_gb: 8  # comment"
        const base = val.split("#")[0].trim();
        const n = Number(base);
        out.min_vram_gb = Number.isFinite(n) ? n : null;
        continue;
      }
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    if (!out.id) return null;
    return out;
  } catch {
    return null;
  }
}

function loadAgentProvidersForUi() {
  if (!fs.existsSync(AGENT_PROVIDERS_DIR)) return [];
  const names = fs
    .readdirSync(AGENT_PROVIDERS_DIR)
    .filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))
    .filter((n) => !n.startsWith("_"))
    .sort((a, b) => a.localeCompare(b));
  const out = [];
  for (const n of names) {
    const item = parseAgentProviderYaml(path.join(AGENT_PROVIDERS_DIR, n));
    if (item) out.push(item);
  }
  return out;
}

function getRequestPathname(req) {
  /** Path only (no query). Supports absolute-form request-target (some proxies) via WHATWG URL. */
  const pathOnly = String(req.url || "/").split("?")[0].split("#")[0].trim() || "/";
  try {
    const u =
      pathOnly.startsWith("http://") || pathOnly.startsWith("https://")
        ? new URL(pathOnly)
        : new URL(pathOnly, "http://127.0.0.1");
    let p = u.pathname || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    let p = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
    p = p.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  }
}

function requestUrlHead(req) {
  return String(req.url || "").split("?")[0].split("#")[0];
}

/**
 * Match /api/agent-providers without relying on a single parsing strategy (proxies, absolute URI, casing).
 */
function isAgentProvidersApi(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  const slashNorm = (s) => s.replace(/\\/g, "/");
  const candidates = [head, decoded, slashNorm(head), slashNorm(decoded)];
  for (const c of candidates) {
    if (/\/api\/agent-providers\/?$/i.test(c)) return true;
  }
  const path = getRequestPathname(req);
  const pl = path.toLowerCase();
  if (pl === "/api/agent-providers" || pl.endsWith("/api/agent-providers")) return true;
  return false;
}

function isApiPing(req) {
  const head = requestUrlHead(req);
  const decoded = (() => {
    try {
      return decodeURIComponent(head);
    } catch {
      return head;
    }
  })();
  for (const c of [head, decoded]) {
    if (/\/api\/ping\/?$/i.test(c)) return true;
  }
  const pl = getRequestPathname(req).toLowerCase();
  return pl === "/api/ping" || pl.endsWith("/api/ping");
}

function sendAgentProvidersJson(res) {
  let data;
  try {
    data = loadAgentProvidersForUi();
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Agentic-AgentProviders": "1",
  });
  res.end(JSON.stringify({ providers: data }));
}

function handleHttp(req, res) {
  if (isApiPing(req)) {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "X-Agentic-Web": "1",
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "agentic-orchestration-web",
        pid: process.pid,
        instance: WEB_INSTANCE_ID,
      }),
    );
    return;
  }
  if (isAgentProvidersApi(req)) {
    sendAgentProvidersJson(res);
    return;
  }
  serveStatic(req, res);
}

function serveStatic(req, res) {
  const normalizedPath = getRequestPathname(req);
  let p = normalizedPath;
  if (p === "/") p = "/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_FILES = 8;

function safeUploadBasename(name) {
  const base = path.basename(String(name || "file").replace(/\\/g, "/"));
  const cleaned = base.replace(/[^\w.\-()+&@#$%[\]{} ]+/g, "_").trim();
  return cleaned.slice(0, 200) || "file.bin";
}

/**
 * Writes uploaded files under `<toolRoot>/_web_uploads/<uuid>/` and returns the manifest path
 * for `python main.py --dynamic-attachments`.
 */
function writeDynamicAttachmentManifest(toolRoot, files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const id = crypto.randomUUID();
  const dir = path.join(toolRoot, "_web_uploads", id);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = { files: [] };
  let total = 0;
  const n = Math.min(files.length, MAX_UPLOAD_FILES);
  for (let i = 0; i < n; i++) {
    const f = files[i];
    const b64 = typeof f.data === "string" ? f.data : f.base64;
    if (!b64 || typeof b64 !== "string") continue;
    let buf;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      continue;
    }
    if (buf.length > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large (max ${MAX_UPLOAD_BYTES} bytes each).`);
    }
    total += buf.length;
    if (total > MAX_UPLOAD_TOTAL_BYTES) {
      throw new Error(`Total upload too large (max ${MAX_UPLOAD_TOTAL_BYTES} bytes).`);
    }
    const name = safeUploadBasename(f.name);
    const dest = path.join(dir, `${i}_${name}`);
    fs.writeFileSync(dest, buf);
    manifest.files.push({
      path: dest,
      name,
      mime: typeof f.mime === "string" && f.mime.trim() ? f.mime.trim() : "application/octet-stream",
      size: buf.length,
    });
  }
  if (manifest.files.length === 0) return null;
  const manifestPath = path.join(dir, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return manifestPath;
}

function runDynamic(
  {
    text,
    runMode,
    iterativeRounds,
    autoIter,
    iterativeMaxRounds,
    noSynthesize,
    sessionId,
    resetSession,
    noVerify,
    verboseCrew,
    selectedAgentProviderIds,
    attachmentManifestPath,
  },
  ws,
) {
  sendJson(ws, { type: "preflight", status: "start", message: "Checking Python dependencies…" });
  if (!ensurePythonDepsForWebRuns((msg) => sendJson(ws, { type: "preflight", status: "progress", message: String(msg || "") }))) {
    sendJson(ws, { type: "preflight", status: "error", message: "Python dependency healing failed." });
    sendJson(ws, {
      type: "error",
      message:
        "Python dependencies are missing for the configured AGENTIC_PYTHON. Auto-install failed or is disabled. Activate/install the tool venv and restart web server.",
    });
    ws._busy = false;
    return;
  }
  sendJson(ws, { type: "preflight", status: "done", message: "Dependencies ready." });

  const mode = String(runMode || "dynamic").trim();
  const args = ["main.py"];
  const ex = String(process.env.AGENTIC_EXAMPLE || "").trim().toLowerCase();
  if (ex && Object.prototype.hasOwnProperty.call(EXAMPLE_VERTICAL_SUBDIR, ex)) {
    args.push("--example", ex);
  }
  if (mode === "dynamic-iterative") {
    args.push("--dynamic-iterative", text);
    if (autoIter) {
      args.push("--dynamic-iterative-auto");
      const maxRounds = Math.max(1, Math.min(32, Number(iterativeMaxRounds || 8)));
      args.push("--dynamic-iterative-max-rounds", String(maxRounds));
    } else {
      const rounds = Math.max(1, Math.min(32, Number(iterativeRounds || 4)));
      args.push("--dynamic-iterative-rounds", String(rounds));
    }
    if (noSynthesize) args.push("--dynamic-iterative-no-synthesize");
  } else {
    args.push("--dynamic", text);
  }
  args.push("--no-save");
  if (!verboseCrew) args.push("--quiet");
  if (noVerify !== false) args.push("--no-verify");
  const sess = sessionId && String(sessionId).trim();
  if (sess) {
    args.push("--orchestrator-session", sess);
    if (resetSession) args.push("--orchestrator-session-reset");
  }
  const selectedIds = Array.isArray(selectedAgentProviderIds)
    ? selectedAgentProviderIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (selectedIds.length > 0) {
    args.push("--dynamic-agent-provider-ids", selectedIds.join(","));
  }
  if (attachmentManifestPath) {
    args.push("--dynamic-attachments", attachmentManifestPath);
  }

  sendJson(ws, { type: "run_start", args });

  const env = { ...process.env };
  env.PYTHONUTF8 = "1";

  const proc = spawn(PYTHON, args, {
    cwd: TOOL_ROOT,
    env,
    shell: false,
  });

  if (proc.stdout) {
    proc.stdout.on("data", (chunk) => {
      sendJson(ws, { type: "chunk", stream: "stdout", text: chunk.toString("utf8") });
    });
  }
  if (proc.stderr) {
    proc.stderr.on("data", (chunk) => {
      sendJson(ws, { type: "chunk", stream: "stderr", text: chunk.toString("utf8") });
    });
  }
  proc.on("error", (err) => {
    sendJson(ws, { type: "error", message: err.message });
    ws._busy = false;
  });
  proc.on("close", (code, signal) => {
    sendJson(ws, {
      type: "run_end",
      code: typeof code === "number" ? code : 0,
      signal: signal || null,
    });
    ws._busy = false;
  });
}

const server = http.createServer(handleHttp);
const wss = new WebSocketServer({ server });

let _listenErrorLogged = false;
function logListenError(err) {
  if (_listenErrorLogged) return;
  _listenErrorLogged = true;
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `[agentic-orchestration-web] port ${PORT} is already in use on ${HOST}. Another process is bound to this port (often a leftover node server.mjs). Free it, then restart. Examples: ./stop-web-bg.sh  then  AGENTIC_WEB_KILL_PORT=1 ./stop-web-bg.sh  or  ss -tlnp | grep :${PORT}`,
    );
  } else {
    console.error("[agentic-orchestration-web] server error:", err);
  }
  process.exit(1);
}

server.on("error", logListenError);
wss.on("error", logListenError);

wss.on("connection", (ws) => {
  ws._busy = false;
  sendJson(ws, { type: "hello", toolRoot: TOOL_ROOT, python: PYTHON });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      sendJson(ws, { type: "error", message: "Invalid JSON message" });
      return;
    }
    if (msg.type === "ping") {
      sendJson(ws, { type: "pong" });
      return;
    }
    if (msg.type === "rate") {
      appendPendingRating({
        session_slug: msg.sessionId || "",
        provider_id: msg.providerId || "",
        mcp_fingerprint: msg.mcpFingerprint || "none",
        task_tag: msg.taskTag || "general",
        rating: msg.rating,
      });
      sendJson(ws, { type: "rated", ok: true });
      return;
    }
    if (msg.type !== "chat") {
      sendJson(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
      return;
    }
    if (ws._busy) {
      sendJson(ws, { type: "error", message: "A run is already in progress for this connection." });
      return;
    }
    const hasFiles = Array.isArray(msg.files) && msg.files.length > 0;
    let attachmentManifestPath = null;
    if (hasFiles) {
      try {
        attachmentManifestPath = writeDynamicAttachmentManifest(TOOL_ROOT, msg.files);
      } catch (err) {
        sendJson(ws, { type: "error", message: String(err && err.message ? err.message : err) });
        return;
      }
      if (!attachmentManifestPath) {
        sendJson(ws, { type: "error", message: "No valid file data in upload." });
        return;
      }
    }
    let text = (msg.text || "").trim();
    if (!text && attachmentManifestPath) {
      text =
        "Analyze the attached files and follow any instructions in their names or contents.";
    }
    if (!text) {
      sendJson(ws, { type: "error", message: "Empty message" });
      return;
    }
    ws._busy = true;
    runDynamic(
      {
        text,
        runMode: msg.runMode,
        iterativeRounds: msg.iterativeRounds,
        autoIter: Boolean(msg.autoIter),
        iterativeMaxRounds: msg.iterativeMaxRounds,
        noSynthesize: Boolean(msg.noSynthesize),
        sessionId: msg.sessionId,
        resetSession: Boolean(msg.resetSession),
        noVerify: msg.noVerify !== false,
        verboseCrew: Boolean(msg.verboseCrew),
        selectedAgentProviderIds: msg.selectedAgentProviderIds,
        attachmentManifestPath,
      },
      ws,
    );
  });
});

server.listen(PORT, HOST, () => {
  console.error(`agentic-orchestration-web http://${HOST}:${PORT}/`);
  console.error(`  instance=${WEB_INSTANCE_ID}  (curl /api/ping to verify this process)`);
  console.error(`  AGENTIC_TOOL_ROOT=${TOOL_ROOT}`);
  console.error(`  Python executable=${PYTHON}`);
  if (!(process.env.AGENTIC_PYTHON || "").trim()) {
    console.error(
      "  (set AGENTIC_PYTHON if this is wrong; install deps: pip install -r requirements.txt in AGENTIC_TOOL_ROOT)",
    );
  }
});

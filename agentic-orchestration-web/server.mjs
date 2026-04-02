/**
 * Static file + WebSocket server. Spawns Python main.py --dynamic for each chat message.
 * Bind to 127.0.0.1 by default; set AGENTIC_WEB_HOST=0.0.0.0 in .env for all interfaces.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
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

const PUBLIC_DIR = path.join(__dirname, "public");

const TOOL_ROOT = path.resolve(
  process.env.AGENTIC_TOOL_ROOT || path.join(__dirname, "..", "agentic-orchestration-tool"),
);

function resolvePythonExecutable() {
  if (process.env.AGENTIC_PYTHON?.trim()) {
    return process.env.AGENTIC_PYTHON.trim();
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

function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let p = url.pathname;
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
  },
  ws,
) {
  const mode = String(runMode || "dynamic").trim();
  const args = ["main.py"];
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

  sendJson(ws, { type: "run_start", args });

  const env = { ...process.env };
  env.PYTHONUTF8 = "1";

  const proc = spawn(PYTHON, args, {
    cwd: TOOL_ROOT,
    env,
    shell: false,
  });

  proc.stdout?.on("data", (chunk) => {
    sendJson(ws, { type: "chunk", stream: "stdout", text: chunk.toString("utf8") });
  });
  proc.stderr?.on("data", (chunk) => {
    sendJson(ws, { type: "chunk", stream: "stderr", text: chunk.toString("utf8") });
  });
  proc.on("error", (err) => {
    sendJson(ws, { type: "error", message: err.message });
    ws._busy = false;
  });
  proc.on("close", (code, signal) => {
    sendJson(ws, { type: "run_end", code: code ?? 0, signal: signal || null });
    ws._busy = false;
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server });

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
    if (msg.type !== "chat") {
      sendJson(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
      return;
    }
    if (ws._busy) {
      sendJson(ws, { type: "error", message: "A run is already in progress for this connection." });
      return;
    }
    const text = (msg.text || "").trim();
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
      },
      ws,
    );
  });
});

server.listen(PORT, HOST, () => {
  console.error(`agentic-orchestration-web http://${HOST}:${PORT}/`);
  console.error(`  AGENTIC_TOOL_ROOT=${TOOL_ROOT}`);
  console.error(`  Python executable=${PYTHON}`);
  if (!process.env.AGENTIC_PYTHON?.trim()) {
    console.error(
      "  (set AGENTIC_PYTHON if this is wrong; install deps: pip install -r requirements.txt in AGENTIC_TOOL_ROOT)",
    );
  }
});

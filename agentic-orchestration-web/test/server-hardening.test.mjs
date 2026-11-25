/**
 * End-to-end hardening tests: start the real server.mjs on a free loopback port with a throwaway
 * tool root and a stub "python" executable, then exercise the HTTP and WebSocket trust boundary.
 *
 * Covers: malformed-path and malformed-frame crashes, Host / Origin guards, the trusted-source
 * rule for the UI-token bootstrap routes, WebSocket subprotocol auth, admin message gating,
 * prompt argument injection, and child-process cleanup on disconnect.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// The stub interpreter relies on a `#!/usr/bin/env node` shebang.
const skip = process.platform === "win32" ? "POSIX shebang stub required" : false;

let server = null;
let serverLog = "";
let port = 0;
let tmpRoot = "";
let stubOut = "";

const STUB = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
if (args[0] === "-c") process.exit(0); // dependency probe: "import dotenv"
const i = args.indexOf("--");
const prompt = i >= 0 ? String(args[i + 1] || "") : "";
const out = process.env.STUB_OUT_DIR;
fs.writeFileSync(
  path.join(out, "run-" + (process.env.AGENTIC_RUN_ID || "x") + ".json"),
  JSON.stringify({ args, pid: process.pid }),
);
if (prompt === "sleep") {
  setInterval(() => {}, 1000);
} else if (prompt === "fail") {
  console.error("SECRET_STDERR_DETAIL /srv/private/path");
  process.exit(3);
} else {
  process.stdout.write("ARGS " + JSON.stringify(args) + "\\n");
}
`;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

/** Raw request so Host / Origin / forwarding headers can be set freely. */
function request(method, urlPath, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: urlPath,
        headers: {
          ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => {
          text += c;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* not json */
          }
          resolve({ status: res.statusCode, text, json, headers: res.headers });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function alive() {
  const r = await request("GET", "/api/ping");
  return r.status === 200 && r.json?.ok === true && r.json.pid === server.pid;
}

/**
 * Open a WebSocket, optionally send frames after `hello`, collect messages until `until`
 * matches (or the timeout), then close.
 */
function wsSession({ protocols, headers = {}, query = "", send = [], until = null, timeoutMs = 4000, keepOpen = false } = {}) {
  return new Promise((resolve) => {
    const messages = [];
    const sock = new WebSocket(`ws://127.0.0.1:${port}/${query}`, protocols, { headers });
    let settled = false;
    let timer = null;
    const finish = (extra) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (!keepOpen) {
        try {
          sock.terminate();
        } catch {
          /* ignore */
        }
      }
      resolve({ messages, sock, protocol: sock.protocol, ...extra });
    };
    timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);
    sock.on("unexpected-response", (_req, res) => finish({ httpStatus: res.statusCode }));
    sock.on("error", (err) => finish({ error: String(err.message || err) }));
    sock.on("close", (code) => finish({ closeCode: code }));
    sock.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      messages.push(msg);
      if (msg.type === "hello") {
        for (const frame of send) sock.send(typeof frame === "string" ? frame : JSON.stringify(frame));
        if (!send.length && !until) finish({});
      }
      if (until && until(msg, messages)) finish({});
    });
  });
}

async function waitFor(check, timeoutMs = 8000, stepMs = 50) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await check();
    if (v) return v;
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, stepMs));
  }
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

before(async () => {
  if (skip) return;
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ao-web-hardening-"));
  const toolRoot = path.join(tmpRoot, "tool");
  stubOut = path.join(tmpRoot, "stub-out");
  fs.mkdirSync(toolRoot, { recursive: true });
  fs.mkdirSync(stubOut, { recursive: true });
  const stub = path.join(tmpRoot, "python-stub");
  fs.writeFileSync(stub, STUB, { mode: 0o755 });
  port = await freePort();
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (k.startsWith("AGENTIC_")) delete env[k];
  }
  Object.assign(env, {
    AGENTIC_WEB_HOST: "127.0.0.1",
    AGENTIC_WEB_PORT: String(port),
    AGENTIC_TOOL_ROOT: toolRoot,
    AGENTIC_PYTHON: stub,
    AGENTIC_WEB_PLANNER_GREET: "0",
    STUB_OUT_DIR: stubOut,
  });
  server = spawn(process.execPath, ["server.mjs"], { cwd: webRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (c) => {
    serverLog += c;
  });
  server.stderr.on("data", (c) => {
    serverLog += c;
  });
  const up = await waitFor(async () => {
    try {
      return await alive();
    } catch {
      return false;
    }
  }, 15000, 100);
  assert.ok(up, `server did not start:\n${serverLog}`);
});

after(async () => {
  if (server && server.exitCode == null) {
    server.kill("SIGTERM");
    await new Promise((r) => {
      const t = setTimeout(() => {
        try {
          server.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        r();
      }, 3000);
      server.once("exit", () => {
        clearTimeout(t);
        r();
      });
    });
  }
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test("malformed admin paths get a 4xx and do not kill the server", { skip }, async () => {
  for (const p of [
    "/api/v1/admin/runs/%zz",
    "/api/v1/admin/tokens/%",
    "/api/v1/admin/traces/..%2F..%2F..%2Ftmp%2Fx",
    "/api/v1/admin/topology/node/%zz",
  ]) {
    const r = await request("GET", p);
    assert.equal(r.status, 400, p);
    assert.equal(r.json?.code, "invalid_path", p);
  }
  assert.equal(await alive(), true);
});

test("Host guard rejects DNS-rebinding host names on a loopback bind", { skip }, async () => {
  const bad = await request("GET", "/api/ping", { headers: { Host: "rebind.evil.example:3847" } });
  assert.equal(bad.status, 403);
  assert.equal(bad.json?.code, "host_not_allowed");
  const ok = await request("GET", "/api/ping", { headers: { Host: `localhost:${port}` } });
  assert.equal(ok.status, 200);
});

test("Origin guard: cross-site state-changing requests and WebSocket upgrades are refused", { skip }, async () => {
  const post = await request("POST", "/api/v1/admin/tokens", {
    headers: { Origin: "http://evil.example" },
    body: { appId: "evil" },
  });
  assert.equal(post.status, 403);
  assert.equal(post.json?.code, "origin_not_allowed");

  const evil = await wsSession({ headers: { Origin: "http://evil.example" } });
  assert.equal(evil.httpStatus, 403);
  assert.equal(evil.messages.length, 0);

  const local = await wsSession({ headers: { Origin: `http://localhost:${port}` } });
  assert.equal(local.messages[0]?.type, "hello");
  const noOrigin = await wsSession();
  assert.equal(noOrigin.messages[0]?.type, "hello");
});

test("bootstrap routes are only usable from a trusted source", { skip }, async () => {
  const viaProxy = { "X-Forwarded-For": "203.0.113.9" };
  const local = await request("GET", "/api/v1/admin/web-auth");
  assert.equal(local.status, 200);
  assert.equal(local.json.assigned, false);
  assert.equal(local.json.token, null);

  for (const [method, p, body] of [
    ["GET", "/api/v1/admin/web-auth", null],
    ["GET", "/api/v1/admin/meta", null],
    ["GET", "/api/v1/admin/tokens", null],
    ["POST", "/api/v1/admin/tokens", { appId: "ao-web" }],
  ]) {
    const r = await request(method, p, { headers: viaProxy, body });
    assert.equal(r.status, 403, `${method} ${p}`);
    assert.equal(r.json.error, "web_auth_untrusted_source", `${method} ${p}`);
    assert.equal(r.json.assigned, false);
    assert.equal(r.json.token, null);
    assert.match(r.json.hint, /AGENTIC_WEB_TRUSTED_PROXIES/);
  }
  // Nothing was minted by the refused POST.
  const tokens = await request("GET", "/api/v1/admin/tokens");
  assert.equal(tokens.status, 200);
  assert.deepEqual(tokens.json.tokens, []);
  // Unassigned chat is open by design and the reply carries no secret.
  const chat = await request("GET", "/api/v1/admin/chat-auth", { headers: viaProxy });
  assert.equal(chat.status, 200);
  assert.equal(chat.json.token, null);
});

test("malformed WebSocket frames are answered with an error, not a crash", { skip }, async () => {
  const frames = [
    "null",
    "[1,2]",
    "{not json",
    "5",
    { type: "chat", text: 123 },
    { type: "chat", text: { trim: 1 } },
    { type: "rate", attachmentFingerprint: 5, rating: 1 },
    { type: "topology_watch_subscribe", target: 7, id: {} },
    { type: "admin_feed_subscribe", topics: "nope" },
    { type: "no_such_type" },
    { type: "ping" },
  ];
  const s = await wsSession({ send: frames, until: (m) => m.type === "pong" });
  assert.ok(s.messages.some((m) => m.type === "pong"), JSON.stringify(s.messages));
  assert.ok(s.messages.filter((m) => m.type === "error").length >= 6);
  assert.equal(await alive(), true);
});

test("a protocol-level bad frame (unmasked) does not kill the server", { skip }, async () => {
  const sawUpgrade = await new Promise((resolve, reject) => {
    const sock = net.connect(port, "127.0.0.1", () => {
      sock.write(
        [
          "GET / HTTP/1.1",
          `Host: 127.0.0.1:${port}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
          "Sec-WebSocket-Version: 13",
          "",
          "",
        ].join("\r\n"),
      );
    });
    let upgraded = false;
    sock.on("data", (chunk) => {
      if (!upgraded && String(chunk).includes("101")) {
        upgraded = true;
        // Client frames MUST be masked; this one is not → ws emits 'error' on the server socket.
        sock.write(Buffer.from([0x81, 0x02, 0x68, 0x69]));
        setTimeout(() => {
          sock.destroy();
          resolve(true);
        }, 300);
      }
    });
    sock.on("error", reject);
    setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 2000);
  });
  assert.equal(sawUpgrade, true, "handshake did not complete");
  assert.equal(await alive(), true);
  assert.match(serverLog, /ws error/);
});

test("admin WebSocket message types need a trusted source before a token exists", { skip }, async () => {
  const trusted = await wsSession({
    send: [{ type: "admin_feed_subscribe", topics: ["fingerprint"] }],
    until: (m) => m.type === "admin_feed" || m.type === "error",
  });
  assert.equal(trusted.messages.at(-1)?.type, "admin_feed", JSON.stringify(trusted.messages.at(-1)));
  assert.ok(trusted.messages[0].toolRoot, "trusted hello carries the tool root");

  const viaProxy = await wsSession({
    headers: { "X-Forwarded-For": "203.0.113.9" },
    send: [
      { type: "admin_feed_subscribe", topics: ["runs", "traces", "access"] },
      { type: "admin_logs_subscribe" },
      { type: "topology_subscribe" },
      { type: "background_activity_cancel" },
      { type: "ping" },
    ],
    until: (m) => m.type === "pong",
  });
  const forbidden = viaProxy.messages.filter((m) => m.type === "error" && m.code === "forbidden");
  assert.equal(forbidden.length, 4, JSON.stringify(viaProxy.messages));
  assert.ok(!viaProxy.messages.some((m) => m.type === "admin_feed" || m.type === "admin_log"));
  // Server paths are not disclosed to anonymous remote clients.
  assert.equal(viaProxy.messages[0].type, "hello");
  assert.equal(viaProxy.messages[0].toolRoot, undefined);
  assert.equal(viaProxy.messages[0].python, undefined);
});

test("an option-looking chat prompt reaches the orchestrator as the prompt, not as a flag", { skip }, async () => {
  const prompt = "--execute-step=/tmp/planted-spec.json";
  const s = await wsSession({
    send: [{ type: "chat", text: prompt, sessionId: "../../etc/passwd" }],
    until: (m) => m.type === "run_end" || m.type === "error",
    timeoutMs: 15000,
  });
  const end = s.messages.find((m) => m.type === "run_end");
  assert.ok(end, JSON.stringify(s.messages));
  assert.equal(end.code, 0);
  const stdout = s.messages
    .filter((m) => m.type === "chunk" && m.stream === "stdout")
    .map((m) => m.text)
    .join("");
  const args = JSON.parse(stdout.replace(/^ARGS /, ""));
  const sep = args.indexOf("--");
  assert.ok(sep > 0);
  assert.deepEqual(args.slice(sep + 1), [prompt]);
  assert.ok(!args.slice(0, sep).some((a) => a.startsWith("--execute-step")));
  // The path-like client session id was dropped in favour of the server-generated one.
  const sess = args.find((a) => a.startsWith("--orchestrator-session="));
  assert.match(sess, /^--orchestrator-session=web-[0-9a-f]+$/);
});

test("non-string and oversized prompts are rejected cleanly", { skip }, async () => {
  const s = await wsSession({
    send: [
      { type: "chat", text: "a\u0000b ok" },
      { type: "ping" },
    ],
    until: (m) => m.type === "run_end",
    timeoutMs: 15000,
  });
  assert.equal(s.messages.find((m) => m.type === "run_end")?.code, 0, JSON.stringify(s.messages));

  const big = await wsSession({
    send: [{ type: "chat", text: "x".repeat(200_000) }],
    until: (m) => m.type === "error" || m.type === "run_end",
  });
  assert.equal(big.messages.at(-1)?.code, "prompt_too_large");
  assert.equal(await alive(), true);
});

test("closing the WebSocket stops the running orchestrator process", { skip }, async () => {
  const before = new Set(fs.readdirSync(stubOut));
  const s = await wsSession({
    send: [{ type: "chat", text: "sleep" }],
    until: (m) => m.type === "run_start",
    timeoutMs: 15000,
    keepOpen: true,
  });
  assert.ok(s.messages.some((m) => m.type === "run_start"), JSON.stringify(s.messages));
  const record = await waitFor(() => {
    const fresh = fs.readdirSync(stubOut).filter((n) => !before.has(n));
    if (!fresh.length) return null;
    try {
      return JSON.parse(fs.readFileSync(path.join(stubOut, fresh[0]), "utf8"));
    } catch {
      return null;
    }
  });
  assert.ok(record?.pid, "stub did not report its pid");
  assert.equal(pidAlive(record.pid), true);
  s.sock.close();
  const gone = await waitFor(() => !pidAlive(record.pid), 8000);
  assert.ok(gone, `orchestrator child ${record.pid} still running after disconnect`);
});

test("after assignment: token hand-out, WebSocket auth, and role gating", { skip }, async () => {
  const mint = async (appId, authToken) =>
    request("POST", "/api/v1/admin/tokens", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: { appId },
    });
  // Bootstrap mint from loopback (trusted) — the operator's first step.
  const web = await mint("ao-web");
  assert.equal(web.status, 201, web.text);
  const webToken = web.json.token;
  assert.match(webToken, /^ao_/);

  // Bootstrap is over: minting now needs the Admin token, even from loopback.
  assert.equal((await mint("someone")).status, 401);
  const chat = await mint("ao-chat", webToken);
  assert.equal(chat.status, 201, chat.text);
  const chatToken = chat.json.token;
  const api = await mint("home-assistant", webToken);
  assert.equal(api.status, 201, api.text);
  const apiToken = api.json.token;

  // Plaintext hand-out: trusted source only.
  const local = await request("GET", "/api/v1/admin/web-auth");
  assert.equal(local.status, 200);
  assert.equal(local.json.token, webToken);
  for (const p of ["/api/v1/admin/web-auth", "/api/v1/admin/chat-auth"]) {
    const remote = await request("GET", p, { headers: { "X-Forwarded-For": "203.0.113.9" } });
    assert.equal(remote.status, 403, p);
    assert.deepEqual(
      { assigned: remote.json.assigned, token: remote.json.token, error: remote.json.error },
      { assigned: true, token: null, error: "web_auth_untrusted_source" },
    );
    assert.ok(!remote.text.includes(webToken) && !remote.text.includes(chatToken));
  }
  // Admin routes need the bearer.
  assert.equal((await request("GET", "/api/v1/admin/config/effective")).status, 401);
  assert.equal(
    (await request("GET", "/api/v1/admin/meta", { headers: { Authorization: `Bearer ${webToken}` } })).status,
    200,
  );

  // UI tokens are not API keys.
  for (const ui of [webToken, chatToken]) {
    const r = await request("POST", "/api/v1/orchestrate", {
      headers: { Authorization: `Bearer ${ui}` },
      body: { text: "hello" },
    });
    assert.equal(r.status, 401);
  }
  const run = await request("POST", "/api/v1/orchestrate", {
    headers: { Authorization: `Bearer ${apiToken}` },
    body: { text: "--help", sessionId: "s1" },
  });
  assert.equal(run.status, 200, run.text);
  assert.equal(run.json.ok, true);
  assert.match(run.json.output, /"--","--help"\]/);

  // Failed runs do not echo child stderr to the client.
  const failed = await request("POST", "/api/v1/orchestrate", {
    headers: { Authorization: `Bearer ${apiToken}` },
    body: { text: "fail" },
  });
  assert.equal(failed.status, 500);
  assert.ok(!failed.text.includes("SECRET_STDERR_DETAIL"), failed.text);
  assert.ok(failed.json.runId);

  // WebSocket: no token → 4401.
  const anon = await wsSession({ until: () => false, timeoutMs: 3000 });
  assert.equal(anon.closeCode, 4401);

  // Subprotocol transport (preferred) and the legacy query parameter both authenticate.
  const viaProtocol = await wsSession({ protocols: ["ao-auth", `ao-bearer.${chatToken}`] });
  assert.equal(viaProtocol.messages[0]?.type, "hello");
  assert.equal(viaProtocol.protocol, "ao-auth");
  const legacy = await wsSession({ query: `?access_token=${encodeURIComponent(chatToken)}` });
  assert.equal(legacy.messages[0]?.type, "hello");
  const badToken = await wsSession({ protocols: ["ao-auth", "ao-bearer.ao_wrong"], until: () => false, timeoutMs: 3000 });
  assert.equal(badToken.closeCode, 4401);

  // Chat token: chat traffic yes, Admin feeds / logs / topology no.
  const chatWs = await wsSession({
    protocols: ["ao-auth", `ao-bearer.${chatToken}`],
    send: [
      { type: "admin_feed_subscribe", topics: ["runs", "traces", "access", "llm_usage"] },
      { type: "admin_logs_subscribe" },
      { type: "topology_watch_subscribe", target: "node", id: "engine" },
      { type: "ping" },
    ],
    until: (m) => m.type === "pong",
  });
  assert.equal(chatWs.messages.filter((m) => m.code === "forbidden").length, 3, JSON.stringify(chatWs.messages));
  assert.ok(!chatWs.messages.some((m) => String(m.type).startsWith("admin_") || String(m.type).startsWith("topology")));

  // Admin token: feeds are available.
  const adminWs = await wsSession({
    protocols: ["ao-auth", `ao-bearer.${webToken}`],
    send: [{ type: "admin_feed_subscribe", topics: ["fingerprint"] }],
    until: (m) => m.type === "admin_feed" || m.type === "error",
  });
  assert.equal(adminWs.messages.at(-1)?.type, "admin_feed", JSON.stringify(adminWs.messages.at(-1)));
  assert.equal(await alive(), true);
});

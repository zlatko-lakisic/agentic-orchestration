import "./ws-singleton.js";
import { closeActiveWebSocket, getActiveWebSocket, isActiveWebSocket } from "./ws-singleton.js";
import { initHostMetricsUi } from "./host-metrics-ui.js";
import { initPwaInstall } from "./install-prompt.js";
import {
  clearChatTranscript,
  getOrCreateBrowserSessionId,
  loadChatTranscript,
  saveChatTranscript,
  transcriptHasConversation,
} from "./chat-session.js";
import { isSimpleChatPrompt } from "./perf-options.js";
import { extractUserFacingStdout } from "./chat-output.js";
import { stripWrappingQuotes } from "./text-normalize.js";
import { sanitizeUserDisplayName } from "./user-context.js";
import { isWarpgateFronted } from "./proxy-context.js";
import { CrewLogSequenceDiagram } from "./crew-log-sequence.js";

let markdownLibPromise = null;

function loadMarkdownLibs() {
  if (!markdownLibPromise) {
    markdownLibPromise = Promise.all([
      import("/vendor/marked.esm.js"),
      import("/vendor/purify.es.mjs"),
    ]).then(([markedMod, purifyMod]) => {
      const { marked } = markedMod;
      const DOMPurify = purifyMod.default;
      marked.setOptions({ breaks: true, gfm: true });
      return { marked, DOMPurify };
    });
  }
  return markdownLibPromise;
}

async function renderMarkdownSafe(md) {
  try {
    const { marked, DOMPurify } = await loadMarkdownLibs();
    const raw = marked.parse(String(md ?? ""), { async: false });
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  } catch {
    return "";
  }
}

async function applyAssistantMarkdown(el, text) {
  if (!el) return;
  const html = await renderMarkdownSafe(text);
  if (!html.trim()) {
    applyAssistantPlain(el, text);
    return;
  }
  el.classList.add("msg-md");
  el.innerHTML = html;
}

function applyAssistantPlain(el, text) {
  if (!el) return;
  el.classList.remove("msg-md");
  el.textContent = text;
}

function jsonValueToProse(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? `- ${v}` : `- ${jsonValueToProse(v)}`))
      .join("\n");
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    const finalKeys = ["Final Answer", "final_answer", "answer", "response", "summary", "text"];
    for (const k of finalKeys) {
      if (typeof value[k] === "string" && value[k].trim()) {
        const main = value[k].trim();
        const rest = keys.filter((key) => key !== k && value[key] != null && value[key] !== "");
        if (!rest.length) return main;
        const extras = rest
          .map((key) => {
            const v = value[key];
            if (Array.isArray(v)) return `**${key}:**\n${v.map((x) => `- ${x}`).join("\n")}`;
            if (typeof v === "string") return `**${key}:** ${v}`;
            return `**${key}:** ${JSON.stringify(v)}`;
          })
          .join("\n\n");
        return `${main}\n\n${extras}`;
      }
    }
    return keys
      .map((k) => {
        const v = value[k];
        if (typeof v === "string") return `**${k}:** ${v}`;
        if (Array.isArray(v)) return `**${k}:**\n${v.map((x) => `- ${x}`).join("\n")}`;
        return `**${k}:** ${JSON.stringify(v)}`;
      })
      .join("\n\n");
  }
  return String(value);
}

function unwrapJsonLikeAssistantText(text) {
  let t = String(text ?? "").trim();
  if (!t) return t;

  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();

  if (!t.startsWith("{") && !t.startsWith("[")) return text;

  let parsed;
  try {
    parsed = JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return text;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return text;
    }
  }

  const prose = jsonValueToProse(parsed);
  return prose.trim() ? prose : text;
}

if (globalThis.__agenticOrchestratorUiInit) {
  console.warn("[agentic] duplicate app.js load ignored");
} else {
  globalThis.__agenticOrchestratorUiInit = true;

{
  const chat = document.getElementById("chat");
  const chatScroll = document.getElementById("chatScroll");
  const chatPinned = document.getElementById("chatPinned");
  const chatPinnedText = document.getElementById("chatPinnedText");
  const rail = document.getElementById("rail");
  const railToggle = document.getElementById("railToggle");
  const railContentMount = document.getElementById("railContentMount");
  const sheetMount = document.getElementById("sheetMount");
  const runSettings = document.getElementById("runSettings");
  const sheet = document.getElementById("sheet");
  const sheetScrim = document.getElementById("sheetScrim");
  const sheetOpen = document.getElementById("sheetOpen");
  const sheetClose = document.getElementById("sheetClose");
  const modePillLabel = document.getElementById("modePillLabel");
  const attachBtn = document.getElementById("attachBtn");
  const ricMode = document.getElementById("ricMode");
  const ricRounds = document.getElementById("ricRounds");
  const ricMax = document.getElementById("ricMax");
  const ricAuto = document.getElementById("ricAuto");
  const ricSession = document.getElementById("ricSession");
  const ricAdvanced = document.getElementById("ricAdvanced");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearBtn");
  const runModeEl = document.getElementById("runMode");
  const iterRoundsEl = document.getElementById("iterRounds");
  const autoIterEl = document.getElementById("autoIter");
  const iterMaxRoundsEl = document.getElementById("iterMaxRounds");
  const noSynthesizeEl = document.getElementById("noSynthesize");
  const sessionIdEl = document.getElementById("sessionId");
  const resetSessionEl = document.getElementById("resetSession");
  const resetSessionSimpleEl = document.getElementById("resetSessionSimple");
  const limitPlannerHistoryEl = document.getElementById("limitPlannerHistory");
  const skipFinalQaEl = document.getElementById("skipFinalQa");
  const skipLearningEvalEl = document.getElementById("skipLearningEval");
  const verboseCrewEl = document.getElementById("verboseCrew");
  const agentPickerSelectEl = document.getElementById("agentPickerSelect");
  const agentPickerAddBtn = document.getElementById("agentPickerAddBtn");
  const agentPickerClearBtn = document.getElementById("agentPickerClearBtn");
  const agentPickerChipsEl = document.getElementById("agentPickerChips");
  const connStatus = document.getElementById("connStatus");
  const activityBar = document.getElementById("activityBar");
  const activityLabel = document.getElementById("activityLabel");
  const crewLogPanel = document.getElementById("crewLogPanel");
  const crewLogText = document.getElementById("crewLogText");
  const crewLogDiagram = document.getElementById("crewLogDiagram");
  const crewLogTabDiagram = document.getElementById("crewLogTabDiagram");
  const crewLogTabText = document.getElementById("crewLogTabText");
  const crewLogSequence = new CrewLogSequenceDiagram(crewLogDiagram);
  const rateUpBtn = document.getElementById("rateUpBtn");
  const rateDownBtn = document.getElementById("rateDownBtn");
  const fileInputEl = document.getElementById("fileInput");

  let ws = null;
  let assistantBubble = null;
  let runActive = false;
  let stdoutBuf = "";
  let stderrBuf = "";
  let processingTimer = null;
  let statusHintTimer = null;
  let lastProgressText = "";
  let lastProgressPct = null;
  let lastRunRatingPayload = null;
  let availableAgentProviders = [];
  const selectedAgentProviderIds = new Set();

  let browserSessionId = getOrCreateBrowserSessionId();
  let chatTranscript = [];
  let chatRestoredFromStorage = false;
  let hadConnectedOnce = false;
  let sessionEstablished = false;
  let pendingReconnectNotice = false;
  let reconnectTimer = null;
  let reconnectDelayMs = 2000;
  let heartbeatTimer = null;
  let stableConnectionTimer = null;
  let intentionalDisconnect = false;
  let wsGeneration = 0;
  let connectPromise = null;

  function clearReconnectTimer() {
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function detachSocket(socket) {
    if (!socket) return;
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, "replaced");
      }
    } catch {
      /* ignore */
    }
  }

  function heartbeatIntervalMs() {
    return isWarpgateFronted() ? 4000 : 20000;
  }

  function setConnStatus(state, label) {
    if (!connStatus) return;
    connStatus.className = `status-pill ${state}`;
    const labelEl = connStatus.querySelector(".status-label");
    if (labelEl) labelEl.textContent = label;
    else connStatus.textContent = label;
  }

  async function ensureEdgeSessionReady() {
    if (!isWarpgateFronted()) return true;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const res = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
        if (res.ok) return true;
      } catch {
        /* retry */
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return false;
  }

  const PROCESSING_HINTS = [
    "Agents are working in the background…",
    "Planning and running tasks—this can take a minute…",
    "Still on it—almost ready with your answer…",
  ];
  const TYPING_DOTS = [".", "..", "..."];
  const PROGRESS_PREFIX = "(progress)";
  const ITER_ROUND_RE = /\(dynamic-iter\)\s+round\s+(\d+\/\d+)/i;
  const ITER_CONTROLLER_HEADER_RE =
    /\(dynamic-iter\)\s+controller\s+\(round\s+(\d+\/\d+)\):\s*done=(?:true|false)/i;
  const ITER_CONTROLLER_REASON_RE = /\(dynamic-iter\)\s+controller reason:\s*(.*)$/i;
  const ITER_CONTROLLER_CONTINUE_RE = /\(dynamic-iter\)\s+controller decision:\s*continue/i;
  const ITER_CONTROLLER_STOP_RE = /\(dynamic-iter\)\s+controller decision:\s*stop/i;

  let iterRoundLabel = "";
  let iterControllerReason = "";
  let crewLogLineBuf = "";

  function formatProgressLine(msg) {
    const raw = String(msg || "").trim();
    if (!raw) return null;
    // Expected percent shape (from iterative controller):
    // "~65% complete; estimated rounds remaining: ~2 (medium)"
    const m = raw.match(/~?\s*(\d{1,3})%\s*complete\s*[;:,-]?\s*(.*)$/i);
    let pct = null;
    let rest = raw;
    if (m) {
      pct = Number(m[1]);
      if (Number.isFinite(pct)) {
        pct = Math.max(0, Math.min(100, pct));
        lastProgressPct = pct;
      }
      rest = (m[2] || "").trim() || "Working…";
    } else {
      // No percent in this progress line (e.g. "starting …"). Carry forward.
      if (typeof lastProgressPct === "number") {
        pct = lastProgressPct;
      } else {
        pct = 0;
        lastProgressPct = 0;
      }
      rest = raw;
    }
    return `${pct}% - ${rest}`;
  }

  const RUN_RATING_META_PREFIX = "(agentic) run_rating_meta:";

  function applyRatingMetaFromText(text) {
    if (!text) return;
    const parts = String(text).split(/\r?\n/);
    for (const rawLine of parts) {
      const line = rawLine.trim();
      if (!line.includes(RUN_RATING_META_PREFIX)) continue;
      const jsonPart = line.slice(line.indexOf(RUN_RATING_META_PREFIX) + RUN_RATING_META_PREFIX.length).trim();
      if (!jsonPart) continue;
      try {
        const meta = JSON.parse(jsonPart);
        if (!lastRunRatingPayload) {
          lastRunRatingPayload = {
            sessionId: sessionId || "",
            providerId: "",
            attachmentFingerprint: "none",
            mcpFingerprint: "none",
            taskTag: "general",
          };
        }
        if (meta.provider_id) lastRunRatingPayload.providerId = String(meta.provider_id);
        if (meta.attachment_fingerprint) {
          const fp = String(meta.attachment_fingerprint);
          lastRunRatingPayload.attachmentFingerprint = fp;
          lastRunRatingPayload.mcpFingerprint = fp;
        }
      } catch {
        // ignore malformed meta lines
      }
    }
  }

  function applyProgressFromText(text) {
    if (!text || !activityLabel) return;
    // Update activity bar with the latest "(progress) ..." line.
    const parts = String(text).split(/\r?\n/);
    for (let i = parts.length - 1; i >= 0; i--) {
      const line = parts[i].trim();
      if (!line) continue;
      if (line.toLowerCase().startsWith(PROGRESS_PREFIX)) {
        const msg = line.slice(PROGRESS_PREFIX.length).trim();
        const formatted = formatProgressLine(msg);
        lastProgressText = formatted || msg;
        activityLabel.textContent = lastProgressText;
        if (chatPinnedText && !chatPinned?.hidden) {
          chatPinnedText.textContent = lastProgressText || "Working…";
        }
        return;
      }
    }
  }

  function setRunStatusText(text) {
    const msg = String(text || "").trim();
    if (!msg) return;
    if (activityLabel && !activityBar?.hidden) {
      activityLabel.textContent = msg;
    }
    if (chatPinnedText && !chatPinned?.hidden) {
      chatPinnedText.textContent = msg;
    }
  }

  function applyIterativeStatusFromText(text) {
    const parts = String(text || "").split(/\r?\n/);
    for (const rawLine of parts) {
      const line = rawLine.trim();
      if (!line) continue;

      const roundM = line.match(ITER_ROUND_RE);
      if (roundM) {
        iterRoundLabel = String(roundM[1] || "").trim();
        setRunStatusText(`Run in progress - round ${iterRoundLabel}`);
        continue;
      }

      const headM = line.match(ITER_CONTROLLER_HEADER_RE);
      if (headM) {
        iterRoundLabel = String(headM[1] || iterRoundLabel).trim();
        continue;
      }

      const reasonM = line.match(ITER_CONTROLLER_REASON_RE);
      if (reasonM) {
        iterControllerReason = String(reasonM[1] || "").trim();
        continue;
      }

      if (ITER_CONTROLLER_CONTINUE_RE.test(line)) {
        const reasonPart = iterControllerReason ? ` - reason: ${iterControllerReason}` : "";
        const roundPart = iterRoundLabel ? ` - round ${iterRoundLabel}` : "";
        setRunStatusText(`Run in progress${roundPart} - continuing to next iteration${reasonPart}`);
        continue;
      }

      if (ITER_CONTROLLER_STOP_RE.test(line)) {
        const reasonPart = iterControllerReason ? ` - reason: ${iterControllerReason}` : "";
        const roundPart = iterRoundLabel ? ` - round ${iterRoundLabel}` : "";
        setRunStatusText(`Run in progress${roundPart} - finalizing${reasonPart}`);
        continue;
      }

      if (
        line.toLowerCase().startsWith("(dynamic-iter) step:") &&
        iterRoundLabel
      ) {
        setRunStatusText(`Run in progress - round ${iterRoundLabel} - running current step`);
      }
    }
  }

  function syncCrewLogVisibility() {
    if (!crewLogPanel) return;
    const show = Boolean(verboseCrewEl?.checked);
    crewLogPanel.hidden = !show;
  }

  function setCrewLogTab(tab) {
    const isDiagram = tab !== "text";
    crewLogTabDiagram?.classList.toggle("is-active", isDiagram);
    crewLogTabText?.classList.toggle("is-active", !isDiagram);
    if (crewLogTabDiagram) crewLogTabDiagram.setAttribute("aria-selected", String(isDiagram));
    if (crewLogTabText) crewLogTabText.setAttribute("aria-selected", String(!isDiagram));
    if (crewLogDiagram) crewLogDiagram.hidden = !isDiagram;
    if (crewLogText) crewLogText.hidden = isDiagram;
  }

  function clearCrewLog() {
    crewLogLineBuf = "";
    if (crewLogText) crewLogText.textContent = "";
    crewLogSequence.clear();
  }

  function formatCrewLogTimestamp() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}] `;
  }

  function appendCrewLogLine(line) {
    crewLogSequence.appendLine(line);
    if (!crewLogText) return;
    crewLogText.textContent += formatCrewLogTimestamp() + line + "\n";
    crewLogText.scrollTop = crewLogText.scrollHeight;
  }

  function appendCrewLog(text) {
    if (!text) return;
    crewLogLineBuf += text;
    const parts = crewLogLineBuf.split(/\r?\n/);
    crewLogLineBuf = parts.pop() ?? "";
    for (const part of parts) {
      appendCrewLogLine(part);
    }
  }

  function flushCrewLogBuffer() {
    const rest = crewLogLineBuf;
    crewLogLineBuf = "";
    if (rest) appendCrewLogLine(rest);
  }

  function stopProcessingUi() {
    if (processingTimer != null) {
      clearInterval(processingTimer);
      processingTimer = null;
    }
    if (statusHintTimer != null) {
      clearInterval(statusHintTimer);
      statusHintTimer = null;
    }
    hideActivityBar();
    if (chatPinned) chatPinned.hidden = true;
  }

  function showActivityBar() {
    if (!activityBar || !activityLabel) return;
    activityBar.hidden = false;
    activityBar.setAttribute("aria-busy", "true");
    activityLabel.textContent = PROCESSING_HINTS[0];
  }

  function hideActivityBar() {
    if (!activityBar) return;
    activityBar.hidden = true;
    activityBar.setAttribute("aria-busy", "false");
  }

  function startProcessingUi(el) {
    stopProcessingUi();
    // Non-verbose: keep detailed progress only in the pinned top status line.
    hideActivityBar();
    if (!el) return;
    if (chatPinned) chatPinned.hidden = false;
    if (chatPinnedText) chatPinnedText.textContent = "Run in progress...";
    el.classList.add("processing", "typing");
    let dotIdx = 0;
    let hintIdx = 0;
    lastProgressText = "";
    lastProgressPct = 0;
    iterRoundLabel = "";
    iterControllerReason = "";
    el.textContent = TYPING_DOTS[0];
    processingTimer = setInterval(() => {
      dotIdx = (dotIdx + 1) % TYPING_DOTS.length;
      el.textContent = TYPING_DOTS[dotIdx];
    }, 550);

    // Independent, slow top status hints (does not refresh with dot animation).
    statusHintTimer = setInterval(() => {
      if (lastProgressText || !chatPinnedText) return;
      hintIdx = (hintIdx + 1) % PROCESSING_HINTS.length;
      chatPinnedText.textContent = `Run in progress... ${PROCESSING_HINTS[hintIdx]}`;
    }, 4200);
  }

  function applyUiDefaults(defaults) {
    if (!defaults || typeof defaults !== "object") return;
    if (runModeEl && defaults.runMode) {
      runModeEl.value = defaults.runMode === "dynamic-iterative" ? "dynamic-iterative" : "dynamic";
    }
    if (autoIterEl && typeof defaults.autoIter === "boolean") {
      autoIterEl.checked = defaults.autoIter;
    }
    if (iterRoundsEl && defaults.iterativeRounds != null) {
      iterRoundsEl.value = String(defaults.iterativeRounds);
    }
    if (iterMaxRoundsEl && defaults.iterativeMaxRounds != null) {
      iterMaxRoundsEl.value = String(defaults.iterativeMaxRounds);
    }
    if (resetSessionSimpleEl && typeof defaults.resetSessionSimple === "boolean") {
      resetSessionSimpleEl.checked = defaults.resetSessionSimple;
    }
    if (limitPlannerHistoryEl && typeof defaults.limitPlannerHistory === "boolean") {
      limitPlannerHistoryEl.checked = defaults.limitPlannerHistory;
    }
    if (skipFinalQaEl && typeof defaults.skipFinalQa === "boolean") {
      skipFinalQaEl.checked = defaults.skipFinalQa;
    }
    if (skipLearningEvalEl && typeof defaults.skipLearningEval === "boolean") {
      skipLearningEvalEl.checked = defaults.skipLearningEval;
    }
    syncIterativeUi();
  }

  function proto() {
    return window.location.protocol === "https:" ? "wss:" : "ws:";
  }

  let welcomeBubble = null;
  let sessionUserName = null;

  function applySessionUserName(raw) {
    const name = sanitizeUserDisplayName(raw);
    if (name) sessionUserName = name;
    return sessionUserName;
  }

  function normalizeAssistantText(text) {
    return stripWrappingQuotes(unwrapJsonLikeAssistantText(extractUserFacingStdout(text)));
  }

  async function loadSessionUserName() {
    try {
      const res = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return applySessionUserName(data.userName);
    } catch {
      return null;
    }
  }

  function persistTranscript() {
    saveChatTranscript(browserSessionId, chatTranscript);
  }

  function recordTranscriptEntry(entry) {
    chatTranscript.push(entry);
    persistTranscript();
  }

  async function restoreChatFromTranscript() {
    for (const entry of chatTranscript) {
      const kind = String(entry.kind || "meta");
      const text = String(entry.text || "");
      if (!text) continue;
      if (kind === "meta") {
        appendMeta(text, { persist: false });
        continue;
      }
      if (kind === "error") {
        const el = appendBubble("error", text, { persist: false });
        if (entry.extraClasses?.length) el?.classList.add(...entry.extraClasses);
        continue;
      }
      const el = appendBubble(kind, text, { persist: false });
      if (!el) continue;
      if (entry.markdown) {
        try {
          await applyAssistantMarkdown(el, text);
        } catch {
          applyAssistantPlain(el, text);
        }
      }
      if (entry.extraClasses?.length) el.classList.add(...entry.extraClasses);
    }
  }

  function sendClientHello() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const resume =
      sessionEstablished ||
      chatRestoredFromStorage ||
      chatHasUserOrAssistantMessages();
    const sessionId = sessionIdEl?.value?.trim() || browserSessionId;
    ws.send(
      JSON.stringify({
        type: "client_hello",
        resume,
        sessionId,
      }),
    );
    sessionEstablished = true;
  }

  function stopHeartbeat() {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function sendHeartbeat() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "ping" }));
    } catch {
      /* ignore */
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    sendHeartbeat();
    heartbeatTimer = window.setInterval(sendHeartbeat, heartbeatIntervalMs());
  }

  function scheduleReconnect() {
    if (reconnectTimer != null) return;
    if (connectPromise) return;
    if (document.visibilityState === "hidden") return;
    const active = getActiveWebSocket();
    if (active && (active.readyState === WebSocket.OPEN || active.readyState === WebSocket.CONNECTING)) {
      ws = active;
      return;
    }
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      ensureConnected();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(Math.round(reconnectDelayMs * 1.5), 30000);
  }

  async function ensureConnected() {
    const active = getActiveWebSocket();
    if (active && (active.readyState === WebSocket.OPEN || active.readyState === WebSocket.CONNECTING)) {
      ws = active;
      return;
    }
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
      const sessionReady = await ensureEdgeSessionReady();
      if (!sessionReady) {
        setConnStatus("disconnected", "Login required");
        appendMeta("Could not verify Warpgate session. Refresh after signing in.");
        return;
      }
      await loadSessionUserName();

      const live = getActiveWebSocket();
      if (live && (live.readyState === WebSocket.OPEN || live.readyState === WebSocket.CONNECTING)) {
        ws = live;
        return;
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      clearReconnectTimer();
      const gen = ++wsGeneration;
      intentionalDisconnect = false;
      closeActiveWebSocket();
      detachSocket(ws);
      ws = null;
      stopHeartbeat();
      if (stableConnectionTimer != null) {
        window.clearTimeout(stableConnectionTimer);
        stableConnectionTimer = null;
      }
      welcomeBubble = null;
      setConnStatus("reconnecting", hadConnectedOnce ? "Reconnecting…" : "Connecting…");

      const url = `${proto()}//${window.location.host}`;
      const socket = new WebSocket(url);
      ws = socket;

      socket.onopen = () => {
        if (gen !== wsGeneration || !isActiveWebSocket(socket)) return;
        reconnectDelayMs = 2000;
        clearReconnectTimer();
        setConnStatus("connected", "Connected");
        sendBtn.disabled = runActive;
        sendClientHello();
        startHeartbeat();
        hadConnectedOnce = true;
        stableConnectionTimer = window.setTimeout(() => {
          reconnectDelayMs = 2000;
        }, 8000);
      };

      socket.onclose = () => {
        if (gen !== wsGeneration) return;
        ws = null;
        stopHeartbeat();
        if (stableConnectionTimer != null) {
          window.clearTimeout(stableConnectionTimer);
          stableConnectionTimer = null;
        }
        stopProcessingUi();
        welcomeBubble = null;
        assistantBubble = null;
        sendBtn.disabled = true;
        if (runActive) {
          runActive = false;
          appendMeta("Connection lost. Your orchestrator session is unchanged — resend if the last reply is missing.");
        }
        if (intentionalDisconnect) {
          setConnStatus("disconnected", "Disconnected");
          return;
        }
        if (hadConnectedOnce) pendingReconnectNotice = true;
        setConnStatus("reconnecting", "Reconnecting…");
        scheduleReconnect();
      };

      socket.onerror = () => {
        /* onclose handles reconnect */
      };

      attachSocketMessageHandler(socket, gen);
    })().finally(() => {
      connectPromise = null;
    });

    return connectPromise;
  }

  function attachSocketMessageHandler(socket, gen) {
    socket.onmessage = async (ev) => {
      if (gen !== wsGeneration || !isActiveWebSocket(socket)) return;
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        appendBubble("assistant", ev.data);
        return;
      }

      if (data.type === "hello") {
        applyUiDefaults(data.uiDefaults);
        applySessionUserName(data.userName);
        if (!data.plannerGreet) {
          showWelcomeMessage(stripWrappingQuotes(data.welcomeMessage));
        }
        if (pendingReconnectNotice) {
          appendMeta("Reconnected.");
          pendingReconnectNotice = false;
        } else if (!chatHasUserOrAssistantMessages()) {
          const er = data.edgeRuntime;
          const edgeMeta = er
            ? `Edge ${er.platform}${er.ollamaRuntime ? ` · Ollama ${er.ollamaRuntime}` : ""}`
            : "";
          appendMeta(
            [`Tool: ${data.toolRoot} · ${data.python}`, edgeMeta].filter(Boolean).join(" · "),
          );
        }
        return;
      }
      if (data.type === "pong") {
        return;
      }
      if (data.type === "welcome_start") {
        if (!chatHasUserOrAssistantMessages()) {
          welcomeBubble = appendBubble("assistant", "");
          if (welcomeBubble) {
            welcomeBubble.classList.add("welcome", "processing", "typing");
            welcomeBubble.textContent = "…";
          }
        }
        return;
      }
      if (data.type === "welcome_message") {
        const msg = stripWrappingQuotes(String(data.text || "").trim());
        if (!msg) return;
        if (!welcomeBubble && chatHasUserOrAssistantMessages()) return;
        if (welcomeBubble) {
          welcomeBubble.classList.remove("processing", "typing");
          applyAssistantPlain(welcomeBubble, msg);
          welcomeBubble.classList.add("welcome");
        } else {
          showWelcomeMessage(msg);
        }
        welcomeBubble = null;
        return;
      }
      if (data.type === "welcome_error") {
        if (welcomeBubble) {
          welcomeBubble.remove();
          welcomeBubble = null;
        }
        return;
      }
      if (data.type === "preflight") {
        const msg = String(data.message || "").trim();
        const st = String(data.status || "").trim().toLowerCase();
        if (st === "start" || st === "progress") {
          showActivityBar();
          if (activityLabel) activityLabel.textContent = msg || "Preparing run…";
        } else if (st === "done") {
          if (activityLabel) activityLabel.textContent = msg || "Dependencies ready.";
        } else if (st === "error") {
          if (activityLabel) activityLabel.textContent = msg || "Dependency healing failed.";
        }
        return;
      }
      if (data.type === "run_start") {
        stdoutBuf = "";
        stderrBuf = "";
        clearCrewLog();
        syncCrewLogVisibility();
        assistantBubble = appendBubble("assistant", "");
        startProcessingUi(assistantBubble);
        iterRoundLabel = "";
        iterControllerReason = "";
        runActive = true;
        sendBtn.disabled = true;
        if (rateUpBtn) rateUpBtn.disabled = true;
        if (rateDownBtn) rateDownBtn.disabled = true;
        lastRunRatingPayload = null;
        return;
      }
      if (data.type === "chunk") {
        const line = data.text || "";
        applyIterativeStatusFromText(line);
        if (!assistantBubble) assistantBubble = appendBubble("assistant", "");
        if (data.stream === "stdout") {
          stdoutBuf += line;
          applyProgressFromText(line);
        } else {
          stderrBuf += line;
          appendCrewLog(line);
          applyProgressFromText(line);
          applyRatingMetaFromText(line);
        }
        if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
        return;
      }
      if (data.type === "error") {
        flushCrewLogBuffer();
        stopProcessingUi();
        if (assistantBubble) {
          assistantBubble.classList.remove("processing", "typing");
        }
        appendBubble("error", data.message || "Error");
        runActive = false;
        sendBtn.disabled = false;
        return;
      }
      if (data.type === "run_end") {
        flushCrewLogBuffer();
        stopProcessingUi();
        if (assistantBubble) {
          assistantBubble.classList.remove("processing", "typing");
        }
        if (assistantBubble) {
          const rawOut = normalizeAssistantText(stdoutBuf.trim());
          const out = rawOut;
          const err = stderrBuf.trim();
          const failed = data.code !== 0;
          let usedMarkdown = false;
          if (failed && err && !out) {
            applyAssistantPlain(assistantBubble, err);
            assistantBubble.classList.add("run-failed");
            assistantBubble.classList.remove("stderr");
          } else if (out) {
            try {
              await applyAssistantMarkdown(assistantBubble, out);
              usedMarkdown = true;
            } catch {
              applyAssistantPlain(assistantBubble, out);
            }
            assistantBubble.classList.toggle("run-failed", failed);
            assistantBubble.classList.remove("stderr");
          } else if (failed) {
            applyAssistantPlain(
              assistantBubble,
              err ||
                "Something went wrong (no details on stdout). Check the crew log or server terminal.",
            );
            assistantBubble.classList.add("run-failed");
            assistantBubble.classList.remove("stderr");
          } else {
            applyAssistantPlain(assistantBubble, "(No output)");
            assistantBubble.classList.remove("run-failed", "stderr");
          }
          const extraClasses = [];
          if (assistantBubble.classList.contains("run-failed")) extraClasses.push("run-failed");
          if (assistantBubble.classList.contains("stderr")) extraClasses.push("stderr");
          recordTranscriptEntry({
            kind: "assistant",
            text: assistantBubble.textContent || out || err || "(No output)",
            markdown: usedMarkdown,
            extraClasses,
          });
        }
        assistantBubble = null;
        runActive = false;
        sendBtn.disabled = false;
        if (rateUpBtn) rateUpBtn.disabled = !lastRunRatingPayload;
        if (rateDownBtn) rateDownBtn.disabled = !lastRunRatingPayload;
        return;
      }
    };
  }

  function setRailCollapsed(collapsed) {
    if (!rail) return;
    const want = Boolean(collapsed);
    rail.classList.toggle("collapsed", want);
    const icons = document.getElementById("railIcons");
    if (icons) icons.setAttribute("aria-hidden", want ? "false" : "true");
    if (railToggle) {
      railToggle.setAttribute("aria-expanded", want ? "false" : "true");
      railToggle.title = want ? "Expand settings rail" : "Collapse settings rail";
    }
    try {
      localStorage.setItem("agentic.rail.collapsed", want ? "1" : "0");
    } catch {
      // ignore
    }
    if (!want && input) {
      try {
        input.focus();
      } catch {
        // ignore
      }
    }
  }

  function initRailCollapse() {
    if (!rail || !railToggle) return;
    let collapsed = false;
    try {
      collapsed =
        localStorage.getItem("agentic.rail.collapsed") === "1" ||
        localStorage.getItem("agentic.toolbar.collapsed") === "1";
    } catch {
      collapsed = false;
    }
    setRailCollapsed(collapsed);
    railToggle.addEventListener("click", () => {
      setRailCollapsed(!rail.classList.contains("collapsed"));
    });
    for (const btn of [ricMode, ricRounds, ricMax, ricAuto, ricSession, ricAdvanced]) {
      btn?.addEventListener("click", () => setRailCollapsed(false));
    }
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function relocateRunSettings() {
    if (!runSettings) return;
    runSettings.hidden = false;
    const mobile = isMobileLayout();
    const target = mobile ? sheetMount : railContentMount;
    if (!target || runSettings.parentElement === target) return;
    target.appendChild(runSettings);
  }

  function openMobileSheet() {
    if (!sheet || !sheetScrim) return;
    relocateRunSettings();
    sheetScrim.hidden = false;
    sheetScrim.classList.add("open");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeMobileSheet() {
    if (!sheet || !sheetScrim) return;
    sheet.classList.remove("open");
    sheetScrim.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!sheet.classList.contains("open")) sheetScrim.hidden = true;
    }, 260);
  }

  function initMobileSheet() {
    // Settings panel is moved between rail mount (desktop) and sheet mount (mobile)
    // instead of duplicating markup — closest equivalent to mockup's shared form.
    sheetOpen?.addEventListener("click", openMobileSheet);
    sheetClose?.addEventListener("click", closeMobileSheet);
    sheetScrim?.addEventListener("click", closeMobileSheet);
    window.addEventListener("resize", () => {
      relocateRunSettings();
      if (!isMobileLayout()) closeMobileSheet();
    });
    relocateRunSettings();
  }

  function syncModePill() {
    if (!modePillLabel || !runModeEl) return;
    const v = runModeEl.value === "dynamic-iterative" ? "Dynamic (iterative)" : "Dynamic";
    modePillLabel.textContent = v;
    if (ricMode) {
      ricMode.title = `Mode: ${v}`;
      ricMode.classList.toggle("on", runModeEl.value === "dynamic-iterative");
    }
  }

  function syncRailIcons() {
    if (ricRounds && iterRoundsEl) {
      ricRounds.textContent = iterRoundsEl.value || "—";
      ricRounds.title = `Iterative rounds: ${iterRoundsEl.value}`;
    }
    if (ricMax && iterMaxRoundsEl) {
      ricMax.textContent = iterMaxRoundsEl.value || "—";
      ricMax.title = `Max rounds: ${iterMaxRoundsEl.value}`;
    }
    if (ricAuto && autoIterEl) {
      ricAuto.classList.toggle("on", autoIterEl.checked);
      ricAuto.title = `Auto-adjust iterations: ${autoIterEl.checked ? "on" : "off"}`;
    }
    const sess = sessionIdEl?.value?.trim() || "default";
    if (ricSession) ricSession.title = `Session: ${sess}`;
  }

  function initComposerGrow() {
    if (!input) return;
    const resize = () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    };
    input.addEventListener("input", resize);
    resize();
  }

  function chipLabelForProvider(p) {
    const pid = String(p.id || "").trim();
    const typ = String(p.type || "").trim();
    const role = String(p.role || "").trim();
    const minVram = Number(p.min_vram_gb);
    let mem = "VRAM n/a";
    if (Number.isFinite(minVram)) {
      if (minVram <= 0) mem = "cloud/no local VRAM";
      else mem = `VRAM >= ${minVram} GB`;
    }
    if (typ && role) return `${pid} (${typ} · ${role} · ${mem})`;
    if (typ) return `${pid} (${typ} · ${mem})`;
    if (role) return `${pid} (${role} · ${mem})`;
    if (mem) return `${pid} (${mem})`;
    return pid;
  }

  function providerById(pid) {
    return availableAgentProviders.find((p) => String(p.id || "").trim() === String(pid || "").trim()) || null;
  }

  function renderAgentProviderOptions() {
    if (!agentPickerSelectEl) return;
    const selectedNow = agentPickerSelectEl.value;
    agentPickerSelectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select agent provider to add…";
    agentPickerSelectEl.appendChild(placeholder);
    const grouped = new Map();
    for (const p of availableAgentProviders) {
      const pid = String(p.id || "").trim();
      if (!pid || selectedAgentProviderIds.has(pid)) continue;
      const typ = String(p.type || "").trim().toLowerCase() || "other";
      if (!grouped.has(typ)) grouped.set(typ, []);
      grouped.get(typ).push(p);
    }
    const order = ["ollama", "openai", "anthropic", "huggingface", "vllm", "jetstream", "crewai", "other"];
    const keys = Array.from(grouped.keys()).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    for (const key of keys) {
      const grp = document.createElement("optgroup");
      grp.label = key.toUpperCase();
      const rows = grouped.get(key) || [];
      rows.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));
      for (const p of rows) {
        const pid = String(p.id || "").trim();
        const opt = document.createElement("option");
        opt.value = pid;
        opt.textContent = chipLabelForProvider(p);
        grp.appendChild(opt);
      }
      agentPickerSelectEl.appendChild(grp);
    }
    if (selectedNow && agentPickerSelectEl.querySelector(`option[value="${CSS.escape(selectedNow)}"]`)) {
      agentPickerSelectEl.value = selectedNow;
    } else {
      agentPickerSelectEl.value = "";
    }
  }

  function renderAgentProviderChips() {
    if (!agentPickerChipsEl) return;
    agentPickerChipsEl.innerHTML = "";
    for (const pid of Array.from(selectedAgentProviderIds).sort()) {
      const p = providerById(pid) || { id: pid };
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.dataset.id = pid;

      const label = document.createElement("span");
      label.textContent = chipLabelForProvider(p);
      chip.appendChild(label);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-remove";
      btn.textContent = "×";
      btn.title = `Remove ${pid}`;
      btn.addEventListener("click", () => {
        selectedAgentProviderIds.delete(pid);
        renderAgentProviderChips();
        renderAgentProviderOptions();
      });
      chip.appendChild(btn);

      agentPickerChipsEl.appendChild(chip);
    }
  }

  async function loadAgentProviderCatalog() {
    if (!agentPickerSelectEl) return;
    try {
      // Try relative path first (works behind reverse-proxy subpaths), then absolute fallback.
      let res = await fetch("api/agent-providers", { cache: "no-store" });
      if (!res.ok && res.status === 404) {
        res = await fetch("/api/agent-providers", { cache: "no-store" });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const list = Array.isArray(payload?.providers) ? payload.providers : [];
      availableAgentProviders = list
        .map((p) => ({
          id: String(p?.id || "").trim(),
          type: String(p?.type || "").trim(),
          role: String(p?.role || "").trim(),
          planner_hint: String(p?.planner_hint || "").trim(),
          min_vram_gb: Number.isFinite(Number(p?.min_vram_gb)) ? Number(p.min_vram_gb) : null,
        }))
        .filter((p) => p.id)
        .sort((a, b) => a.id.localeCompare(b.id));
      renderAgentProviderOptions();
      renderAgentProviderChips();
    } catch (err) {
      appendMeta(`Agent picker unavailable: ${String(err?.message || err)}`);
    }
  }

  function chatHasUserOrAssistantMessages() {
    const root = chatScroll || chat;
    if (!root) return false;
    if (root.querySelector(".msg.user")) return true;
    return Boolean(root.querySelector(".msg.assistant:not(.welcome)"));
  }

  function showWelcomeMessage(text) {
    const msg = String(text || "").trim();
    if (!msg || chatHasUserOrAssistantMessages()) return;
    const el = appendBubble("assistant", msg);
    if (el) el.classList.add("welcome");
  }

  function appendBubble(kind, text, opts = {}) {
    const el = document.createElement("div");
    el.className = `msg ${kind}`;
    el.textContent = text;
    (chatScroll || chat).appendChild(el);
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
    if (opts.persist !== false) {
      recordTranscriptEntry({ kind, text: String(text || "") });
    }
    return el;
  }

  function appendMeta(text, opts = {}) {
    const el = document.createElement("div");
    const t = String(text || "");
    el.className = t.startsWith("Tool:") ? "msg meta tool-chip-line" : "msg meta";
    el.textContent = text;
    (chatScroll || chat).appendChild(el);
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
    if (opts.persist !== false) {
      recordTranscriptEntry({ kind: "meta", text: t });
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const d = String(r.result || "");
        const i = d.indexOf("base64,");
        resolve(i >= 0 ? d.slice(i + 7) : "");
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function buildFilesPayload(fileList) {
    const out = [];
    const files = Array.from(fileList || []);
    for (const file of files) {
      const data = await fileToBase64(file);
      if (!data) continue;
      out.push({
        name: file.name || "file",
        mime: file.type || "application/octet-stream",
        data,
      });
    }
    return out;
  }

  async function sendChat() {
    const text = input.value.trim();
    const hasFiles = Boolean(fileInputEl && fileInputEl.files && fileInputEl.files.length > 0);
    if ((!text && !hasFiles) || !ws || ws.readyState !== WebSocket.OPEN || runActive) return;

    const modeRaw = (runModeEl?.value || "dynamic").trim();
    const runMode =
      modeRaw === "dynamic-iterative" ? "dynamic-iterative" : "dynamic";

    let iterRounds = 4;
    if (iterRoundsEl) {
      const parsed = Number(iterRoundsEl.value);
      if (Number.isFinite(parsed)) iterRounds = Math.max(1, Math.min(32, parsed));
    }
    const autoIter = Boolean(autoIterEl?.checked);
    let iterMaxRounds = 8;
    if (iterMaxRoundsEl) {
      const parsed = Number(iterMaxRoundsEl.value);
      if (Number.isFinite(parsed)) iterMaxRounds = Math.max(1, Math.min(32, parsed));
    }

    const sessionRaw = sessionIdEl.value.trim();
    const sessionId = sessionRaw || undefined;

    function inferTaskTag(t) {
      const s = String(t || "").toLowerCase();
      if (s.includes("home assistant") || s.includes("hass") || s.includes("automation")) return "home_assistant";
      if (s.includes("mirrord") || s.includes("kubernetes") || s.includes("k8s")) return "devops";
      if (s.includes("error") || s.includes("traceback") || s.includes("exception")) return "debug";
      if (s.includes("refactor") || s.includes("implement") || s.includes("write code")) return "build";
      if (s.includes("research") || s.includes("compare") || s.includes("explain")) return "research";
      return "general";
    }

    let filesPayload = [];
    if (hasFiles) {
      try {
        filesPayload = await buildFilesPayload(fileInputEl.files);
      } catch (err) {
        appendMeta(`Could not read attachments: ${String(err?.message || err)}`);
        return;
      }
    }

    const userBubbleText = [text, filesPayload.length ? `[${filesPayload.length} attached file(s)]` : ""]
      .filter(Boolean)
      .join("\n");
    appendBubble("user", userBubbleText || `[${filesPayload.length} attached file(s)]`);
    input.value = "";
    if (fileInputEl) fileInputEl.value = "";

    const payload = {
      type: "chat",
      text,
      runMode,
      iterativeRounds: iterRounds,
      autoIter,
      iterativeMaxRounds: iterMaxRounds,
      noSynthesize: Boolean(noSynthesizeEl?.checked),
      sessionId,
      noVerify: true,
      verboseCrew: true,
      selectedAgentProviderIds: Array.from(selectedAgentProviderIds),
      files: filesPayload,
      resetSessionSimple: Boolean(resetSessionSimpleEl?.checked),
      limitPlannerHistory: Boolean(limitPlannerHistoryEl?.checked),
      skipFinalQa: Boolean(skipFinalQaEl?.checked),
      skipLearningEval: Boolean(skipLearningEvalEl?.checked),
    };
    const shouldResetSession =
      Boolean(resetSessionEl?.checked) ||
      (Boolean(resetSessionSimpleEl?.checked) && !hasFiles && isSimpleChatPrompt(text));
    if (shouldResetSession) payload.resetSession = true;
    if (sessionUserName) payload.userName = sessionUserName;
    ws.send(JSON.stringify(payload));
    resetSessionEl.checked = false;
    // Prepare rating envelope; provider/attachment fp filled from Python stderr meta.
    lastRunRatingPayload = {
      sessionId: sessionId || "",
      providerId: "",
      attachmentFingerprint: "none",
      mcpFingerprint: "none",
      taskTag: inferTaskTag(text),
    };
  }

  function sendRating(rating) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!lastRunRatingPayload) return;
    ws.send(
      JSON.stringify({
        type: "rate",
        rating,
        ...lastRunRatingPayload,
      }),
    );
    if (rateUpBtn) rateUpBtn.disabled = true;
    if (rateDownBtn) rateDownBtn.disabled = true;
    appendMeta("Thanks — feedback saved for future runs.");
  }

  function syncIterativeUi() {
    const iterative = (runModeEl?.value || "") === "dynamic-iterative";
    const auto = Boolean(autoIterEl?.checked);
    if (iterRoundsEl) iterRoundsEl.disabled = !iterative || auto;
    if (autoIterEl) autoIterEl.disabled = !iterative;
    if (iterMaxRoundsEl) iterMaxRoundsEl.disabled = !iterative || !auto;
    if (noSynthesizeEl) noSynthesizeEl.disabled = !iterative;
    syncModePill();
    syncRailIcons();
  }

  sendBtn.addEventListener("click", sendChat);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  clearBtn.addEventListener("click", () => {
    if (chatScroll) {
      chatScroll.innerHTML = "";
    } else {
      chat.innerHTML = "";
    }
    chatTranscript = [];
    clearChatTranscript(browserSessionId);
    clearCrewLog();
  });
  verboseCrewEl?.addEventListener("change", syncCrewLogVisibility);
  crewLogTabDiagram?.addEventListener("click", () => setCrewLogTab("diagram"));
  crewLogTabText?.addEventListener("click", () => setCrewLogTab("text"));
  syncCrewLogVisibility();
  setCrewLogTab("diagram");
  agentPickerAddBtn?.addEventListener("click", () => {
    const pid = String(agentPickerSelectEl?.value || "").trim();
    if (!pid) return;
    selectedAgentProviderIds.add(pid);
    renderAgentProviderChips();
    renderAgentProviderOptions();
  });
  agentPickerClearBtn?.addEventListener("click", () => {
    selectedAgentProviderIds.clear();
    renderAgentProviderChips();
    renderAgentProviderOptions();
  });

  runModeEl?.addEventListener("change", syncIterativeUi);
  autoIterEl?.addEventListener("change", syncIterativeUi);
  iterRoundsEl?.addEventListener("input", syncRailIcons);
  iterMaxRoundsEl?.addEventListener("input", syncRailIcons);
  sessionIdEl?.addEventListener("input", syncRailIcons);
  attachBtn?.addEventListener("click", () => fileInputEl?.click());
  syncIterativeUi();

  // Rate the last run (stored by the orchestrator into a pending file; consumed on next plan).
  rateUpBtn?.addEventListener("click", () => sendRating(1));
  rateDownBtn?.addEventListener("click", () => sendRating(-1));

  loadAgentProviderCatalog();
  initRailCollapse();
  initMobileSheet();
  initComposerGrow();
  initHostMetricsUi();
  initPwaInstall();
  if (sessionIdEl && !sessionIdEl.value.trim()) {
    sessionIdEl.value = browserSessionId;
  }
  function bootWebSocket() {
    if (globalThis.__agenticWsConnectBooted) return;
    globalThis.__agenticWsConnectBooted = true;
    ensureConnected();
  }

  chatTranscript = loadChatTranscript(browserSessionId);
  if (transcriptHasConversation(chatTranscript)) {
    chatRestoredFromStorage = true;
    restoreChatFromTranscript().finally(() => {
      bootWebSocket();
    });
  } else {
    bootWebSocket();
  }

  connStatus?.addEventListener("click", () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reconnectDelayMs = 2000;
      wsGeneration += 1;
      closeActiveWebSocket();
      detachSocket(ws);
      ws = null;
      connectPromise = null;
      clearReconnectTimer();
      globalThis.__agenticWsConnectBooted = true;
      ensureConnected();
    }
  });
}
} // __agenticOrchestratorUiInit

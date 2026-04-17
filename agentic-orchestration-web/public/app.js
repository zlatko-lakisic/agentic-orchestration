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

{
  const chat = document.getElementById("chat");
  const chatScroll = document.getElementById("chatScroll");
  const chatPinned = document.getElementById("chatPinned");
  const chatPinnedText = document.getElementById("chatPinnedText");
  const toolbar = document.getElementById("toolbar");
  const toolbarBody = document.getElementById("toolbarBody");
  const toolbarToggle = document.getElementById("toolbarToggle");
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
  const verboseCrewEl = document.getElementById("verboseCrew");
  const agentPickerSelectEl = document.getElementById("agentPickerSelect");
  const agentPickerAddBtn = document.getElementById("agentPickerAddBtn");
  const agentPickerClearBtn = document.getElementById("agentPickerClearBtn");
  const agentPickerChipsEl = document.getElementById("agentPickerChips");
  const connStatus = document.getElementById("connStatus");
  const activityBar = document.getElementById("activityBar");
  const activityLabel = document.getElementById("activityLabel");
  const rateUpBtn = document.getElementById("rateUpBtn");
  const rateDownBtn = document.getElementById("rateDownBtn");
  const fileInputEl = document.getElementById("fileInput");

  let ws = null;
  let assistantBubble = null;
  let runActive = false;
  let stdoutBuf = "";
  let stderrBuf = "";
  let streamVerbose = false;
  let processingTimer = null;
  let statusHintTimer = null;
  let lastProgressText = "";
  let lastProgressPct = null;
  let lastRunRatingPayload = null;
  let availableAgentProviders = [];
  const selectedAgentProviderIds = new Set();

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

  function startVerboseActivityBar() {
    stopProcessingUi();
    showActivityBar();
    if (activityLabel) {
      activityLabel.textContent = "Run in progress—streaming crew output below…";
    }
    iterRoundLabel = "";
    iterControllerReason = "";
    if (chatPinned) chatPinned.hidden = true;
  }

  function proto() {
    return window.location.protocol === "https:" ? "wss:" : "ws:";
  }

  function connect() {
    const url = `${proto()}//${window.location.host}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      connStatus.textContent = "Connected";
      connStatus.className = "status connected";
      sendBtn.disabled = runActive;
    };

    ws.onclose = () => {
      stopProcessingUi();
      connStatus.textContent = "Disconnected";
      connStatus.className = "status disconnected";
      sendBtn.disabled = true;
      assistantBubble = null;
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      appendMeta("WebSocket error");
    };

    ws.onmessage = async (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        appendBubble("assistant", ev.data);
        return;
      }

      if (data.type === "hello") {
        appendMeta(`Tool: ${data.toolRoot} · ${data.python}`);
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
        streamVerbose = Boolean(verboseCrewEl?.checked);
        stdoutBuf = "";
        stderrBuf = "";
        assistantBubble = appendBubble("assistant", "");
        if (streamVerbose) {
          startVerboseActivityBar();
          appendMeta(`Run: ${(data.args || []).join(" ")}`);
        } else {
          startProcessingUi(assistantBubble);
        }
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
        if (streamVerbose) {
          assistantBubble.textContent += line;
          if (data.stream === "stderr") {
            assistantBubble.classList.add("stderr");
          }
        } else if (data.stream === "stdout") {
          stdoutBuf += line;
          applyProgressFromText(line);
        } else {
          stderrBuf += line;
          applyProgressFromText(line);
        }
        if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
        return;
      }
      if (data.type === "error") {
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
        stopProcessingUi();
        if (assistantBubble) {
          assistantBubble.classList.remove("processing", "typing");
        }
        if (!streamVerbose && assistantBubble) {
          const out = stdoutBuf.trim();
          const err = stderrBuf.trim();
          if (data.code !== 0 && err) {
            applyAssistantPlain(assistantBubble, err);
            assistantBubble.classList.add("stderr");
          } else if (out) {
            try {
              await applyAssistantMarkdown(assistantBubble, out);
            } catch {
              applyAssistantPlain(assistantBubble, out);
            }
            assistantBubble.classList.remove("stderr");
          } else if (data.code !== 0) {
            applyAssistantPlain(
              assistantBubble,
              "Something went wrong (no details on stdout). Check the terminal running the web server.",
            );
            assistantBubble.classList.add("stderr");
          } else {
            applyAssistantPlain(assistantBubble, "(No output)");
            assistantBubble.classList.remove("stderr");
          }
        }
        if (streamVerbose && assistantBubble) {
          const out = stdoutBuf.trim();
          if (out) {
            try {
              await applyAssistantMarkdown(assistantBubble, out);
            } catch {
              applyAssistantPlain(assistantBubble, out);
            }
          }
        }
        appendMeta(`Exit code: ${data.code}${data.signal ? ` (${data.signal})` : ""}`);
        assistantBubble = null;
        runActive = false;
        sendBtn.disabled = false;
        if (rateUpBtn) rateUpBtn.disabled = !lastRunRatingPayload;
        if (rateDownBtn) rateDownBtn.disabled = !lastRunRatingPayload;
        return;
      }
    };
  }

  function setToolbarCollapsed(collapsed) {
    if (!toolbar) return;
    const want = Boolean(collapsed);
    toolbar.classList.toggle("collapsed", want);
    if (toolbarToggle) {
      toolbarToggle.setAttribute("aria-expanded", want ? "false" : "true");
      const chev = toolbarToggle.querySelector(".chev");
      if (chev) chev.textContent = want ? "▸" : "▾";
      const sr = toolbarToggle.querySelector(".sr-only");
      if (sr) sr.textContent = want ? "Expand settings" : "Collapse settings";
    }
    try {
      localStorage.setItem("agentic.toolbar.collapsed", want ? "1" : "0");
    } catch {
      // ignore
    }
    // When expanding, keep layout stable by focusing the input again.
    if (!want && input) {
      try {
        input.focus();
      } catch {
        // ignore
      }
    }
  }

  function initToolbarCollapse() {
    if (!toolbar || !toolbarToggle) return;
    let collapsed = false;
    try {
      collapsed = localStorage.getItem("agentic.toolbar.collapsed") === "1";
    } catch {
      collapsed = false;
    }
    setToolbarCollapsed(collapsed);
    toolbarToggle.addEventListener("click", () => {
      const isCollapsed = toolbar.classList.contains("collapsed");
      setToolbarCollapsed(!isCollapsed);
    });
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

  function appendBubble(kind, text) {
    const el = document.createElement("div");
    el.className = `msg ${kind}`;
    el.textContent = text;
    (chatScroll || chat).appendChild(el);
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
    return el;
  }

  function appendMeta(text) {
    const el = document.createElement("div");
    el.className = "msg meta";
    el.textContent = text;
    (chatScroll || chat).appendChild(el);
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
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
      verboseCrew: Boolean(verboseCrewEl?.checked),
      selectedAgentProviderIds: Array.from(selectedAgentProviderIds),
      files: filesPayload,
    };
    if (resetSessionEl.checked && sessionId) {
      payload.resetSession = true;
    }
    ws.send(JSON.stringify(payload));
    resetSessionEl.checked = false;
    // Prepare rating envelope; provider/mcp are filled by Python traces (not available in UI).
    lastRunRatingPayload = {
      sessionId: sessionId || "",
      providerId: "",
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
  });
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
  syncIterativeUi();

  // Rate the last run (stored by the orchestrator into a pending file; consumed on next plan).
  rateUpBtn?.addEventListener("click", () => sendRating(1));
  rateDownBtn?.addEventListener("click", () => sendRating(-1));

  loadAgentProviderCatalog();
  initToolbarCollapse();
  connect();
}

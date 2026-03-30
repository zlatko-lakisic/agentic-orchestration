(() => {
  const chat = document.getElementById("chat");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sessionIdEl = document.getElementById("sessionId");
  const resetSessionEl = document.getElementById("resetSession");
  const verboseCrewEl = document.getElementById("verboseCrew");
  const connStatus = document.getElementById("connStatus");

  let ws = null;
  let assistantBubble = null;
  let runActive = false;
  let stdoutBuf = "";
  let stderrBuf = "";
  let streamVerbose = false;
  let processingTimer = null;

  const PROCESSING_HINTS = [
    "Hang tight while I look into this…",
    "Running the crew on your request…",
    "Still working—almost there…",
  ];

  function stopProcessingUi() {
    if (processingTimer != null) {
      clearInterval(processingTimer);
      processingTimer = null;
    }
  }

  function startProcessingUi(el) {
    stopProcessingUi();
    if (!el) return;
    el.classList.add("processing");
    let i = 0;
    el.textContent = PROCESSING_HINTS[0];
    processingTimer = setInterval(() => {
      i = (i + 1) % PROCESSING_HINTS.length;
      el.textContent = PROCESSING_HINTS[i];
    }, 4500);
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

    ws.onmessage = (ev) => {
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
      if (data.type === "run_start") {
        streamVerbose = Boolean(verboseCrewEl?.checked);
        stdoutBuf = "";
        stderrBuf = "";
        assistantBubble = appendBubble(
          "assistant",
          streamVerbose ? "" : "Hang tight while I look into this…",
        );
        if (streamVerbose) {
          appendMeta(`Run: ${(data.args || []).join(" ")}`);
        }
        runActive = true;
        sendBtn.disabled = true;
        return;
      }
      if (data.type === "chunk") {
        const line = data.text || "";
        if (!assistantBubble) assistantBubble = appendBubble("assistant", "");
        if (streamVerbose) {
          assistantBubble.textContent += line;
          if (data.stream === "stderr") {
            assistantBubble.classList.add("stderr");
          }
        } else if (data.stream === "stdout") {
          stdoutBuf += line;
        } else {
          stderrBuf += line;
        }
        chat.scrollTop = chat.scrollHeight;
        return;
      }
      if (data.type === "error") {
        stopProcessingUi();
        if (assistantBubble) {
          assistantBubble.classList.remove("processing");
        }
        appendBubble("error", data.message || "Error");
        runActive = false;
        sendBtn.disabled = false;
        return;
      }
      if (data.type === "run_end") {
        stopProcessingUi();
        if (!streamVerbose && assistantBubble) {
          assistantBubble.classList.remove("processing");
          const out = stdoutBuf.trim();
          const err = stderrBuf.trim();
          if (data.code !== 0 && err) {
            assistantBubble.textContent = err;
            assistantBubble.classList.add("stderr");
          } else if (out) {
            assistantBubble.textContent = out;
            assistantBubble.classList.remove("stderr");
          } else if (data.code !== 0) {
            assistantBubble.textContent =
              "Something went wrong (no details on stdout). Check the terminal running the web server.";
            assistantBubble.classList.add("stderr");
          } else {
            assistantBubble.textContent = "(No output)";
            assistantBubble.classList.remove("stderr");
          }
        }
        appendMeta(`Exit code: ${data.code}${data.signal ? ` (${data.signal})` : ""}`);
        assistantBubble = null;
        runActive = false;
        sendBtn.disabled = false;
        return;
      }
    };
  }

  function appendBubble(kind, text) {
    const el = document.createElement("div");
    el.className = `msg ${kind}`;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  function appendMeta(text) {
    const el = document.createElement("div");
    el.className = "msg meta";
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  function sendChat() {
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN || runActive) return;

    const sessionRaw = sessionIdEl.value.trim();
    const sessionId = sessionRaw || undefined;

    appendBubble("user", text);
    input.value = "";

    const payload = {
      type: "chat",
      text,
      sessionId,
      noVerify: true,
      verboseCrew: Boolean(verboseCrewEl?.checked),
    };
    if (resetSessionEl.checked && sessionId) {
      payload.resetSession = true;
    }
    ws.send(JSON.stringify(payload));
    resetSessionEl.checked = false;
  }

  sendBtn.addEventListener("click", sendChat);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  clearBtn.addEventListener("click", () => {
    chat.innerHTML = "";
  });

  connect();
})();

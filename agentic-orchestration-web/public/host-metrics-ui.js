const HISTORY_MAX = 180;
const POLL_MS = 1000;
const COLORS = {
  cpu: "#f59e0b",
  mem: "#60a5fa",
  gpu: "#c084fc",
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "rgba(148, 163, 184, 0.35)",
};

function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let x = v;
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatPercent(n) {
  const v = Number(n);
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
}

function statSeries(history, key) {
  const vals = history.map((h) => h[key]).filter((v) => Number.isFinite(v));
  if (!vals.length) return { min: null, max: null, avg: null, latest: null };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: sum / vals.length,
    latest: vals[vals.length - 1],
  };
}

function drawLineChart(canvas, history, { width, height, pad = 12, showGrid = false, showLegend = false }) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const plotX = pad;
  const plotY = pad;

  if (showGrid) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = plotY + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.axis;
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i += 1) {
      const y = plotY + (plotH * i) / 4;
      const label = `${100 - i * 25}%`;
      ctx.fillText(label, plotX - 4, y + 3);
    }
  }

  const drawSeries = (key, color) => {
    const points = history.filter((h) => Number.isFinite(h[key]));
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = showGrid ? 2 : 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((pt, idx) => {
      const x = plotX + (plotW * idx) / Math.max(1, points.length - 1);
      const y = plotY + plotH - (Math.min(100, Math.max(0, pt[key])) / 100) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawSeries("cpu", COLORS.cpu);
  drawSeries("mem", COLORS.mem);
  drawSeries("gpu", COLORS.gpu);

  if (showLegend) {
    const items = [
      ["CPU", COLORS.cpu],
      ["Memory", COLORS.mem],
    ];
    if (history.some((h) => Number.isFinite(h.gpu))) {
      items.push(["GPU", COLORS.gpu]);
    }
    let lx = plotX;
    const ly = 8;
    ctx.font = "11px Inter, sans-serif";
    for (const [label, color] of items) {
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly, 10, 3);
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 14, ly + 4);
      lx += ctx.measureText(label).width + 36;
    }
  }
}

export function initHostMetricsUi() {
  const btn = document.getElementById("hostMetricsBtn");
  const spark = document.getElementById("hostMetricsSpark");
  const modal = document.getElementById("hostMetricsModal");
  const scrim = document.getElementById("hostMetricsScrim");
  const closeBtn = document.getElementById("hostMetricsClose");
  const chart = document.getElementById("hostMetricsChart");
  const scopeEl = document.getElementById("hostMetricsScope");
  const hostEl = document.getElementById("hostMetricsHost");
  const updatedEl = document.getElementById("hostMetricsUpdated");
  const cpuNowEl = document.getElementById("hostMetricsCpuNow");
  const memNowEl = document.getElementById("hostMetricsMemNow");
  const cpuStatsEl = document.getElementById("hostMetricsCpuStats");
  const memStatsEl = document.getElementById("hostMetricsMemStats");
  const loadEl = document.getElementById("hostMetricsLoad");
  const uptimeEl = document.getElementById("hostMetricsUptime");
  const memDetailEl = document.getElementById("hostMetricsMemDetail");
  const gpuNowEl = document.getElementById("hostMetricsGpuNow");
  const gpuStatsEl = document.getElementById("hostMetricsGpuStats");
  const gpuDetailEl = document.getElementById("hostMetricsGpuDetail");
  const jetsonPowerEl = document.getElementById("hostMetricsJetsonPower");

  if (!btn || !spark) return;

  const history = [];
  let modalOpen = false;
  let lastSample = null;
  let pollTimer = null;

  function pushHistory(sample) {
    if (sample?.cpu?.percent == null) return;
    history.push({
      t: Date.now(),
      cpu: sample.cpu.percent,
      mem: sample.memory?.usedPercent ?? null,
      gpu: sample.jetson?.gpu?.percent ?? null,
    });
    if (history.length > HISTORY_MAX) history.shift();
  }

  function updateHeader() {
    drawLineChart(spark, history, { width: 92, height: 30, pad: 2, showGrid: false });
    const cpu = lastSample?.cpu?.percent;
    const mem = lastSample?.memory?.usedPercent;
    const gpu = lastSample?.jetson?.gpu?.percent;
    const parts = [];
    if (Number.isFinite(cpu)) parts.push(`CPU ${cpu.toFixed(0)}%`);
    if (Number.isFinite(mem)) parts.push(`RAM ${mem.toFixed(0)}%`);
    if (Number.isFinite(gpu)) parts.push(`GPU ${gpu.toFixed(0)}%`);
    const scopeHint = lastSample?.scope === "jetson" ? " (jtop)" : "";
    btn.title = parts.length
      ? `Host resources${scopeHint} — ${parts.join(" · ")} (click for details)`
      : `Host resources${scopeHint} (warming up…)`;
    btn.setAttribute("aria-label", btn.title);
  }

  function updateModal() {
    if (!modalOpen || !lastSample) return;
    drawLineChart(chart, history, {
      width: chart?.clientWidth || 640,
      height: 220,
      pad: 36,
      showGrid: true,
      showLegend: true,
    });
    const cpuS = statSeries(history, "cpu");
    const memS = statSeries(history, "mem");
    const gpuS = statSeries(history, "gpu");
    if (scopeEl) {
      const scope = lastSample.scope || "runtime";
      scopeEl.textContent =
        scope === "jetson"
          ? "Jetson host (jtop)"
          : scope === "host"
            ? "Node host (/proc)"
            : scope === "container"
              ? "Coordinator container"
              : "Server runtime";
    }
    if (hostEl) {
      hostEl.textContent = `${lastSample.hostname || "—"} · ${lastSample.platform || ""}/${lastSample.arch || ""}`;
    }
    if (updatedEl) {
      const d = lastSample.ts ? new Date(lastSample.ts) : new Date();
      updatedEl.textContent = d.toLocaleTimeString();
    }
    if (cpuNowEl) cpuNowEl.textContent = formatPercent(lastSample.cpu?.percent);
    if (memNowEl) memNowEl.textContent = formatPercent(lastSample.memory?.usedPercent);
    if (cpuStatsEl) {
      cpuStatsEl.textContent = `min ${formatPercent(cpuS.min)} · avg ${formatPercent(cpuS.avg)} · max ${formatPercent(cpuS.max)}`;
    }
    if (memStatsEl) {
      memStatsEl.textContent = `min ${formatPercent(memS.min)} · avg ${formatPercent(memS.avg)} · max ${formatPercent(memS.max)}`;
    }
    if (loadEl) {
      const la = Array.isArray(lastSample.loadAvg) ? lastSample.loadAvg : [];
      loadEl.textContent = la.length ? la.map((n) => n.toFixed(2)).join(" · ") : "—";
    }
    if (uptimeEl) {
      const sec = Number(lastSample.uptimeSec);
      if (!Number.isFinite(sec)) uptimeEl.textContent = "—";
      else {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        uptimeEl.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }
    if (memDetailEl && lastSample.memory) {
      const m = lastSample.memory;
      memDetailEl.textContent = `${formatBytes(m.usedBytes)} used · ${formatBytes(m.availableBytes)} available · ${formatBytes(m.totalBytes)} total`;
    }
    if (gpuNowEl) {
      gpuNowEl.textContent = formatPercent(lastSample.jetson?.gpu?.percent);
    }
    if (gpuStatsEl) {
      gpuStatsEl.textContent = `min ${formatPercent(gpuS.min)} · avg ${formatPercent(gpuS.avg)} · max ${formatPercent(gpuS.max)}`;
    }
    if (gpuDetailEl && lastSample.jetson?.gpu) {
      const g = lastSample.jetson.gpu;
      const bits = [];
      if (Number.isFinite(g.freqMhz)) bits.push(`${g.freqMhz} MHz`);
      const temps = lastSample.jetson.temperature;
      if (temps && typeof temps === "object") {
        const gpuTemp = temps.gpu ?? temps.GPU ?? temps.gr3d;
        if (Number.isFinite(gpuTemp)) bits.push(`${gpuTemp.toFixed(1)} °C`);
      }
      if (lastSample.jetson.ramText) bits.push(lastSample.jetson.ramText);
      gpuDetailEl.textContent = bits.length ? bits.join(" · ") : "—";
    }
    if (jetsonPowerEl) {
      const pw = lastSample.jetson?.powerW;
      jetsonPowerEl.textContent = Number.isFinite(pw) ? `${pw.toFixed(2)} W` : "—";
    }
  }

  async function poll() {
    try {
      const res = await fetch("/api/host-metrics", { cache: "no-store" });
      if (!res.ok) return;
      const sample = await res.json();
      lastSample = sample;
      pushHistory(sample);
      btn.classList.remove("stale");
      updateHeader();
      updateModal();
    } catch {
      btn.classList.add("stale");
    }
  }

  function openModal() {
    if (!modal || !scrim) return;
    modalOpen = true;
    modal.hidden = false;
    scrim.hidden = false;
    modal.classList.add("open");
    scrim.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    updateModal();
    window.addEventListener("resize", updateModal);
  }

  function closeModal() {
    if (!modal || !scrim) return;
    modalOpen = false;
    modal.classList.remove("open");
    scrim.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    window.removeEventListener("resize", updateModal);
    setTimeout(() => {
      if (!modalOpen) {
        modal.hidden = true;
        scrim.hidden = true;
      }
    }, 180);
  }

  btn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  scrim?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOpen) closeModal();
  });

  poll();
  pollTimer = window.setInterval(poll, POLL_MS);
  window.addEventListener("beforeunload", () => {
    if (pollTimer != null) clearInterval(pollTimer);
  });
}

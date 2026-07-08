const HISTORY_MAX = 180;
const COLORS = {
  cpu: "#f59e0b",
  mem: "#60a5fa",
  gpu: "#c084fc",
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "rgba(148, 163, 184, 0.35)",
};

let applyHostMetricsSample = null;

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

function chartLayout(width, height, pad = 12) {
  return {
    width,
    height,
    pad,
    plotX: pad,
    plotY: pad,
    plotW: width - pad * 2,
    plotH: height - pad * 2,
  };
}

function xForHistoryIndex(index, count, layout) {
  if (count <= 1) return layout.plotX + layout.plotW / 2;
  return layout.plotX + (layout.plotW * index) / (count - 1);
}

function yForPercent(value, layout) {
  const v = Math.min(100, Math.max(0, value));
  return layout.plotY + layout.plotH - (v / 100) * layout.plotH;
}

function historyIndexAtCanvasX(canvas, layout, clientX, count) {
  if (!canvas || count < 1) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return null;
  const x = ((clientX - rect.left) / rect.width) * layout.width;
  const { plotX, plotW } = layout;
  if (x < plotX || x > plotX + plotW) return null;
  if (count === 1) return 0;
  const frac = (x - plotX) / plotW;
  return Math.min(count - 1, Math.max(0, Math.round(frac * (count - 1))));
}

function formatChartTime(ts) {
  const d = new Date(ts);
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString() : "—";
}

function drawLineChart(canvas, history, { width, height, pad = 12, showGrid = false, showLegend = false, hoverIndex = null, lockCssWidthPct = false }) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssW = Math.max(1, Math.floor(width));
  const cssH = Math.max(1, Math.floor(height));
  const dpr = window.devicePixelRatio || 1;
  // Keep CSS width as % for fluid layouts. Setting absolute px from clientWidth causes a
  // shrink feedback loop (scrollbar / layout churn on hover redraws).
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  if (lockCssWidthPct) {
    canvas.style.width = "100%";
    canvas.style.height = `${cssH}px`;
  } else {
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const layout = chartLayout(cssW, cssH, pad);
  const { plotX, plotY, plotW, plotH } = layout;

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
    if (history.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = showGrid ? 2 : 1.5;
    ctx.lineJoin = "round";
    let started = false;
    history.forEach((pt, idx) => {
      if (!Number.isFinite(pt[key])) {
        started = false;
        return;
      }
      const x = xForHistoryIndex(idx, history.length, layout);
      const y = yForPercent(pt[key], layout);
      if (!started) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    if (started) ctx.stroke();
  };

  drawSeries("cpu", COLORS.cpu);
  drawSeries("mem", COLORS.mem);
  drawSeries("gpu", COLORS.gpu);

  if (hoverIndex != null && history[hoverIndex]) {
    const pt = history[hoverIndex];
    const hx = xForHistoryIndex(hoverIndex, history.length, layout);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, plotY);
    ctx.lineTo(hx, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const [key, color] of [
      ["cpu", COLORS.cpu],
      ["mem", COLORS.mem],
      ["gpu", COLORS.gpu],
    ]) {
      const v = pt[key];
      if (!Number.isFinite(v)) continue;
      const hy = yForPercent(v, layout);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

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

/** @param {Record<string, unknown>} data */
export function handleHostMetricsMessage(data) {
  if (!data || data.type !== "host_metrics") return;
  const { type: _type, ...sample } = data;
  applyHostMetricsSample?.(sample);
}

/** @param {WebSocket | null | undefined} ws */
export function subscribeHostMetrics(ws) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({ type: "host_metrics_subscribe" }));
  } catch {
    /* ignore */
  }
}

export function initHostMetricsUi() {
  const btn = document.getElementById("hostMetricsBtn");
  const spark = document.getElementById("hostMetricsSpark");
  const modal = document.getElementById("hostMetricsModal");
  const scrim = document.getElementById("hostMetricsScrim");
  const closeBtn = document.getElementById("hostMetricsClose");
  const chart = document.getElementById("hostMetricsChart");
  const chartWrap = chart?.closest(".host-metrics-chart-wrap");
  const chartTooltip = document.getElementById("hostMetricsChartTooltip");
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
  let chartHoverIndex = null;

  function chartOptions() {
    // Measure the wrap, not the canvas — canvas style px from prior draws would feedback-shrink.
    const width = Math.max(
      1,
      Math.floor(chartWrap?.clientWidth || chart?.parentElement?.clientWidth || 640),
    );
    return {
      width,
      height: 220,
      pad: 36,
      showGrid: true,
      showLegend: true,
      hoverIndex: chartHoverIndex,
      lockCssWidthPct: true,
    };
  }

  function hideChartTooltip() {
    chartHoverIndex = null;
    if (!chartTooltip) return;
    chartTooltip.hidden = true;
    chartTooltip.classList.remove("visible");
    chartTooltip.replaceChildren();
  }

  function tooltipRow(label, color, value) {
    const row = document.createElement("div");
    row.className = "host-metrics-chart-tooltip-row";
    const labelEl = document.createElement("span");
    labelEl.className = "host-metrics-chart-tooltip-label";
    const swatch = document.createElement("span");
    swatch.className = "host-metrics-chart-tooltip-swatch";
    swatch.style.background = color;
    labelEl.append(swatch, document.createTextNode(label));
    const valueEl = document.createElement("span");
    valueEl.className = "host-metrics-chart-tooltip-value";
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    return row;
  }

  function showChartTooltip(index) {
    if (!chart || !chartWrap || !chartTooltip || !history[index]) return;
    const pt = history[index];
    const options = chartOptions();
    const layout = chartLayout(options.width, options.height, options.pad);
    const canvasRect = chart.getBoundingClientRect();
    const wrapRect = chartWrap.getBoundingClientRect();
    const scaleX = canvasRect.width / options.width;
    const scaleY = canvasRect.height / options.height;
    const hx = xForHistoryIndex(index, history.length, layout) * scaleX;
    const values = [
      ["CPU", COLORS.cpu, pt.cpu],
      ["Memory", COLORS.mem, pt.mem],
      ["GPU", COLORS.gpu, pt.gpu],
    ].filter(([, , v]) => Number.isFinite(v));
    if (!values.length) {
      hideChartTooltip();
      return;
    }

    chartTooltip.replaceChildren();
    const timeEl = document.createElement("div");
    timeEl.className = "host-metrics-chart-tooltip-time";
    timeEl.textContent = formatChartTime(pt.t);
    chartTooltip.append(timeEl);
    for (const [label, color, value] of values) {
      chartTooltip.append(tooltipRow(label, color, formatPercent(value)));
    }

    let topY = canvasRect.height;
    for (const [, , value] of values) {
      topY = Math.min(topY, yForPercent(value, layout) * scaleY);
    }
    const left = canvasRect.left - wrapRect.left + hx;
    const top = canvasRect.top - wrapRect.top + topY;
    chartTooltip.style.left = `${left}px`;
    chartTooltip.style.top = `${top}px`;
    chartTooltip.hidden = false;
    chartTooltip.classList.add("visible");
  }

  function updateChartHover(clientX) {
    if (!modalOpen || !chart || history.length < 1) {
      hideChartTooltip();
      return;
    }
    const options = chartOptions();
    const layout = chartLayout(options.width, options.height, options.pad);
    const index = historyIndexAtCanvasX(chart, layout, clientX, history.length);
    if (index == null) {
      if (chartHoverIndex != null) {
        chartHoverIndex = null;
        drawLineChart(chart, history, { ...options, hoverIndex: null });
        hideChartTooltip();
      }
      return;
    }
    if (index === chartHoverIndex) return;
    chartHoverIndex = index;
    drawLineChart(chart, history, { ...options, hoverIndex: index });
    showChartTooltip(index);
  }

  function onChartMouseMove(e) {
    updateChartHover(e.clientX);
  }

  function onChartMouseLeave() {
    if (chartHoverIndex == null) return;
    hideChartTooltip();
    drawLineChart(chart, history, chartOptions());
  }

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
    const options = chartOptions();
    drawLineChart(chart, history, options);
    if (chartHoverIndex != null && history[chartHoverIndex]) {
      showChartTooltip(chartHoverIndex);
    }
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

  function applySample(sample) {
    lastSample = sample;
    pushHistory(sample);
    btn.classList.remove("stale");
    updateHeader();
    updateModal();
  }

  applyHostMetricsSample = applySample;

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
    chart?.addEventListener("mousemove", onChartMouseMove);
    chart?.addEventListener("mouseleave", onChartMouseLeave);
  }

  function closeModal() {
    if (!modal || !scrim) return;
    modalOpen = false;
    hideChartTooltip();
    modal.classList.remove("open");
    scrim.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    window.removeEventListener("resize", updateModal);
    chart?.removeEventListener("mousemove", onChartMouseMove);
    chart?.removeEventListener("mouseleave", onChartMouseLeave);
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
}

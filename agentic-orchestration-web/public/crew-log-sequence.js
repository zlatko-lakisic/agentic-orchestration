/**
 * Incremental sequence diagram built from orchestrator stderr (crew log) lines.
 */

const PARTICIPANT_LABELS = {
  orchestrator: "Orchestrator",
  planner: "Planner",
  coordinator: "Coordinator",
  worker: "Worker",
  ollama: "Ollama",
  mcp: "MCP",
  skills: "Skills",
};

const NOISE_RES = [
  /^workflow (mcp|skills) catalog: skipping/i,
  /^\(dynamic\) (mcp|skills) catalog: skipping/i,
  /^\(mcp\) task /i,
  /^\(skills\) task /i,
];

function formatParticipantLabel(id) {
  if (PARTICIPANT_LABELS[id]) return PARTICIPANT_LABELS[id];
  if (id.startsWith("agent:")) {
    const raw = id.slice("agent:".length);
    return raw.replace(/^ollama_/, "").replace(/_/g, " ");
  }
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function truncate(text, max = 96) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripPrefix(line, prefix) {
  const t = String(line || "").trim();
  if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
    return t.slice(prefix.length).trim();
  }
  return t;
}

/** @returns {{ from: string, to: string, label: string, kind: string } | null} */
export function parseCrewLogSequenceEvent(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  if (NOISE_RES.some((re) => re.test(raw))) return null;
  if (raw.toLowerCase().startsWith("(progress)")) return null;

  if (raw.startsWith("{")) {
    try {
      const j = JSON.parse(raw);
      const comp = String(j.component || "system").trim();
      const msg = truncate(String(j.message || j.level || "event"), 88);
      const compMap = {
        coordinator: "coordinator",
        "warm-pool-worker": "worker",
        worker: "worker",
      };
      const from = compMap[comp] || comp;
      let to = "coordinator";
      let kind = "sync";
      if (comp === "coordinator" && /enqueued/i.test(msg)) {
        to = "worker";
        kind = "async";
      } else if (comp === "warm-pool-worker" && /claimed/i.test(msg)) {
        to = "worker";
        kind = "note";
      } else if (comp === "warm-pool-worker" && /exited|failed/i.test(msg)) {
        to = "coordinator";
        kind = "error";
      } else if (comp === "warm-pool-worker") {
        to = "coordinator";
        kind = "return";
      }
      return { from, to, label: msg, kind };
    } catch {
      // fall through
    }
  }

  if (raw.startsWith("(agentic)")) {
    const label = truncate(stripPrefix(raw, "(agentic)"), 88);
    if (label.startsWith("run_rating_meta:")) return null;
    return { from: "orchestrator", to: "orchestrator", label, kind: "note" };
  }

  if (/\(dynamic\)\s+planner LLM:/i.test(raw) || /\(dynamic repair\)\s+planner LLM:/i.test(raw)) {
    const label = truncate(raw.replace(/^.*planner LLM:\s*/i, ""), 88);
    return { from: "planner", to: "ollama", label, kind: "async" };
  }

  if (/\(dynamic\)\s+planner LLM done:/i.test(raw) || /\(dynamic repair\)\s+planner LLM done:/i.test(raw)) {
    const label = truncate(raw.replace(/^.*planner LLM done:\s*/i, ""), 88);
    return { from: "ollama", to: "planner", label, kind: "return" };
  }

  if (/\(dynamic\)\s+single-agent catalog:/i.test(raw)) {
    return {
      from: "planner",
      to: "planner",
      label: truncate(stripPrefix(raw, "(dynamic)"), 88),
      kind: "note",
    };
  }

  if (/\(dynamic\)\s+plan:/i.test(raw)) {
    return {
      from: "planner",
      to: "orchestrator",
      label: truncate(raw.replace(/^\(dynamic\)\s+plan:\s*/i, ""), 88),
      kind: "sync",
    };
  }

  const stepM = raw.match(
    /\(dynamic\)\s+step\s+(\d+)\/(\d+):\s*(\S+)\s*->\s*agent_provider\s+'([^']+)'/i,
  );
  if (stepM) {
    return {
      from: "orchestrator",
      to: `agent:${stepM[4]}`,
      label: `step ${stepM[1]}/${stepM[2]}: ${stepM[3]}`,
      kind: "async",
    };
  }

  if (raw.startsWith("(execution)")) {
    return {
      from: "orchestrator",
      to: "coordinator",
      label: truncate(stripPrefix(raw, "(execution)"), 88),
      kind: "sync",
    };
  }

  if (/warm pool enqueued/i.test(raw)) {
    return { from: "coordinator", to: "worker", label: "enqueue step", kind: "async" };
  }
  if (/warm pool step completed/i.test(raw)) {
    return { from: "worker", to: "coordinator", label: "step completed", kind: "return" };
  }
  if (/warm pool step failed/i.test(raw)) {
    return { from: "worker", to: "coordinator", label: "step failed", kind: "error" };
  }
  if (/warm pool timed out/i.test(raw)) {
    return { from: "worker", to: "coordinator", label: "step timed out", kind: "error" };
  }

  if (/\(dynamic\)\s+agent selection:/i.test(raw)) {
    return {
      from: "orchestrator",
      to: "planner",
      label: truncate(stripPrefix(raw, "(dynamic)"), 88),
      kind: "sync",
    };
  }

  if (/planner validation failed/i.test(raw) || /planning failed/i.test(raw)) {
    return {
      from: "planner",
      to: "orchestrator",
      label: truncate(raw.replace(/^\(dynamic(?: repair)?\)\s*/i, ""), 88),
      kind: "error",
    };
  }

  if (/\(dynamic-iter\)/i.test(raw)) {
    return {
      from: "orchestrator",
      to: "planner",
      label: truncate(raw, 88),
      kind: "note",
    };
  }

  if (raw.startsWith("(dynamic)") || raw.startsWith("(dynamic repair)")) {
    return {
      from: "planner",
      to: "planner",
      label: truncate(stripPrefix(raw.replace(/^\(dynamic repair\)\s*/i, ""), "(dynamic)"), 88),
      kind: "note",
    };
  }

  if (/^loading spec\b/i.test(raw) || /^kickoff\b/i.test(raw) || /^wrote\b/i.test(raw)) {
    return { from: "worker", to: "agent:crew", label: truncate(raw, 88), kind: "sync" };
  }

  return null;
}

function laneCenterX(index, laneCount, width, pad) {
  if (laneCount <= 0) return width / 2;
  const inner = width - pad * 2;
  const step = inner / laneCount;
  return pad + step * index + step / 2;
}

function arrowPath(x1, x2, y, kind) {
  const dir = x2 >= x1 ? 1 : -1;
  const head = 7;
  const tx = x2 - dir * head;
  const dash = kind === "async" || kind === "return" ? ' stroke-dasharray="5 4"' : "";
  const color =
    kind === "error"
      ? "#f87171"
      : kind === "return"
        ? "#4ade80"
        : kind === "note"
          ? "#94a3b8"
          : "#fbbf24";
  const marker = kind === "return" ? "url(#seq-arrow-return)" : "url(#seq-arrow)";
  if (Math.abs(x2 - x1) < 4) {
    const loop = 14;
    return {
      path: `M ${x1} ${y} c 0 ${loop}, ${loop} ${loop}, ${loop} 0 s ${loop} ${-loop}, ${loop} ${-loop * 2}`,
      dash,
      color,
      marker: "none",
    };
  }
  return {
    path: `M ${x1} ${y} L ${tx} ${y}`,
    dash,
    color,
    marker,
  };
}

export class CrewLogSequenceDiagram {
  /** @param {HTMLElement | null} root */
  constructor(root) {
    this.root = root;
    /** @type {string[]} */
    this.participants = [];
    /** @type {{ from: string, to: string, label: string, kind: string }[]} */
    this.events = [];
    this._laneWidth = 720;
    if (this.root) this._render();
  }

  clear() {
    this.participants = [];
    this.events = [];
    this._render();
  }

  /** @param {string} line */
  appendLine(line) {
    const ev = parseCrewLogSequenceEvent(line);
    if (!ev) return;
    this._ensureParticipant(ev.from);
    this._ensureParticipant(ev.to);
    this.events.push(ev);
    this._render();
    this._scrollToBottom();
  }

  /** @param {string} id */
  _ensureParticipant(id) {
    if (!id || this.participants.includes(id)) return;
    this.participants.push(id);
  }

  _scrollToBottom() {
    const body = this.root?.querySelector(".crew-seq-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  _render() {
    if (!this.root) return;
    const pids = this.participants.length ? this.participants : ["orchestrator"];
    const rowH = 40;
    const pad = 16;
    const headerH = 44;
    const bodyH = Math.max(120, this.events.length * rowH + 24);
    const width = this._laneWidth;

    const headerCells = pids
      .map(
        (id) =>
          `<div class="crew-seq-lane" title="${formatParticipantLabel(id)}">${formatParticipantLabel(id)}</div>`,
      )
      .join("");

    let arrows = "";
    let labels = "";
    this.events.forEach((ev, i) => {
      const fromIdx = pids.indexOf(ev.from);
      const toIdx = pids.indexOf(ev.to);
      const y = headerH + 18 + i * rowH;
      const x1 = laneCenterX(fromIdx, pids.length, width, pad);
      const x2 = laneCenterX(toIdx, pids.length, width, pad);
      const { path, dash, color, marker } = arrowPath(x1, x2, y, ev.kind);
      arrows += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"${dash}${
        marker !== "none" ? ` marker-end="${marker}"` : ""
      }/>`;
      const lx = (x1 + x2) / 2;
      labels += `<text x="${lx}" y="${y - 6}" class="crew-seq-msg-label" text-anchor="middle">${escapeXml(
        ev.label,
      )}</text>`;
    });

    const lifelines = pids
      .map((_, i) => {
        const x = laneCenterX(i, pids.length, width, pad);
        return `<line x1="${x}" y1="${headerH}" x2="${x}" y2="${headerH + bodyH}" class="crew-seq-lifeline"/>`;
      })
      .join("");

    const empty =
      this.events.length === 0
        ? `<div class="crew-seq-empty">Sequence builds here as stderr lines arrive…</div>`
        : "";

    this.root.innerHTML = `
      <div class="crew-seq-header" style="--seq-cols:${pids.length}">${headerCells}</div>
      <div class="crew-seq-body">
        <svg class="crew-seq-svg" viewBox="0 0 ${width} ${headerH + bodyH}" width="100%" height="${
          headerH + bodyH
        }" aria-hidden="true">
          <defs>
            <marker id="seq-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24"/>
            </marker>
            <marker id="seq-arrow-return" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#4ade80"/>
            </marker>
          </defs>
          ${lifelines}
          ${arrows}
          ${labels}
        </svg>
        ${empty}
      </div>
    `;
  }
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import {
  LayoutResult,
  PositionedEdge,
  PositionedNode,
  TopologyBand,
  TopologyEdge,
  TopologyNode,
  TopologyNodeKind,
} from './topology.types';

/** kind → (band, rank, lane, order) — deterministic slots. */
const KIND_SLOT: Record<
  string,
  { band: TopologyBand; rank: number; lane: number; order: number }
> = {
  ui: { band: 'application', rank: 0, lane: 0, order: 0 },
  'overlay-source': { band: 'application', rank: 0, lane: 1, order: 0 },
  'local-tools': { band: 'application', rank: 0, lane: 2, order: 0 },
  openclaw: { band: 'application', rank: 0, lane: 3, order: 0 },

  'session-bridge': { band: 'reach', rank: 0, lane: 0, order: 0 },
  'overlay-packer': { band: 'reach', rank: 0, lane: 1, order: 0 },
  'local-mcp-host': { band: 'reach', rank: 0, lane: 2, order: 0 },
  'speech-client': { band: 'reach', rank: 0, lane: 3, order: 0 },
  'mtls-enroller': { band: 'reach', rank: 0, lane: 4, order: 0 },

  engine: { band: 'ao', rank: 0, lane: 0, order: 0 },
  endpoint: { band: 'ao', rank: 0, lane: 1, order: 0 },
  'web-ui': { band: 'ao', rank: 0, lane: 5, order: 0 },

  planner: { band: 'ao', rank: 1, lane: 0, order: 0 },

  catalog: { band: 'ao', rank: 2, lane: 0, order: 0 },
  'model-backend': { band: 'ao', rank: 2, lane: 1, order: 0 },
  'model-runtime': { band: 'ao', rank: 2, lane: 2, order: 0 },

  'execution-backend': { band: 'ao', rank: 3, lane: 0, order: 0 },
  worker: { band: 'ao', rank: 3, lane: 1, order: 0 },
  'mcp-sidecar': { band: 'ao', rank: 3, lane: 2, order: 0 },

  platform: { band: 'ao', rank: 4, lane: 0, order: 0 },
  storage: { band: 'ao', rank: 4, lane: 1, order: 0 },
};

const ENDPOINT_LANE: Record<string, number> = {
  'engine/session-overlay': 1,
  'engine/mcp-tunnel': 2,
  'engine/direct-agent': 3,
  'engine/hello-speech': 4,
  'engine/mtls-enrol': 4,
  'speech/stt': 3,
  'speech/tts': 4,
};

const CATALOG_ORDER: Record<string, number> = {
  'catalog/agents': 0,
  'catalog/mcp': 1,
  'catalog/skills': 2,
};

const MODEL_ORDER: Record<string, number> = {
  'models/backends': 0,
  'models/ollama': 1,
  'models/remote': 2,
};

const NODE_W = 128;
const NODE_H = 48;
const COL_GAP = 28;
const ROW_GAP = 36;
const BAND_PAD_Y = 28;
const BAND_LABEL_H = 22;
const MARGIN = 24;
const MAX_LANES = 6;

const BAND_LABELS: Record<TopologyBand, string> = {
  application: '1 · Application',
  reach: '2 · AO Reach',
  ao: '3 · Agentic Orchestration',
};

function slotFor(node: TopologyNode): {
  band: TopologyBand;
  rank: number;
  lane: number;
  order: number;
} {
  const base = KIND_SLOT[node.kind] || {
    band: (node.band || 'ao') as TopologyBand,
    rank: 0,
    lane: MAX_LANES - 1,
    order: 99,
  };
  let lane = base.lane;
  let order = base.order;
  if (node.kind === 'endpoint' && ENDPOINT_LANE[node.id] != null) {
    lane = ENDPOINT_LANE[node.id];
  }
  if (node.kind === 'catalog' && CATALOG_ORDER[node.id] != null) {
    order = CATALOG_ORDER[node.id];
  }
  if (node.kind === 'model-runtime' && MODEL_ORDER[node.id] != null) {
    lane = 2 + (MODEL_ORDER[node.id] || 0);
    order = MODEL_ORDER[node.id] || 0;
  }
  if (node.kind === 'model-backend') {
    lane = 1;
  }
  if (node.id === 'speech/stt' || node.id === 'speech/tts') {
    // Keep speech sidecars on edge rank near advertise lane
    return { band: 'ao', rank: 0, lane: ENDPOINT_LANE[node.id] ?? 3, order: 10 };
  }
  return {
    band: (node.band || base.band) as TopologyBand,
    rank: base.rank,
    lane,
    order,
  };
}

function displayStatus(n: TopologyNode): string {
  if (n.instrumented === false && n.status === 'healthy') {
    // Honesty: uninstrumented must not read as healthy green
    return 'unknown';
  }
  if (!n.instrumented && n.status === 'healthy') return 'unknown';
  return n.status || 'unknown';
}

function trimPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  hw: number,
  hh: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * hw,
    y1: y1 + uy * hh,
    x2: x2 - ux * hw,
    y2: y2 - uy * hh,
  };
}

function routeEdge(
  from: PositionedNode,
  to: PositionedNode,
  kind: string
): string {
  const fx = from.x + from.width / 2;
  const fy = from.y + from.height / 2;
  const tx = to.x + to.width / 2;
  const ty = to.y + to.height / 2;
  const trimmed = trimPath(fx, fy, tx, ty, from.width / 2 - 4, from.height / 2 - 4);

  if (kind === 'bypass') {
    const right = Math.max(fx, tx) + 80;
    return `M ${trimmed.x1} ${trimmed.y1} L ${right} ${trimmed.y1} L ${right} ${trimmed.y2} L ${trimmed.x2} ${trimmed.y2}`;
  }
  if (kind === 'reverse-tunnel') {
    const midY = (trimmed.y1 + trimmed.y2) / 2;
    const offset = 18;
    return `M ${trimmed.x1 + offset} ${trimmed.y1} C ${trimmed.x1 + offset} ${midY}, ${trimmed.x2 + offset} ${midY}, ${trimmed.x2 + offset} ${trimmed.y2}`;
  }
  if (Math.abs(from.rank - to.rank) <= 1 && Math.abs(from.lane - to.lane) <= 1) {
    return `M ${trimmed.x1} ${trimmed.y1} L ${trimmed.x2} ${trimmed.y2}`;
  }
  const midY = (trimmed.y1 + trimmed.y2) / 2;
  return `M ${trimmed.x1} ${trimmed.y1} C ${trimmed.x1} ${midY}, ${trimmed.x2} ${midY}, ${trimmed.x2} ${trimmed.y2}`;
}

export function layoutTopology(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  opts?: { showNotDeployed?: boolean }
): LayoutResult {
  const showNotDeployed = opts?.showNotDeployed ?? false;
  const visible = nodes.filter((n) => showNotDeployed || n.deployed !== false);

  const enriched = visible.map((n) => {
    const s = slotFor(n);
    return { node: n, ...s };
  });

  enriched.sort((a, b) => {
    const bandOrder = { application: 0, reach: 1, ao: 2 } as const;
    if (bandOrder[a.band] !== bandOrder[b.band]) {
      return bandOrder[a.band] - bandOrder[b.band];
    }
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.lane !== b.lane) return a.lane - b.lane;
    if (a.order !== b.order) return a.order - b.order;
    return a.node.id.localeCompare(b.node.id);
  });

  const colWidth = NODE_W + COL_GAP;
  const canvasContentW = MAX_LANES * colWidth;
  const width = canvasContentW + MARGIN * 2;

  type RowKey = string;
  const rows = new Map<RowKey, typeof enriched>();
  for (const e of enriched) {
    const key = `${e.band}:${e.rank}`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push(e);
  }

  const bandOrderList: TopologyBand[] = ['application', 'reach', 'ao'];
  const positioned: PositionedNode[] = [];
  const bands: LayoutResult['bands'] = [];
  let y = MARGIN;

  for (const band of bandOrderList) {
    const bandRows = [...rows.entries()]
      .filter(([k]) => k.startsWith(`${band}:`))
      .sort((a, b) => Number(a[0].split(':')[1]) - Number(b[0].split(':')[1]));

    if (bandRows.length === 0) {
      // Empty band still shown with a note strip
      bands.push({
        id: band,
        label: BAND_LABELS[band],
        y,
        height: BAND_PAD_Y + BAND_LABEL_H + 40,
      });
      y += BAND_PAD_Y + BAND_LABEL_H + 40 + 12;
      continue;
    }

    const bandTop = y;
    y += BAND_PAD_Y + BAND_LABEL_H;

    for (const [, rowNodes] of bandRows) {
      for (const e of rowNodes) {
        const x = MARGIN + e.lane * colWidth;
        positioned.push({
          ...e.node,
          x,
          y,
          width: NODE_W,
          height: NODE_H,
          lane: e.lane,
          rank: e.rank,
          order: e.order,
          displayStatus: displayStatus(e.node),
        });
      }
      y += NODE_H + ROW_GAP;
    }

    const bandHeight = y - bandTop + BAND_PAD_Y / 2;
    bands.push({
      id: band,
      label: BAND_LABELS[band],
      y: bandTop,
      height: bandHeight,
    });
    y += 12;
  }

  const byId = new Map(positioned.map((n) => [n.id, n]));
  const positionedEdges: PositionedEdge[] = [];
  for (const e of edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) continue;
    const pathD = routeEdge(from, to, String(e.kind || 'request'));
    positionedEdges.push({
      ...e,
      points: '',
      pathD,
    });
  }

  return {
    width,
    height: y + MARGIN,
    bands,
    nodes: positioned,
    edges: positionedEdges,
  };
}

/** Transitive closure for path highlight. */
export function pathClosure(
  nodeId: string,
  edges: TopologyEdge[]
): { nodes: Set<string>; edges: Set<string> } {
  const outs = new Map<string, string[]>();
  const ins = new Map<string, string[]>();
  for (const e of edges) {
    if (!outs.has(e.from)) outs.set(e.from, []);
    outs.get(e.from)!.push(e.to);
    if (!ins.has(e.to)) ins.set(e.to, []);
    ins.get(e.to)!.push(e.from);
  }
  const nodes = new Set<string>([nodeId]);
  const edgeIds = new Set<string>();

  const walk = (
    start: string,
    map: Map<string, string[]>,
    forward: boolean
  ) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const next of map.get(cur) || []) {
        const eid = edges.find((e) =>
          forward ? e.from === cur && e.to === next : e.from === next && e.to === cur
        )?.id;
        if (eid) edgeIds.add(eid);
        if (!nodes.has(next)) {
          nodes.add(next);
          stack.push(next);
        }
      }
    }
  };

  walk(nodeId, outs, true);
  walk(nodeId, ins, false);

  // Include all edges between members
  for (const e of edges) {
    if (nodes.has(e.from) && nodes.has(e.to)) edgeIds.add(e.id);
  }

  return { nodes, edges: edgeIds };
}

export function slotForKind(kind: TopologyNodeKind) {
  return KIND_SLOT[kind] || null;
}

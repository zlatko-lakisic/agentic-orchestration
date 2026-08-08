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

const CATALOG_LANE: Record<string, number> = {
  'catalog/agents': 0,
  'catalog/mcp': 1,
  'catalog/skills': 2,
};

const MODEL_LANE: Record<string, number> = {
  'models/backends': 3,
  'models/ollama': 4,
  'models/remote': 5,
};

const NODE_W = 140;
const NODE_H = 52;
const COL_GAP = 52;
const ROW_GAP = 64;
const BAND_PAD_Y = 28;
const BAND_LABEL_H = 22;
const MARGIN = 32;
const ROUTE_MARGIN = 56;
const MAX_LANES = 8;
const CLEARANCE = 8;

const BAND_LABELS: Record<TopologyBand, string> = {
  application: '1 · Application',
  reach: '2 · AO Reach',
  ao: '3 · Agentic Orchestration',
};

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; id?: string };

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
  if (node.kind === 'catalog' && CATALOG_LANE[node.id] != null) {
    lane = CATALOG_LANE[node.id];
    order = CATALOG_LANE[node.id];
  }
  if (node.kind === 'model-runtime' || node.kind === 'model-backend') {
    if (MODEL_LANE[node.id] != null) {
      lane = MODEL_LANE[node.id];
      order = MODEL_LANE[node.id];
    } else if (node.kind === 'model-backend') {
      lane = 3;
    }
  }
  if (node.id === 'speech/stt' || node.id === 'speech/tts') {
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
    return 'unknown';
  }
  if (!n.instrumented && n.status === 'healthy') return 'unknown';
  return n.status || 'unknown';
}

function inflate(n: PositionedNode, pad: number): Rect {
  return {
    x: n.x - pad,
    y: n.y - pad,
    w: n.width + pad * 2,
    h: n.height + pad * 2,
    id: n.id,
  };
}

/** Orthogonal segment vs axis-aligned rect (inclusive). */
function segHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const rx2 = r.x + r.w;
  const ry2 = r.y + r.h;
  if (Math.abs(a.x - b.x) < 0.5) {
    // vertical
    return a.x >= r.x && a.x <= rx2 && maxY >= r.y && minY <= ry2;
  }
  if (Math.abs(a.y - b.y) < 0.5) {
    // horizontal
    return a.y >= r.y && a.y <= ry2 && maxX >= r.x && minX <= rx2;
  }
  return false;
}

function pathHitsObstacles(pts: Pt[], obstacles: Rect[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    for (const o of obstacles) {
      if (segHitsRect(pts[i], pts[i + 1], o)) return true;
    }
  }
  return false;
}

function simplifyOrtho(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const colinear =
      (Math.abs(prev.x - cur.x) < 0.5 && Math.abs(cur.x - next.x) < 0.5) ||
      (Math.abs(prev.y - cur.y) < 0.5 && Math.abs(cur.y - next.y) < 0.5);
    if (!colinear) out.push(cur);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function toPathD(pts: Pt[]): string {
  const clean = simplifyOrtho(pts);
  return clean
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`)
    .join(' ');
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function ports(
  from: PositionedNode,
  to: PositionedNode
): { s: Pt; t: Pt; vertical: boolean } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dy = toCy - fromCy;
  const dx = toCx - fromCx;
  if (Math.abs(dy) >= Math.abs(dx)) {
    return {
      vertical: true,
      s: { x: fromCx, y: dy >= 0 ? from.y + from.height : from.y },
      t: { x: toCx, y: dy >= 0 ? to.y : to.y + to.height },
    };
  }
  return {
    vertical: false,
    s: { x: dx >= 0 ? from.x + from.width : from.x, y: fromCy },
    t: { x: dx >= 0 ? to.x : to.x + to.width, y: toCy },
  };
}

/** Build orthogonal candidates and pick the first that clears obstacles. */
export function routeEdgeOrthogonal(
  from: PositionedNode,
  to: PositionedNode,
  kind: string,
  allNodes: PositionedNode[],
  canvasWidth: number
): string {
  const { s, t } = ports(from, to);
  const obstacles = allNodes
    .filter((n) => n.id !== from.id && n.id !== to.id)
    .map((n) => inflate(n, CLEARANCE));

  const leftX = MARGIN / 2;
  const rightX = canvasWidth - MARGIN / 2;
  const midY = (s.y + t.y) / 2;
  const midX = (s.x + t.x) / 2;
  const gutterAbove = Math.min(s.y, t.y) - ROW_GAP / 3;
  const gutterBelow = Math.max(s.y, t.y) + ROW_GAP / 3;

  const offset = kind === 'reverse-tunnel' ? 16 : 0;
  const sx = s.x + offset;
  const tx = t.x + offset;

  const candidates: Pt[][] = [];

  if (kind === 'bypass') {
    candidates.push([
      { x: sx, y: s.y },
      { x: rightX, y: s.y },
      { x: rightX, y: t.y },
      { x: tx, y: t.y },
    ]);
  }

  // Same column: straight vertical (or with slight side jog if blocked)
  if (Math.abs(sx - tx) < 1) {
    candidates.push([
      { x: sx, y: s.y },
      { x: tx, y: t.y },
    ]);
    candidates.push([
      { x: sx, y: s.y },
      { x: sx + 24, y: s.y },
      { x: sx + 24, y: t.y },
      { x: tx, y: t.y },
    ]);
  }

  // Same row: straight horizontal
  if (Math.abs(s.y - t.y) < 1) {
    candidates.push([
      { x: sx, y: s.y },
      { x: tx, y: t.y },
    ]);
    candidates.push([
      { x: sx, y: s.y },
      { x: sx, y: gutterAbove },
      { x: tx, y: gutterAbove },
      { x: tx, y: t.y },
    ]);
  }

  // Elbows — right-angle only
  candidates.push([
    { x: sx, y: s.y },
    { x: sx, y: midY },
    { x: tx, y: midY },
    { x: tx, y: t.y },
  ]);
  candidates.push([
    { x: sx, y: s.y },
    { x: midX, y: s.y },
    { x: midX, y: t.y },
    { x: tx, y: t.y },
  ]);
  candidates.push([
    { x: sx, y: s.y },
    { x: sx, y: gutterBelow },
    { x: tx, y: gutterBelow },
    { x: tx, y: t.y },
  ]);
  candidates.push([
    { x: sx, y: s.y },
    { x: sx, y: gutterAbove },
    { x: tx, y: gutterAbove },
    { x: tx, y: t.y },
  ]);
  candidates.push([
    { x: sx, y: s.y },
    { x: leftX, y: s.y },
    { x: leftX, y: t.y },
    { x: tx, y: t.y },
  ]);
  candidates.push([
    { x: sx, y: s.y },
    { x: rightX, y: s.y },
    { x: rightX, y: t.y },
    { x: tx, y: t.y },
  ]);
  // Two-gutter detour (go around a mid-row cluster)
  candidates.push([
    { x: sx, y: s.y },
    { x: sx, y: gutterBelow },
    { x: rightX, y: gutterBelow },
    { x: rightX, y: gutterAbove },
    { x: tx, y: gutterAbove },
    { x: tx, y: t.y },
  ]);

  for (const c of candidates) {
    if (!pathHitsObstacles(c, obstacles)) {
      return toPathD(c);
    }
  }

  // Last resort: right margin corridor (canvas includes ROUTE_MARGIN)
  return toPathD([
    { x: sx, y: s.y },
    { x: rightX, y: s.y },
    { x: rightX, y: t.y },
    { x: tx, y: t.y },
  ]);
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
  const canvasContentW = MAX_LANES * colWidth + ROUTE_MARGIN;
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
      bands.push({
        id: band,
        label: BAND_LABELS[band],
        y,
        height: BAND_PAD_Y + BAND_LABEL_H + 40,
      });
      y += BAND_PAD_Y + BAND_LABEL_H + 40 + 16;
      continue;
    }

    const bandTop = y;
    y += BAND_PAD_Y + BAND_LABEL_H;

    for (const [, rowNodes] of bandRows) {
      const usedLanes = new Set<number>();
      for (const e of rowNodes) {
        let lane = Math.max(0, Math.min(MAX_LANES - 1, e.lane));
        while (usedLanes.has(lane) && lane < MAX_LANES - 1) lane += 1;
        // If still colliding at the end, wrap search leftward
        if (usedLanes.has(lane)) {
          for (let i = 0; i < MAX_LANES; i++) {
            if (!usedLanes.has(i)) {
              lane = i;
              break;
            }
          }
        }
        usedLanes.add(lane);
        const x = MARGIN + lane * colWidth;
        positioned.push({
          ...e.node,
          x,
          y,
          width: NODE_W,
          height: NODE_H,
          lane,
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
    y += 16;
  }

  const byId = new Map(positioned.map((n) => [n.id, n]));
  const positionedEdges: PositionedEdge[] = [];
  for (const e of edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) continue;
    const pathD = routeEdgeOrthogonal(
      from,
      to,
      String(e.kind || 'request'),
      positioned,
      width
    );
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

  for (const e of edges) {
    if (nodes.has(e.from) && nodes.has(e.to)) edgeIds.add(e.id);
  }

  return { nodes, edges: edgeIds };
}

export function slotForKind(kind: TopologyNodeKind) {
  return KIND_SLOT[kind] || null;
}

/** Test helper: axis-aligned bounding boxes of nodes must not overlap. */
export function nodesOverlap(a: PositionedNode, b: PositionedNode): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

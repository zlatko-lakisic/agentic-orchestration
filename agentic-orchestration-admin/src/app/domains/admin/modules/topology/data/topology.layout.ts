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
  app: { band: 'application', rank: 0, lane: 0, order: 0 },
  ui: { band: 'application', rank: 1, lane: 0, order: 0 },
  'overlay-source': { band: 'application', rank: 1, lane: 1, order: 0 },
  'local-tools': { band: 'application', rank: 1, lane: 2, order: 0 },
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
/** Wide header spanning the three child columns (UI · overlays · local tools). */
const APP_HEADER_W = NODE_W * 3 + 52 * 2;
const COL_GAP = 52;
const ROW_GAP = 64;
const BAND_PAD_Y = 28;
const BAND_LABEL_H = 22;
const MARGIN = 32;
const ROUTE_MARGIN = 56;
const MAX_LANES = 8;
const CLEARANCE = 8;
/** Perpendicular stub so wires leave/enter side centers, never run along card edges. */
const PORT_STUB = 14;

const APP_CHILD_LANE: Record<string, number> = {
  ui: 0,
  'overlay-source': 1,
  'local-tools': 2,
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort();
}

const BAND_LABELS: Record<TopologyBand, string> = {
  application: '1 · Application',
  reach: '2 · AO Reach',
  ao: '3 · Agentic Orchestration',
};

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; id?: string };
type Side = 'top' | 'bottom' | 'left' | 'right';

function slotFor(
  node: TopologyNode,
  appRankBase?: Map<string, number>
): {
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
  let rank = base.rank;

  // Per-app Application groups: header row + child trio under each appId.
  if (node.band === 'application' && node.appId && appRankBase) {
    const baseRank = appRankBase.get(node.appId) ?? 0;
    if (node.kind === 'app') {
      return { band: 'application', rank: baseRank, lane: 0, order: 0 };
    }
    if (APP_CHILD_LANE[node.kind] != null) {
      return {
        band: 'application',
        rank: baseRank + 1,
        lane: APP_CHILD_LANE[node.kind],
        order: APP_CHILD_LANE[node.kind],
      };
    }
  }

  if (node.kind === 'openclaw' && appRankBase && appRankBase.size) {
    const maxBase = Math.max(...appRankBase.values());
    return { band: 'application', rank: maxBase + 2, lane: 3, order: 0 };
  }

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
    rank,
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

function sideCenter(node: PositionedNode, side: Side): Pt {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (side) {
    case 'top':
      return { x: cx, y: node.y };
    case 'bottom':
      return { x: cx, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: cy };
    case 'right':
      return { x: node.x + node.width, y: cy };
  }
}

/** Point just outside the card, along the side normal. */
function stubOut(node: PositionedNode, side: Side, stub = PORT_STUB): Pt {
  const p = sideCenter(node, side);
  switch (side) {
    case 'top':
      return { x: p.x, y: p.y - stub };
    case 'bottom':
      return { x: p.x, y: p.y + stub };
    case 'left':
      return { x: p.x - stub, y: p.y };
    case 'right':
      return { x: p.x + stub, y: p.y };
  }
}

function chooseSides(
  from: PositionedNode,
  to: PositionedNode,
  kind: string
): { fromSide: Side; toSide: Side } {
  if (kind === 'bypass') {
    return { fromSide: 'right', toSide: 'right' };
  }
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dy = toCy - fromCy;
  const dx = toCx - fromCx;

  // Prefer top/bottom when mostly vertical so stacked cards connect mid-edge.
  if (Math.abs(dy) >= Math.abs(dx) * 0.75) {
    if (dy >= 0) return { fromSide: 'bottom', toSide: 'top' };
    return { fromSide: 'top', toSide: 'bottom' };
  }
  if (dx >= 0) return { fromSide: 'right', toSide: 'left' };
  return { fromSide: 'left', toSide: 'right' };
}

/**
 * Orthogonal route between exterior stubs. Never travels along a card edge:
 * the full path is always [sideCenter → stubOut → …manhattan… → stubIn → sideCenter].
 */
export function routeEdgeOrthogonal(
  from: PositionedNode,
  to: PositionedNode,
  kind: string,
  allNodes: PositionedNode[],
  canvasWidth: number
): string {
  const { fromSide, toSide } = chooseSides(from, to, kind);
  const portS = sideCenter(from, fromSide);
  const portT = sideCenter(to, toSide);
  let a = stubOut(from, fromSide);
  let b = stubOut(to, toSide);

  // Reverse-tunnel: slight lateral offset on the stubs only (ports stay centered).
  if (kind === 'reverse-tunnel') {
    const ox = 16;
    a = { x: a.x + ox, y: a.y };
    b = { x: b.x + ox, y: b.y };
  }

  const obstacles = allNodes
    .filter((n) => n.id !== from.id && n.id !== to.id)
    .map((n) => inflate(n, CLEARANCE));

  const leftX = MARGIN / 2;
  const rightX = canvasWidth - MARGIN / 2;
  const midY = (a.y + b.y) / 2;
  const midX = (a.x + b.x) / 2;
  const gutterAbove = Math.min(a.y, b.y) - Math.max(12, ROW_GAP / 4);
  const gutterBelow = Math.max(a.y, b.y) + Math.max(12, ROW_GAP / 4);

  const midCandidates: Pt[][] = [];

  if (kind === 'bypass') {
    midCandidates.push([
      a,
      { x: rightX, y: a.y },
      { x: rightX, y: b.y },
      b,
    ]);
  }

  // Direct alignment
  if (Math.abs(a.x - b.x) < 0.5) {
    midCandidates.push([a, b]);
  }
  if (Math.abs(a.y - b.y) < 0.5) {
    midCandidates.push([a, b]);
  }

  // Standard elbows (route only between stubs — never along node borders)
  midCandidates.push([a, { x: a.x, y: midY }, { x: b.x, y: midY }, b]);
  midCandidates.push([a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]);
  midCandidates.push([
    a,
    { x: a.x, y: gutterBelow },
    { x: b.x, y: gutterBelow },
    b,
  ]);
  midCandidates.push([
    a,
    { x: a.x, y: gutterAbove },
    { x: b.x, y: gutterAbove },
    b,
  ]);
  midCandidates.push([
    a,
    { x: leftX, y: a.y },
    { x: leftX, y: b.y },
    b,
  ]);
  midCandidates.push([
    a,
    { x: rightX, y: a.y },
    { x: rightX, y: b.y },
    b,
  ]);
  midCandidates.push([
    a,
    { x: a.x, y: gutterBelow },
    { x: rightX, y: gutterBelow },
    { x: rightX, y: gutterAbove },
    { x: b.x, y: gutterAbove },
    b,
  ]);
  midCandidates.push([
    a,
    { x: a.x, y: gutterAbove },
    { x: leftX, y: gutterAbove },
    { x: leftX, y: gutterBelow },
    { x: b.x, y: gutterBelow },
    b,
  ]);

  for (const mid of midCandidates) {
    if (!pathHitsObstacles(mid, obstacles)) {
      return toPathD([portS, ...mid, portT]);
    }
  }

  return toPathD([
    portS,
    a,
    { x: rightX, y: a.y },
    { x: rightX, y: b.y },
    b,
    portT,
  ]);
}

/** Parse path endpoints for tests. */
export function pathEndpoints(pathD: string): { start: Pt; end: Pt } | null {
  const nums = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!nums || nums.length < 4) return null;
  return {
    start: { x: nums[0], y: nums[1] },
    end: { x: nums[nums.length - 2], y: nums[nums.length - 1] },
  };
}

export function isSideCenter(
  node: PositionedNode,
  p: Pt,
  tol = 1.5
): Side | null {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  if (Math.abs(p.x - cx) <= tol && Math.abs(p.y - node.y) <= tol) return 'top';
  if (
    Math.abs(p.x - cx) <= tol &&
    Math.abs(p.y - (node.y + node.height)) <= tol
  ) {
    return 'bottom';
  }
  if (Math.abs(p.y - cy) <= tol && Math.abs(p.x - node.x) <= tol) return 'left';
  if (
    Math.abs(p.y - cy) <= tol &&
    Math.abs(p.x - (node.x + node.width)) <= tol
  ) {
    return 'right';
  }
  return null;
}

export function layoutTopology(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  opts?: { showNotDeployed?: boolean }
): LayoutResult {
  const showNotDeployed = opts?.showNotDeployed ?? false;
  const visible = nodes.filter((n) => showNotDeployed || n.deployed !== false);

  const appIds = uniqueSorted(
    visible
      .filter((n) => n.band === 'application' && n.appId)
      .map((n) => String(n.appId))
  );
  const appRankBase = new Map(appIds.map((id, i) => [id, i * 2]));

  const enriched = visible.map((n) => {
    const s = slotFor(n, appRankBase);
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
        const isAppHeader = e.node.kind === 'app';
        const width = isAppHeader ? APP_HEADER_W : NODE_W;
        // Header spans lanes 0–2; do not place other nodes in those lanes on this row.
        if (isAppHeader) {
          usedLanes.add(1);
          usedLanes.add(2);
        }
        const x = MARGIN + lane * colWidth;
        positioned.push({
          ...e.node,
          x,
          y,
          width,
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

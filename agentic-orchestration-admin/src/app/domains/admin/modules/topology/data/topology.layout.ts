import {
  LayoutResult,
  PositionedEdge,
  PositionedNode,
  TopologyAppGroup,
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
  openclaw: { band: 'application', rank: 0, lane: 0, order: 0 },
  'ao-web': { band: 'application', rank: 0, lane: 1, order: 0 },
  'ao-chat': { band: 'application', rank: 0, lane: 2, order: 0 },
  'web-api-client': { band: 'application', rank: 0, lane: 3, order: 0 },

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
  'k8s-workload': { band: 'ao', rank: 5, lane: 0, order: 0 },
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
/** Wider header card for accordion expanders (Application appId or Kubernetes). */
const EXPAND_PANEL_W = 168;
const COL_GAP = 52;
const ROW_GAP = 64;
const BAND_PAD_Y = 28;
const BAND_LABEL_H = 22;
/** Vertical air between Application · Reach · AO band rectangles. */
const BAND_GAP = 56;
const MARGIN = 32;
const ROUTE_MARGIN = 56;
const MAX_LANES = 8;
const CLEARANCE = 8;
/** Perpendicular stub so wires leave/enter side centers, never run along card edges. */
const PORT_STUB = 14;
/** Horizontal gap between Reach-apps and Web-API family frames. */
const APP_FAMILY_GAP = 56;
/** Extra top padding inside each Application family frame for its label. */
const APP_FAMILY_LABEL_H = 20;
const APP_FAMILY_PAD = 12;

const APP_CHILD_LANE: Record<string, number> = {
  ui: 0,
  'overlay-source': 1,
  'local-tools': 2,
};

/** Non-Reach Application clients that bypass to Web UI (right family). */
const BYPASS_APP_LANE: Record<string, number> = {
  openclaw: 0,
  'ao-web': 1,
  'ao-chat': 2,
  'web-api-client': 3,
};

/** Preferred left-to-right order inside the Web API family. */
const WEB_API_KIND_ORDER: Record<string, number> = {
  'ao-web': 0,
  'ao-chat': 1,
  openclaw: 2,
  'web-api-client': 3,
};

function sortWebApiIds(ids: string[], kindById: Map<string, string>): string[] {
  return [...ids].sort((a, b) => {
    const ka = WEB_API_KIND_ORDER[kindById.get(a) || ''] ?? 50;
    const kb = WEB_API_KIND_ORDER[kindById.get(b) || ''] ?? 50;
    if (ka !== kb) return ka - kb;
    return a.localeCompare(b);
  });
}

const APP_FAMILY_LABEL: Record<TopologyAppGroup, string> = {
  reach: 'Reach apps',
  'web-api': 'Web API',
};

function isBypassAppKind(kind: string): boolean {
  return BYPASS_APP_LANE[kind] != null;
}

/** Resolve Application-band family (Reach framework vs Web API bypass). */
export function resolveAppGroup(
  node: Pick<TopologyNode, 'band' | 'kind' | 'appGroup'>
): TopologyAppGroup | null {
  if (node.band !== 'application') return null;
  if (node.appGroup === 'reach' || node.appGroup === 'web-api') {
    return node.appGroup;
  }
  if (isBypassAppKind(String(node.kind))) return 'web-api';
  return 'reach';
}

export type LayoutTopologyOpts = {
  showNotDeployed?: boolean;
  /** When set, only that appId's child components are laid out (others stay minimized panels). */
  expandedAppId?: string | null;
  /** When set to `platform/k3s`, show nested k8s workload children. */
  expandedK8sId?: string | null;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort();
}

const BAND_LABELS: Record<TopologyBand, string> = {
  application: '1 · Application',
  /** Canvas renders AO mark + "Reach" (no text "AO"). */
  reach: '2 · Reach',
  /** Canvas renders AO mark left of the product name. */
  ao: '3 · Agentic Orchestration',
};

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; id?: string };
type Side = 'top' | 'bottom' | 'left' | 'right';

function slotFor(
  node: TopologyNode,
  appLaneById?: Map<string, number>,
  expandedAppId?: string | null
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

  // Application accordion: all app panels on rank 0 (LTR); expanded children on rank 1.
  if (node.band === 'application' && node.appId && appLaneById) {
    if (node.kind === 'app') {
      const appLane = appLaneById.get(node.appId) ?? 0;
      return { band: 'application', rank: 0, lane: appLane, order: appLane };
    }
    if (APP_CHILD_LANE[node.kind] != null) {
      // Only the expanded app's children are present; park under lanes 0–2.
      return {
        band: 'application',
        rank: 1,
        lane: APP_CHILD_LANE[node.kind],
        order: APP_CHILD_LANE[node.kind],
      };
    }
  }

  if (isBypassAppKind(node.kind)) {
    // Web API family sits on the header row (rank 0), beside Reach panels.
    return {
      band: 'application',
      rank: 0,
      lane: BYPASS_APP_LANE[node.kind] ?? 0,
      order: BYPASS_APP_LANE[node.kind] ?? 0,
    };
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
  if (node.kind === 'k8s-workload') {
    return {
      band: 'ao',
      rank: 5,
      lane: 0,
      order: 0,
    };
  }
  return {
    band: (node.band || base.band) as TopologyBand,
    rank,
    lane,
    order,
  };
}

/** Hide other apps' components while one panel is expanded (or all when collapsed). */
function filterApplicationAccordion(
  nodes: TopologyNode[],
  expandedAppId: string | null | undefined
): TopologyNode[] {
  return nodes.filter((n) => {
    if (n.band !== 'application' || !n.appId) return true;
    if (n.kind === 'app' || isBypassAppKind(n.kind)) return true;
    if (APP_CHILD_LANE[n.kind] == null) return true;
    // Children only when their app panel is expanded.
    return Boolean(expandedAppId) && n.appId === expandedAppId;
  });
}

/** Hide nested k8s workloads until the Kubernetes platform node is expanded. */
function filterK8sAccordion(
  nodes: TopologyNode[],
  expandedK8sId: string | null | undefined
): TopologyNode[] {
  return nodes.filter((n) => {
    if (n.kind !== 'k8s-workload') return true;
    return expandedK8sId === 'platform/k3s' || expandedK8sId === n.parent;
  });
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
  opts?: LayoutTopologyOpts
): LayoutResult {
  const showNotDeployed = opts?.showNotDeployed ?? false;
  const expandedAppId = opts?.expandedAppId ?? null;
  const expandedK8sId = opts?.expandedK8sId ?? null;
  const deployed = nodes.filter((n) => showNotDeployed || n.deployed !== false);
  const afterApps = filterApplicationAccordion(deployed, expandedAppId);
  const visible = filterK8sAccordion(afterApps, expandedK8sId);

  const appIds = uniqueSorted(
    visible
      .filter((n) => n.kind === 'app' && n.appId)
      .map((n) => String(n.appId))
  );
  const appLaneById = new Map(appIds.map((id, i) => [id, i]));

  const webApiRawIds = visible
    .filter((n) => resolveAppGroup(n) === 'web-api')
    .map((n) => n.id);
  const kindById = new Map(visible.map((n) => [n.id, String(n.kind)]));
  const webApiIds = sortWebApiIds(uniqueSorted(webApiRawIds), kindById);
  const webApiLaneById = new Map(webApiIds.map((id, i) => [id, i]));

  const reachFamilyNodes = visible.filter(
    (n) => resolveAppGroup(n) === 'reach'
  );
  const reachPanelCount = reachFamilyNodes.filter((n) => n.kind === 'app').length;
  const webApiCount = webApiIds.length;
  /** Expanded Reach children occupy lanes 0–2 on the grid under the headers. */
  const reachChildRowW =
    3 * NODE_W + Math.max(0, 2) * COL_GAP;
  let reachSectionW = 0;
  if (reachPanelCount > 0) {
    reachSectionW =
      reachPanelCount * EXPAND_PANEL_W +
      Math.max(0, reachPanelCount - 1) * COL_GAP;
  } else if (reachFamilyNodes.length > 0) {
    // Tests / odd graphs with Reach children but no app header still reserve left space.
    reachSectionW =
      reachFamilyNodes.length * NODE_W +
      Math.max(0, reachFamilyNodes.length - 1) * COL_GAP;
  }
  // When a Reach app is expanded, the child row can be wider than the header row —
  // push Web API far enough right so it does not sit on top of UI / overlays / tools.
  if (expandedAppId) {
    reachSectionW = Math.max(reachSectionW, reachChildRowW);
  }
  const webApiSectionW =
    webApiCount > 0
      ? webApiCount * NODE_W + Math.max(0, webApiCount - 1) * COL_GAP
      : 0;
  const webApiOriginX =
    MARGIN + (reachSectionW > 0 ? reachSectionW + APP_FAMILY_GAP : 0);

  const k8sIds = uniqueSorted(
    visible.filter((n) => n.kind === 'k8s-workload').map((n) => n.id)
  );
  const k8sLaneById = new Map(k8sIds.map((id, i) => [id, i]));

  const enriched = visible.map((n) => {
    const s = slotFor(n, appLaneById, expandedAppId);
    if (n.kind === 'k8s-workload') {
      const lane = k8sLaneById.get(n.id) ?? 0;
      return { node: n, band: 'ao' as TopologyBand, rank: 5, lane, order: lane };
    }
    if (resolveAppGroup(n) === 'web-api') {
      const lane = webApiLaneById.get(n.id) ?? s.lane;
      return {
        node: n,
        band: 'application' as TopologyBand,
        rank: 0,
        lane,
        order: lane,
      };
    }
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
  const appRowW =
    (reachSectionW > 0 ? reachSectionW : 0) +
    (reachSectionW > 0 && webApiSectionW > 0 ? APP_FAMILY_GAP : 0) +
    webApiSectionW;
  const k8sChildCount = k8sIds.length;
  const k8sExpandRowW =
    k8sChildCount > 0
      ? Math.max(
          EXPAND_PANEL_W,
          k8sChildCount * NODE_W + Math.max(0, k8sChildCount - 1) * COL_GAP
        )
      : 0;
  const canvasContentW = Math.max(
    MAX_LANES * colWidth + ROUTE_MARGIN,
    appRowW + ROUTE_MARGIN,
    k8sExpandRowW + ROUTE_MARGIN
  );
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
      y += BAND_PAD_Y + BAND_LABEL_H + 40 + BAND_GAP;
      continue;
    }

    const bandTop = y;
    y += BAND_PAD_Y + BAND_LABEL_H;
    // Room for Reach apps / Web API family labels above the node row.
    if (band === 'application' && (reachPanelCount > 0 || webApiCount > 0)) {
      y += APP_FAMILY_LABEL_H + 4;
    }

    for (const [, rowNodes] of bandRows) {
      const usedLanes = new Set<number>();
      for (const e of rowNodes) {
        const isAppHeader = e.node.kind === 'app';
        const isWebApi = resolveAppGroup(e.node) === 'web-api';
        const isExpandHeader =
          isAppHeader ||
          Boolean(e.node.expandable && e.node.kind === 'platform');
        const isK8sChild = e.node.kind === 'k8s-workload';
        let lane = e.lane;
        if (!isAppHeader && !isWebApi) {
          // K8s children may exceed MAX_LANES when the panel is expanded —
          // keep their assigned lane so the group frame can grow wider.
          if (isK8sChild) {
            lane = Math.max(0, e.lane);
          } else {
            lane = Math.max(0, Math.min(MAX_LANES - 1, e.lane));
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
          }
        }
        const nodeW = isExpandHeader ? EXPAND_PANEL_W : NODE_W;
        // Reach accordion headers: own pitch. Web API family: right of Reach section.
        // Expandable platform keeps the AO column grid but uses the wider card.
        let x: number;
        if (isWebApi) {
          x = webApiOriginX + e.lane * colWidth;
        } else if (isAppHeader) {
          x = MARGIN + e.lane * (EXPAND_PANEL_W + COL_GAP);
        } else {
          x = MARGIN + lane * colWidth;
        }
        positioned.push({
          ...e.node,
          x,
          y,
          width: nodeW,
          height: NODE_H,
          lane: isAppHeader || isWebApi ? e.lane : lane,
          rank: e.rank,
          order: e.order,
          displayStatus: displayStatus(e.node),
        });
      }
      y += NODE_H + ROW_GAP;
    }

    // Trim trailing row gap inside the band so padding is even top/bottom.
    const bandHeight = y - bandTop - ROW_GAP + BAND_PAD_Y;
    bands.push({
      id: band,
      label: BAND_LABELS[band],
      y: bandTop,
      height: Math.max(bandHeight, BAND_PAD_Y + BAND_LABEL_H + NODE_H + BAND_PAD_Y),
    });
    y = bandTop + bands[bands.length - 1].height + BAND_GAP;
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

  const applicationFamilies = buildApplicationFamilyFrames(positioned);

  return {
    width,
    height: y + MARGIN,
    bands,
    applicationFamilies,
    nodes: positioned,
    edges: positionedEdges,
  };
}

function boundsOfNodes(
  list: PositionedNode[],
  pad: number
): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of list) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

function familyHasVisibleApps(
  family: TopologyAppGroup,
  list: PositionedNode[]
): boolean {
  if (!list.length) return false;
  if (family === 'reach') {
    // Real Reach clients only (ignore legacy waiting placeholders).
    return list.some(
      (n) =>
        (n.kind === 'app' && Boolean(n.appId) && n.id !== 'app/waiting') ||
        Boolean(n.appId && APP_CHILD_LANE[n.kind] != null)
    );
  }
  // Web API: any deployed bypass client counts.
  return list.some((n) => n.deployed !== false);
}

function buildApplicationFamilyFrames(
  positioned: PositionedNode[]
): NonNullable<LayoutResult['applicationFamilies']> {
  const byFamily = new Map<TopologyAppGroup, PositionedNode[]>();
  for (const n of positioned) {
    const family = resolveAppGroup(n);
    if (!family) continue;
    if (n.id === 'app/waiting') continue;
    const list = byFamily.get(family) || [];
    list.push(n);
    byFamily.set(family, list);
  }
  const frames: NonNullable<LayoutResult['applicationFamilies']> = [];
  for (const id of ['reach', 'web-api'] as TopologyAppGroup[]) {
    const list = byFamily.get(id);
    if (!list?.length || !familyHasVisibleApps(id, list)) continue;
    const box = boundsOfNodes(list, APP_FAMILY_PAD);
    frames.push({
      id,
      label: APP_FAMILY_LABEL[id],
      x: box.x,
      y: box.y - APP_FAMILY_LABEL_H,
      width: box.width,
      height: box.height + APP_FAMILY_LABEL_H,
    });
  }
  return frames;
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

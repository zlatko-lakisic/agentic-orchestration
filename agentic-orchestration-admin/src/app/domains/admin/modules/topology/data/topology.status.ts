/** Canvas / legend marks for TopologyNodeStatus. Colour is secondary to the glyph. */

export type StatusMark = {
  id: string;
  label: string;
  /** Lucide svgIcon name. */
  icon: string;
  /** Compact unicode for table / tests. */
  glyph: string;
  color: string;
};

const MARKS = {
  healthy: {
    id: 'healthy',
    label: 'healthy',
    icon: 'check',
    glyph: '✓',
    color: '#16a34a',
  },
  degraded: {
    id: 'degraded',
    label: 'degraded',
    icon: 'triangle-alert',
    glyph: '▲',
    color: '#eab308',
  },
  failed: {
    id: 'failed',
    label: 'failed',
    icon: 'x',
    glyph: '✕',
    color: '#dc2626',
  },
  starting: {
    id: 'starting',
    label: 'starting',
    icon: 'loader-circle',
    glyph: '◐',
    color: '#0284c7',
  },
  draining: {
    id: 'draining',
    label: 'draining',
    icon: 'circle-arrow-down',
    glyph: '↓',
    color: '#64748b',
  },
  offline: {
    id: 'offline',
    label: 'offline',
    icon: 'circle-off',
    glyph: '○',
    color: '#a3a3a3',
  },
} as const satisfies Record<string, StatusMark>;

const VISIBLE = new Set<string>(Object.keys(MARKS));

/**
 * Topology never shows `unknown`. Idle / present-but-unprobed → healthy;
 * disabled / unset / not deployed → offline.
 */
export function visibleNodeStatus(
  status: string | null | undefined,
  deployed: boolean | undefined = true
): string {
  const s = String(status || '').trim().toLowerCase();
  if (VISIBLE.has(s)) return s;
  return deployed === false ? 'offline' : 'healthy';
}

/** Legend order. */
export const STATUS_MARK_LIST: StatusMark[] = [
  MARKS.healthy,
  MARKS.degraded,
  MARKS.failed,
  MARKS.starting,
  MARKS.draining,
  MARKS.offline,
];

export function statusMark(status: string | null | undefined): StatusMark {
  const key = visibleNodeStatus(status, true) as keyof typeof MARKS;
  return MARKS[key];
}

export function statusGlyph(status: string | null | undefined): string {
  return statusMark(status).glyph;
}

export function statusGlyphColor(status: string | null | undefined): string {
  return statusMark(status).color;
}

export function statusIcon(status: string | null | undefined): string {
  return statusMark(status).icon;
}

import { themeForKind, TopologyKindTheme } from '@/app/domains/admin/modules/topology/data/topology.theme';

/** Map sequence-diagram participant labels to Topology node kinds (shared accents). */
export function topologyKindForTraceActor(actor: string): string {
  const a = String(actor || '')
    .trim()
    .toLowerCase()
    .replace(/^participant\s+/i, '');
  const raw = a.includes(' as ') ? a.split(' as ').pop()!.trim() : a;
  const id = raw.replace(/\s+/g, '_');

  if (id === 'client' || id.startsWith('client')) return 'ui';
  if (id === 'planner' || id.includes('planner')) return 'planner';
  if (id === 'engine' || id.includes('engine')) return 'engine';
  if (id === 'orchestrator' || id.includes('orchestrator')) return 'execution-backend';
  if (id === 'mcp' || id.startsWith('mcp')) return 'mcp-sidecar';
  if (id === 'skills' || id.startsWith('skills')) return 'catalog';
  if (id.startsWith('agent:') || id.startsWith('agent_')) {
    return id.includes('ollama') ? 'model-runtime' : 'catalog';
  }
  if (id.includes('ollama') || id.includes('model')) return 'model-runtime';
  if (id.includes('inprocess') || id.includes('worker')) return 'worker';
  return 'platform';
}

export function themeForTraceActor(actor: string): TopologyKindTheme {
  return themeForKind(topologyKindForTraceActor(actor));
}

/** Short display label for Mermaid participant boxes (avoid cut-off). */
export function shortTraceActorLabel(actor: string): string {
  const a = String(actor || '').trim();
  if (a.toLowerCase().startsWith('agent:')) {
    const id = a.slice(6);
    return id.length > 22 ? `${id.slice(0, 21)}…` : id;
  }
  return a.length > 28 ? `${a.slice(0, 27)}…` : a;
}

/**
 * Append Mermaid `style` directives so participant boxes use Topology accents.
 * Works when the loaded Mermaid build supports sequence style (11.x+); post-SVG
 * pass still applies left bars and lifelines.
 */
export function enrichMermaidWithTopologyStyles(source: string): string {
  const src = String(source || '').trim();
  if (!src) return src;
  const dark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');
  const fill = dark ? '#171717' : '#ffffff';
  const color = dark ? '#f5f5f5' : '#171717';

  const lines = src.split(/\r?\n/);
  const styleLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const m = line.match(/^\s*participant\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (!m) continue;
    const pid = m[1];
    const label = (m[2] || pid).trim();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const accent = themeForTraceActor(label).accent;
    styleLines.push(
      `  style ${pid} fill:${fill},stroke:${accent},stroke-width:1.5px,color:${color}`
    );
  }

  if (!styleLines.length) return src;
  return `${src}\n${styleLines.join('\n')}`;
}

/**
 * Restyle Mermaid sequence actor boxes to match Topology nodes:
 * surface fill, accent stroke, left accent bar, accent-tinted lifeline.
 */
export function applyTopologyStylesToMermaidSvg(svg: SVGSVGElement): void {
  const dark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');
  const surface = dark ? '#171717' : '#ffffff';
  const text = dark ? '#f5f5f5' : '#171717';
  const arrowAccent = themeForKind('session-bridge').accent;

  const actorRects = Array.from(
    svg.querySelectorAll<SVGRectElement>(
      'g[class*="actor"] > rect, rect.actor, .actor-man rect, g.actor rect, g.participant > rect'
    )
  ).filter((r) => Number(r.getAttribute('width') || 0) > 20);

  if (!actorRects.length) return;

  const topY = Math.min(...actorRects.map((r) => Number(r.getAttribute('y') || 0)));
  const topRects = actorRects.filter(
    (r) => Math.abs(Number(r.getAttribute('y') || 0) - topY) < 3
  );

  const allTexts = Array.from(svg.querySelectorAll('text'));

  topRects.forEach((rect, i) => {
    const x = Number(rect.getAttribute('x') || 0);
    const y = Number(rect.getAttribute('y') || 0);
    const w = Number(rect.getAttribute('width') || 0);
    const h = Number(rect.getAttribute('height') || 0);
    const cx = x + w / 2;

    let label = '';
    let best = Infinity;
    for (const t of allTexts) {
      let tx = Number(t.getAttribute('x') || NaN);
      let ty = Number(t.getAttribute('y') || NaN);
      try {
        const bx = t.getBBox();
        tx = bx.x + bx.width / 2;
        ty = bx.y + bx.height / 2;
      } catch {
        /* foreignObject / hidden */
      }
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
      if (Math.abs(ty - (y + h / 2)) > h) continue;
      const d = Math.abs(tx - cx);
      if (d < best && d < w) {
        best = d;
        label = (t.textContent || '').trim();
      }
    }
    if (!label) {
      const g = rect.closest('g');
      const gt = g?.querySelector('text');
      label = (gt?.textContent || '').trim();
    }

    const theme = themeForTraceActor(label || 'platform');
    const accent = theme.accent;

    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', surface);
    rect.setAttribute('stroke', accent);
    rect.setAttribute('stroke-width', '1.5');
    rect.style.setProperty('fill', surface, 'important');
    rect.style.setProperty('stroke', accent, 'important');

    const parent = rect.parentNode;
    if (parent) {
      parent.querySelector(`[data-ao-accent="${i}"]`)?.remove();
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('data-ao-accent', String(i));
      bar.setAttribute('x', String(x));
      bar.setAttribute('y', String(y));
      bar.setAttribute('width', '4');
      bar.setAttribute('height', String(h));
      bar.setAttribute('rx', '2');
      bar.setAttribute('fill', accent);
      bar.style.fill = accent;
      parent.insertBefore(bar, rect.nextSibling);
    }

    const g = rect.closest('g');
    g?.querySelectorAll('text').forEach((t) => {
      t.setAttribute('fill', text);
      (t as SVGElement).style.setProperty('fill', text, 'important');
    });

    svg.querySelectorAll('line.actor-line, .actor-line, line').forEach((line) => {
      const x1 = Number(line.getAttribute('x1') || 0);
      const x2 = Number(line.getAttribute('x2') || 0);
      const y1 = Number(line.getAttribute('y1') || 0);
      const y2 = Number(line.getAttribute('y2') || 0);
      const vertical = Math.abs(x1 - x2) < 1.5 && Math.abs(y2 - y1) > 24;
      if (vertical && Math.abs(x1 - cx) < 12) {
        line.setAttribute('stroke', accent);
        line.setAttribute('stroke-opacity', '0.4');
        (line as SVGElement).style.setProperty('stroke', accent, 'important');
      }
    });
  });

  svg
    .querySelectorAll(
      'path.messageLine0, path.messageLine1, line.messageLine0, line.messageLine1, .messageLine0, .messageLine1'
    )
    .forEach((el) => {
      el.setAttribute('stroke', arrowAccent);
      (el as SVGElement).style.setProperty('stroke', arrowAccent, 'important');
    });
}

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

/** Mix accent into surface (topology-like subtle tint). */
export function tintedSurface(accent: string, dark: boolean): string {
  // Approximate color-mix without CSSOM: blend ~14% accent into surface.
  const surface = dark ? [23, 23, 23] : [255, 255, 255];
  const rgb = parseHex(accent);
  if (!rgb) return dark ? '#171717' : '#ffffff';
  const t = 0.14;
  const mix = surface.map((c, i) => Math.round(c * (1 - t) + rgb[i]! * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    return [
      parseInt(h[0]! + h[0]!, 16),
      parseInt(h[1]! + h[1]!, 16),
      parseInt(h[2]! + h[2]!, 16),
    ];
  }
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export type TraceIconLoader = (iconName: string) => Promise<SVGElement | null>;

/**
 * Restyle Mermaid sequence actor boxes to match Topology nodes:
 * tinted surface, accent stroke, left accent bar, icon, accent lifeline.
 */
export async function applyTopologyStylesToMermaidSvg(
  svg: SVGSVGElement,
  loadIcon?: TraceIconLoader
): Promise<void> {
  const dark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');
  const text = dark ? '#f5f5f5' : '#171717';
  const muted = dark ? '#a3a3a3' : '#737373';
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

  for (let i = 0; i < topRects.length; i++) {
    const rect = topRects[i]!;
    const x = Number(rect.getAttribute('x') || 0);
    const y = Number(rect.getAttribute('y') || 0);
    const w = Number(rect.getAttribute('width') || 0);
    const h = Number(rect.getAttribute('height') || 0);
    const cx = x + w / 2;

    let label = '';
    let labelText: SVGTextElement | null = null;
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
        labelText = t;
      }
    }
    if (!label) {
      const g = rect.closest('g');
      const gt = g?.querySelector('text') ?? null;
      label = (gt?.textContent || '').trim();
      labelText = gt;
    }

    const theme = themeForTraceActor(label || 'platform');
    const accent = theme.accent;
    const fill = tintedSurface(accent, dark);

    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', accent);
    rect.setAttribute('stroke-width', '1.5');
    rect.style.setProperty('fill', fill, 'important');
    rect.style.setProperty('stroke', accent, 'important');
    rect.style.setProperty('stroke-width', '1.5px', 'important');

    const parent = rect.parentNode as SVGGElement | null;
    if (parent) {
      parent.querySelectorAll(`[data-ao-topo="${i}"]`).forEach((n) => n.remove());

      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('data-ao-topo', String(i));
      bar.setAttribute('x', String(x));
      bar.setAttribute('y', String(y));
      bar.setAttribute('width', '4');
      bar.setAttribute('height', String(h));
      bar.setAttribute('rx', '2');
      bar.setAttribute('fill', accent);
      bar.style.fill = accent;
      parent.insertBefore(bar, rect.nextSibling);

      // Icon (topology node signature)
      if (loadIcon) {
        try {
          const iconSvg = await loadIcon(theme.icon);
          if (iconSvg) {
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('data-ao-topo', String(i));
            fo.setAttribute('x', String(x + 10));
            fo.setAttribute('y', String(y + Math.max(6, (h - 18) / 2)));
            fo.setAttribute('width', '18');
            fo.setAttribute('height', '18');
            const wrap = document.createElement('div');
            wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            wrap.style.cssText =
              'display:flex;width:18px;height:18px;align-items:center;justify-content:center;color:' +
              accent;
            const cloned = iconSvg.cloneNode(true) as SVGElement;
            cloned.setAttribute('width', '16');
            cloned.setAttribute('height', '16');
            cloned.style.cssText = `width:16px;height:16px;display:block;color:${accent};fill:currentColor;`;
            cloned.querySelectorAll('[fill]').forEach((el) => {
              if (el.getAttribute('fill') !== 'none') el.setAttribute('fill', 'currentColor');
            });
            cloned.querySelectorAll('[stroke]').forEach((el) => {
              if (el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', 'currentColor');
            });
            wrap.appendChild(cloned);
            fo.appendChild(wrap);
            parent.appendChild(fo);

            // Nudge label right to clear icon
            if (labelText) {
              try {
                const bx = labelText.getBBox();
                const targetX = x + 32 + Math.max(0, (w - 40 - bx.width) / 2);
                labelText.setAttribute('x', String(targetX));
                labelText.style.setProperty('text-anchor', 'start', 'important');
              } catch {
                /* ignore */
              }
            }
          }
        } catch {
          /* icons optional */
        }
      }

      // Secondary aspect caption under label (topology-style meta)
      const aspect = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      aspect.setAttribute('data-ao-topo', String(i));
      aspect.setAttribute('x', String(cx + (loadIcon ? 8 : 0)));
      aspect.setAttribute('y', String(y + h - 8));
      aspect.setAttribute('text-anchor', 'middle');
      aspect.setAttribute('fill', muted);
      aspect.style.cssText = `fill:${muted};font-size:9px;font-family:inherit;`;
      aspect.textContent = theme.aspect;
      // Only add if box is tall enough; otherwise skip to avoid overlap
      if (h >= 48) parent.appendChild(aspect);
    }

    const g = rect.closest('g');
    g?.querySelectorAll('text').forEach((t) => {
      if (t.getAttribute('data-ao-topo') != null) return;
      t.setAttribute('fill', text);
      (t as SVGElement).style.setProperty('fill', text, 'important');
      (t as SVGElement).style.setProperty('font-weight', '500', 'important');
      (t as SVGElement).style.setProperty('font-size', '12px', 'important');
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
  }

  svg
    .querySelectorAll(
      'path.messageLine0, path.messageLine1, line.messageLine0, line.messageLine1, .messageLine0, .messageLine1'
    )
    .forEach((el) => {
      el.setAttribute('stroke', arrowAccent);
      (el as SVGElement).style.setProperty('stroke', arrowAccent, 'important');
    });
}

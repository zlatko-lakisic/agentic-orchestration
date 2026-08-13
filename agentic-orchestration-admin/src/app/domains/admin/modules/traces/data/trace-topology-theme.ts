import { themeForKind, TopologyKindTheme } from '@/app/domains/admin/modules/topology/data/topology.theme';

/** Fuse uses `scheme-dark` / `scheme-light` on <html>, not Tailwind's `.dark`. */
export function isAoDarkScheme(): boolean {
  if (typeof document === 'undefined') return true;
  const root = document.documentElement;
  return (
    root.classList.contains('scheme-dark') ||
    root.classList.contains('dark') ||
    (!root.classList.contains('scheme-light') &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

/**
 * SVG/Canvas paints cannot use CSS `light-dark()` (what `--mat-sys-*` stores).
 * Always return a concrete hex that matches Topology node cards.
 */
export function topologyPanelSurface(): string {
  return isAoDarkScheme() ? '#171717' : '#ffffff';
}

export function topologyPanelText(): string {
  return isAoDarkScheme() ? '#f5f5f5' : '#171717';
}

export function topologyPanelMuted(): string {
  return isAoDarkScheme() ? '#a3a3a3' : '#737373';
}

export function topologyPanelCanvas(): string {
  return isAoDarkScheme() ? '#0a0a0a' : '#fafafa';
}

/** True if a string is safe to use as an SVG fill/stroke. */
export function isSvgPaintColor(value: string): boolean {
  const v = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^rgba?\(/i.test(v);
}

/** Prefer hex tokens; never pass unresolved CSS functions into Mermaid/SVG. */
export function svgSafeColor(value: string, fallback: string): string {
  const v = String(value || '').trim();
  return isSvgPaintColor(v) ? v : fallback;
}

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

export type TraceIconLoader = (iconName: string) => Promise<SVGElement | null>;

/**
 * Restyle Mermaid sequence actor boxes to match Topology nodes:
 * mat-sys surface fill, accent stroke, left accent bar, icon, accent lifeline.
 */
export async function applyTopologyStylesToMermaidSvg(
  svg: SVGSVGElement,
  loadIcon?: TraceIconLoader
): Promise<void> {
  const surface = topologyPanelSurface();
  const text = topologyPanelText();
  const muted = topologyPanelMuted();
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
    const padL = 10;
    const iconSize = 16;
    const iconGap = 6;
    const padR = 10;
    const textStartX = x + padL + iconSize + iconGap; // after left bar + icon
    const textMaxW = Math.max(24, w - (textStartX - x) - padR);

    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', surface);
    rect.setAttribute('stroke', accent);
    rect.setAttribute('stroke-width', '1.5');
    rect.style.setProperty('fill', surface, 'important');
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

      if (loadIcon) {
        try {
          const iconSvg = await loadIcon(theme.icon);
          if (iconSvg) {
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('data-ao-topo', String(i));
            fo.setAttribute('x', String(x + padL));
            fo.setAttribute('y', String(y + Math.max(6, (h - iconSize) / 2 - (h >= 48 ? 4 : 0))));
            fo.setAttribute('width', String(iconSize + 2));
            fo.setAttribute('height', String(iconSize + 2));
            const wrap = document.createElement('div');
            wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            wrap.style.cssText =
              `display:flex;width:${iconSize}px;height:${iconSize}px;align-items:center;justify-content:center;color:${accent}`;
            const cloned = iconSvg.cloneNode(true) as SVGElement;
            cloned.setAttribute('width', String(iconSize));
            cloned.setAttribute('height', String(iconSize));
            cloned.style.cssText = `width:${iconSize}px;height:${iconSize}px;display:block;color:${accent};fill:currentColor;`;
            cloned.querySelectorAll('[fill]').forEach((el) => {
              if (el.getAttribute('fill') !== 'none') el.setAttribute('fill', 'currentColor');
            });
            cloned.querySelectorAll('[stroke]').forEach((el) => {
              if (el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', 'currentColor');
            });
            wrap.appendChild(cloned);
            fo.appendChild(wrap);
            parent.appendChild(fo);
          }
        } catch {
          /* icons optional */
        }
      }

      // Primary label: left-aligned + truncated to panel width (topology-style).
      if (labelText) {
        const full = (labelText.textContent || label || '').trim();
        const shown = truncateToWidth(labelText, full, textMaxW);
        labelText.textContent = shown;
        labelText.setAttribute('x', String(textStartX));
        labelText.setAttribute('text-anchor', 'start');
        labelText.style.setProperty('text-anchor', 'start', 'important');
        // Vertical: top line when aspect caption fits
        if (h >= 48) {
          labelText.setAttribute('y', String(y + 22));
          labelText.style.setProperty('dominant-baseline', 'auto', 'important');
        }
        if (shown !== full) {
          setSvgTitle(labelText, full);
        }
      }

      if (h >= 48) {
        const aspect = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        aspect.setAttribute('data-ao-topo', String(i));
        aspect.setAttribute('x', String(textStartX));
        aspect.setAttribute('y', String(y + h - 10));
        aspect.setAttribute('text-anchor', 'start');
        aspect.setAttribute('fill', muted);
        aspect.style.cssText = `fill:${muted};font-size:9px;font-family:inherit;text-anchor:start;`;
        const aspectFull = theme.aspect;
        const aspectShown = truncateChars(aspectFull, Math.floor(textMaxW / 5.5));
        aspect.textContent = aspectShown;
        if (aspectShown !== aspectFull) {
          setSvgTitle(aspect, aspectFull);
        }
        parent.appendChild(aspect);
      }
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
        line.setAttribute('stroke-opacity', '0.45');
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

function setSvgTitle(el: SVGElement, full: string): void {
  const text = String(full || '').trim();
  if (!text) return;
  el.querySelectorAll('title').forEach((n) => n.remove());
  const tip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  tip.textContent = text;
  el.insertBefore(tip, el.firstChild);
}

/**
 * Apply native SVG tooltips for truncated Mermaid labels.
 * Prefer ``tips`` from the API (shown→full); also title any text that still ends with ….
 */
export function applyMermaidTextTooltips(
  svg: SVGSVGElement,
  tips: Array<{ shown?: string; full?: string }> | null | undefined
): void {
  const byShown = new Map<string, string>();
  for (const tip of tips || []) {
    const shown = String(tip?.shown || '').trim();
    const full = String(tip?.full || '').trim();
    if (shown && full && shown !== full) byShown.set(shown, full);
  }

  svg.querySelectorAll('text').forEach((el) => {
    // Prefer text nodes only (ignore nested <title> when reading)
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => (n.textContent || '').trim())
      .join('')
      .trim();
    const visible = own || (el.textContent || '').trim();
    if (!visible) return;

    const mapped = byShown.get(visible);
    if (mapped) {
      setSvgTitle(el, mapped);
      return;
    }

    // Topology restyle may further shorten a tip's shown form.
    for (const [shown, full] of byShown) {
      if (visible.endsWith('…') && shown.startsWith(visible.slice(0, -1))) {
        setSvgTitle(el, full);
        return;
      }
    }

    if (visible.includes('…')) {
      const existing = el.querySelector('title')?.textContent?.trim();
      if (!existing || existing === visible) {
        // Keep any better title already set; otherwise at least expose visible.
        if (!existing) setSvgTitle(el, visible);
      }
    }
  });
}

function truncateChars(s: string, max: number): string {
  const t = String(s || '');
  if (max < 2) return '…';
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Shrink label until getBBox width fits; fall back to char estimate. */
function truncateToWidth(el: SVGTextElement, full: string, maxPx: number): string {
  const raw = String(full || '').trim();
  if (!raw) return '';
  el.textContent = raw;
  try {
    if (el.getBBox().width <= maxPx) return raw;
  } catch {
    return truncateChars(raw, Math.floor(maxPx / 7));
  }
  let lo = 1;
  let hi = raw.length;
  let best = '…';
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = truncateChars(raw, mid);
    el.textContent = candidate;
    let width = maxPx + 1;
    try {
      width = el.getBBox().width;
    } catch {
      return truncateChars(raw, Math.floor(maxPx / 7));
    }
    if (width <= maxPx) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  el.textContent = best;
  return best;
}

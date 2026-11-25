/** Shared helpers for object-detection answer JSON in Admin Runs / Traces. */

export type DetectionBox = {
  label?: string;
  confidence?: number;
  box_xyxy?: number[];
};

export type DetectionAnswer = {
  detections: DetectionBox[];
  image?: { width?: number; height?: number; name?: string | null };
  model?: Record<string, unknown>;
};

export type DetectionPreview = {
  mimeType?: string;
  dataBase64?: string;
  width?: number;
  height?: number;
  name?: string | null;
};

export function parseDetectionResult(text: string | null | undefined): DetectionAnswer | null {
  const raw = String(text || '').trim();
  if (!raw.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const detections = (parsed as { detections?: unknown }).detections;
    if (!Array.isArray(detections)) return null;
    return parsed as DetectionAnswer;
  } catch {
    return null;
  }
}

export function isDetectionAnswer(text: string | null | undefined): boolean {
  return parseDetectionResult(text) != null;
}

export function formatDetectionAnswer(text: string | null | undefined): string {
  const parsed = parseDetectionResult(text);
  if (!parsed) return String(text || '');
  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(text || '');
  }
}

/** Map box_xyxy from source image coords onto a displayed element size. */
export function scaleBoxXyxy(
  box: number[] | undefined,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number
): { left: number; top: number; width: number; height: number } | null {
  if (!Array.isArray(box) || box.length < 4) return null;
  const [x1, y1, x2, y2] = box.map((n) => Number(n));
  if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) return null;
  const sw = Math.max(1, srcW);
  const sh = Math.max(1, srcH);
  const dw = Math.max(1, destW);
  const dh = Math.max(1, destH);
  const left = (x1 / sw) * dw;
  const top = (y1 / sh) * dh;
  const width = ((x2 - x1) / sw) * dw;
  const height = ((y2 - y1) / sh) * dh;
  return { left, top, width: Math.max(0, width), height: Math.max(0, height) };
}

export type OverlayBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  conf: string;
}

/**
 * Boxes positioned for an image displayed at `dest` size. The source size
 * comes from the answer, then the preview, then the decoded image.
 */
export function overlayBoxes(
  answer: DetectionAnswer | null | undefined,
  preview: DetectionPreview | null | undefined,
  natural: { width: number; height: number },
  dest: { width: number; height: number }
): OverlayBox[] {
  if (!answer) return [];
  const srcW = Number(answer.image?.width || preview?.width || natural.width || 1);
  const srcH = Number(
    answer.image?.height || preview?.height || natural.height || 1
  );
  const destW = dest.width || natural.width || 1;
  const destH = dest.height || natural.height || 1;
  const out: OverlayBox[] = [];
  for (const d of answer.detections || []) {
    const scaled = scaleBoxXyxy(d.box_xyxy, srcW, srcH, destW, destH);
    if (!scaled) continue;
    const conf =
      d.confidence != null && Number.isFinite(Number(d.confidence))
        ? ` ${(Number(d.confidence) * 100).toFixed(0)}%`
        : '';
    out.push({ ...scaled, label: String(d.label || 'obj'), conf });
  }
  return out;
}

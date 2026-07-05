/** @param {string | null | undefined} raw */
export function sanitizeUserDisplayName(raw) {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 120) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

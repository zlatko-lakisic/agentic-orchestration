/** Detect when the UI is fronted by Warpgate (bastion / SSO). */
export function isWarpgateFronted() {
  try {
    if (typeof document === "undefined") return false;
    if (window.location.pathname.startsWith("/@warpgate")) return true;
    for (const script of document.scripts) {
      const src = String(script.src || "");
      if (src.includes("/@warpgate")) return true;
    }
    for (const entry of performance.getEntriesByType("resource")) {
      const name = String(entry.name || "");
      if (name.includes("/@warpgate")) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

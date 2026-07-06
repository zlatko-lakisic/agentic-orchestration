/** True when the page is served behind Warpgate (injected assets or official edge host). */
export function isWarpgateFronted() {
  if (typeof document !== "undefined") {
    if (document.querySelector('script[src*="/@warpgate"]')) return true;
  }
  const host = String(location?.hostname || "").toLowerCase();
  return host === "ai-orchestrator.mostardesigns.com" || host.endsWith(".mostardesigns.com");
}

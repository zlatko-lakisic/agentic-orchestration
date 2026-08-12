import { isWarpgateFronted } from "./proxy-context.js";
import { PWA_MANIFEST } from "./pwa-manifest-data.js";

if (isWarpgateFronted() && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister();
  }).catch(() => {});
}

const MANIFEST_HREF = "/manifest.webmanifest";

function linkFromBlob(manifest) {
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = URL.createObjectURL(blob);
  link.type = "application/manifest+json";
  return link;
}

function linkFromUrl(href) {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = href;
  link.type = "application/manifest+json";
  return link;
}

/**
 * Security gateway auth-gates /manifest.webmanifest (307 login, empty body in DevTools).
 * Load after the session cookie exists via credentialed fetch, or inline blob fallback.
 */
export async function ensureManifestLink() {
  document.querySelector('link[rel="manifest"]')?.remove();

  if (!isWarpgateFronted()) {
    document.head.appendChild(linkFromUrl(MANIFEST_HREF));
    return;
  }

  try {
    const res = await fetch(MANIFEST_HREF, { credentials: "same-origin", cache: "no-store" });
    if (res.ok) {
      const manifest = await res.json();
      document.head.appendChild(linkFromBlob(manifest));
      return;
    }
  } catch {
    /* fall through */
  }

  document.head.appendChild(linkFromBlob(PWA_MANIFEST));
}

ensureManifestLink();

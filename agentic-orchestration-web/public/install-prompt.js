import { isWarpgateFronted } from "./proxy-context.js";

const DISMISS_KEY = "agentic_pwa_install_dismissed_v1";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function registerServiceWorker() {
  if (isWarpgateFronted()) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      }).catch(() => {});
    }
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

/**
 * Show install UI on Android (and other Chromium) when the PWA is installable.
 */
export function initPwaInstall() {
  if (isStandalone() || isDismissed()) return;

  registerServiceWorker();

  const banner = document.getElementById("pwaInstallBanner");
  const installBtn = document.getElementById("pwaInstallBtn");
  const dismissBtn = document.getElementById("pwaInstallDismiss");
  const messageEl = document.getElementById("pwaInstallMessage");
  if (!banner) return;

  let deferredPrompt = null;

  function hideBanner() {
    banner.classList.add("hidden");
    banner.setAttribute("aria-hidden", "true");
  }

  function showBanner(message, buttonLabel, showInstallButton) {
    if (messageEl) messageEl.textContent = message;
    if (installBtn) {
      installBtn.textContent = buttonLabel;
      installBtn.hidden = !showInstallButton;
    }
    banner.classList.remove("hidden");
    banner.setAttribute("aria-hidden", "false");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showBanner("Install Agentic Orchestration for quick access from your home screen.", "Install", true);
  });

  installBtn?.addEventListener("click", async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      hideBanner();
      return;
    }
    hideBanner();
  });

  dismissBtn?.addEventListener("click", () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    hideBanner();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideBanner();
  });

  if (isAndroid() && isMobileViewport()) {
    window.setTimeout(() => {
      if (deferredPrompt || isDismissed() || isStandalone()) return;
      showBanner(
        "Install this app: open Chrome’s menu (⋮), then tap Install app or Add to Home screen.",
        "Got it",
        false,
      );
    }, 5000);
  }
}

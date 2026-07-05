/** Dock Warpgate's injected session menu (#warpgate-embedded-ui) into the settings rail. */
const MOUNT_ID = "warpgateSessionMount";

function dockWarpgateUi() {
  const root = document.getElementById("warpgate-embedded-ui");
  const mount = document.getElementById(MOUNT_ID);
  if (!root || !mount || root.parentElement === mount) return;
  mount.appendChild(root);
  root.classList.add("warpgate-docked");
}

export function initWarpgateSessionUi() {
  dockWarpgateUi();
  const observer = new MutationObserver(() => dockWarpgateUi());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

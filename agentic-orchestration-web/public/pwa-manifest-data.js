/** Keep in sync with manifest.webmanifest (served for direct / LAN access). */
export const PWA_MANIFEST = {
  name: "Agentic Orchestration",
  short_name: "Agentic",
  description: "Multi-agent orchestration chat",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#0a0d13",
  theme_color: "#0a0d13",
  orientation: "any",
  icons: [
    {
      src: "/logo.png",
      sizes: "any",
      type: "image/png",
      purpose: "any",
    },
  ],
};

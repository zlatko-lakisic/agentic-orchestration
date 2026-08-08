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
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
};

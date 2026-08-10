import { TopologyBand, TopologyNodeKind } from './topology.types';

export type TopologyKindTheme = {
  /** CSS color for accent (stroke / icon). */
  accent: string;
  /** Lucide svgIcon name. */
  icon: string;
  /** Short theme label for legend. */
  aspect: string;
};

const BY_KIND: Record<string, TopologyKindTheme> = {
  app: { accent: '#0f766e', icon: 'app-window', aspect: 'App' },
  ui: { accent: '#0d9488', icon: 'monitor', aspect: 'Client' },
  'overlay-source': { accent: '#0891b2', icon: 'layers', aspect: 'Overlays' },
  'local-tools': { accent: '#059669', icon: 'wrench', aspect: 'Local tools' },
  openclaw: { accent: '#7c3aed', icon: 'bot', aspect: 'OpenClaw' },
  'ao-web': { accent: '#0284c7', icon: 'layout-dashboard', aspect: 'Admin UI' },
  'ao-chat': { accent: '#0d9488', icon: 'messages-square', aspect: 'Chat UI' },

  'session-bridge': { accent: '#2563eb', icon: 'cable', aspect: 'Reach bridge' },
  'overlay-packer': { accent: '#4f46e5', icon: 'package', aspect: 'Overlay pack' },
  'local-mcp-host': { accent: '#6366f1', icon: 'plug', aspect: 'Local MCP' },
  'speech-client': { accent: '#db2777', icon: 'mic', aspect: 'Speech' },
  'mtls-enroller': { accent: '#b45309', icon: 'shield', aspect: 'mTLS' },

  engine: { accent: '#dc2626', icon: 'cpu', aspect: 'Engine' },
  endpoint: { accent: '#ea580c', icon: 'radio', aspect: 'Endpoint' },
  'web-ui': { accent: '#0284c7', icon: 'globe', aspect: 'Web UI' },

  planner: { accent: '#ca8a04', icon: 'brain', aspect: 'Planner' },

  catalog: { accent: '#16a34a', icon: 'book-open', aspect: 'Catalog' },
  'model-backend': { accent: '#0f766e', icon: 'boxes', aspect: 'Models' },
  'model-runtime': { accent: '#0d9488', icon: 'sparkles', aspect: 'Runtime' },

  'execution-backend': { accent: '#9333ea', icon: 'workflow', aspect: 'Execution' },
  worker: { accent: '#a855f7', icon: 'server', aspect: 'Workers' },
  'mcp-sidecar': { accent: '#c026d3', icon: 'puzzle', aspect: 'Sidecar' },

  platform: { accent: '#3B6EA5', icon: 'container', aspect: 'Platform' },
  storage: { accent: '#64748b', icon: 'hard-drive', aspect: 'Storage' },
  'k8s-workload': { accent: '#3B6EA5', icon: 'server', aspect: 'K8s workload' },
};

const BY_BAND: Record<TopologyBand, TopologyKindTheme> = {
  application: { accent: '#0d9488', icon: 'monitor', aspect: 'Application' },
  reach: { accent: '#2563eb', icon: 'cable', aspect: 'Reach' },
  ao: { accent: '#3B6EA5', icon: 'cpu', aspect: 'Orchestration' },
};

export function themeForKind(
  kind: TopologyNodeKind | string,
  band?: TopologyBand
): TopologyKindTheme {
  return (
    BY_KIND[String(kind)] ||
    (band ? BY_BAND[band] : null) || {
      accent: '#737373',
      icon: 'circle',
      aspect: 'Other',
    }
  );
}

export function themeForBand(band: TopologyBand): TopologyKindTheme {
  return BY_BAND[band];
}

export const KIND_THEMES = BY_KIND;

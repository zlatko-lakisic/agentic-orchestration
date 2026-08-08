import { WIKI_BASE_URL } from '@/app/domains/admin/shared/env-help/env-wiki';
import { TopologyEdge, TopologyNode } from './topology.types';

/** Wiki page hosting per-component stubs (HTML anchors match `wikiKey`). */
export const TOPOLOGY_WIKI_PAGE = 'Topology-dashboard';

export type TopologyHelp = {
  /** Anchor id on the wiki page (no `#`). */
  wikiKey: string;
  /** One-sentence hover tooltip. */
  blurb: string;
};

const NODE_BY_KIND: Record<string, TopologyHelp> = {
  ui: {
    wikiKey: 'ui',
    blurb: 'Client or kiosk UI that connected through AO Reach.',
  },
  'overlay-source': {
    wikiKey: 'overlay-source',
    blurb: 'Domain overlays the client advertised for this session.',
  },
  'local-tools': {
    wikiKey: 'local-tools',
    blurb: 'MCP tools hosted on the client device and reverse-tunneled in.',
  },
  openclaw: {
    wikiKey: 'openclaw',
    blurb: 'OpenClaw host that talks to the Web UI and bypasses Reach.',
  },
  'session-bridge': {
    wikiKey: 'session-bridge',
    blurb: 'Reach SessionBridge carrying the authenticated client session.',
  },
  'overlay-packer': {
    wikiKey: 'overlay-packer',
    blurb: 'Packs client overlays before they hit the engine overlay API.',
  },
  'local-mcp-host': {
    wikiKey: 'local-mcp-host',
    blurb: 'Client-side MCP host reached via the engine reverse tunnel.',
  },
  'speech-client': {
    wikiKey: 'speech-client',
    blurb: 'Reach speech client for STT/TTS against advertised sidecars.',
  },
  'mtls-enroller': {
    wikiKey: 'mtls-enroller',
    blurb: 'Issues and renews client certificates for Reach↔engine mTLS.',
  },
  engine: {
    wikiKey: 'engine',
    blurb: 'Engine daemon API (serve) — session, tunnel, and agent edge.',
  },
  endpoint: {
    wikiKey: 'endpoint',
    blurb: 'A concrete engine or speech HTTP endpoint on the edge rank.',
  },
  'web-ui': {
    wikiKey: 'web-ui',
    blurb: 'Coordinator Web UI and Admin console (NodePort 30487).',
  },
  planner: {
    wikiKey: 'planner',
    blurb: 'Dynamic planner / runner that turns goals into CrewAI steps.',
  },
  catalog: {
    wikiKey: 'catalog',
    blurb: 'Resolved agent, MCP, or skills catalog cluster used by planning.',
  },
  'model-backend': {
    wikiKey: 'model-backend',
    blurb: 'Model backend registry that selects local or remote LLM runtimes.',
  },
  'model-runtime': {
    wikiKey: 'model-runtime',
    blurb: 'A concrete model runtime such as Ollama or a remote provider.',
  },
  'execution-backend': {
    wikiKey: 'execution-backend',
    blurb: 'Execution backend that runs steps (in-process, k8s, or warm pool).',
  },
  worker: {
    wikiKey: 'worker',
    blurb: 'Worker pods or processes currently available to run steps.',
  },
  'mcp-sidecar': {
    wikiKey: 'mcp-sidecar',
    blurb: 'MCP sidecar containers attached to workers for tool execution.',
  },
  platform: {
    wikiKey: 'platform',
    blurb: 'Cluster / host platform layer (k3s node, Jetson, or NVR).',
  },
  storage: {
    wikiKey: 'storage',
    blurb: 'Persistent volumes, GPU weights, and host metrics mounts.',
  },
};

const NODE_BY_ID: Record<string, TopologyHelp> = {
  'engine/session-overlay': {
    wikiKey: 'endpoint-session-overlay',
    blurb: 'Engine API that applies Reach session overlays for a run.',
  },
  'engine/mcp-tunnel': {
    wikiKey: 'endpoint-mcp-tunnel',
    blurb: 'Reverse tunnel endpoint that calls back into the client MCP host.',
  },
  'engine/direct-agent': {
    wikiKey: 'endpoint-direct-agent',
    blurb: 'Direct-agent chat path that skips full dynamic planning.',
  },
  'engine/hello-speech': {
    wikiKey: 'endpoint-hello-speech',
    blurb: 'Advertises speech (STT/TTS) capability to Reach clients.',
  },
  'engine/mtls-enrol': {
    wikiKey: 'endpoint-mtls-enrol',
    blurb: 'mTLS enrollment endpoint for Reach client certificates.',
  },
  'speech/stt': {
    wikiKey: 'speech-stt',
    blurb: 'Speech-to-text sidecar serving transcription requests.',
  },
  'speech/tts': {
    wikiKey: 'speech-tts',
    blurb: 'Text-to-speech sidecar serving synthesis requests.',
  },
  'catalog/agents': {
    wikiKey: 'catalog-agents',
    blurb: 'Cluster of agent-provider catalog entries available to the planner.',
  },
  'catalog/mcp': {
    wikiKey: 'catalog-mcp',
    blurb: 'Cluster of MCP provider catalog entries available to the planner.',
  },
  'catalog/skills': {
    wikiKey: 'catalog-skills',
    blurb: 'Cluster of agent-skill playbooks the planner may attach to tasks.',
  },
  'models/backends': {
    wikiKey: 'models-backends',
    blurb: 'Resolved model-backend catalog used to pick LLM runtimes.',
  },
  'models/ollama': {
    wikiKey: 'models-ollama',
    blurb: 'Local Ollama runtime for on-box model inference.',
  },
  'models/remote': {
    wikiKey: 'models-remote',
    blurb: 'Remote LLM providers (OpenAI, Anthropic, …) when credentials exist.',
  },
};

const EDGE_BY_KIND: Record<string, TopologyHelp> = {
  request: {
    wikiKey: 'edge-request',
    blurb: 'A request/response call path between two components.',
  },
  stream: {
    wikiKey: 'edge-stream',
    blurb: 'A streaming path (WebSocket or chunked) between components.',
  },
  'reverse-tunnel': {
    wikiKey: 'edge-reverse-tunnel',
    blurb: 'Engine calling back up into a Reach-hosted local MCP host.',
  },
  advertisement: {
    wikiKey: 'edge-advertisement',
    blurb: 'Capability advertisement (not request traffic).',
  },
  bypass: {
    wikiKey: 'edge-bypass',
    blurb: 'OpenClaw path that skips Reach and hits the Web UI directly.',
  },
};

const DEFAULT_NODE: TopologyHelp = {
  wikiKey: 'topology-node',
  blurb: 'A live topology component reported by the current deployment.',
};

const DEFAULT_EDGE: TopologyHelp = {
  wikiKey: 'topology-edge',
  blurb: 'A structural link between two topology components.',
};

export function helpForNode(
  node: Pick<TopologyNode, 'id' | 'kind'> | null | undefined
): TopologyHelp {
  if (!node) return DEFAULT_NODE;
  return NODE_BY_ID[node.id] || NODE_BY_KIND[String(node.kind)] || DEFAULT_NODE;
}

export function helpForEdge(
  edge: Pick<TopologyEdge, 'id' | 'kind'> | null | undefined
): TopologyHelp {
  if (!edge) return DEFAULT_EDGE;
  return EDGE_BY_KIND[String(edge.kind)] || DEFAULT_EDGE;
}

export function topologyWikiUrl(wikiKey: string): string {
  const k = String(wikiKey || '').trim();
  if (!k) return `${WIKI_BASE_URL}/${TOPOLOGY_WIKI_PAGE}`;
  return `${WIKI_BASE_URL}/${TOPOLOGY_WIKI_PAGE}#${k}`;
}

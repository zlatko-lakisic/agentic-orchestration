import { describe, expect, it } from 'vitest';
import {
  isSideCenter,
  layoutTopology,
  nodesOverlap,
  pathClosure,
  pathEndpoints,
  slotForKind,
} from './topology.layout';
import { TopologyEdge, TopologyNode } from './topology.types';

function n(
  partial: Partial<TopologyNode> & Pick<TopologyNode, 'id' | 'kind' | 'band'>
): TopologyNode {
  return {
    label: partial.id,
    status: 'unknown',
    instrumented: false,
    deployed: true,
    ...partial,
  };
}

describe('topology.layout', () => {
  it('keeps planner slot stable regardless of optional nodes', () => {
    const base: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
    ];
    const withExtras: TopologyNode[] = [
      ...base,
      n({ id: 'speech/stt', kind: 'endpoint', band: 'ao', deployed: true }),
      n({ id: 'workers/cluster', kind: 'worker', band: 'ao' }),
    ];
    const a = layoutTopology(base, []);
    const b = layoutTopology(withExtras, []);
    const pa = a.nodes.find((x) => x.id === 'planner')!;
    const pb = b.nodes.find((x) => x.id === 'planner')!;
    expect(pa.x).toBe(pb.x);
    expect(slotForKind('planner')?.rank).toBe(1);
  });

  it('groups Reach apps left and Web API right with family frames', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'app/myapp',
        kind: 'app',
        band: 'application',
        appId: 'myapp',
        appGroup: 'reach',
      }),
      n({
        id: 'app/openclaw',
        kind: 'openclaw',
        band: 'application',
        appGroup: 'web-api',
      }),
      n({
        id: 'app/ao-web',
        kind: 'ao-web',
        band: 'application',
        appGroup: 'web-api',
      }),
      n({
        id: 'app/ao-chat',
        kind: 'ao-chat',
        band: 'application',
        appGroup: 'web-api',
      }),
    ];
    const layout = layoutTopology(nodes, []);
    const reach = layout.nodes.find((x) => x.id === 'app/myapp')!;
    const web = layout.nodes.find((x) => x.id === 'app/ao-web')!;
    const chat = layout.nodes.find((x) => x.id === 'app/ao-chat')!;
    const oc = layout.nodes.find((x) => x.id === 'app/openclaw')!;
    expect(web.x).toBeGreaterThan(reach.x + reach.width);
    expect(chat.x).toBeGreaterThan(web.x);
    expect(oc.x).toBeGreaterThan(chat.x);
    const families = layout.applicationFamilies || [];
    expect(families.map((f) => f.id).sort()).toEqual(['reach', 'web-api']);
    expect(families.find((f) => f.id === 'reach')!.label).toBe('Reach apps');
    expect(families.find((f) => f.id === 'web-api')!.label).toBe('Web API');
  });

  it('bumps Web API right when a Reach app is expanded', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'app/myapp',
        kind: 'app',
        band: 'application',
        appId: 'myapp',
        appGroup: 'reach',
      }),
      n({
        id: 'app/myapp/ui',
        kind: 'ui',
        band: 'application',
        appId: 'myapp',
        appGroup: 'reach',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/myapp/overlays',
        kind: 'overlay-source',
        band: 'application',
        appId: 'myapp',
        appGroup: 'reach',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/myapp/local-tools',
        kind: 'local-tools',
        band: 'application',
        appId: 'myapp',
        appGroup: 'reach',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/ao-web',
        kind: 'ao-web',
        band: 'application',
        appGroup: 'web-api',
      }),
      n({
        id: 'app/ao-chat',
        kind: 'ao-chat',
        band: 'application',
        appGroup: 'web-api',
      }),
    ];
    const collapsed = layoutTopology(nodes, [], { expandedAppId: null });
    const expanded = layoutTopology(nodes, [], { expandedAppId: 'myapp' });
    const webCollapsed = collapsed.nodes.find((x) => x.id === 'app/ao-web')!;
    const webExpanded = expanded.nodes.find((x) => x.id === 'app/ao-web')!;
    const ui = expanded.nodes.find((x) => x.id === 'app/myapp/ui')!;
    const tools = expanded.nodes.find((x) => x.id === 'app/myapp/local-tools')!;
    expect(webExpanded.x).toBeGreaterThan(webCollapsed.x);
    expect(webExpanded.x).toBeGreaterThan(tools.x + tools.width);
    expect(ui.rank).toBe(1);
    const family = expanded.applicationFamilies!.find((f) => f.id === 'web-api')!;
    expect(family.x).toBeGreaterThan(
      collapsed.applicationFamilies!.find((f) => f.id === 'web-api')!.x
    );
  });

  it('leaves empty lanes as gaps (does not re-center)', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'app/ui', kind: 'ui', band: 'application', appGroup: 'reach' }),
      n({
        id: 'app/openclaw',
        kind: 'openclaw',
        band: 'application',
        appGroup: 'web-api',
      }),
    ];
    const layout = layoutTopology(nodes, []);
    const ui = layout.nodes.find((x) => x.id === 'app/ui')!;
    const oc = layout.nodes.find((x) => x.id === 'app/openclaw')!;
    expect(oc.x).toBeGreaterThan(ui.x + ui.width);
  });

  it('minimizes app panels horizontally and hides children until expanded', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'app/myapp',
        kind: 'app',
        band: 'application',
        appId: 'myapp',
        instanceCount: 2,
      }),
      n({
        id: 'app/myapp/ui',
        kind: 'ui',
        band: 'application',
        appId: 'myapp',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/myapp/overlays',
        kind: 'overlay-source',
        band: 'application',
        appId: 'myapp',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/myapp/local-tools',
        kind: 'local-tools',
        band: 'application',
        appId: 'myapp',
        parent: 'app/myapp',
      }),
      n({
        id: 'app/field-client',
        kind: 'app',
        band: 'application',
        appId: 'field-client',
        instanceCount: 1,
      }),
      n({
        id: 'app/field-client/ui',
        kind: 'ui',
        band: 'application',
        appId: 'field-client',
        parent: 'app/field-client',
      }),
    ];
    const collapsed = layoutTopology(nodes, []);
    expect(collapsed.nodes.map((x) => x.id).sort()).toEqual([
      'app/field-client',
      'app/myapp',
    ]);
    const fc = collapsed.nodes.find((x) => x.id === 'app/field-client')!;
    const my = collapsed.nodes.find((x) => x.id === 'app/myapp')!;
    // Horizontal LTR by appId: field-client then myapp
    expect(fc.y).toBe(my.y);
    expect(fc.x).toBeLessThan(my.x);

    const expanded = layoutTopology(nodes, [], { expandedAppId: 'myapp' });
    expect(expanded.nodes.some((x) => x.id === 'app/myapp/ui')).toBe(true);
    expect(expanded.nodes.some((x) => x.id === 'app/field-client/ui')).toBe(false);
    const myUi = expanded.nodes.find((x) => x.id === 'app/myapp/ui')!;
    const myOv = expanded.nodes.find((x) => x.id === 'app/myapp/overlays')!;
    const myHeader = expanded.nodes.find((x) => x.id === 'app/myapp')!;
    expect(myUi.y).toBeGreaterThan(myHeader.y);
    expect(myOv.x).toBeGreaterThan(myUi.x);
  });

  it('hides k8s workloads until platform is expanded', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'platform/k3s',
        kind: 'platform',
        band: 'ao',
        expandable: true,
      }),
      n({
        id: 'k8s/workload/agentic-engine',
        kind: 'k8s-workload',
        band: 'ao',
        parent: 'platform/k3s',
        label: 'Engine',
      }),
      n({
        id: 'k8s/workload/agentic-warm-pool',
        kind: 'k8s-workload',
        band: 'ao',
        parent: 'platform/k3s',
        label: 'Warm pool',
      }),
    ];
    const collapsed = layoutTopology(nodes, []);
    expect(collapsed.nodes.map((x) => x.id)).toEqual(['platform/k3s']);
    expect(collapsed.nodes[0].width).toBe(168);

    const expanded = layoutTopology(nodes, [], {
      expandedK8sId: 'platform/k3s',
    });
    expect(expanded.nodes.some((x) => x.id === 'k8s/workload/agentic-engine')).toBe(
      true
    );
    expect(
      expanded.nodes.some((x) => x.id === 'k8s/workload/agentic-warm-pool')
    ).toBe(true);
    const engine = expanded.nodes.find(
      (x) => x.id === 'k8s/workload/agentic-engine'
    )!;
    const platform = expanded.nodes.find((x) => x.id === 'platform/k3s')!;
    expect(engine.y).toBeGreaterThan(platform.y);
    // Expandable Kubernetes header uses the wider accordion panel width.
    expect(platform.width).toBe(168);
    expect(engine.x).toBeLessThan(
      expanded.nodes.find((x) => x.id === 'k8s/workload/agentic-warm-pool')!.x
    );
  });

  it('routes unknown kinds to trailing other lane', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'weird',
        kind: 'future-kind' as TopologyNode['kind'],
        band: 'ao',
      }),
    ];
    const layout = layoutTopology(nodes, []);
    expect(layout.nodes[0].lane).toBe(7);
  });

  it('computes path closure upstream and downstream', () => {
    const edges: TopologyEdge[] = [
      {
        id: 'a->b',
        from: 'a',
        to: 'b',
        kind: 'request',
        instrumented: false,
      },
      {
        id: 'b->c',
        from: 'b',
        to: 'c',
        kind: 'request',
        instrumented: false,
      },
      {
        id: 'x->y',
        from: 'x',
        to: 'y',
        kind: 'request',
        instrumented: false,
      },
    ];
    const c = pathClosure('b', edges);
    expect(c.nodes.has('a')).toBe(true);
    expect(c.nodes.has('c')).toBe(true);
    expect(c.nodes.has('x')).toBe(false);
    expect(c.edges.has('a->b')).toBe(true);
    expect(c.edges.has('b->c')).toBe(true);
  });

  it('hides undeployed nodes unless showNotDeployed', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({
        id: 'speech/stt',
        kind: 'endpoint',
        band: 'ao',
        deployed: false,
      }),
    ];
    expect(layoutTopology(nodes, []).nodes.map((x) => x.id)).toEqual([
      'engine',
    ]);
    expect(
      layoutTopology(nodes, [], { showNotDeployed: true }).nodes.map(
        (x) => x.id
      )
    ).toContain('speech/stt');
  });

  it('never overlaps node cards in a dense AO row', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/mcp', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/skills', kind: 'catalog', band: 'ao' }),
      n({ id: 'models/backends', kind: 'model-backend', band: 'ao' }),
      n({ id: 'models/ollama', kind: 'model-runtime', band: 'ao' }),
      n({ id: 'models/remote', kind: 'model-runtime', band: 'ao' }),
    ];
    const layout = layoutTopology(nodes, []);
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        expect(nodesOverlap(layout.nodes[i], layout.nodes[j])).toBe(false);
      }
    }
  });

  it('routes edges with orthogonal (right-angle) segments only', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'web-ui', kind: 'web-ui', band: 'ao' }),
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
    ];
    const edges: TopologyEdge[] = [
      {
        id: 'engine->planner',
        from: 'engine',
        to: 'planner',
        kind: 'request',
      },
      {
        id: 'web-ui->planner',
        from: 'web-ui',
        to: 'planner',
        kind: 'request',
      },
      {
        id: 'planner->catalog/agents',
        from: 'planner',
        to: 'catalog/agents',
        kind: 'request',
      },
    ];
    const layout = layoutTopology(nodes, edges);
    for (const e of layout.edges) {
      expect(e.pathD).not.toMatch(/[CcQqSsAa]/);
      expect(e.pathD).toMatch(/^M /);
    }
  });

  it('attaches every edge at side centers (not corners)', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'web-ui', kind: 'web-ui', band: 'ao' }),
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
      n({ id: 'models/backends', kind: 'model-backend', band: 'ao' }),
      n({ id: 'execution', kind: 'execution-backend', band: 'ao' }),
      n({ id: 'workers/cluster', kind: 'worker', band: 'ao' }),
      n({ id: 'platform/k3s', kind: 'platform', band: 'ao' }),
      n({ id: 'platform/storage', kind: 'storage', band: 'ao' }),
    ];
    const edges: TopologyEdge[] = [
      { id: 'e1', from: 'engine', to: 'planner', kind: 'request' },
      { id: 'e2', from: 'web-ui', to: 'planner', kind: 'request' },
      { id: 'e3', from: 'planner', to: 'catalog/agents', kind: 'request' },
      { id: 'e4', from: 'catalog/agents', to: 'models/backends', kind: 'request' },
      { id: 'e5', from: 'planner', to: 'execution', kind: 'request' },
      { id: 'e6', from: 'execution', to: 'workers/cluster', kind: 'request' },
      { id: 'e7', from: 'execution', to: 'platform/k3s', kind: 'request' },
      { id: 'e8', from: 'platform/k3s', to: 'platform/storage', kind: 'request' },
    ];
    const layout = layoutTopology(nodes, edges);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) {
      const ends = pathEndpoints(e.pathD);
      expect(ends).not.toBeNull();
      const from = byId.get(e.from)!;
      const to = byId.get(e.to)!;
      expect(isSideCenter(from, ends!.start)).not.toBeNull();
      expect(isSideCenter(to, ends!.end)).not.toBeNull();
    }
  });
});

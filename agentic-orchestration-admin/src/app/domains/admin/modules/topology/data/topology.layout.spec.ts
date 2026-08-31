import { describe, expect, it } from 'vitest';
import {
  MIN_ROUTE_X,
  MIN_ROUTE_Y,
  edgePathHitsOtherNodes,
  isSideCenter,
  displayStatus,
  layoutTopology,
  nodesOverlap,
  pathClosure,
  pathEndpoints,
  pathPoints,
  pathsCollinearOverlap,
  routeEdgeOrthogonal,
  routeEdgeOrthogonalPoints,
  slotForKind,
} from './topology.layout';
import { TopologyEdge, TopologyNode } from './topology.types';

function n(
  partial: Partial<TopologyNode> & Pick<TopologyNode, 'id' | 'kind' | 'band'>
): TopologyNode {
  return {
    label: partial.id,
    status: 'healthy',
    instrumented: false,
    deployed: true,
    ...partial,
  };
}

describe('topology.layout', () => {
  it('never displays unknown status', () => {
    expect(
      displayStatus(
        n({
          id: 'reach/session-bridge',
          kind: 'session-bridge',
          band: 'reach',
          status: 'unknown' as TopologyNode['status'],
        })
      )
    ).toBe('healthy');
    expect(
      displayStatus(
        n({
          id: 'reach/overlay-packer',
          kind: 'overlay-packer',
          band: 'reach',
          status: 'unknown' as TopologyNode['status'],
          deployed: false,
        })
      )
    ).toBe('offline');
    expect(
      displayStatus(
        n({
          id: 'engine',
          kind: 'engine',
          band: 'ao',
          status: 'healthy',
          instrumented: false,
        })
      )
    ).toBe('healthy');
  });

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

  it('hides Reach apps family frame when there are no Reach clients', () => {
    const nodes: TopologyNode[] = [
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
    const families = layout.applicationFamilies || [];
    expect(families.map((f) => f.id)).toEqual(['web-api']);
    expect(families.find((f) => f.id === 'reach')).toBeUndefined();
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

  it('places tool-sandbox to the right of mcp-sidecar on execution rank', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'execution', kind: 'execution-backend', band: 'ao' }),
      n({ id: 'workers/cluster', kind: 'worker', band: 'ao' }),
      n({ id: 'sidecars/cluster', kind: 'mcp-sidecar', band: 'ao' }),
      n({ id: 'sandboxes/cluster', kind: 'tool-sandbox', band: 'ao' }),
    ];
    const layout = layoutTopology(nodes, []);
    const workers = layout.nodes.find((x) => x.id === 'workers/cluster')!;
    const sidecars = layout.nodes.find((x) => x.id === 'sidecars/cluster')!;
    const sandboxes = layout.nodes.find((x) => x.id === 'sandboxes/cluster')!;
    expect(workers.y).toBe(sidecars.y);
    expect(sidecars.y).toBe(sandboxes.y);
    expect(workers.x).toBeLessThan(sidecars.x);
    expect(sidecars.x).toBeLessThan(sandboxes.x);
    expect(slotForKind('tool-sandbox').lane).toBe(3);
  });

  it('nests pods under their node with labeled k8s group frames', () => {
    const nodes: TopologyNode[] = [
      n({
        id: 'platform/k3s',
        kind: 'platform',
        band: 'ao',
        expandable: true,
        label: 'Kubernetes',
      }),
      n({
        id: 'k8s/node/a',
        kind: 'k8s-node',
        band: 'ao',
        parent: 'platform/k3s',
        label: 'node-a',
      }),
      n({
        id: 'k8s/node/b',
        kind: 'k8s-node',
        band: 'ao',
        parent: 'platform/k3s',
        label: 'node-b',
      }),
      n({
        id: 'k8s/pod/p1',
        kind: 'k8s-pod',
        band: 'ao',
        parent: 'k8s/node/a',
        label: 'pod-1',
      }),
      n({
        id: 'k8s/pod/p2',
        kind: 'k8s-pod',
        band: 'ao',
        parent: 'k8s/node/a',
        label: 'pod-2',
      }),
      n({
        id: 'k8s/pod/p3',
        kind: 'k8s-pod',
        band: 'ao',
        parent: 'k8s/node/b',
        label: 'pod-3',
      }),
      n({
        id: 'k8s/svc/web',
        kind: 'k8s-service',
        band: 'ao',
        parent: 'platform/k3s',
        label: 'web',
      }),
    ];
    const edges: TopologyEdge[] = [
      {
        id: 'platform/k3s->k8s/node/a',
        from: 'platform/k3s',
        to: 'k8s/node/a',
        kind: 'request',
        protocol: 'k8s',
      },
      {
        id: 'k8s/node/a->k8s/pod/p1',
        from: 'k8s/node/a',
        to: 'k8s/pod/p1',
        kind: 'request',
        protocol: 'k8s',
      },
      {
        id: 'svc->pod',
        from: 'k8s/svc/web',
        to: 'k8s/pod/p1',
        kind: 'request',
        protocol: 'tcp',
      },
    ];
    const layout = layoutTopology(nodes, edges, {
      expandedK8sId: 'platform/k3s',
    });

    const nodeA = layout.nodes.find((x) => x.id === 'k8s/node/a')!;
    const nodeB = layout.nodes.find((x) => x.id === 'k8s/node/b')!;
    const p1 = layout.nodes.find((x) => x.id === 'k8s/pod/p1')!;
    const p2 = layout.nodes.find((x) => x.id === 'k8s/pod/p2')!;
    const p3 = layout.nodes.find((x) => x.id === 'k8s/pod/p3')!;

    // Pods share the parent node column and stack vertically under it.
    expect(p1.x).toBe(nodeA.x);
    expect(p2.x).toBe(nodeA.x);
    expect(p3.x).toBe(nodeB.x);
    expect(p1.y).toBeGreaterThan(nodeA.y);
    expect(p2.y).toBeGreaterThan(p1.y);
    // Sibling nodes stay on one row; pods stack with a wire channel between them.
    expect(nodeA.y).toBe(nodeB.y);
    expect(p2.y - p1.y).toBe(52 + 56);
    // Services sit under the pod stacks so edges drop down (not climb).
    const svc = layout.nodes.find((x) => x.id === 'k8s/svc/web')!;
    expect(svc.y).toBeGreaterThan(p2.y);
    expect(svc.y).toBeGreaterThan(p3.y);

    const groups = layout.k8sGroups || [];
    expect(groups.some((g) => g.role === 'cluster' && g.label === 'Kubernetes')).toBe(
      true
    );
    expect(groups.some((g) => g.role === 'node' && g.id === 'k8s/node/a')).toBe(
      true
    );
    expect(groups.some((g) => g.role === 'node' && g.id === 'k8s/node/b')).toBe(
      true
    );
    expect(groups.some((g) => g.role === 'services')).toBe(true);

    // Containment wires are omitted; Service → Pod network path remains.
    expect(layout.edges.some((e) => e.protocol === 'k8s')).toBe(false);
    expect(layout.edges.some((e) => e.id === 'svc->pod')).toBe(true);
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

  it('routes edges with orthogonal segments and soft corner fillets', () => {
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
      expect(e.pathD).not.toMatch(/[CcSsAa]/);
      expect(e.pathD).toMatch(/^M /);
      // Multi-segment routes get quadratic corner fillets.
      if ((e.pathD.match(/ L /g) || []).length >= 2) {
        expect(e.pathD).toMatch(/Q /);
      }
    }
  });

  it('routes edges around intervening panels (no card underlap)', () => {
    // Gaps match live COL_GAP so stubs sit in the wire channel, not in clearance.
    const from = {
      id: 'from',
      kind: 'catalog' as const,
      band: 'ao' as const,
      label: 'From',
      status: 'healthy' as const,
      instrumented: false,
      deployed: true,
      x: 40,
      y: 100,
      width: 140,
      height: 52,
      lane: 0,
      rank: 0,
      order: 0,
      displayStatus: 'healthy',
    };
    const blocker = {
      ...from,
      id: 'blocker',
      label: 'Blocker',
      x: 40 + 140 + 72,
      lane: 1,
    };
    const to = {
      ...from,
      id: 'to',
      label: 'To',
      x: blocker.x + 140 + 72,
      lane: 2,
    };
    const pathD = routeEdgeOrthogonal(
      from,
      to,
      'request',
      [from, blocker, to],
      700
    );
    expect(
      edgePathHitsOtherNodes(pathD, 'from', 'to', [from, blocker, to])
    ).toBe(false);
    // Must not take the straight line through the blocker centerline.
    const pts = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    const ys = [];
    for (let i = 1; i < pts.length; i += 2) ys.push(pts[i]);
    const midY = from.y + from.height / 2;
    const wentAround = ys.some((y) => Math.abs(y - midY) > 20);
    expect(wentAround).toBe(true);
  });

  it('keeps live layout edges clear of other node cards', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'web-ui', kind: 'web-ui', band: 'ao' }),
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/mcp', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/skills', kind: 'catalog', band: 'ao' }),
      n({ id: 'models/backends', kind: 'model-backend', band: 'ao' }),
      n({ id: 'execution', kind: 'execution-backend', band: 'ao' }),
      n({ id: 'workers/cluster', kind: 'worker', band: 'ao' }),
      n({ id: 'platform/k3s', kind: 'platform', band: 'ao' }),
    ];
    const edges: TopologyEdge[] = [
      { id: 'e1', from: 'engine', to: 'planner', kind: 'request' },
      { id: 'e2', from: 'web-ui', to: 'planner', kind: 'request' },
      { id: 'e3', from: 'planner', to: 'catalog/agents', kind: 'request' },
      { id: 'e4', from: 'planner', to: 'catalog/mcp', kind: 'request' },
      { id: 'e5', from: 'planner', to: 'execution', kind: 'request' },
      { id: 'e6', from: 'execution', to: 'workers/cluster', kind: 'request' },
      { id: 'e7', from: 'execution', to: 'platform/k3s', kind: 'request' },
      { id: 'e8', from: 'catalog/agents', to: 'models/backends', kind: 'request' },
    ];
    const layout = layoutTopology(nodes, edges);
    for (const e of layout.edges) {
      expect(
        edgePathHitsOtherNodes(e.pathD, e.from, e.to, layout.nodes)
      ).toBe(false);
    }
  });

  it('keeps parallel edge runs from overlapping (90° crosses ok)', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'web-ui', kind: 'web-ui', band: 'ao' }),
      n({ id: 'catalog/agents', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/mcp', kind: 'catalog', band: 'ao' }),
      n({ id: 'catalog/skills', kind: 'catalog', band: 'ao' }),
      n({ id: 'execution', kind: 'execution-backend', band: 'ao' }),
      n({ id: 'workers/cluster', kind: 'worker', band: 'ao' }),
    ];
    const edges: TopologyEdge[] = [
      { id: 'e1', from: 'engine', to: 'planner', kind: 'request' },
      { id: 'e2', from: 'web-ui', to: 'planner', kind: 'request' },
      { id: 'e3', from: 'planner', to: 'catalog/agents', kind: 'request' },
      { id: 'e4', from: 'planner', to: 'catalog/mcp', kind: 'request' },
      { id: 'e5', from: 'planner', to: 'catalog/skills', kind: 'request' },
      { id: 'e6', from: 'planner', to: 'execution', kind: 'request' },
      { id: 'e7', from: 'execution', to: 'workers/cluster', kind: 'request' },
    ];
    const layout = layoutTopology(nodes, edges);
    const skeletons = layout.edges.map((e) => pathPoints(e.pathD));
    for (let i = 0; i < skeletons.length; i++) {
      for (let j = i + 1; j < skeletons.length; j++) {
        expect(pathsCollinearOverlap(skeletons[i], skeletons[j])).toBe(false);
      }
    }
  });

  it('offsets a second parallel corridor when the first is reserved', () => {
    const from = {
      id: 'from',
      kind: 'catalog' as const,
      band: 'ao' as const,
      label: 'From',
      status: 'healthy' as const,
      instrumented: false,
      deployed: true,
      x: 40,
      y: 40,
      width: 140,
      height: 52,
      lane: 0,
      rank: 0,
      order: 0,
      displayStatus: 'healthy',
    };
    const toA = { ...from, id: 'toA', x: 40, y: 200, lane: 0 };
    const toB = { ...from, id: 'toB', x: 220, y: 200, lane: 1 };
    const first = routeEdgeOrthogonalPoints(
      from,
      toA,
      'request',
      [from, toA, toB],
      500
    );
    // Same reservation rule as layoutTopology: interior corridor only.
    const reserved = first
      .map((a, i) =>
        i < first.length - 1 ? { a, b: first[i + 1] } : null
      )
      .filter((s): s is { a: { x: number; y: number }; b: { x: number; y: number } } =>
        Boolean(s)
      );
    // Drop port stubs (first + last).
    const interior =
      reserved.length > 2 ? reserved.slice(1, -1) : reserved.slice();
    const second = routeEdgeOrthogonalPoints(
      from,
      toB,
      'request',
      [from, toA, toB],
      500,
      { reserved: interior, fromPortOffset: 10 }
    );
    expect(pathsCollinearOverlap(first, second)).toBe(false);
  });

  it('attaches every edge on a card side (not corners)', () => {
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

  /** Live Ada-shaped graph: Reach row + Web API bypass + AO endpoints. */
  function adaLikeGraph(): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
    const nodes: TopologyNode[] = [
      n({
        id: 'app/comstar',
        kind: 'app',
        band: 'application',
        appId: 'comstar',
        appGroup: 'reach',
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
      n({
        id: 'app/home-assistant',
        kind: 'web-api-client',
        band: 'application',
        appGroup: 'web-api',
      }),
      n({ id: 'reach/session-bridge', kind: 'session-bridge', band: 'reach' }),
      n({ id: 'reach/overlay-packer', kind: 'overlay-packer', band: 'reach' }),
      n({ id: 'reach/local-mcp-host', kind: 'local-mcp-host', band: 'reach' }),
      n({ id: 'reach/speech-client', kind: 'speech-client', band: 'reach' }),
      n({
        id: 'reach/mtls-enroller',
        kind: 'mtls-enroller',
        band: 'reach',
        deployed: false,
      }),
      n({ id: 'engine', kind: 'engine', band: 'ao' }),
      n({ id: 'engine/session-overlay', kind: 'endpoint', band: 'ao' }),
      n({ id: 'engine/mcp-tunnel', kind: 'endpoint', band: 'ao' }),
      n({ id: 'engine/direct-agent', kind: 'endpoint', band: 'ao' }),
      n({ id: 'speech/stt', kind: 'endpoint', band: 'ao' }),
      n({ id: 'engine/hello-speech', kind: 'endpoint', band: 'ao' }),
      n({ id: 'engine/mtls-enrol', kind: 'endpoint', band: 'ao' }),
      n({ id: 'planner', kind: 'planner', band: 'ao' }),
      n({ id: 'web-ui', kind: 'web-ui', band: 'ao' }),
    ];
    const edges: TopologyEdge[] = [
      {
        id: 'sb->op',
        from: 'reach/session-bridge',
        to: 'reach/overlay-packer',
        kind: 'request',
      },
      {
        id: 'sb->mcp',
        from: 'reach/session-bridge',
        to: 'reach/local-mcp-host',
        kind: 'request',
      },
      {
        id: 'sb->speech',
        from: 'reach/session-bridge',
        to: 'reach/speech-client',
        kind: 'request',
      },
      {
        id: 'sb->engine',
        from: 'reach/session-bridge',
        to: 'engine',
        kind: 'stream',
      },
      {
        id: 'op->so',
        from: 'reach/overlay-packer',
        to: 'engine/session-overlay',
        kind: 'request',
      },
      {
        id: 'tun->mcp',
        from: 'engine/mcp-tunnel',
        to: 'reach/local-mcp-host',
        kind: 'reverse-tunnel',
      },
      {
        id: 'sp->stt',
        from: 'reach/speech-client',
        to: 'speech/stt',
        kind: 'stream',
      },
      {
        id: 'ha->web',
        from: 'app/home-assistant',
        to: 'web-ui',
        kind: 'bypass',
      },
      {
        id: 'web->pl',
        from: 'web-ui',
        to: 'planner',
        kind: 'request',
      },
      {
        id: 'eng->pl',
        from: 'engine',
        to: 'planner',
        kind: 'request',
      },
      {
        id: 'eng->so',
        from: 'engine',
        to: 'engine/session-overlay',
        kind: 'request',
      },
      {
        id: 'eng->tun',
        from: 'engine',
        to: 'engine/mcp-tunnel',
        kind: 'request',
      },
      {
        id: 'eng->da',
        from: 'engine',
        to: 'engine/direct-agent',
        kind: 'request',
      },
    ];
    return { nodes, edges };
  }

  it('never routes wires off the left of the canvas (Ada Reach/AO graph)', () => {
    const { nodes, edges } = adaLikeGraph();
    const layout = layoutTopology(nodes, edges, { showNotDeployed: true });
    for (const e of layout.edges) {
      for (const p of pathPoints(e.pathD)) {
        expect(
          p.x,
          `${e.id} x=${p.x} y=${p.y} path=${e.pathD}`
        ).toBeGreaterThanOrEqual(MIN_ROUTE_X);
        expect(p.y, `${e.id} y=${p.y}`).toBeGreaterThanOrEqual(MIN_ROUTE_Y);
      }
    }
  });

  it('does not send SessionBridge wires through sibling Reach cards', () => {
    const { nodes, edges } = adaLikeGraph();
    const layout = layoutTopology(nodes, edges, { showNotDeployed: true });
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const sb = byId.get('reach/session-bridge')!;
    const long = layout.edges.filter(
      (e) =>
        e.from === 'reach/session-bridge' &&
        (e.to === 'reach/local-mcp-host' || e.to === 'reach/speech-client')
    );
    expect(long.length).toBe(2);
    for (const e of long) {
      const start = pathEndpoints(e.pathD)!.start;
      // Skip-level Reach edges leave the top (row gutter), not the right
      // (which bundled horizontals through OverlayPacker).
      expect(isSideCenter(sb, start), e.id).toBe('top');
      expect(
        edgePathHitsOtherNodes(e.pathD, e.from, e.to, layout.nodes),
        e.id
      ).toBe(false);
    }
    const toPacker = layout.edges.find(
      (e) =>
        e.from === 'reach/session-bridge' && e.to === 'reach/overlay-packer'
    )!;
    expect(isSideCenter(sb, pathEndpoints(toPacker.pathD)!.start)).toBe(
      'right'
    );
    for (const e of layout.edges) {
      expect(
        edgePathHitsOtherNodes(e.pathD, e.from, e.to, layout.nodes),
        e.id
      ).toBe(false);
    }
  });
});

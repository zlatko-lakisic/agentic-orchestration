import { describe, expect, it } from 'vitest';
import {
  layoutTopology,
  nodesOverlap,
  pathClosure,
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

  it('leaves empty lanes as gaps (does not re-center)', () => {
    const nodes: TopologyNode[] = [
      n({ id: 'app/ui', kind: 'ui', band: 'application' }),
      n({ id: 'app/openclaw', kind: 'openclaw', band: 'application' }),
    ];
    const layout = layoutTopology(nodes, []);
    const ui = layout.nodes.find((x) => x.id === 'app/ui')!;
    const oc = layout.nodes.find((x) => x.id === 'app/openclaw')!;
    expect(oc.x).toBeGreaterThan(ui.x + ui.width);
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
});

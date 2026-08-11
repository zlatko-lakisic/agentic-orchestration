import { describe, expect, it } from 'vitest';
import { layoutTopology } from './topology.layout';
import { TopologyNode } from './topology.types';

/**
 * Health overlays must not change geometry — the store keeps status in
 * healthById and only structureNodes feed layoutTopology.
 */
describe('topology health vs layout contract', () => {
  it('layout positions ignore status field changes', () => {
    const nodes: TopologyNode[] = [
      {
        id: 'engine',
        kind: 'engine',
        band: 'ao',
        label: 'Engine',
        status: 'healthy',
        instrumented: true,
        deployed: true,
      },
      {
        id: 'planner',
        kind: 'planner',
        band: 'ao',
        label: 'Planner',
        status: 'healthy',
        instrumented: false,
        deployed: true,
      },
    ];
    const a = layoutTopology(nodes, []);
    const b = layoutTopology(
      nodes.map((n) =>
        n.id === 'engine' ? { ...n, status: 'failed', statusReason: 'down' } : n
      ),
      []
    );
    expect(a.nodes.find((n) => n.id === 'engine')!.x).toBe(
      b.nodes.find((n) => n.id === 'engine')!.x
    );
    expect(a.nodes.find((n) => n.id === 'planner')!.y).toBe(
      b.nodes.find((n) => n.id === 'planner')!.y
    );
  });
});

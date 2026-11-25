import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AoApi, ApiResult } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { layoutTopology } from './topology.layout';
import { TopologyStore } from './topology.store';
import { TopologyGraph, TopologyNode } from './topology.types';

function node(id: string, status = 'healthy'): TopologyNode {
  return {
    id,
    kind: id === 'engine' ? 'engine' : 'planner',
    band: 'ao',
    label: id,
    status,
    instrumented: true,
    deployed: true,
  };
}

function graph(seq: number, ids: string[]): TopologyGraph {
  return {
    seq,
    generatedAt: '2026-01-01T00:00:00.000Z',
    nodes: ids.map((id) => node(id)),
    edges: [],
  } as unknown as TopologyGraph;
}

/**
 * Health overlays must not change geometry — the store keeps status in
 * healthById and only structureNodes feed layoutTopology.
 */
describe('topology health vs layout contract', () => {
  it('layout positions ignore status field changes', () => {
    const nodes = [node('engine'), node('planner')];
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

describe('TopologyStore', () => {
  let store: TopologyStore;
  let events: Subject<{ type: string; [k: string]: unknown }>;
  let httpCalls: Subject<ApiResult<TopologyGraph>>[];
  let release: ReturnType<typeof vi.fn>;
  let resyncTopology: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    events = new Subject();
    httpCalls = [];
    release = vi.fn();
    resyncTopology = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        TopologyStore,
        {
          provide: AoApi,
          useValue: {
            topologyGraph: () => {
              const s = new Subject<ApiResult<TopologyGraph>>();
              httpCalls.push(s);
              return s;
            },
          },
        },
        {
          provide: AoLiveWs,
          useValue: {
            topologyEvents: events,
            acquire: () => ({ release }),
            resyncTopology,
          },
        },
      ],
    });
    store = TestBed.inject(TopologyStore);
  });

  afterEach(() => {
    store.stop();
    vi.useRealTimers();
  });

  const ids = () =>
    store
      .layout()
      .nodes.map((n) => n.id)
      .sort();

  it('seeds from HTTP and flags snapshot-only until the socket delivers', () => {
    store.start();
    httpCalls[0].next({ ok: true, data: graph(3, ['engine']) });
    expect(store.seq()).toBe(3);
    expect(store.snapshotOnly()).toBe(true);
    expect(store.loading()).toBe(false);

    events.next({ type: 'topology_snapshot', ...graph(4, ['engine', 'planner']) });
    expect(store.seq()).toBe(4);
    expect(store.snapshotOnly()).toBe(false);
  });

  it('ignores an HTTP snapshot that lands after a newer WS snapshot', () => {
    store.start();
    events.next({ type: 'topology_snapshot', ...graph(7, ['engine', 'planner']) });
    // The slow HTTP response is older: it must not roll the view back.
    httpCalls[0].next({ ok: true, data: graph(5, ['engine']) });
    expect(store.seq()).toBe(7);
    expect(ids()).toEqual(['engine', 'planner']);
    expect(store.snapshotOnly()).toBe(false);
    expect(store.loading()).toBe(false);
  });

  it('keeps a removed node for the grace window, then drops it on its own', () => {
    store.start();
    events.next({ type: 'topology_snapshot', ...graph(1, ['engine', 'planner']) });
    events.next({
      type: 'topology_delta',
      fromSeq: 1,
      seq: 2,
      nodesRemoved: ['planner'],
    });
    expect(ids()).toEqual(['engine', 'planner']);
    expect(store.healthById()['planner'].status).toBe('offline');

    vi.advanceTimersByTime(29_000);
    expect(ids()).toEqual(['engine', 'planner']);
    // No further event arrives: expiry alone must re-run the layout.
    vi.advanceTimersByTime(1_500);
    expect(ids()).toEqual(['engine']);
  });

  it('a node that comes back leaves the grace list', () => {
    store.start();
    events.next({ type: 'topology_snapshot', ...graph(1, ['engine', 'planner']) });
    events.next({
      type: 'topology_delta',
      fromSeq: 1,
      seq: 2,
      nodesRemoved: ['planner'],
    });
    events.next({
      type: 'topology_delta',
      fromSeq: 2,
      seq: 3,
      nodesUpserted: [node('planner')],
    });
    vi.advanceTimersByTime(60_000);
    expect(ids()).toEqual(['engine', 'planner']);
    expect(store.healthById()['planner'].status).toBe('healthy');
  });

  it('health patches do not recompute the layout', () => {
    store.start();
    events.next({ type: 'topology_snapshot', ...graph(1, ['engine', 'planner']) });
    const before = store.layout();
    events.next({
      type: 'topology_health',
      seq: 2,
      health: [{ id: 'engine', status: 'failed', statusReason: 'down' }],
    });
    expect(store.layout()).toBe(before);
    expect(
      store.displayNodes().find((n) => n.id === 'engine')?.displayStatus
    ).toBe('failed');
  });

  it('drops events while paused and resyncs on resume', () => {
    store.start();
    events.next({ type: 'topology_snapshot', ...graph(1, ['engine']) });
    store.togglePause();
    events.next({ type: 'topology_snapshot', ...graph(2, ['engine', 'planner']) });
    expect(ids()).toEqual(['engine']);
    expect(resyncTopology).not.toHaveBeenCalled();

    store.togglePause();
    expect(store.paused()).toBe(false);
    expect(resyncTopology).toHaveBeenCalledTimes(1);
    // The resync also refetches over HTTP; a newer snapshot is applied.
    httpCalls[httpCalls.length - 1].next({
      ok: true,
      data: graph(2, ['engine', 'planner']),
    });
    expect(ids()).toEqual(['engine', 'planner']);
  });

  it('stop releases its live handle', () => {
    store.start();
    store.stop();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

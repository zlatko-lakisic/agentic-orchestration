import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebAuth } from '@/app/core/ao-api/web-auth';
import {
  AoLiveWs,
  CONNECT_GRACE_MS,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
} from './ao-live-ws';

type Frame = Record<string, unknown>;

/** Minimal stand-in for the browser WebSocket, driven by the test. */
class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeSocket[] = [];

  readyState = FakeSocket.CONNECTING;
  sent: Frame[] = [];
  closedByClient = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    readonly url: string,
    readonly protocols?: string[]
  ) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as Frame);
  }

  close() {
    this.closedByClient = true;
    this.readyState = FakeSocket.CLOSED;
  }

  /** Server accepted the upgrade and sent its hello frame. */
  accept() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
    this.deliver({ type: 'hello' });
  }

  deliver(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  deliverRaw(data: string) {
    this.onmessage?.({ data });
  }

  drop(code = 1006) {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code });
  }

  types(): string[] {
    return this.sent.map((f) => String(f['type']));
  }
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

describe('AoLiveWs', () => {
  let token: string | null;
  let refreshOnce: ReturnType<typeof vi.fn>;
  let live: AoLiveWs;

  beforeEach(() => {
    vi.useFakeTimers();
    // Jitter factor becomes exactly 1.0 (0.75 + 0.5 * 0.5).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    token = 'ao_tok';
    refreshOnce = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WebAuth,
          useValue: { bearer: () => token, refreshOnce },
        },
      ],
    });
    live = TestBed.inject(AoLiveWs);
  });

  afterEach(() => {
    live.ngOnDestroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sends the token as a subprotocol, never in the URL', () => {
    live.acquire({ metrics: true });
    expect(last().protocols).toEqual(['ao-auth', 'ao-bearer.ao_tok']);
    expect(last().url).not.toContain('ao_tok');
    expect(last().url).not.toContain('access_token');
  });

  it('subscribes the union of consumers with per-topic params', () => {
    live.acquire({
      feeds: ['runs'],
      feedIntervalMs: 4000,
      feedParams: { runs: { limit: 80 } },
    });
    live.acquire({
      feeds: ['traces'],
      feedIntervalMs: 2000,
      feedParams: { traces: { limit: 500 } },
    });
    last().accept();
    expect(last().sent).toEqual([
      {
        type: 'admin_feed_subscribe',
        topics: ['runs', 'traces'],
        intervalMs: 2000,
        params: { runs: { limit: 80 }, traces: { limit: 500 } },
      },
    ]);
  });

  it('release unsubscribes only that consumer and restores the interval', () => {
    const runs = live.acquire({ feeds: ['runs'], feedIntervalMs: 4000 });
    const usage = live.acquire({ feeds: ['llm_usage'], feedIntervalMs: 2000 });
    const sock = last();
    sock.accept();
    sock.sent.length = 0;

    usage.release();
    expect(sock.sent).toEqual([
      { type: 'admin_feed_unsubscribe', topics: ['llm_usage'] },
      {
        type: 'admin_feed_subscribe',
        topics: ['runs'],
        intervalMs: 4000,
        params: { runs: {} },
      },
    ]);
    expect(sock.closedByClient).toBe(false);

    // Releasing twice must not disturb the remaining consumer.
    usage.release();
    expect(sock.closedByClient).toBe(false);

    runs.release();
    expect(sock.closedByClient).toBe(true);
  });

  it('stops logs and topology when their consumer leaves', () => {
    live.acquire({ metrics: true });
    const page = live.acquire({ logs: true, topology: true });
    const sock = last();
    sock.accept();
    expect(sock.types()).toEqual([
      'host_metrics_subscribe',
      'admin_logs_subscribe',
      'topology_subscribe',
    ]);
    sock.sent.length = 0;

    page.release();
    expect(sock.types()).toEqual(['admin_logs_unsubscribe', 'topology_unsubscribe']);
  });

  it('does not resend subscriptions the server already holds', () => {
    live.acquire({ logs: true, feeds: ['topology'], topology: true });
    const sock = last();
    sock.accept();
    sock.sent.length = 0;

    // A second consumer of the same things changes nothing on the server.
    const again = live.acquire({ logs: true, feeds: ['topology'], topology: true });
    expect(sock.sent).toEqual([]);
    again.release();
    expect(sock.sent).toEqual([]);

    // Neither does a visibility event while the tab stays visible.
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sock.sent).toEqual([]);
  });

  it('setFeedParams and refreshFeeds push params instead of resubscribing', () => {
    const traces = live.acquire({
      feeds: ['traces'],
      feedParams: { traces: { limit: 500 } },
    });
    live.acquire({ feeds: ['runs'], feedParams: { runs: { limit: 80 } } });
    const sock = last();
    sock.accept();
    sock.sent.length = 0;

    traces.setFeedParams('traces', { limit: 500, crewOnly: true });
    expect(sock.sent).toEqual([
      {
        type: 'admin_feed_params',
        params: { runs: { limit: 80 }, traces: { limit: 500, crewOnly: true } },
      },
    ]);
    sock.sent.length = 0;

    live.refreshFeeds();
    expect(sock.types()).toEqual(['admin_feed_params']);
  });

  it('replays watches and followed runs after a reconnect', async () => {
    const page = live.acquire({ logs: true, topology: true });
    page.followRunLogs('run-1');
    live.subscribeTopologyWatch('node', 'engine');
    const first = last();
    first.accept();
    expect(first.types()).toEqual([
      'admin_logs_subscribe',
      'admin_logs_follow_run',
      'topology_subscribe',
      'topology_watch_subscribe',
    ]);

    first.drop();
    expect(live.connected()).toBe(false);
    await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    const second = last();
    expect(second).not.toBe(first);
    second.accept();
    expect(second.sent).toEqual([
      { type: 'admin_logs_subscribe' },
      { type: 'admin_logs_follow_run', runId: 'run-1' },
      { type: 'topology_subscribe' },
      { type: 'topology_watch_subscribe', target: 'node', id: 'engine' },
    ]);

    second.sent.length = 0;
    live.unsubscribeTopologyWatch('node', 'engine');
    expect(second.sent).toEqual([
      { type: 'topology_watch_unsubscribe', target: 'node', id: 'engine' },
    ]);
  });

  it('queues a watch requested before the socket is open', () => {
    live.acquire({ topology: true });
    live.subscribeTopologyWatch('edge', 'a->b');
    const sock = last();
    expect(sock.sent).toEqual([]);
    sock.accept();
    expect(sock.sent).toEqual([
      { type: 'topology_subscribe' },
      { type: 'topology_watch_subscribe', target: 'edge', id: 'a->b' },
    ]);
  });

  it('backs off exponentially up to the cap and resets once established', async () => {
    live.acquire({ metrics: true });
    const delays: number[] = [];
    for (let i = 0; i < 7; i++) {
      const before = FakeSocket.instances.length;
      last().drop();
      let waited = 0;
      while (FakeSocket.instances.length === before) {
        await vi.advanceTimersByTimeAsync(500);
        waited += 500;
        if (waited > RECONNECT_MAX_MS * 2) throw new Error('no reconnect');
      }
      delays.push(waited);
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);

    // A frame from the server proves the connection: the next retry is fast.
    last().accept();
    const before = FakeSocket.instances.length;
    last().drop();
    await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    expect(FakeSocket.instances.length).toBe(before + 1);
  });

  it('falls back once to the query form when an old server rejects the subprotocol', () => {
    live.acquire({ metrics: true });
    const first = last();
    first.readyState = FakeSocket.OPEN;
    first.onopen?.();
    first.drop(4401);

    const second = last();
    expect(second).not.toBe(first);
    expect(second.protocols).toBeUndefined();
    expect(second.url).toContain('access_token=ao_tok');
    expect(refreshOnce).not.toHaveBeenCalled();
    expect(live.connectionError()).toBeNull();
  });

  it('on a real 4401 refreshes auth, reports the error and keeps retrying', async () => {
    const page = live.acquire({ feeds: ['runs'] });
    expect(live.feedLoading('runs')).toBe(true);
    last().drop(4401); // subprotocol form
    last().drop(4401); // query form: the token itself is bad
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshOnce).toHaveBeenCalledTimes(1);
    expect(live.connectionError()).toMatch(/rejected/i);
    expect(live.feedErrors()['_']).toMatch(/rejected/i);
    // Pages stop spinning and show the error instead.
    expect(live.feedLoading('runs')).toBe(false);

    const before = FakeSocket.instances.length;
    await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    expect(FakeSocket.instances.length).toBe(before + 1);

    // Once the server accepts the socket the error clears.
    last().accept();
    expect(live.connectionError()).toBeNull();
    page.release();
  });

  it('uses the rotated token (subprotocol form again) after a refresh', async () => {
    refreshOnce.mockImplementation(async () => {
      token = 'ao_new';
    });
    live.acquire({ metrics: true });
    last().drop(4401);
    last().drop(4401);
    await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    expect(last().protocols).toEqual(['ao-auth', 'ao-bearer.ao_new']);
    expect(last().url).not.toContain('access_token');
  });

  it('reports an unavailable connection instead of loading forever', async () => {
    live.acquire({ feeds: ['control'] });
    expect(live.feedLoading('control')).toBe(true);
    last().drop();
    await vi.advanceTimersByTimeAsync(CONNECT_GRACE_MS + 10);
    expect(live.connectionError()).toMatch(/unavailable/i);
    expect(live.feedLoading('control')).toBe(false);

    last().accept();
    expect(live.connectionError()).toBeNull();
    last().deliver({ type: 'admin_feed', topic: 'control', data: { ok: true } });
    expect(live.feedData('control')).toEqual({ ok: true });
  });

  it('ignores frames that are valid JSON but not objects', () => {
    live.acquire({ metrics: true });
    const sock = last();
    sock.readyState = FakeSocket.OPEN;
    sock.onopen?.();
    for (const raw of ['null', '42', '"text"', '[1,2]', 'not json', '']) {
      expect(() => sock.deliverRaw(raw)).not.toThrow();
    }
    expect(live.metrics()).toBeNull();
  });

  it('does not duplicate log lines when the server replays its history', async () => {
    live.acquire({ logs: true });
    const first = last();
    first.accept();
    const line = (ts: string, text: string) => ({
      type: 'admin_log',
      source: 'web',
      level: 'info',
      ts,
      line: text,
    });
    first.deliver(line('2026-01-01T00:00:01.000Z', 'a'));
    first.deliver(line('2026-01-01T00:00:02.000Z', 'b'));
    first.deliver(line('2026-01-01T00:00:02.000Z', 'b')); // genuine repeat
    expect(live.logs().map((l) => l.line)).toEqual(['a', 'b', 'b']);

    first.drop();
    await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    const second = last();
    second.accept();
    // Replay of everything so far, one more at the same instant, then new.
    second.deliver(line('2026-01-01T00:00:01.000Z', 'a'));
    second.deliver(line('2026-01-01T00:00:02.000Z', 'b'));
    second.deliver(line('2026-01-01T00:00:02.000Z', 'b'));
    second.deliver(line('2026-01-01T00:00:02.000Z', 'c'));
    second.deliver(line('2026-01-01T00:00:03.000Z', 'd'));
    expect(live.logs().map((l) => l.line)).toEqual(['a', 'b', 'b', 'c', 'd']);
  });

  it('restarts the log buffer when the source filter changes', () => {
    const page = live.acquire({ logs: true });
    const sock = last();
    sock.accept();
    sock.deliver({
      type: 'admin_log',
      source: 'engine',
      level: 'info',
      ts: '2026-01-01T00:00:01.000Z',
      line: 'from engine',
    });
    sock.sent.length = 0;

    page.setLogSources(['web']);
    expect(sock.sent).toEqual([{ type: 'admin_logs_subscribe', sources: ['web'] }]);
    expect(live.logs()).toEqual([]);
  });
});

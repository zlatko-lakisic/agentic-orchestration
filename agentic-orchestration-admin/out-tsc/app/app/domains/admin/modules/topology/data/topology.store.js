import { __decorate } from "tslib";
import { Injectable, computed, inject, signal } from '@angular/core';
import { AoApi } from '@/app/core/ao-api/ao-api';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { layoutTopology, pathClosure } from './topology.layout';
import { visibleNodeStatus } from './topology.status';
const GRACE_MS = 30_000;
let TopologyStore = class TopologyStore {
    api = inject(AoApi);
    live = inject(AoLiveWs);
    liveSub = null;
    seq = signal(0);
    generatedAt = signal(null);
    notes = signal([]);
    capabilities = signal(null);
    /** Structure only — health patches must not write here. */
    structureNodes = signal([]);
    structureEdges = signal([]);
    /** id → status overlay; never triggers layoutTopology. */
    healthById = signal({});
    liveMode = signal(true);
    paused = signal(false);
    showNotDeployed = signal(false);
    onlyUnhealthy = signal(false);
    bandFilter = signal('all');
    tableMode = signal(false);
    hoverNodeId = signal(null);
    /** Application accordion: which appId panel is expanded (null = all minimized). */
    expandedAppId = signal(null);
    /** Kubernetes accordion: expand platform/k3s to show in-cluster workloads. */
    expandedK8sId = signal(null);
    snapshotOnly = signal(false);
    lastError = signal(null);
    loading = signal(true);
    grace = new Map();
    _layoutRuns = 0;
    layoutRunCount() {
        return this._layoutRuns;
    }
    /** Geometry only — depends on structure + filters, not healthById. */
    layout = computed(() => {
        this._layoutRuns += 1;
        let nodes = this.mergeGrace(this.structureNodes());
        let edges = this.structureEdges();
        if (this.bandFilter() !== 'all') {
            const band = this.bandFilter();
            nodes = nodes.filter((n) => n.band === band);
            const ids = new Set(nodes.map((n) => n.id));
            edges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
        }
        return layoutTopology(nodes, edges, {
            showNotDeployed: this.showNotDeployed(),
            expandedAppId: this.expandedAppId(),
            expandedK8sId: this.expandedK8sId(),
        });
    });
    /** Positioned nodes with live health merged for rendering. */
    displayNodes = computed(() => {
        const health = this.healthById();
        const onlyBad = this.onlyUnhealthy();
        return this.layout()
            .nodes.map((n) => {
            const h = health[n.id];
            const status = visibleNodeStatus(h?.status || n.status, n.deployed !== false);
            const statusReason = h?.statusReason ?? n.statusReason;
            return {
                ...n,
                status,
                statusReason,
                displayStatus: status,
            };
        })
            .filter((n) => {
            if (!onlyBad)
                return true;
            return ['failed', 'degraded', 'offline'].includes(String(n.displayStatus || '').toLowerCase());
        });
    });
    displayEdges = computed(() => {
        if (!this.onlyUnhealthy())
            return this.layout().edges;
        const ids = new Set(this.displayNodes().map((n) => n.id));
        return this.layout().edges.filter((e) => ids.has(e.from) || ids.has(e.to));
    });
    hoverClosure = computed(() => {
        const id = this.hoverNodeId();
        if (!id)
            return null;
        return pathClosure(id, this.structureEdges());
    });
    unhealthyCount = computed(() => this.displayNodes().filter((n) => ['failed', 'degraded'].includes(String(n.displayStatus || '').toLowerCase())).length);
    nodes = computed(() => this.structureNodes());
    edges = computed(() => this.structureEdges());
    start() {
        this.loading.set(true);
        this.api.topologyGraph().subscribe((r) => {
            if (r.ok) {
                this.applySnapshot(r.data);
                this.snapshotOnly.set(true);
                this.lastError.set(null);
            }
            else {
                this.lastError.set(r.message);
            }
            this.loading.set(false);
        });
        this.live.acquire({ topology: true });
        this.liveSub?.unsubscribe();
        this.liveSub = this.live.topologyEvents.subscribe((ev) => {
            if (this.paused())
                return;
            this.onLiveEvent(ev);
        });
    }
    stop() {
        this.liveSub?.unsubscribe();
        this.liveSub = null;
        this.live.release();
    }
    togglePause() {
        this.paused.update((p) => !p);
    }
    resync() {
        this.live.resyncTopology();
        this.api.topologyGraph().subscribe((r) => {
            if (r.ok)
                this.applySnapshot(r.data);
        });
    }
    setHover(id) {
        this.hoverNodeId.set(id);
    }
    /** Expand one Application panel (or collapse if already expanded). */
    toggleAppExpanded(appId) {
        const id = String(appId || '').trim();
        if (!id)
            return;
        this.expandedAppId.update((cur) => (cur === id ? null : id));
    }
    collapseApps() {
        this.expandedAppId.set(null);
    }
    /** Expand Kubernetes platform node to reveal in-cluster workloads. */
    toggleK8sExpanded(nodeId = 'platform/k3s') {
        const id = String(nodeId || '').trim() || 'platform/k3s';
        this.expandedK8sId.update((cur) => (cur === id ? null : id));
    }
    collapseK8s() {
        this.expandedK8sId.set(null);
    }
    loadNodeDetail(id) {
        return this.api.topologyNode(id);
    }
    /** Test helper: health patch must not increment layout runs. */
    applyHealthForTest(patches) {
        // Touch layout once so _layoutRuns is stable
        void this.layout();
        const before = this._layoutRuns;
        this.patchHealth(patches);
        void this.displayNodes();
        const after = this._layoutRuns;
        return { layoutRunsBefore: before, layoutRunsAfter: after };
    }
    onLiveEvent(ev) {
        if (ev.type === 'topology_snapshot') {
            this.applySnapshot(ev);
            this.snapshotOnly.set(false);
            return;
        }
        if (ev.type === 'topology_delta') {
            const fromSeq = Number(ev['fromSeq'] || 0);
            if (fromSeq && fromSeq !== this.seq()) {
                this.live.resyncTopology();
                return;
            }
            this.applyDelta(ev);
            this.snapshotOnly.set(false);
            return;
        }
        if (ev.type === 'topology_health') {
            const health = ev['health'];
            if (Array.isArray(health))
                this.patchHealth(health);
            if (ev['seq'] != null)
                this.seq.set(Number(ev['seq']));
        }
    }
    applySnapshot(graph) {
        this.seq.set(Number(graph.seq || 0));
        this.generatedAt.set(graph.generatedAt || null);
        this.notes.set(graph.notes || []);
        this.capabilities.set(graph.capabilities || null);
        this.structureNodes.set(graph.nodes || []);
        this.structureEdges.set(graph.edges || []);
        this.pruneExpandedApp(graph.nodes || []);
        this.pruneExpandedK8s(graph.nodes || []);
        const health = {};
        for (const n of graph.nodes || []) {
            health[n.id] = { status: String(n.status), statusReason: n.statusReason };
        }
        this.healthById.set(health);
        this.grace.clear();
    }
    applyDelta(ev) {
        const upserted = ev['nodesUpserted'] || [];
        const removed = ev['nodesRemoved'] || [];
        const edgesUpserted = ev['edgesUpserted'] || [];
        const edgesRemoved = ev['edgesRemoved'] || [];
        const map = new Map(this.structureNodes().map((n) => [n.id, n]));
        const health = { ...this.healthById() };
        for (const n of upserted) {
            map.set(n.id, n);
            health[n.id] = { status: String(n.status), statusReason: n.statusReason };
            this.grace.delete(n.id);
        }
        const now = Date.now();
        for (const id of removed) {
            const prev = map.get(id);
            if (prev) {
                this.grace.set(id, {
                    node: { ...prev, status: 'offline' },
                    removeAt: now + GRACE_MS,
                });
                health[id] = { status: 'offline', statusReason: 'removed' };
            }
            map.delete(id);
        }
        const nextNodes = [...map.values()];
        this.structureNodes.set(nextNodes);
        this.healthById.set(health);
        this.pruneExpandedApp(nextNodes);
        this.pruneExpandedK8s(nextNodes);
        const emap = new Map(this.structureEdges().map((e) => [e.id, e]));
        for (const e of edgesUpserted)
            emap.set(e.id, e);
        for (const id of edgesRemoved)
            emap.delete(id);
        this.structureEdges.set([...emap.values()]);
        if (ev['seq'] != null)
            this.seq.set(Number(ev['seq']));
        if (ev['notes'])
            this.notes.set(ev['notes']);
        if (ev['capabilities']) {
            this.capabilities.set(ev['capabilities']);
        }
        if (ev['generatedAt'])
            this.generatedAt.set(String(ev['generatedAt']));
    }
    pruneExpandedApp(nodes) {
        const cur = this.expandedAppId();
        if (!cur)
            return;
        const stillThere = nodes.some((n) => n.kind === 'app' && n.appId === cur && n.deployed !== false);
        if (!stillThere)
            this.expandedAppId.set(null);
    }
    pruneExpandedK8s(nodes) {
        const cur = this.expandedK8sId();
        if (!cur)
            return;
        const platform = nodes.find((n) => n.id === cur);
        if (!platform?.expandable)
            this.expandedK8sId.set(null);
    }
    patchHealth(patches) {
        this.healthById.update((prev) => {
            const next = { ...prev };
            for (const p of patches) {
                next[p.id] = { status: p.status, statusReason: p.statusReason };
            }
            return next;
        });
    }
    mergeGrace(nodes) {
        const now = Date.now();
        const out = [...nodes];
        for (const [id, g] of [...this.grace.entries()]) {
            if (now >= g.removeAt) {
                this.grace.delete(id);
                continue;
            }
            if (!out.some((n) => n.id === id))
                out.push(g.node);
        }
        return out;
    }
};
TopologyStore = __decorate([
    Injectable()
], TopologyStore);
export { TopologyStore };

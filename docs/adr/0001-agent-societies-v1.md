---
layout: single
title: "ADR 0001 — Agent societies v1"
permalink: /adr/0001-agent-societies-v1/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# ADR 0001 — Agent societies v1

**Status:** Accepted (2026-07-29). Superseded in part by **K6.2** (2026-07-29): the message bus
predicted in decision 3 shipped, so `blackboard` mode is now threaded messages under
`<session>/messages/` with `blackboard.md` kept as the audit trail, and turn selection moved to
`orchestration/society_protocols.py` (`round_robin`, `moderator_picks`, `reactive`). Every
non-goal below still holds, including no parallel turns.

**Context:** [Agent societies roadmap]({{ '/Agent-societies-roadmap/' | relative_url }}) (K6), [Dynamic planning]({{ '/dynamic-planning/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) (K5.5 delegation RPC)

---

## Context

Today the orchestrator coordinates agents but does not let them act as a society. A planner picks
one agent per step, prior output is injected into the next task description, and `allow_delegation`
is `false` on effectively every catalog entry. Cross-agent work only happens through the Kubernetes
`k8s_delegate_task` tool, which needs a run store and the delegation broker.

Customers asking for "a panel of agents that argue and converge" cannot be served by the linear
planner without re-planning on every turn, which is slow, expensive, and loses the debate.

We need a **society runtime**: a roster with roles, a turn protocol, shared memory, and hard budgets —
separate from the planner, which only decides *who is in the room*.

## Decision

Ship agent societies in phases, starting with **K6.1 "society lite"** on the in-process backend.

1. **Charter is data, not code.** A society is declared in YAML (`society_charter.schema.json`):
   roster of catalog `agent_provider_id` values with roles, a turn protocol, budgets, and stop
   conditions. Regulated tenants can pin a charter and skip LLM roster bootstrap entirely.
2. **Runtime protocol is Python, not prompt engineering.** `round_robin` turn selection in
   `orchestration/society_runtime.py` drives one single-agent crew per turn. CrewAI
   `process: hierarchical` and `allow_delegation` are shipped as a **reference workflow**
   (`config/workflows/workflow_society_hierarchical_panel.yaml`), not as the society runtime, because
   manager-driven crews behave inconsistently across local (Ollama) and cloud models.
3. **Shared memory is a blackboard file.** Session state lives under
   `__orchestrator_sessions__/societies/<slug>/` with `meta.json`, `blackboard.md`, and
   `transcript.jsonl`. Phase 2 replaces the append-only markdown with a message bus; the session
   layout stays.
4. **Delegation is a tool with a budget.** `delegate_task` mirrors the `k8s_delegate_task` argument
   surface (`agent_provider_id`, `task_description`, `expected_output`) and runs the child inline via
   `build_workflow` + kickoff. It is attached only to members with `can_delegate: true`, and every
   call must be reserved against `max_delegations` before it runs.
5. **Stopping is a controller decision plus hard caps.** `society_controller_decision` mirrors
   `iterative_controller_decision` (same JSON contract, same model-selection precedence). The
   controller may stop early; it can never extend past `max_turns`.
6. **Opt-in per catalog entry.** New catalog flag `society_capable: true` marks entries an operator
   is willing to seat in a society. `allow_delegation` stays `false` by default and is enabled only
   on facilitator-oriented entries.

## Interaction modes (charter enum)

| Mode | Description | v1 status |
|------|-------------|-----------|
| `handoff` | Sequential steps, prior output injected into the next task | Existing behavior |
| `crew_delegation` | CrewAI `allow_delegation: true` on selected members | Reference workflow only |
| `hierarchical` | Manager agent + workers (`process: hierarchical`) | Reference workflow only |
| `blackboard` | Members read/write a shared board; append-only in v1 | **Shipped (K6.1)** |
| `delegate_rpc` | Explicit delegation tool (`delegate_task` inline, `k8s_delegate_task` on K8s) | **Shipped (K6.1)** |

A charter declares one `interaction_mode`; `blackboard` is the default and the only mode the
`--society` runtime drives end to end in v1.

## Non-goals (v1)

- **No unbounded spend.** `max_turns` and `max_delegations` are always enforced, with defaults even
  when the charter omits them. A society that cannot bound itself must not start.
- **No internet-facing societies without auth.** Societies are reachable only through the existing
  authenticated surfaces (CLI, and the orchestrate API behind `AGENTIC_ORCHESTRATE_API_KEY`). No new
  unauthenticated endpoint, webhook, or public message bus.
- **No nested societies.** A delegated child task runs a single agent; it cannot start its own
  society. Depth stays 1 in v1.
- **No cross-tenant or external agents.** Members must resolve to entries in the local agent-provider
  catalog. Foreign agent runtimes need an adapter (A2A / MCP), which is out of scope.
- **No autonomous side effects.** Members get the tools the charter lists. Filesystem and network
  reach still comes from the MCP catalog and its existing allowlists.
- **No parallel turns.** One member speaks per turn so transcripts stay auditable and token spend
  stays predictable.

## Consequences

- Laptop, ARM edge, and cluster all run the same charter through the same Python loop, so behavior does
  not depend on a CrewAI manager agent's judgment.
- A society run costs at most `max_turns` agent calls plus at most `max_delegations` child calls plus
  one controller call per completed round — bounded before the run starts.
- Because the blackboard is append-only markdown, very long societies grow context linearly. The
  runtime truncates the injected excerpt (`AGENTIC_SOCIETY_BLACKBOARD_CHARS`), and Phase 2's threaded
  message bus is the real fix.
- Shipping `hierarchical` only as a reference workflow means one advertised interaction mode is not
  driven by the CLI. This is deliberate: reliability over surface area.

## Alternatives considered

- **Pure CrewAI hierarchical crews.** Rejected as the primary runtime: manager delegation quality
  collapses on small local models, and budgets cannot be enforced from outside the crew.
- **Re-plan every turn with the dynamic planner.** Rejected: one planner call per turn dominates cost
  and latency, and the planner rewrites the roster mid-debate.
- **Message-bus-first (skip lite).** Rejected for v1 sequencing only. The Phase 2 bus is the durable
  design; shipping the session layout and budgets first de-risks it.

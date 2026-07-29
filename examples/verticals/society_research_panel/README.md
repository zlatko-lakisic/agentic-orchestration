# Society research panel (K6.1 society lite + K6.2 message bus)

A three-member **agent society**: a facilitator, a domain expert, and an implementation critic
take turns on a threaded message bus until they converge on one recommendation.

Unlike the other verticals, the interesting artifact here is not a workflow YAML — it is the
**charter** (`society_research_panel.yaml`), validated against
`agentic-orchestration-tool/config/schemas/society_charter.schema.json`. See
[ADR 0001](../../../docs/adr/0001-agent-societies-v1.md) for what v1 does and deliberately does not do.

## Run it

```bash
cd agentic-orchestration-tool
python main.py --example society_research_panel \
  --society ../examples/verticals/society_research_panel/society_research_panel.yaml \
  --goal "Should we run our RAG index on the edge device or in the cluster?"
```

Members are local Ollama entries, so no cloud keys are needed. Pull the models first:

```bash
ollama pull hermes3 && ollama pull llama3.3 && ollama pull qwen2.5-coder
```

`--example society_research_panel` points `AGENTIC_ORCHESTRATOR_CONTEXT_FILE` at
`orchestrator-context.md` (debate rules, evidence honesty, controller guidance) and merges the
`agent_providers/` overlay used by the Jetson charter.

### Small devices (Jetson)

The Jetson catalog ships one small model, and a society needs a distinct catalog id per seat, so
`society_research_panel_jetson.yaml` seats three overlay entries (`soc_jetson_facilitator`,
`soc_jetson_expert`, `soc_jetson_critic`) that all run `llama3.2:3b` on the host Ollama:

```bash
cd agentic-orchestration-tool
python main.py --example society_research_panel \
  --society ../examples/verticals/society_research_panel/society_research_panel_jetson.yaml \
  --goal "Should the RAG index live on the Jetson or in the cluster?" \
  --society-max-turns 6
```

Smoke test (unit tests, charter load, session create, message-bus round-trip, protocol
selection — no LLM calls):

```bash
bash agentic-orchestration-tool/scripts/smoke_society_lite.sh
# add a real 6-turn run against local models:
AGENTIC_SMOKE_SOCIETY_LIVE=1 bash agentic-orchestration-tool/scripts/smoke_society_lite.sh
```

## What the charter controls

| Field | Effect |
|-------|--------|
| `members[].agent_provider_id` | Catalog entry for the seat; must carry `society_capable: true` |
| `members[].role` | Drives the injected role charge and `<role>_posts` stop conditions |
| `members[].charge` | Per-member instructions appended to that member's turns |
| `members[].can_delegate` | Attaches the `delegate_task` tool to that member's turns |
| `protocol` | `round_robin` (default), `moderator_picks` (the facilitator hands the floor to the member it names), `reactive` (whoever has unread messages speaks next); `hierarchical` is an alias that still round-robins |
| `max_turns` / `max_delegations` | Hard budgets, enforced outside the LLM's control |
| `min_turns` | Earliest turn the society controller may stop the run |
| `stop_when` | Phrases that end the run, e.g. `facilitator_posts: FINAL_RECOMMENDATION` |
| `tools` | `delegate_task` plus the message bus tools `society_post`, `society_read_thread`, `society_list_agents` |

## Where the run lands

```
agentic-orchestration-tool/__orchestrator_sessions__/societies/research_panel/
  meta.json         roster, turn, delegations_used, status, stop_reason
  blackboard.md     append-only audit trail (and the controller's input)
  transcript.jsonl  one record per turn, message, delegation, and controller decision
  messages/         threaded message bus: {msg_id}.json, _index.jsonl, _cursors.json
```

Each turn sees a digest of the most recent messages plus anything addressed to it, not the whole
blackboard — members pull full threads with `society_read_thread` and reply with `society_post`.
Turn output is broadcast to thread `main` automatically, so the bus stays useful even when a
small model never calls the tools.

Under `protocol: moderator_picks` or `reactive`, a member posting `ready_for_draft` hands the next
turn to the seated `writer` (or `domain_expert`).

## Hierarchical crew reference

The `hierarchical` / `crew_delegation` interaction modes ship as a reference workflow rather
than as the society runtime:

```bash
python main.py --config config/workflows/workflow_society_hierarchical_panel.yaml \
  "Should we run our RAG index on the edge device or in the cluster?"
```

That file uses `process: hierarchical` with one manager (`allow_delegation: true`) and two
workers that cannot delegate; the manager LLM comes from `AGENTIC_CREW_MANAGER_MODEL`. The
society CLI takes a charter path instead, because manager-driven delegation quality varies too
much across local and cloud models to be the default runtime.

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENTIC_SOCIETY_MAX_TURNS` | Default `max_turns` when the charter omits it (default `12`) |
| `AGENTIC_SOCIETY_MAX_DELEGATIONS` | Default `max_delegations` when the charter omits it (default `3`) |
| `AGENTIC_SOCIETY_REQUIRE_CAPABLE` | Set `0` to seat catalog entries without `society_capable: true` |
| `AGENTIC_SOCIETY_CONTROLLER` | Set `0` to run purely on turn budgets and `stop_when` |
| `AGENTIC_SOCIETY_CONTROLLER_MODEL` | Controller model; falls back to the iterative controller, then the planner model |
| `AGENTIC_SOCIETY_BLACKBOARD_CHARS` | Blackboard excerpt (default `12000`); injected per turn only when the message tools are off |
| `AGENTIC_SOCIETY_MESSAGE_TOOLS` | Set `0` to drop the `society_*` tools and go back to the full blackboard excerpt per turn |
| `AGENTIC_SOCIETY_MESSAGE_SUMMARY_N` | Recent messages digested into each turn description (default `8`) |
| `AGENTIC_SOCIETY_DELEGATE` | Set `1` to allow `delegate_task` outside society runs |

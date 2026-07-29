# Society research panel (K6.1 — society lite)

A three-member **agent society**: a facilitator, a domain expert, and an implementation critic
take round-robin turns on a shared blackboard until they converge on one recommendation.

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

Smoke test (unit tests + charter load + session create, no LLM calls):

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
| `protocol` | `round_robin` (v1 runtime); `hierarchical` is accepted as an alias that still round-robins |
| `max_turns` / `max_delegations` | Hard budgets, enforced outside the LLM's control |
| `min_turns` | Earliest turn the society controller may stop the run |
| `stop_when` | Phrases that end the run, e.g. `facilitator_posts: FINAL_RECOMMENDATION` |

## Where the run lands

```
agentic-orchestration-tool/__orchestrator_sessions__/societies/research_panel/
  meta.json         roster, turn, delegations_used, status, stop_reason
  blackboard.md     append-only shared memory injected into each turn
  transcript.jsonl  one record per turn, delegation, and controller decision
```

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
| `AGENTIC_SOCIETY_BLACKBOARD_CHARS` | Blackboard excerpt injected per turn (default `12000`) |
| `AGENTIC_SOCIETY_DELEGATE` | Set `1` to allow `delegate_task` outside society runs |

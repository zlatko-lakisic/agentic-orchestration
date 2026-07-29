---
layout: single
title: "Configuration"
permalink: /configuration/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Configuration (environment variables)

**Authoritative reference:** `agentic-orchestration-tool/.env.example` — every variable is documented inline with defaults and behavior.

**Load order:** `python-dotenv` loads `.env` from the tool directory when you start `main.py` (see `main.py`).

## Categories (summary)

| Category examples | Notes |
|-------------------|------|
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_MODEL_NAME`, `OPENAI_BASE_URL` (compatible servers) |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| **Hugging Face** | `HF_TOKEN`, `HUGGINGFACE_API_BASE` |
| **Ollama** | `OLLAMA_HOST`, router model envs |
| **Dynamic planner** | `AGENTIC_PLANNER_MODEL`, `AGENTIC_PLANNER_USE_LITELLM`, `AGENTIC_PLANNER_MAX_STEPS`, JSON mode, repair retry, 429 retries, context window truncation |
| **Sessions** | `AGENTIC_ORCHESTRATOR_*` |
| **VRAM / hardware** | `AGENTIC_ASSUME_VRAM_GB`, `AGENTIC_MAX_VRAM_FRACTION`, `AGENTIC_MAX_VRAM_GB`, disable filters |
| **MCP** | `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `HOME_ASSISTANT_*`, `BRAVE_SEARCH_*`, `TAVILY_API_KEY`, `EXA_API_KEY`, `AGENTIC_MCP_FETCH_ENABLED`, `AGENTIC_MCP_MEMORY_MCP_ENABLED`, `FILESYSTEM_MCP_ALLOWED_DIRECTORY`, goal-match toggles |
| **Agent skills** | `AGENTIC_AGENT_SKILLS_CATALOG`, `AGENTIC_EXTRA_AGENT_SKILLS_PATH`, `AGENTIC_SKILLS_MAX_CHARS_PER_TASK`, `AGENTIC_DISABLE_SKILL_GOAL_MATCH`, `AGENTIC_STRICT_SKILL_IDS` |
| **RAG sources** | `AGENTIC_EXTRA_RAG_SOURCES_PATH`, `AGENTIC_RAG_INJECT_MAX_TOKENS` — see [RAG sources]({{ '/rag-catalog/' | relative_url }}) |
| **Execution backend** | `AGENTIC_EXECUTION_BACKEND`, `AGENTIC_SUBPROCESS_WORKERS`, `AGENTIC_RUN_STORE_PATH`, `AGENTIC_RUN_STORE_BACKEND` | See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}), [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) |
| **Progress / step context** | `AGENTIC_PROGRESS`, `AGENTIC_STEP_CONTEXT_*` |
| **Learning & KB** | `AGENTIC_LEARNING*`, `AGENTIC_KB*` (attachment fingerprints: `attachment_fingerprint`; legacy `mcp_fingerprint` alias); user harness: `AGENTIC_USER_HARNESS_RECORD_STATS`, `AGENTIC_USER_HARNESS_FEED_PLANNER` |
| **Cloud anonymization** | `AGENTIC_ANONYMIZE_CLOUD` (default `1`), `AGENTIC_CLOUD_PROVIDER_TYPES` (default `openai,anthropic,huggingface`), `AGENTIC_ANONYMIZE_PATTERNS_PATH` / `AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH` — scrub PII/secrets before cloud LLM egress; YAML custom regexes; privacy/offline goals force local providers. **Tier 3**: `AGENTIC_ANONYMIZE_REVERSIBLE` (default `1`, unique recoverable `[EMAIL:1]`-style tokens), `AGENTIC_ANONYMIZE_NER` (default `0`, optional Presidio PERSON/LOCATION/NRP pass — soft dep, see `requirements-anonymize.txt`), `AGENTIC_ANONYMIZE_TOOL_RESULTS` (default `1`, scrub fetched pages / prior-step handoff), `AGENTIC_ANONYMIZE_VISION_LOCAL` / `AGENTIC_ANONYMIZE_VISION_MODEL` (default `1` / `ollama/llava`, prefer local vision model for video synopsis) |
| **Impartial QA gate** | `AGENTIC_IMPARTIAL_QA` (default `1`, advisory), `AGENTIC_IMPARTIAL_QA_FAIL` (default `0`) and `AGENTIC_IMPARTIAL_QA_*` — see below |
| **Answer cache** | `AGENTIC_ANSWER_CACHE` |
| **Iterative mode** | `AGENTIC_DYNAMIC_ITERATIVE_*`, controller-related vars |
| **Iterative stdout behavior** | `AGENTIC_DYNAMIC_ITER_STREAM_STEPS` |
| **Agent societies** | `AGENTIC_SOCIETY_*` — see below and [Agent societies roadmap]({{ '/Agent-societies-roadmap/' | relative_url }}) |
| **Attachments / uploads** | `AGENTIC_ATTACHMENTS_ALLOW_ABSOLUTE` (advanced escape hatch; defaults keep paths under tool upload directory) |
| **Extra catalogs** | `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH`, `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`, `AGENTIC_EXTRA_AGENT_SKILLS_PATH`, `AGENTIC_EXTRA_AGENT_HARNESS_DIRS` |
| **Artifacts** | `AGENTIC_VERIFY`, output dirs |

## Execution backend

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_EXECUTION_BACKEND` | `inprocess` | `inprocess` (CrewAI in-process), `subprocess`, or `kubernetes` (stub). Aliases: `crewai`, `k8s`. |
| `AGENTIC_SUBPROCESS_WORKERS` | `0` | When `1` and backend is `subprocess`, run each step via `python main.py --execute-step`. Otherwise subprocess backend falls back to in-process CrewAI. |
| `AGENTIC_RUN_STORE_PATH` | _(unset)_ | Mounted directory for distributed step handoffs: `{path}/{run_id}/{step_id}/result.json`. Used by subprocess workers today; same path on a PVC for K8s Jobs. When unset, each run uses a temp directory. |
| `AGENTIC_K8S_ALLOW_STDIO_MCPS` | `0` | K8s mode only: when `1`, allow stdio MCP ids if sidecars exist (K4). K3 MVP keeps `0`. See [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}#mcp-compatibility-matrix-k8s-mode). |

See [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) for architecture and phased rollout. See [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) for PVC layout on cluster.

## Run store backends

`AGENTIC_RUN_STORE_BACKEND` chooses where step **results** are stored. Step **specs** always
stay on `AGENTIC_RUN_STORE_PATH` (local directory or PVC) because subprocess workers and
Kubernetes Jobs are handed a file path for `--execute-step`; only results move off disk.
Workers keep writing `result.json` onto the shared volume, and the remote backends promote a
worker-written result to the remote store on first read.

`boto3` and `redis` are soft dependencies (`requirements-run-store.txt`) — the default
filesystem backend never imports them.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_RUN_STORE_BACKEND` | `filesystem` | `filesystem` (aliases `fs`, `file`, `local`), `s3` (alias `minio`), or `redis`. Unknown values are a startup error. |
| `AGENTIC_RUN_STORE_S3_BUCKET` | _(unset)_ | **Required** for `s3`. Results at `{prefix}/{run_id}/{step_id}/result.json`. |
| `AGENTIC_RUN_STORE_S3_PREFIX` | `agentic-runs` | Key prefix inside the bucket. |
| `AGENTIC_RUN_STORE_S3_ENDPOINT` | _(unset)_ | Set for MinIO / Ceph RGW; leave unset for AWS S3. |
| `AGENTIC_RUN_STORE_S3_REGION` | `AWS_REGION` / `AWS_DEFAULT_REGION` | Client region. |
| `AGENTIC_RUN_STORE_S3_ACCESS_KEY_ID` | `AWS_ACCESS_KEY_ID` | Explicit credential; otherwise the boto3 default chain applies. |
| `AGENTIC_RUN_STORE_S3_SECRET_ACCESS_KEY` | `AWS_SECRET_ACCESS_KEY` | Paired with the access key id. |
| `AGENTIC_RUN_STORE_REDIS_URL` | `redis://127.0.0.1:6379/0` | Connection URL for `redis`. |
| `AGENTIC_RUN_STORE_REDIS_PREFIX` | `agentic` | Keys are `{prefix}:run:{run_id}:step:{step_id}:result`. |
| `AGENTIC_RUN_STORE_REDIS_TTL_SECONDS` | _(unset)_ | Optional expiry on result keys; unset keeps them forever. |

Smoke: `agentic-orchestration-tool/scripts/smoke_run_store_backends.sh` (offline by default;
`AGENTIC_SMOKE_RUN_STORE_S3_LIVE=1` / `AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE=1` for live round-trips).

## Engine API daemon (optional)

`python -m orchestration.serve` is **opt-in**. The CLI (`python main.py`) and the Node web server
are unchanged and never import FastAPI, which lives in `requirements-serve.txt` alongside uvicorn
and websockets. A CLI-only or Jetson install can skip that file; the daemon then fails with a
message naming it rather than a bare `ImportError`.

See [Engine API daemon plan]({{ '/engine-daemon-plan/' | relative_url }}) for the protocol and the
slice-by-slice status.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_SERVE_HOST` | `127.0.0.1` | Bind address. Loopback by default — network binding is an explicit opt-in, and in server mode the port must be reachable **only** through the identity-terminating proxy. On Jetson, `config/env.jetson` sets `0.0.0.0` so the `agentic-engine` Deployment can publish hostPort **8765**. |
| `AGENTIC_SERVE_PORT` | `8765` | Bind port. KnowBuddy Remote URL on Jetson: `http://<jetson>:8765` (NodePort alternate **30765**). Web UI remains on **30487**. |
| `AGENTIC_JETSON_ENABLE_ENGINE` | `1` | When unset/`1`, `jetson-deploy.sh` applies `scripts/jetson-enable-engine.sh`. Set `0` to leave only the Node web UI. |
| `AGENTIC_SERVE_LOG_LEVEL` | `info` | uvicorn log level. |
| `AGENTIC_SERVE_MAX_CONCURRENT_RUNS` | `8` | Cap on question-tagged runs in flight per WebSocket connection (ceiling `64`). |
| `AGENTIC_REQUIRE_IDENTITY` | _(unset)_ | `1` rejects requests without an identity header (HTTP `401`, WebSocket close `1008`) instead of falling back to the implicit local user. Also switches deal authorization on. |
| `AGENTIC_WEB_USER_NAME_HEADER` | `x-agentic-user-name,x-user-name` | Comma-separated headers searched for the display name (same variable the Node server uses). |
| `AGENTIC_WEB_SESSION_ID_HEADER` | `x-agentic-session-id,x-warpgate-session-id` | Comma-separated headers searched for the session id; absent → a generated `web-<hex>` id. |
| `AGENTIC_WEB_HOST_METRICS_PUSH_MS` | `2000` | Interval for `host_metrics` pushes after `host_metrics_subscribe` (clamped to 1000–60000). |
| `AGENTIC_HOST_METRICS_PROC_ROOT` | `/proc` | Set to `/host/proc` when the node's `/proc` is mounted; also flips the reported `scope` to `host`. |
| `AGENTIC_JETSON_JTOP_METRICS_PATH` | _(unset)_ | jtop snapshot JSON; supplies GPU / power / temperature and flips `scope` to `jetson`. |
| `AGENTIC_DIRECT_AGENT_CONTEXT_CHARS` | `20000` | Cap on caller-supplied context in the direct-agent prompt. |

Smoke: `agentic-orchestration-tool/scripts/smoke_serve.sh` (offline by default and safe without the
extras; `AGENTIC_SMOKE_SERVE_LIVE=1` binds a real port and probes `/health`).

### User dimension and deal scope

All three are **opt-in** and dual-read, so existing on-disk state is never orphaned.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_SESSION_USER_NAMESPACE` | `0` | `1` writes new sessions to `__orchestrator_sessions__/users/<user_id>/<slug>.json`. An existing legacy `<slug>.json` still wins, and a namespaced session that was never written falls back to the legacy file on read. |
| `AGENTIC_RUN_STORE_USER_NAMESPACE` | `0` | `1` allocates shared run roots at `{AGENTIC_RUN_STORE_PATH}/users/<user_id>/<run_id>/`. |
| `AGENTIC_DEAL_AUTH` | _(unset)_ | `1` enforces deal membership without requiring `AGENTIC_REQUIRE_IDENTITY`. Membership lives in `__orchestrator_deals__/members.json` (roles `viewer` < `editor` < `owner`). Local mode is permissive; in server mode an empty file denies every deal. |

**One writer for SQLite.** Do not let the Node spawn-per-message CLI and the daemon write the same
`__orchestrator_kb__/kb.sqlite3` in one deployment — pick one writer.

### Concurrent resident models

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_VRAM_GB` | _(unset)_ | Explicit VRAM budget for `plan_resident_models()`. Useful on unified-memory boards where `nvidia-smi` is absent or misleading. Falls back to the largest detected NVIDIA GPU. |
| `AGENTIC_RESIDENT_HEADROOM_GB` | `1` | Reserved for KV cache / framework overhead before packing models. |
| `AGENTIC_MAX_RESIDENT_MODELS` | `4` | Cap on simultaneously resident models (ceiling `32`). |

The existing `AGENTIC_MAX_VRAM_GB` / `AGENTIC_MAX_VRAM_FRACTION` caps still apply. An unknown budget
degrades to one resident local model rather than guessing.

## Agent societies (K6.1)

Used by `python main.py --society CHARTER.yaml --goal "…"`. The charter's `max_turns` and
`max_delegations` are always enforced; the variables below only supply defaults when the charter
omits them, or tune the runtime around them.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_SOCIETY_MAX_TURNS` | `12` | Default turn cap when the charter omits `max_turns` (hard ceiling `200`). `--society-max-turns` can lower a run further, never raise it. |
| `AGENTIC_SOCIETY_MAX_DELEGATIONS` | `3` | Default `delegate_task` budget for the whole run when the charter omits `max_delegations` (ceiling `50`). |
| `AGENTIC_SOCIETY_REQUIRE_CAPABLE` | `1` | Members must carry `society_capable: true` in the agent catalog. Set `0` to seat any entry. |
| `AGENTIC_SOCIETY_CONTROLLER` | `1` | Consult the controller LLM after each completed round (may stop early). Set `0` to rely only on `stop_when` phrases and the turn cap — same as `--society-no-controller`. |
| `AGENTIC_SOCIETY_CONTROLLER_MODEL` | _(unset)_ | Controller model; falls back to `AGENTIC_ITERATIVE_CONTROLLER_MODEL`, then `AGENTIC_PLANNER_MODEL`, then `gpt-4o-mini`. |
| `AGENTIC_SOCIETY_CONTROLLER_EXCERPT_CHARS` | `12000` | Blackboard excerpt sent to the controller. |
| `AGENTIC_SOCIETY_BLACKBOARD_CHARS` | `12000` | Blackboard excerpt (trimmed from the front, newest posts kept). Injected into each member turn only when the message tools are off. |
| `AGENTIC_SOCIETY_MESSAGE_TOOLS` | `1` | Attach the K6.2 message bus tools (`society_post`, `society_read_thread`, `society_list_agents`) to every member turn. Set `0` to fall back to the K6.1 behavior: no tools, full blackboard excerpt in each turn description. |
| `AGENTIC_SOCIETY_MESSAGE_SUMMARY_N` | `8` | How many recent bus messages are digested into a member's turn description. |
| `AGENTIC_SOCIETY_MESSAGE_SUMMARY_CHARS` | `700` | Per-message excerpt length inside that digest; full posts stay available through `society_read_thread`. |
| `AGENTIC_SOCIETY_MESSAGE_CHARS` | `8000` | Per-message content cap on the bus. |
| `AGENTIC_SOCIETY_SESSION` | _(unset)_ | Session directory name under `__orchestrator_sessions__/societies/`; default is the charter's `society.id`. `--society-session` overrides. |
| `AGENTIC_SOCIETY_DELEGATE` | `0` | Allow the inline `delegate_task` tool **outside** society runs. Society members with `can_delegate: true` get it regardless. |
| `AGENTIC_SOCIETY_DELEGATE_RESULT_CHARS` | `6000` | Truncation for a delegated child's answer. |
| `AGENTIC_CREW_MANAGER_MODEL` | `OPENAI_MODEL_NAME` | Manager LLM for `process: hierarchical` crews (`config/workflows/workflow_society_hierarchical_panel.yaml`). |

Charter schema: `config/schemas/society_charter.schema.json`. Example: `examples/verticals/society_research_panel/`
(`--example society_research_panel`). Design and non-goals: [ADR 0001]({{ '/adr/0001-agent-societies-v1/' | relative_url }}).

## Impartial QA gate (v1)

**On by default, advisory by default.** The gate scores a *finished* deliverable — the user goal
plus the final output text — as one pass/fail report instead of three separate signals. It reuses
the existing pieces: harness assertions, the LLM-as-judge score (`evaluate_run_quality`, with an
optional rubric appended to the goal exactly like harness L3), and the faithfulness review. Nothing
is re-executed; the harness CLI and the learning loop are unchanged.

Two switches, and they are independent:

- **`AGENTIC_IMPARTIAL_QA=0`** turns the gate off entirely (no report, no reviewer calls).
- **`AGENTIC_IMPARTIAL_QA_FAIL=1`** promotes it from advisory to a **hard gate** that exits `1`.

Because `AGENTIC_IMPARTIAL_QA_FAIL` defaults to `0`, a low score cannot break a production run
until you opt in. Turning the gate on by default only adds the report.

Where it runs:

| Entry point | Goal scored | Output scored |
|-------------|-------------|---------------|
| `--dynamic` | the (composed) user goal | finalized dynamic result text |
| `--dynamic-iterative` | the (composed) user goal | final synthesis, or the last crew excerpt |
| `--society` | `--goal` / `TASK` / charter goal | `final_recommendation_text` (the stop-marker turn, else the last turn) |
| routed static workflow (`main.py "goal"`) | `TASK` | the workflow's final text |

Each run prints one `=== Impartial QA (unified gate) ===` block to stderr. On the dynamic paths it
replaces the standalone faithfulness block so the faithfulness model is not paid for twice; the
society and static paths had no QA block before, so nothing is replaced there. Reports land in
`__orchestrator_sessions__/impartial_qa/<slug>-<timestamp>.json` (society slugs are prefixed
`society-`), and with the hard gate armed the process exits `1` *after* artifacts have been saved.

| Variable | Default | Meaning |
|----------|---------|---------|
| `AGENTIC_IMPARTIAL_QA` | `1` | Master switch. Set `0` to disable the gate everywhere. |
| `AGENTIC_IMPARTIAL_QA_FAIL` | `0` | Report only. Set `1` for a hard gate that exits `1` on failure. |
| `AGENTIC_IMPARTIAL_QA_MIN_SCORE` | `0.5` | Judge score below this fails the report. |
| `AGENTIC_IMPARTIAL_QA_EVAL` | `1` | Set `0` for assertions-only (no judge LLM call). |
| `AGENTIC_IMPARTIAL_QA_RUBRIC` | _(unset)_ | Inline rubric appended to the goal for the judge. |
| `AGENTIC_IMPARTIAL_QA_RUBRIC_FILE` | _(unset)_ | Rubric file; used when the inline variable is empty. |
| `AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE` | _(unset)_ | JSON list of harness assertions, e.g. `[{"type":"min_chars","value":400},{"type":"bullet_count","min":3}]`. Same types as the agent harness. |
| `AGENTIC_IMPARTIAL_QA_FAITHFULNESS` | `1` | Include the faithfulness pass in the report. |
| `AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL` | `1` | A `high` hallucination risk fails the report too. Set `0` to opt out. |
| `AGENTIC_IMPARTIAL_QA_MODEL` | _(unset)_ | Overrides both reviewers; otherwise each keeps its own chain (`AGENTIC_EVAL_MODEL` for the judge, `AGENTIC_QA_MODEL` for faithfulness, then the planner default). |

### Soft skip when nothing can be checked

The gate never fails a run just because a reviewer was unavailable. It reports itself **skipped**
when there are no assertions and no reviewer produced a result — including the edge profile in
`config/env.jetson`, which sets `AGENTIC_LEARNING_EVAL=0` (judge off) and `AGENTIC_FINAL_QA=0`
(faithfulness off) for latency. Setting `AGENTIC_IMPARTIAL_QA_EVAL=0` with no assertions skips it
the same way. A judge that errors or returns no score is recorded in the report but does not fail it
on its own either.

Smoke: `scripts/smoke_impartial_qa.sh` (offline; `AGENTIC_SMOKE_IMPARTIAL_LIVE=1` runs a real judge
pass).

## Notable runtime toggles

- `AGENTIC_ANSWER_CACHE=1` (default): same-goal replay in the same orchestrator session, with explicit "reply no to re-run" flow.
- `AGENTIC_DYNAMIC_ITER_STREAM_STEPS=1`: emit each iterative round output to stdout instead of only the final synthesis.
- `AGENTIC_OLLAMA_PULL_PROGRESS_STDERR=1` (default): keep normalized Ollama pull progress lines visible on stderr for web activity/progress UI.
- `AGENTIC_AUTO_ENSURE_RUNTIME=1` (default): ensure Python `.venv` + `requirements.txt`, and for Ollama agents install/serve/pull models (not only `selfcontained: true`). Set `0` for legacy behaviour.
- `AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S=1`: allow Ollama auto-ensure inside kubernetes workers (off by default; host Ollama + `host.k3s.internal` is the Jetson path).
- `AGENTIC_ANONYMIZE_CLOUD=1` (default): redact emails, phones, SSN-like patterns, API keys, and card-like digit runs before cloud planner/agent calls; also scrub attachment excerpts and session/KB writes. Set `0` to disable. Cloud types: `AGENTIC_CLOUD_PROVIDER_TYPES` (comma list). Goals that ask for offline/private/ollama-only drop those cloud types from the planner catalog and require a non-cloud `AGENTIC_PLANNER_MODEL`.
- Custom regex scrubbers: `config/anonymize_patterns.yaml` (or `AGENTIC_ANONYMIZE_PATTERNS_PATH`) plus optional `AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH`. Each entry has `id`, `pattern`, optional `replacement` / `flags` / `enabled`. Applied after built-ins. See `config/anonymize_patterns_examples.yaml`.
- **Tier 3** (`orchestration/cloud_anonymize_tier3.py`, re-exported from `cloud_anonymize.py`): `AGENTIC_ANONYMIZE_REVERSIBLE=1` (default) mints unique per-value placeholders (`[EMAIL:1]`, `[PERSON:2]`) instead of static ones, tracked in a session `TokenMap` (ContextVar; optionally persisted to `__orchestrator_sessions__/anon_maps/<slug>.json` via `set_token_map_session(slug)`); `restore_tokens(text)` recovers originals for a final answer. `AGENTIC_ANONYMIZE_NER=0` (default off) runs an optional Presidio pass (PERSON/LOCATION/NRP, `AGENTIC_ANONYMIZE_NER_ENTITIES`) after the regex scrub — soft dependency, install `pip install -r requirements-anonymize.txt` and a spaCy model (`python -m spacy download en_core_web_lg`); skipped with a one-time stderr warning if missing. `AGENTIC_ANONYMIZE_TOOL_RESULTS=1` (default) scrubs tool-call output — fetched page text (`fetch_url_tool.py`) and prior-step handoff (`step_context.py`) — before it flows into later steps. `AGENTIC_ANONYMIZE_VISION_LOCAL=1` (default) prefers a local Ollama vision model (`AGENTIC_ANONYMIZE_VISION_MODEL`, default `ollama/llava`) over cloud for video-frame synopsis when anonymization is active; if the local model fails, the synopsis is skipped (stderr note) rather than falling back to cloud.

## Web server (`agentic-orchestration-web/.env`)

| Variable | Role |
|----------|------|
| `AGENTIC_TOOL_ROOT` | Path to folder containing `main.py` |
| `AGENTIC_PYTHON` | Python executable (defaults to tool `.venv` when present) |
| `AGENTIC_WEB_HOST` | Bind address (`0.0.0.0` for LAN) |
| `AGENTIC_WEB_PORT` | Default `3847` |
| `AGENTIC_ORCHESTRATE_API_KEY` | Bearer/API key for `POST /api/v1/orchestrate` (OpenClaw). Falls back to `AGENTIC_CHAT_COMPLETIONS_API_KEY` when unset. |
| `AGENTIC_CHAT_COMPLETIONS_API_KEY` | Shared key for chat-completions-compatible proxies and orchestrate fallback. |

See `agentic-orchestration-web/README.md` and [Web UI]({{ '/web-ui/' | relative_url }}).

## Security

Never commit `.env` or tokens. `.env` files are gitignored by convention.

## Related

- [MCP providers]({{ '/mcp-catalog/' | relative_url }}) — required env per integration; [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) cross-reference
- [RAG sources]({{ '/rag-catalog/' | relative_url }}) — retrieval corpora (`sqlite-fts`, `embedding`, `hybrid` shipped; known gaps on that page)
- [Agent skills roadmap]({{ '/agent-skills-roadmap/' | relative_url }}) — procedural skill catalog env vars and attachment semantics
- [Agent skills]({{ '/agent-skills/' | relative_url }}) — shipped skill inventory
- [CLI reference]({{ '/cli-reference/' | relative_url }})
- Root `README.md` — summary table

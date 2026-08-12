# Logging contract for Kubernetes and engine runs

Correlate engine, coordinator, worker, and web logs in Loki, Datadog, or Cloud Logging using shared fields. **One correlation id:** `run_id` (hex uuid). Do not invent a second APM trace id.

## Format

Set on engine, coordinator, worker, warm-pool, and delegation-broker pods:

```env
AGENTIC_LOG_FORMAT=json   # default: text ([run_id/step_id] prefix)
```

### JSON line schema

Each log line is one JSON object:

| Field | Always | Description |
|-------|--------|-------------|
| `ts` | yes | UTC ISO-8601 timestamp |
| `level` | yes | `info`, `error`, … |
| `component` | yes | See components below |
| `message` | yes | Human-readable event |
| `run_id` | when known | Workflow / chat turn id |
| `step_id` | when known | Step id (distributed backends) |
| *(extra)* | optional | Merged keys such as `question_id`, `namespace` |

Example:

```json
{"ts":"2026-06-29T12:00:00.123456+00:00","level":"info","component":"engine","message":"engine chat start","run_id":"abc123","question_id":"q-1"}
```

## Components

| `component` | Process | Typical events |
|-------------|---------|----------------|
| `engine` | `python -m orchestration.serve` (WS / dynamic daemon) and CLI `main.py` | run start/end, planning, direct_agent |
| `worker` | Job / subprocess `--execute-step` | step kickoff via `worker_logging` |
| `warm-pool-worker` | Warm pool Deployment | queue claim + execute |
| `coordinator` | Laptop or in-cluster coordinator (subprocess/K8s Job create/wait) | Job create/wait, step spawn |
| `inprocess` | CrewAI in-process kickoff | kickoff start/end/fail |
| `delegation-broker` | K5.5 delegation broker | child Job spawn for worker delegation |

## Correlation rules

1. **Mint once at the edge** — engine WS mints `run_id` per chat/direct_agent turn; web `server.mjs` mints via `mintRunId()` and passes `--run-id` / `AGENTIC_RUN_ID`.
2. **`question_id` ≠ `run_id`** — clients may send `question_id` for concurrent demux; frames carry both. Logs may put `question_id` in `extra`.
3. **Propagate** — `RunOptions.run_id` → step specs → worker env → `emit_log(..., run_id=...)`.
4. **Session outcome** — `last_run_id`, `last_exit_code`, `last_error`, `last_k8s_jobs` on orchestrator session JSON for Admin Runs.
5. **Grep** — filter by `run_id` across engine → coordinator → worker (and web when present).

Worker stdout/stderr from CrewAI still uses the `[run_id/step_id]` text prefix when `AGENTIC_LOG_FORMAT=text`. In JSON mode, explicit `emit_log` calls use JSON; CrewAI verbose output remains prefixed text unless you pipe through a collector that parses both.

## Prometheus `/metrics`

| Process | Path | Notes |
|---------|------|-------|
| Engine daemon | `GET /metrics` | `ao_runs_total`, `ao_run_duration_seconds`, `ao_step_failures_total` (`orchestration/metrics.py`) |
| Web / coordinator Node | `GET /metrics` | `ao_web_runs_total`, `ao_web_run_duration_seconds_*`, topology RTT (`lib/ao-metrics.mjs`) |

Scrape both when both are deployed. Counters are process-local (no remote write required).

Opt-in Sentry: `AGENTIC_SENTRY_DSN` (engine) / `AGENTIC_WEB_SENTRY_DSN` (web).

## Loki (LogQL)

```logql
{namespace="agentic-orchestration"} | json | run_id="your-run-id"
```

Label suggestions via Promtail pipeline_stages:

- `run_id`, `step_id`, `component` from JSON
- `job` label from Kubernetes pod labels (`app.kubernetes.io/name`)

## Datadog

Map JSON attributes to facets: `@run_id`, `@step_id`, `@component`. Filter:

```
@component:engine @run_id:abc*
```

## Worker Jobs vs warm pool

| Path | `component` | Notes |
|------|-------------|-------|
| One-shot Job | `worker` | `worker_logging.worker_log_context` prefixes streams |
| Warm pool Deployment | `warm-pool-worker` | Queue claim + execute events |
| Coordinator (laptop or in-cluster) | `coordinator` | Job create/wait, warm pool enqueue |
| Engine serve / CLI | `engine` | Chat turn and dynamic plan/execute |
| In-process CrewAI | `inprocess` | Whole-crew kickoff |
| Delegation broker | `delegation-broker` | Child Job for delegated tools |

## Related

- `orchestration/structured_logging.py` — `emit_log`, `structured_log_record`
- `orchestration/run_store.py` — `new_run_id`, `resolve_run_id`
- `orchestration/worker_logging.py` — worker stream prefixing (K2.2)
- `orchestration/metrics.py` / `agentic-orchestration-web/lib/ao-metrics.mjs` — Prometheus text
- `deploy/k8s/warm-pool.yaml` — warm pool workers default `AGENTIC_LOG_FORMAT=json`

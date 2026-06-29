# Logging contract for Kubernetes runs (K5.2)

Correlate coordinator and worker logs in Loki, Datadog, or Cloud Logging using shared fields.

## Format

Set on coordinator and worker pods:

```env
AGENTIC_LOG_FORMAT=json   # default: text ([run_id/step_id] prefix)
```

### JSON line schema

Each log line is one JSON object:

| Field | Always | Description |
|-------|--------|-------------|
| `ts` | yes | UTC ISO-8601 timestamp |
| `level` | yes | `info`, `error`, … |
| `component` | yes | `coordinator`, `worker`, `warm-pool-worker` |
| `message` | yes | Human-readable event |
| `run_id` | when known | Workflow run id |
| `step_id` | when known | Step id |

Example:

```json
{"ts":"2026-06-29T12:00:00.123456+00:00","level":"info","component":"coordinator","message":"created Job agentic-abc-research","run_id":"abc","step_id":"research","namespace":"agentic-orchestration"}
```

Worker stdout/stderr from CrewAI still uses the `[run_id/step_id]` text prefix when `AGENTIC_LOG_FORMAT=text`. In JSON mode, explicit `emit_log` calls use JSON; CrewAI verbose output remains prefixed text unless you pipe through a collector that parses both.

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
@component:coordinator @run_id:abc*
```

## Worker Jobs vs warm pool

| Path | `component` | Notes |
|------|-------------|-------|
| One-shot Job | `worker` | `worker_logging.worker_log_context` prefixes streams |
| Warm pool Deployment | `warm-pool-worker` | Queue claim + execute events |
| Coordinator (laptop or in-cluster) | `coordinator` | Job create/wait, warm pool enqueue |

## Related

- `orchestration/structured_logging.py` — `emit_log`, `structured_log_record`
- `orchestration/worker_logging.py` — worker stream prefixing (K2.2)
- `deploy/k8s/warm-pool.yaml` — warm pool workers default `AGENTIC_LOG_FORMAT=json`

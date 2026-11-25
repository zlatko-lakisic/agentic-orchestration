# mirrord configs — read before running

> **Warning.** These configs attach your laptop to the **live** engine / warm-pool
> Deployments on the Jetson and Ada hosts. They are debugging tools for the
> operator of those hosts, not something to run casually.

What each setting does to the cluster and to your machine:

| Setting | Effect |
|---------|--------|
| `"agent": {"privileged": true}` | mirrord starts a **privileged** agent pod on the node. It can see every process and network namespace on that host. |
| `"feature": {"env": true}` | The target pod's **entire environment is copied into your local process** — every key in the `agentic-orchestrator-env` Secret (LLM provider keys, MCP tokens, the inbound API keys, `AGENTIC_SERVE_ADMIN_TOKEN`). Anything your local process logs, dumps or sends to a crash reporter now includes them. |
| `"network": {"incoming": "steal"}` (`ada-engine.json`, `jetson-engine.json`) | **All traffic to the engine is taken away from the real pod** and delivered to your laptop for as long as the session runs. Reach / KnowBuddy clients and the web UI's admin proxy talk to *your* process. If it is stopped at a breakpoint, production is down. |
| `"network": {"incoming": "mirror"}` (warm pool, `ada-engine-outgoing.json`) | Traffic is copied, not taken. The real pod keeps serving. |
| `"network": {"outgoing": true}` | Your local process's outbound connections leave **from the cluster**, with the pod's network identity. |
| `"fs": "read"` | Reads of files that do not exist locally are served from the pod's filesystem (including mounted Secrets and the run store). |

Before using one:

1. Prefer the `mirror` configs. Use a `steal` config only in a maintenance window,
   and never against a host other people are using.
2. Do not run these from a machine you do not fully trust with the cluster's
   secrets (shared workstation, CI runner, a container with crash/telemetry upload).
3. Unset or scrub the copied environment before sharing terminal output, core
   dumps or debugger sessions.
4. Stop the mirrord session when you are done; check `kubectl get pods -n
   agentic-orchestration` for a leftover `mirrord-agent-*` pod and delete it.
5. If a session with `"env": true` ran on a machine that was later lost or
   compromised, rotate every key in the Secret.

The JSON files themselves cannot carry comments, which is why this warning lives here.

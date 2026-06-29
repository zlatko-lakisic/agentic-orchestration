# CrewAI pin and upgrade runbook (K5.3)

The worker and coordinator images install CrewAI from `requirements.txt`. The version is **pinned** for reproducible K8s runs.

## Current pin

```text
crewai==1.12.2
```

Verify in a built image:

```bash
docker run --rm agentic-orchestrator-worker:local python -c "import crewai; print(crewai.__version__)"
```

## Upgrade procedure

1. **Changelog** — Read [CrewAI releases](https://github.com/crewAIInc/crewAI/releases) for breaking changes (MCP resolver, LLM adapters, `kickoff` API).

2. **Bump pin** — Update `requirements.txt`:
   ```text
   crewai==<new-version>
   ```

3. **Local venv** — Reinstall and run unit + integration tests:
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   pytest -m unit
   pytest -m integration
   ```

4. **MCP hotfix** — Run `tests/test_backend_inprocess_regression.py` and any MCP smoke workflows. Re-read `orchestration/crewai_mcp_hotfix.py`; upstream may have fixed bugs we patch.

5. **Rebuild images** — Worker + coordinator:
   ```bash
   docker build -f docker/Dockerfile.worker -t agentic-orchestrator-worker:local .
   docker build -f docker/Dockerfile.coordinator -t agentic-orchestrator-coordinator:local ..
   powershell -File scripts/docker-worker-smoke.ps1
   powershell -File scripts/docker-coordinator-smoke.ps1
   ```

6. **Kind regression** — Full or subset:
   ```powershell
   powershell -File scripts/k8s-local-verify.ps1 -SkipLlm
   ```

7. **Rollout** — Push images to your registry, update `AGENTIC_K8S_WORKER_IMAGE` and coordinator Deployment image, rolling restart worker-facing Deployments (coordinator, warm pool).

8. **THIRD_PARTY_NOTICES.md** — Update the documented CrewAI version at repo root.

## Rollback

Redeploy the previous image tag and restore the prior `crewai==` pin in `requirements.txt`. Worker Jobs are ephemeral; no in-flight migration is required beyond coordinator/warm-pool pod restarts.

## Related

- `docker/Dockerfile.worker` — worker image
- `docker/Dockerfile.coordinator` — coordinator image
- `orchestration/crewai_mcp_hotfix.py` — native MCP resolver patch

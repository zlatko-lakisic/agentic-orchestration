# Edge-only agent skills

Procedural skills loaded **only on ARM edge** deployments via `config/env.jetson`:

```bash
AGENTIC_EXTRA_AGENT_SKILLS_PATH=config/agent_skills_jetson
```

The planner merges this directory with the default `config/agent_skills/` catalog. Skills here are not loaded on dev machines unless you set the same env var locally.

On edge k3s, `jetson-hotfix-web.sh` hostPath-mounts this folder into coordinator and warm-pool pods so `git pull` updates skills without rebuilding the worker image.

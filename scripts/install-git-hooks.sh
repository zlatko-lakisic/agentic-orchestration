#!/usr/bin/env bash
# Point this clone at repo-managed hooks (.githooks/), including pre-push unit tests.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
chmod +x .githooks/pre-push
git config core.hooksPath .githooks
echo "Installed git hooks (core.hooksPath=.githooks)."
echo "pre-push will run: agentic-orchestration-tool pytest (CI unit tier)."
echo "Bypass: git push --no-verify  or  AGENTIC_SKIP_PREPUSH_TESTS=1 git push"
